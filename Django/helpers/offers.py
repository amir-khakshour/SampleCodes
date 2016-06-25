# -*- coding: utf-8 -*-
import khayyam
import datetime
import logging
import calendar
from collections import OrderedDict

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.formats import get_format
from django.core.urlresolvers import reverse
from django.template import Context, loader
from django.utils.translation import ugettext, ugettext_lazy as _, override as trans_override

from sanjab.elasticsearch import Search, Q, F

from libs.cache import storage, cached, safe_cache_key
from libs.template import loader_btn
from base.utils import generate_thumb_url
from cities_light.models import CityCatalog, City
from ticket.models import Flight, Ticket
from ticket.utils.persian import english_to_persian_numbers

from flight.utils.airport import es_get_airport_from_kw, nearest_airport_to_airport_from_kw, formatted_airport_from_kw
from flight.utils.parser import ticket_types_local

_s = Search()

logger = logging.getLogger('ticketparser')


def get_price_calendar(search_formatted):
    s = _s.doc_type('TicketAll').extra(size=0)

    if 3 < timezone.now().hour < 19:
        min_hours = 0.2
    else:
        min_hours = 8

    # Updated
    updated_min = (timezone.now() - datetime.timedelta(hours=min_hours)) \
        .strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)

    query = s.query(
        'filtered',
        query=Q('bool', must=[
            Q('terms', origin=search_formatted['origin']),
            Q('terms', destination=search_formatted['destination']),
            Q('range', **{'price': {"gt": 0}}),
            Q('term', status=Ticket.STATUS_ON_TIME),  # @DEBUG: // updated_min  # Q(  # 'range',  # 	**{'updated': {
            # 	"gte": updated_min,  # 	}}  # )  # @DEBUG: // updated_min
        ]),
        filter=F(
            'nested', path='dates', query=F(
                'range', **{'dates.departure': {
                'gte': search_formatted['start_date'].strftime(settings.FLIGHT_DATE_FORMAT_ES_PY),
                'lte': search_formatted['end_date'].strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)
                }}
            ),
        ),
    )

    query.aggs.bucket('dates', 'nested', path='dates') \
        .bucket('dates_departure', 'date_histogram', field='dates.departure', interval='day') \
        .bucket('dates_to_ticket', 'reverse_nested') \
        .bucket('price', 'stats', field='price')
    aggs = query.aggregations

    try:
        return aggs['dates']['dates_departure']['buckets']
    except:
        return {}


def validate_price_calendar_request(search):
    # @TODO log errors
    if 'firstDate' not in search or \
                    'lastDate' not in search or \
                    'originIata' not in search or \
                    'destinationIata' not in search:
        return False

    return True


def daterange(start_date, end_date):
    for n in range(int((end_date - start_date).days) + 1):
        yield start_date + datetime.timedelta(n)


