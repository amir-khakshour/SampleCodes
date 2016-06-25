import re
import urlparse

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import ugettext_lazy as _
from django.utils.datastructures import SortedDict

from openflights.models import Route, Airline

import signals
from signal_workers import fetch_ticket_price_img, ocr_ticket_price_img

domain_re = re.compile('^(?:www\.)?(?P<domain>.*)\.[^.]*$')


class Airplane(models.Model):
    name = models.CharField(max_length=1000, unique=True)
    name_fa = models.CharField(max_length=1000, blank=True, default='')
    alternate_names = models.TextField(null=True, blank=True, default='')

    def __unicode__(self):
        return u'{0}'.format(self.name)


class Flight(models.Model):
    FLIGHT_ONEWAY = 'o'
    FLIGHT_ROUNDTRIP = 'r'
    FLIGHT_MULTI = 'm'

    FLIGHT_TYPE_CHOICES = (
        (FLIGHT_ONEWAY, _("Oneway")),
        (FLIGHT_ROUNDTRIP, _("RoundTrip")),
        # (FLIGHT_MULTI, _("Multi")),
    )

    FLIGHT_ROUND_TRIP_NONE = ''
    FLIGHT_ROUND_TRIP_SINGLE_LEG = 's'
    FLIGHT_ROUND_TRIP_FULL_LEG = 'f'

    FLIGHT_ROUND_TRIP_CHOICES = (
        (FLIGHT_ROUND_TRIP_NONE, _("None")),
        (FLIGHT_ROUND_TRIP_SINGLE_LEG, _("Single Legs")),
        (FLIGHT_ROUND_TRIP_FULL_LEG, _("Full legs")),
    )

    # Unique flight id - @ see ticket.utils.
    flight_uid = models.CharField(max_length=1000, verbose_name=_("Flight Unique ID"), default='', unique=True)
    raw_id = models.CharField(max_length=1000, verbose_name=_("Flight raw ID"), default='', blank=True, null=True)
    round_trip_type = models.CharField(max_length=1, choices=FLIGHT_ROUND_TRIP_CHOICES,
                                       help_text=_("Round-Trip type"), default=FLIGHT_ROUND_TRIP_NONE, blank=True)

    def __unicode__(self):
        return u'{0}'.format(self.flight_uid)


class FlightSegment(models.Model):
    flight = models.ForeignKey(Flight, help_text=_("Flight"), related_name='segments')
    seg_uid = models.CharField(max_length=1000, verbose_name=_("Segment Unique ID"), default='')
    seg_no = models.PositiveSmallIntegerField(default=1)

    class Meta:
        unique_together = (
            ('flight', 'seg_no'),
        )

    def __unicode__(self):
        return u'{0}'.format(self.seg_uid)


class FlightLeg(models.Model):
    segment = models.ForeignKey(FlightSegment, help_text=_("Leg segment"), related_name='legs', null=True, blank=True)
    airline = models.ForeignKey(Airline, related_name='+', default=0)
    flight_raw_no = models.CharField(max_length=100, verbose_name=_("Flight Number"), default=0)
    leg_no = models.PositiveSmallIntegerField(default=1)
    route = models.ForeignKey(Route, related_name='+')
    # in every flight leg we use the timezone of the first leg to show times for all other legs
    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    airplane = models.ForeignKey(Airplane, related_name='+')

    class Meta:
        unique_together = (
            ('segment', 'leg_no'),
        )

    def __unicode__(self):
        return u'{0}: {1}'.format(self.airline, self.route)


def set_price_discounted(sender, instance=None, **kwargs):
    """
    Signal reciever that sets instance.price_irr_incl_discount and price_usd_incl_discount from instance.discount.
    """
    pass


class ReservationSource(models.Model):
    name = models.CharField(max_length=1000, blank=True, null=True)
    website = models.URLField(help_text=_("Reservation website."), unique=True)
    factor = models.DecimalField(max_digits=12, decimal_places=2, blank=True,
                                 default=1.0, help_text=_("Display order weight"))
    # @TODO ADD this fields:
    """
    - Factor
    - Group
    - SupplierId
    """

    def __unicode__(self):
        return u'%s' % self.name if self.name else self.website

    def save(self, *args, **kwargs):
        if not self.name:
            parsed_ws = urlparse.urlparse(self.website)
            domain = domain_re.search(parsed_ws.netloc)
            if domain:
                self.name = domain.groups()[0]
            else:
                self.name = self.website

        super(ReservationSource, self).save(*args, **kwargs)


