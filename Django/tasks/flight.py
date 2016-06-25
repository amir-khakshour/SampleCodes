from kombu.compat import Publisher, Consumer
import datetime

from django.conf import settings
from django.db import IntegrityError
from django.contrib.sitemaps import ping_google

from celery import shared_task
from celery.task import periodic_task
from celery.messaging import establish_connection

from account.compat import get_user_model
from flight.models import UserWatch
from fleeo.celery import tracker_exchange


@shared_task(ignore_result=True)
def save_tracker_data(data):
    """Send data to tracker parser via AMQP."""

    connection = establish_connection()
    publisher = Publisher(
        connection=connection,
        exchange=tracker_exchange,
        routing_key=settings.TRACKER_AMQP_ROUTING_KEY,
        exchange_type="topic"
    )

    publisher.send(data)
    publisher.close()
    connection.close()


@shared_task(ignore_result=True)
def save_user_fare_alert(user, data):
    if not user.is_authenticated():
        email = data['email']
        userModel = get_user_model()
        try:
            user = userModel.objects.get(email=email)
        except userModel.DoesNotExist:
            user = userModel()
            user.username = email
            user.email = email
            user.set_unusable_password()
            user.save()

    for seg in data['segments'][:2]:  # prevent adding huge data from Hackers to DB
        departure = seg.get('Departure', None)
        if not departure:
            departure = None
        else:
            departure_re = settings.FLIGHT_DATE_FORMAT_SEARCH_ISO_RE.search(departure)
            if departure_re:
                departure = departure_re.groupdict()
                departure = datetime.datetime(year=int(departure['year']), month=int(departure['month']),
                                              day=int(departure['day']))
        origin = seg.get('Origin', None)
        if not origin:
            continue
        origin_iata = origin.get('Iata', None)
        if not origin_iata:
            continue

        dest = seg.get('Destination', None)
        if not dest:
            continue
        dest_iata = dest.get('Iata', None)
        if not dest_iata:
            continue

        watch = UserWatch(**{
            'user': user,
            'origin_iata': origin_iata,
            'destination_iata': dest_iata,
            'departure_date': departure,
            'active': True
        })

        try:
            watch.save()
        except IntegrityError:
            try:
                watch = UserWatch.objects.get(**{
                    'user': user,
                    'origin_iata': origin_iata,
                    'destination_iata': dest_iata,
                    'departure_date': departure,
                })
                watch.active = True
                watch.save()
            except:
                # @TODO add more proper exception handling here
                pass


@periodic_task(ignore_result=True, run_every=datetime.timedelta(minutes=30))
def sitemap_ping_google():
    try:
        ping_google()
    except Exception:
        # @TODO add more proper exception handling here
        pass