@cached(60 * 2)
def get_formatted_price_calendar(search):
    """
        {
            u'destinationIata': u'KIH',
            u'originIata': u'THR',
            u'includeNearby': False,
            u'maxStops': 10,
            u'lastDate': u'2015-06-03',
            u'firstDate': u'2015-05-15',
            u'action': u'get_price_calendar',
            u'segment': 0
        }
    :param search:
    :return:
    """
    if not validate_price_calendar_request(search):
        return

    search_formatted = dict()
    iso_date_re = settings.FLIGHT_DATE_FORMAT_SEARCH_ISO_RE
    first_date = iso_date_re.search(search['firstDate'])
    if not first_date:
        return False
    first_date = first_date.groupdict()
    first_date = dict([(x[0], int(x[1])) for x in first_date.items()])
    search_formatted['start_date'] = datetime.datetime(**first_date)
    now = timezone.now()
    search_formatted['start_date'] = search_formatted['start_date'].replace(
        hour=now.hour, minute=now.minute, second=now.second, microsecond=now.second
    )

    last_date = iso_date_re.search(search['lastDate'])
    if not last_date:
        return False
    last_date = last_date.groupdict()
    last_date = dict([(x[0], int(x[1])) for x in last_date.items()])
    last_date.update({
        'hour': 23,
        'minute': 59,
        'second': 59
    })
    search_formatted['end_date'] = datetime.datetime(**last_date)

    search_formatted['origin'] = [search['originIata']]
    search_formatted['destination'] = [search['destinationIata']]

    if 'includeNearby' in search and search['includeNearby']:
        for origin in nearest_airport_to_airport_from_kw(iata_faa=search['originIata']):
            if origin['iata_faa'] != search['originIata']:
                search_formatted['origin'].append(origin['iata_faa'])

        for dest in nearest_airport_to_airport_from_kw(iata_faa=search['destinationIata']):
            if dest['iata_faa'] != search['destinationIata']:
                search_formatted['destination'].append(dest['iata_faa'])

    aggs_result = get_price_calendar(search_formatted)
    if not aggs_result:
        return False

    date_and_prices = OrderedDict()
    # Add default data
    for date in daterange(search_formatted['start_date'], search_formatted['end_date']):
        _date_k = date.replace(hour=0, minute=0, second=0, microsecond=0)  # Remove time from datetime
        date_key = str(calendar.timegm(_date_k.timetuple()))  # create timestamp out of datetime
        # create ES format type for default Departure Date
        date_departure = int(str(date_key) + '000')
        date_and_prices[date_key] = {
            'DepartureDate': date_departure,
            'EstimatedPrice': 0,
            'ExamplePrice': 0,
            'ExpectedPrice': 0,
        }

    for b in aggs_result:
        this_offers = b['dates_to_ticket']['price']
        date_departure = datetime.datetime.fromtimestamp(
            int(str(b['key'])[:10]))  # Convert timestamp from ES format to python datetime
        _date_k = date_departure.replace(hour=0, minute=0, second=0, microsecond=0)  # Remove time from datetime
        date_key = str(calendar.timegm(_date_k.timetuple()))  # create timestamp of datetime
        date_and_prices[date_key] = {
            'DepartureDate': b['key'],
            'EstimatedPrice': this_offers['avg'],
            'ExamplePrice': this_offers['max'],
            'ExpectedPrice': this_offers['min'],
        }

    return {
        'Data': {'DatesAndPrices': date_and_prices.values()},
        'Action': 'get_price_calendar',
    }


def fares_from_origin_to_anywhere_cache_key(iata_faa, departure_date, page=0):
    return safe_cache_key('fares_from_origin_to_anywhere', iata_faa, departure_date, page)


def init_get_fares_from_origin_to_anywhere(iata_faa, departure_date, limit=settings.FLIGHT_PLACE_CARDS_LIMIT):
    """
    @STORAGE
    :param iata_faa:
    :param limit:
    :return:
    """
    base_cache_key = fares_from_origin_to_anywhere_cache_key(iata_faa, departure_date, page=1)
    output = storage.get(base_cache_key)
    if not output:
        s = _s.doc_type('TicketAll').extra(size=0)

        if 3 < timezone.now().hour < 19:
            min_hours = 0.2
        else:
            min_hours = 8

        updated_min = (timezone.now() - datetime.timedelta(hours=min_hours)).strftime(
            settings.FLIGHT_DATE_FORMAT_ES_PY)
        origins = nearest_airport_to_airport_from_kw(iata_faa=iata_faa)
        origin_iatas = list()
        for o in origins:
            origin_iatas.append(o['iata_faa'])
        query = s.query(
            'filtered',
            query=Q(
                'bool',
                must=[
                    Q('terms', origin=origin_iatas or [iata_faa]),
                    Q('range', **{'price': {"gt": 10}}),
                    Q('term', status=Ticket.STATUS_ON_TIME),
                    Q('term', tour_reserve=False),  # @DEBUG: // updated_min  # Q(  # 'range',  # 	**{'updated': {
                    # 		"gte": updated_min,  # 	}}  # )  # @DEBUG: // updated_min
                ],  # must_not=[  # Q('term', round_trip_type=Flight.FLIGHT_ROUND_TRIP_FULL_LEG),  # ],
            ),
            filter=F(
                'nested', path='dates', query=F(
                    'range', **{'dates.departure': {
                        'gte': departure_date,
                    }}
                ),
            ),
        )

        # print json.dumps(query.to_dict())
        first_bucket = query.aggs.bucket(
            'destinations',
            'terms',
            field='destination',
            size=0,
            order={"best_hit": "asc"},
        )
        first_bucket.bucket(
            'min_price_doc',
            'top_hits',
            sort=[{"price": {"order": "asc"}}, {"dates.departure": {"order": "asc"}}],
            _source={
            "include": [
                "origin",
                "destination",
                "price",
                "cabin",
                "dates",
                "segments",  # "segments",  # "flight_id",
                "round_trip_type",
                "currency_code",
            ]
            },
            size=1,
        )
        first_bucket.bucket(
            'best_hit',
            'min',
            lang="groovy",
            script="doc.price",
        )

        def set_empty_results_cache():
            # In case of no results found, we cache for less times
            storage.set(base_cache_key, result_chunks, 60 * 5)  # @CACHE_TIME: 5 minutes

        result_chunks = None
        aggs = query.aggregations
        if 'destinations' not in aggs:
            return set_empty_results_cache()
        result = aggs['destinations']['buckets']
        # print json.dumps(query.to_dict())
        page = 1
        while True:
            start = (page - 1) * settings.FLIGHT_PLACE_CARDS_ITEMS_PER_PAGE
            try:
                result[start]
            except IndexError:
                if page == 1:
                    set_empty_results_cache()
                break
            result_chunks = result[start:(start + settings.FLIGHT_PLACE_CARDS_ITEMS_PER_PAGE)]
            cache_key = fares_from_origin_to_anywhere_cache_key(iata_faa, departure_date, page)
            storage.set(cache_key, result_chunks, 60 * 5)  # @CACHE_TIME: 10 minutes
            page += 1