class Ticket(models.Model):
    fetch_price_img = False
    ocr_image = False

    ALL_CABIN = 'a'
    ECONOMY_CABIN = 'e'
    P_ECONOMY_CABIN = 'p'
    BUSINESS_CABIN = 'b'
    FIRST_CABIN = 'f'
    DEFAULT_CABIN_TYPE = ECONOMY_CABIN

    CABIN_CHOICES = SortedDict([
        (ALL_CABIN, _("All cabins")),
        (ECONOMY_CABIN, _("Economy")),
        (P_ECONOMY_CABIN, _("Premium Economy")),
        (BUSINESS_CABIN, _("Business")),
        (FIRST_CABIN, _("First")),
    ])

    TRIP_ONE_WAY = 'o'
    TRIP_ROUND_TRIP = 'r'
    TRIP_MILTI_DEST = 'm'
    DEFAULT_TRIP_TYPE = TRIP_ONE_WAY

    TRIP_TYPE_CHOICES = SortedDict([
        (TRIP_ONE_WAY, _("One Way")),
        (TRIP_ROUND_TRIP, _("Return trip")),
        (TRIP_MILTI_DEST, _("Multiple destinations")),
    ])

    STATUS_ON_TIME = 'o'
    STATUS_CLOSED = 'c'
    STATUS_FULL = 'f'
    STATUS_CANCELED = 'd'

    STATUS_CHOICES = SortedDict([
        (STATUS_ON_TIME, _("On Time")),
        (STATUS_FULL, _("Full")),
        (STATUS_CLOSED, _("Closed")),
        (STATUS_CANCELED, _("Canceled")),
    ])

    RESERVE_TYPE_PHONE = 'p'
    RESERVE_TYPE_TOUR = 't'
    RESERVE_TYPE_CHARTER = 'c'
    RESERVE_TYPE_CHOICES = SortedDict([
        (RESERVE_TYPE_PHONE, _("Phone Reserve")),
        (RESERVE_TYPE_TOUR, _("Tour Reserve")),
        (RESERVE_TYPE_CHARTER, _("Charter Reserve")),
    ])

    flight = models.ForeignKey(Flight, related_name='tickets', default=None, null=True)
    flight_raw_no = models.CharField(max_length=100, verbose_name=_("Flight Number"), default=None, null=True)

    seg_no = models.SmallIntegerField(default=-1, blank=True)  # -1 : related to all segments, x>0: segment number
    ticket_uid = models.CharField(max_length=100, verbose_name=_("Ticket Uniqueu ID"), default=None, unique=True)
    ticket_id = models.CharField(max_length=100, verbose_name=_("Ticket ID"), default=None)
    reserve_source = models.ForeignKey(ReservationSource, related_name='+', default=None)
    reserve_url = models.URLField(blank=True, null=True, default=None, max_length=1000)
    seat_id = models.CharField(max_length=256, blank=True, default='', null=True)
    status = models.CharField(max_length=1, choices=STATUS_CHOICES.items(), default=STATUS_ON_TIME)
    cabin = models.CharField(max_length=1, choices=CABIN_CHOICES.items(), help_text=_("Cabin type"))
    charter = models.BooleanField(default=False)
    tour_reserve = models.BooleanField(default=False)
    phone_reserve = models.BooleanField(default=False)

    capacity = models.SmallIntegerField(default=-1, blank=True)  # -1 : Not Full, 0 = Full, other = Capacity
    price_img_refreshed = models.BooleanField(default=False)
    price_img_source = models.CharField(max_length=1000, null=True)
    price_img = models.ImageField(upload_to=getattr(settings, 'PRICE_IMAGE_UPLOAD_TO', 'price-images')
                                  , verbose_name="Price image", default='', blank=True)

    price_img_content = models.TextField(null=True, blank=True, default='')

    price = models.DecimalField(max_digits=12, decimal_places=2, blank=True,
                                default=0.0, help_text=_("Price in IRR"))
    currency_code = models.CharField(max_length=4, help_text=_("Currency Code"), default='IRR')

    # In percentage
    discount = models.DecimalField(max_digits=6, decimal_places=2, blank=True,
                                   help_text=_("Discount in percentage."), default=0.0)

    updated = models.DateTimeField(auto_now=True, default=timezone.now)

    def __unicode__(self):
        return u'({0}) {1} > {2}'.format(self.pk, self.ticket_id, self.seat_id)

    def save(self, *args, **kwargs):
        super(Ticket, self).save(*args, **kwargs)
        signals.ticket_updated.send(Ticket, ticket=self)


signals.ticket_updated.connect(fetch_ticket_price_img)
signals.ticket_updated.connect(ocr_ticket_price_img)

