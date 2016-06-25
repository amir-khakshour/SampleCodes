import datetime

from django.conf import settings
from django.db import models
from django.utils.translation import ugettext_lazy as _

from account.compat import AUTH_USER_MODEL


# Create your models here.
class UserWatch(models.Model):
    DEFAULT_WID_TIME = datetime.datetime(1967, 1, 1)
    user = models.ForeignKey(AUTH_USER_MODEL, null=True, blank=True)
    wid = models.CharField(max_length=1000, verbose_name=_("User watch Unique ID"), unique=True)
    origin_iata = models.CharField(
        max_length=3,
        help_text=_("3-letter IATA code, for all other airports."),
        db_index=True,
        blank=True
    )
    destination_iata = models.CharField(
        max_length=3,
        help_text=_("3-letter IATA code, for all other airports."),
        db_index=True,
        blank=True
    )
    departure_date = models.DateField(blank=True, null=True, default=DEFAULT_WID_TIME)
    active = models.BooleanField(_("Active watch"), default=True)

    def save(self, *args, **kwargs):
        _wid_slots = list()
        _wid_slots.append(self.origin_iata)
        _wid_slots.append(self.destination_iata)
        if not self.departure_date:
            self.departure_date = self.DEFAULT_WID_TIME
        _wid_slots.append(self.departure_date.strftime(settings.FLIGHT_DATE_FORMAT_SEARCH_ISO))
        _wid_slots.append(self.user.pk)
        self.wid = ''.join([str(k) for k in _wid_slots])
        super(UserWatch, self).save(*args, **kwargs)