def fares_from_origin_to_anywhere(iata_faa, departure_date, page=1):
    cache_key = fares_from_origin_to_anywhere_cache_key(iata_faa, departure_date, page)
    output = storage.get(cache_key)
    if not output:
        init_get_fares_from_origin_to_anywhere(iata_faa, departure_date, page)
        output = storage.get(cache_key)
    return output


# @NO_CACHE
def formatted_fares_from_origin_to_anywhere(iata_faa, departure_date, page=1, culture_code=settings.LANGUAGE_CODE):
    """
    :param departure_date:
    :param from_iata:
    :param culture_code:
    :return:
    """
    fares = {iata_faa: fares_from_origin_to_anywhere(iata_faa, departure_date, page)}
    airports = list()
    result_count = fares[iata_faa]
    # @IMPROVE, @CACHE
    # if len(result_count) < settings.FLIGHT_PLACE_CARDS_LIMIT:
    # global_fares = fares_from_origin_to_anywhere(
    # 		departure_date, settings.DEFAULT_USER_AIRPORT,
    # 		limit=(settings.FLIGHT_PLACE_CARDS_LIMIT - len(result_count))
    # 	)
    # 	fares.update({settings.DEFAULT_USER_AIRPORT: global_fares})
    if not fares:
        return
    for origin_iata, buckets in fares.items():
        if not buckets or buckets == None:
            continue
        for bucket in buckets:
            dest_iata = bucket['key']
            airport_raw = es_get_airport_from_kw(iata_faa=dest_iata)
            if airport_raw:
                airport = {
                    'iata': airport_raw['iata_faa'],
                    'city_id': airport_raw['city_id'],
                }
                if culture_code == 'fa':
                    airport.update({
                        'country': airport_raw['country_fa'] if airport_raw['country_fa'] else airport_raw['country'],
                        'city': airport_raw['city_fa'] if airport_raw['city_fa'] else airport_raw['city'],
                        'Name': airport_raw['name_fa'] if airport_raw['name_fa'] else airport_raw['name'],
                        'state': airport_raw['region_fa'] if airport_raw['region_fa'] else airport_raw['region'],
                    })
                else:
                    airport.update({
                        'country': airport_raw['country'],
                        'city': airport_raw['city'],
                        'Name': airport_raw['name'],
                        'state': airport_raw['region'],
                    })
                ticket = bucket['min_price_doc']['hits']['hits'].pop()
                ticket_id = ticket['_id'].split('.')[:-1]
                ticket_source = ticket['_source']
                airport['Origin_Iata'] = origin_iata
                airport['Ticket'] = {'pk': ticket_id}
                airport['Ticket'].update(ticket_source)
                airports.append(airport)

    return airports


def place_cards_items(iata_faa, departure_date, page=1, culture_code=settings.LANGUAGE_CODE):
    cache_key = safe_cache_key('place_cards_items', iata_faa, departure_date, page, culture_code)
    output = cache.get(cache_key)
    if not output:
        places = formatted_fares_from_origin_to_anywhere(
            iata_faa=iata_faa,
            departure_date=departure_date,
            page=page,
            culture_code=culture_code,
        )
        if places:
            t = loader.get_template('flight/place_card-items.html')
            # prepare places
            js_data = list()
            sizes = {
                'medium': '285x285',
                'wide': '570x285',
                'large': '570x570'
            }

            uid = (page - 1) * settings.FLIGHT_PLACE_CARDS_ITEMS_PER_PAGE
            for cid, place in enumerate(places):
                city_id = place['city_id']
                city_catalog = CityCatalog.objects.filter(city__pk=city_id).order_by('?').first()

                size = 'medium'
                if cid in (4, 8, 9):
                    size = 'wide'

                if cid == 7:
                    size = 'large'

                if city_catalog:
                    place['bg'] = generate_thumb_url(
                        {  # @HORDER  # @CHANGE to url in order to be able to server from remote storage
                           'path': city_catalog.image.path,
                           'size': sizes[size],
                        })
                    place['bg_mobile'] = generate_thumb_url(
                        {  # @HORDER  # @CHANGE to url in order to be able to server from remote storage
                           'path': city_catalog.image.path,
                           'size': settings.FLIGHT_PLACE_CARD_MOBILE_SIZE,
                        })
                    place['title'] = city_catalog.title_fa if culture_code == 'fa' else city_catalog.title
                else:
                    place['bg'] = None

                palce_js_data = place_card_js_data(place)
                place['id'] = 'pi-%s' % uid
                place['class'] = size
                palce_js_data['id'] = place['id']
                js_data.append(palce_js_data)
                # Remove unwanted data
                place['round_trip_type'] = place['Ticket']['round_trip_type']
                del place['Ticket']
                uid += 1
            # Render Items
            c = Context({
                'places': places,
                'page': page,
                'js_data': js_data,
            })

            output = t.render(c)
        cache.set(cache_key, output, 60 * 5)
    return output


def place_cards(iata_faa, departure_date, culture_code=settings.LANGUAGE_CODE):
    cache_key = safe_cache_key('place_cards', iata_faa, departure_date, culture_code)
    output = cache.get(cache_key) or ''
    if not output:
        t = loader.get_template('flight/place_cards.html')

        # prepare places
        items = place_cards_items(iata_faa, departure_date, page=1, culture_code=culture_code)
        if items:
            with trans_override(culture_code):
                btn = loader_btn(unicode(_('See More Destinations')), unicode(_('See more offers from your hometown')),
                                 ex_class='load-more-btn')

            # Render PlaceCards
            palce_cards = Context({
                'items': items,
                'loader_btn': btn,
            })

            output = t.render(palce_cards)

        cache.set(cache_key, output, 1)  # Low cache lifetime

    return output


def place_card_js_data(place):
    """
    We always build two URL types in place cards: one way and roundtrip types
    :param place:
    :return:
    """
    js_data = dict()
    js_data['segments'] = list()
    ticket = place['Ticket']
    js_data['price'] = ticket['price']
    js_data['currency'] = ticket['currency_code']
    js_data['ticketClass'] = ticket['cabin']
    # @FLIGHT_VARIATION
    js_data['segments'].append({
        'Origin': ticket['origin'],
        'Destination': ticket['destination'],
        'Depart': ticket['dates']['departure'],
    })

    if ticket['round_trip_type'] == Flight.FLIGHT_ROUND_TRIP_FULL_LEG and len(ticket['segments'][0]['legs']) == 2:
        homebound = ticket['segments'][0]['legs'][1]
        js_data['segments'].append({
            'Origin': ticket['destination'],
            'Destination': ticket['Origin'],
            'Depart': homebound['departure']['date'],
        })

    return js_data


def es_agg_flight_top_destinations(max=settings.TOP_FLIGHT_DESTINATIONS_MAX):
    s = _s.doc_type('TicketAll').extra(size=0)
    departure_date = datetime.datetime.now().strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)

    query = s.query(
        'filtered',
        query=Q(
            'bool',
            must=[
                Q('range', **{'price': {"gt": 10}}),
                Q('term', status=Ticket.STATUS_ON_TIME),
                Q('term', tour_reserve=False),
            ],
        ),
        filter=F(
            'nested', path='dates', query=F(
                'range', **{'dates.departure': {
                'gte': departure_date,
                }}
            ),
        ),
    )

    first_bucket = query.aggs.bucket(
        'destinations',
        'terms',
        field='destination',
        size=max,
        order={"_count": "desc"}
    )
    first_bucket.bucket(
        'min_price_doc',
        'top_hits',
        sort=[{"price": {"order": "asc"}}, {"dates.departure": {"order": "asc"}}],
        _source={
        "include": [  # "origin",  # "cabin",
                      "destination",
                      "price",
                      "currency_code",
        ]
        },
        size=1,
    )
    # print json.dumps(query.to_dict())
    aggs = query.aggregations
    if 'destinations' not in aggs:
        return None
    return aggs['destinations']['buckets']


@cached(60 * 10)  # 10 minutes of caching
def format_flight_top_destinations(max=settings.TOP_FLIGHT_DESTINATIONS_MAX):
    agg_top_flights = es_agg_flight_top_destinations(max)
    if not agg_top_flights:
        return

    items = list()
    for bucket in agg_top_flights:
        best_hit = bucket['min_price_doc']['hits']['hits'][0]['_source']
        dest = es_get_airport_from_kw(iata_faa=best_hit['destination'])
        if not dest:
            continue

        items.append({
            'price': best_hit['price'],
            'currency_code': best_hit['currency_code'],
            'city_fa': dest['city_fa'] if dest['city_fa'] else dest['city'],
            'city': dest['city'],
            'name_fa': dest['name_fa'] if dest['name_fa'] else dest['name'],
            'name': dest['name'],
            'iata_faa': dest['iata_faa'],
        })

    return items


@cached(60 * 30)
def flight_top_destinations(culture_code=settings.LANGUAGE_CODE, max=settings.TOP_FLIGHT_DESTINATIONS_MAX):
    items = format_flight_top_destinations(max)
    url_anchor_title = settings.FLIGHT_TO_URL_FA if culture_code == 'fa' else settings.FLIGHT_TO_URL_EN
    if not items:
        return
    urls = list()
    with trans_override(culture_code):
        for item in items:
            subtitle_slots = list()
            if culture_code == 'fa':
                subtitle_slots.append(u'ارزانترین پرواز - چارتر به')
                subtitle_slots.append(item['city_fa']),
                subtitle_slots.append(item['name_fa']),
                link_title = _("Cheap flights to %(origin)s (%(iata_faa)s)") % {
                    'origin': item['city_fa'],
                    'iata_faa': item['iata_faa'],
                }

                url_title = _(u"ارزانترین پرواز - چارتر به %(origin)s (%(iata_faa)s)") % {
                    'origin': item['city'],
                    'iata_faa': item['iata_faa'],
                }
            else:
                subtitle_slots.append(ugettext("Cheap flights to"))
                subtitle_slots.append(item['city']),
                subtitle_slots.append(item['name']),
                link_title = _("Cheap flights to %(origin)s (%(iata_faa)s)") % {
                    'origin': item['city'],
                    'iata_faa': item['iata_faa'],
                }

                url_title = _(u"Charter flights to %(origin)s (%(iata_faa)s)") % {
                    'origin': item['city'],
                    'iata_faa': item['iata_faa'],
                }

            subtitle = u'-'.join(subtitle_slots).lower()
            subtitle = subtitle.replace(' ', '-')

            urls.append({
                'title': link_title,
                'url_title': url_title,
                'url': reverse('flights_to_offers', kwargs={
                    'title': url_anchor_title,
                    'destination': item['iata_faa'].lower(),
                    'subtitle': subtitle.lower().replace(' ', '-')
                }),
                'price': item['price'],
                'currency_code': item['currency_code'],
            })

    t = loader.get_template('flight/flight_top_destinations.html')

    # Render PlaceCards
    palce_cards = Context({
        'items': urls,
    })

    return t.render(palce_cards)


@cached(60 * 30)
def es_agg_offers_to_airport(iata_faa, max=100):
    s = _s.doc_type('TicketAll').extra(size=0)
    departure_date = datetime.datetime.now().strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)
    query = s.query(
        'filtered',
        query=Q(
            'bool',
            must=[
                Q('range', **{'price': {"gt": 10}}),
                Q('term', status=Ticket.STATUS_ON_TIME),
                Q('term', destination=iata_faa),
                Q('term', tour_reserve=False),
            ],
        ),
        filter=F(
            'nested', path='dates', query=F(
                'range', **{'dates.departure': {
                'gte': departure_date,
                }}
            ),
        ),
    )

    first_bucket = query.aggs.bucket(
        'origins',
        'terms',
        field='origin',
        size=max,
        order={"_count": "desc", "best_hit": "asc"}
    )
    first_bucket.bucket(
        'min_price_doc',
        'top_hits',
        sort=[{"price": {"order": "asc"}}, {"dates.departure": {"order": "asc"}}],
        _source={
        "include": [
            "origin",
            "destination",
            "cabin",
            "dates",
            "price",
            "currency_code",
        ]
        },
        size=1,
    )
    first_bucket.bucket(
        'best_hit',
        'min',
        lang="groovy",
        script="doc.price",
    )

    # print json.dumps(query.to_dict())
    aggs = query.aggregations
    if 'origins' not in aggs:
        return None
    return aggs['origins']['buckets']


def top_offers_to_airport(iata_faa, culture_code=settings.LANGUAGE_CODE, max=100):
    agg_items = es_agg_offers_to_airport(iata_faa, max)
    if not agg_items:
        return
    flights = list()

    ticket_types = ticket_types_local(culture_code)
    if culture_code == 'fa':
        title_format = _(
            u'ارزانترین پرواز - چارتر از %(origin)s به %(dest)s %(date)s %(ticket_class)s - قیمت از %(price)s')
    else:
        title_format = _("Flight from %(origin)s to %(dest)s %(date)s %(ticket_class)s - price from %(price)s")
    for bucket in agg_items:
        best_hit = bucket['min_price_doc']['hits']['hits'][0]['_source']
        origin = es_get_airport_from_kw(iata_faa=best_hit['origin'])
        dest = es_get_airport_from_kw(iata_faa=best_hit['destination'])

        if not dest:
            logger.err("Not found destination: %s" % best_hit['origin'])
            continue

        if not origin:
            logger.err("Not found origin: %s" % best_hit['origin'])
            continue

        departure_date_string = best_hit['dates']['departure']
        departure_date = datetime.datetime.strptime(departure_date_string, settings.FLIGHT_DATE_FORMAT_ES_PY)
        departure_date_jal = khayyam.JalaliDate.from_date(departure_date)

        this_flight = {
            'price': best_hit['price'],
            'currency_code': best_hit['currency_code'],
            'ticket_class': ticket_types[best_hit['cabin']],
        }
        if culture_code == 'fa':
            this_flight['date_url'] = '%s_%s' % (
            english_to_persian_numbers(departure_date_jal.strftime("%d")),
            departure_date_jal.strftime("%B"),
            )
            this_flight['origin'] = {
                'city': origin['city_fa'] if origin['city_fa'] else origin['city'],
                'name': origin['name_fa'] if origin['name_fa'] else origin['name'],
                'iata_faa': origin['iata_faa'],
            }
            this_flight['dest'] = {
                'city': dest['city_fa'] if dest['city_fa'] else dest['city'],
                'name': dest['name_fa'] if dest['name_fa'] else dest['name'],
                'iata_faa': dest['iata_faa'],
            }
            with trans_override(culture_code):
                this_flight['url'] = reverse('flight_search_oneway_fa', kwargs={
                    'origin': this_flight['origin']['city'].replace('-', '_'),
                    'origin_iata': this_flight['origin']['iata_faa'].lower(),
                    'destination': this_flight['dest']['city'].replace('-', '_'),
                    'destination_iata': this_flight['dest']['iata_faa'].lower(),
                    'ticket_class': this_flight['ticket_class'].replace('-', '_'),
                    'date': this_flight['date_url'],
                })

        else:
            this_flight['date_url'] = departure_date.strftime("%B_%d")
            this_flight['origin'] = {
                'city': origin['city'],
                'name': origin['name'],
                'iata_faa': origin['iata_faa'],
            }
            this_flight['dest'] = {
                'city': dest['city'],
                'name': dest['name'],
                'iata_faa': dest['iata_faa'],
            }
            with trans_override(culture_code):
                this_flight['url'] = reverse('flight_search_oneway_en', kwargs={
                    'origin': this_flight['origin']['city'].replace('-', '_'),
                    'origin_iata': this_flight['origin']['iata_faa'].lower(),
                    'destination': this_flight['dest']['city'].replace('-', '_'),
                    'destination_iata': this_flight['dest']['iata_faa'].lower(),
                    'ticket_class': this_flight['ticket_class'].replace('-', '_'),
                    'date': this_flight['date_url'],
                })

        # Global
        this_flight['departure_date'] = departure_date.strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)
        this_flight['title'] = title_format % {
            'origin': this_flight['origin']['city'],
            'dest': this_flight['dest']['city'],
            'ticket_class': this_flight['ticket_class'],
            'date': this_flight['date_url'].replace('_', ' '),
            'price': '%s %s' % (this_flight['price'], this_flight['currency_code']),
        }
        flights.append(this_flight)

    return flights


# @cached(60 * 15)
def es_agg_offers_norm(max=0):
    """
    @STORAGE
    :param iata_faa:
    :param limit:
    :return:
    """
    # Departure date from 6 month ago till now
    departure_date = (datetime.datetime.now() - datetime.timedelta(days=31 * 6)) \
        .date().strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)

    s = _s.doc_type('TicketAll').extra(size=0)
    query = s.query(
        'filtered',
        query=Q(
            'bool',
            must=[
                Q('range', **{'price': {"gt": 10}}),
                Q('term', tour_reserve=False),
            ],
        ),
        filter=F(
            'nested', path='dates', query=F(
                'range', **{'dates.departure': {'gte': departure_date, }}
            ),
        ),
    )

    origin_buckets = query.aggs.bucket(
        'origins',
        'terms',
        field='origin',
        size=max,
        order={"_count": "desc"},
    )
    destination_buckets = origin_buckets.bucket(
        'destinations',
        'terms',
        field='destination',
        size=0,
        order={"_count": "desc"},
    )
    destination_buckets.bucket(
        'price_stats',
        'stats',
        field="price",
    )

    aggs = query.aggregations
    if 'origins' not in aggs:
        return
    result = aggs['origins']['buckets']
    # print json.dumps(query.to_dict())
    return result


# @cached(60 * 15)
def es_get_route_offers_with_norm(origin_iata, dest_iata, max_price, max_offers=20):
    s = _s.doc_type('TicketAll').extra(size=0)
    # Departure date
    departure_date_from = datetime.datetime.now().strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)
    departure_date_to = (datetime.datetime.now() + datetime.timedelta(days=60)) \
        .date().strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)

    if 3 < timezone.now().hour < 19:
        min_hours = 0.2
    else:
        min_hours = 8

    # Updated
    updated_min = (timezone.now() - datetime.timedelta(hours=min_hours)) \
        .strftime(settings.FLIGHT_DATE_FORMAT_ES_PY)

    query = s.query(
        'filtered',
        query=Q(
            'bool',
            must=[
                Q('term', origin=origin_iata),
                Q('term', destination=dest_iata),
                Q('range', **{'price': {"gt": 10, "lte": max_price}}),
                Q('term', status=Ticket.STATUS_ON_TIME),
                Q('term', tour_reserve=False),  # @DEBUG: // updated_min  # Q(  # 'range',  # 	**{'updated': {
                # 	"gte": updated_min,  # 	}}  # )  # @DEBUG: // updated_min
            ],
        ),  # @DEBUG
        filter=F(
            'nested', path='dates', query=F(
                'range', **{'dates.departure': {'gte': departure_date_from, 'lte': departure_date_to}}
            ),
        ),  # @DEBUG
    )

    query.aggs.bucket(
        'dates',
        'nested',
        path='dates',
    ).bucket(
        'dates_departure',
        'date_histogram',
        field='dates.departure',
        interval='day',
    ).bucket(
        'dates_to_ticket',
        'reverse_nested',
    ).bucket(
        'min_price_doc',
        'top_hits',
        sort=[{"price": {"order": "asc"}}, {"dates.departure": {"order": "asc"}}, {"updated": {"order": "desc"}}],
        _source={
        "include": [
            "origin",
            "destination",
            "price",
            "cabin",
            "dates",
            "segments",  # "segments",  # "flight_id",
            "round_trip_type",
            "currency_code",
            "django_id",
        ]
        },
        size=1,
    )

    aggs = query.aggregations
    if 'dates' not in aggs or 'dates_departure' not in aggs['dates']:
        return
    result = aggs['dates']['dates_departure']['buckets']
    # print json.dumps(query.to_dict())

    result = sorted(
        result,
        key=lambda hit: int(hit['dates_to_ticket']['min_price_doc']['hits']['hits'][0]['_source']['price'])
    )
    return result[:max_offers]


def route_offer_notification_format_offers(offers_agg, norm_price, filter_offers=True,
                                           culture_code=settings.LANGUAGE_CODE):
    offers = list()
    origin = None
    dest = None
    ticket_types = ticket_types_local(culture_code)
    with trans_override('fa'):
        flights_url_date_format_fa = get_format('DATE_FORMAT_URL')
    for offer in offers_agg:
        source = offer['dates_to_ticket']['min_price_doc']['hits']['hits'][0]['_source']
        cache_key = safe_cache_key(
            'route_offers',
            source['origin'],
            source['destination'],
            source['django_id'],
        )
        offer_recent_price = storage.get(cache_key, 0)
        departure_date_string = source['dates']['departure']
        departure_date = datetime.datetime.strptime(departure_date_string, settings.FLIGHT_DATE_FORMAT_ES_PY)

        if not filter_offers or not offer_recent_price or float(offer_recent_price) != float(source['price']):
            if not origin or not dest:
                origin = es_get_airport_from_kw(iata_faa=source['origin'])
                dest = es_get_airport_from_kw(iata_faa=source['destination'])

            if not origin:
                logger.error("Couldn't able to determine airport from IATA code: %s" % source['origin'])
                continue

            if not dest:
                logger.error("Couldn't able to determine airport from IATA code: %s" % source['destination'])
                continue
            departure_date_jal = khayyam.JalaliDate.from_date(departure_date)

            url_date_fa = flights_url_date_format_fa.format(
                year=departure_date_jal.year,
                month="%02d" % (departure_date_jal.month,),
                day="%02d" % (departure_date_jal.day,),
            )
            price_value = (float(norm_price) - float(source['price']))
            price_value = '%s %s' % (english_to_persian_numbers('{0:,}'.format(int(price_value) / 10)), u'تومان')

            price_drop = None
            price_up = None
            if offer_recent_price:
                price_diff = (float(offer_recent_price) - float(source['price']))
                if price_diff > 0:
                    price_drop = '%s %s' % (english_to_persian_numbers('{0:,}'.format(int(price_diff) / 10)), u'تومان')
                else:
                    price_up = '%s %s' % (
                    english_to_persian_numbers('{0:,}'.format(-1 * int(price_diff) / 10)), u'تومان')

            with trans_override('fa'):
                offers.append({
                    'departure': departure_date_string,
                    'origin': origin,
                    'dest': dest,
                    'ticket': {
                        'price': '%s %s' % (english_to_persian_numbers('{0:,}'.format(int(source['price'] / 10))), u'تومان'),
                        'departure': '%s %s' % (
                            english_to_persian_numbers(departure_date_jal.strftime("%d")),
                            departure_date_jal.strftime("%B"),
                        ),
                        'cabin': ticket_types[source['cabin']],
                        'id': 'T%s' % source['django_id'],
                    },
                    'price': {
                        'value': price_value,
                        'drop': price_drop,
                        'up': price_up,
                    },
                    'url': '%s%s' % ('http://lurak.ir', reverse('flight_search_oneway', kwargs={
                        'od_n0': '%s-%s' % (origin['iata_faa'], dest['iata_faa']),
                        'date_n0': '%s' % (url_date_fa),
                        'ticket_class': source['cabin'],
                        'options': '',
                    })),
                })

        expires = (departure_date - datetime.datetime.now()).total_seconds()
        storage.set(cache_key, float(source['price']), expires)
    return {'offers': offers, 'origin': origin, 'destination': dest}


