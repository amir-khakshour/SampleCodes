# -*- coding: utf-8 -*-
import logging

from django.conf import settings
from django.utils.formats import get_format
from django.utils.translation import override as trans_override

from sanjab.elasticsearch import Search, Q, F
from libs.cache import cached


_s = Search()
logger = logging.getLogger('ticketparser')


def localize_es_airport(airport, short=False, culture_code=settings.LANGUAGE_CODE):
    """
     {airport} ({iata}), {city}, {country}
    :param airport:
    :param lang:
    :return:
    """
    with trans_override(culture_code):
        geo_locate_format = get_format('FLIGHT_GEOLOCATE_FORMAT')

    if culture_code == 'fa':
        format_data = {
            'airport': airport['name_fa'] or airport['name'],
            'iata': airport['iata_faa'],
            'city': airport['city_fa'] or airport['city'],
            'country': airport['country_fa'] or airport['country'],
        }
    else:
        format_data = {
            'airport': airport['name'],
            'iata': airport['iata_faa'],
            'city': airport['city'],
            'country': airport['country'],
        }
    if short:
        return format_data['city']
    return geo_locate_format.decode('utf8').format(**format_data)


def es_get_airport_from_query(_query, max=settings.FLIGHT_AJAX_COMPLETER_MAX):
    """
    @NO_CACHE
    :param _query:
    :return:
    """
    s = _s.doc_type('AirportAll')
    query_bool_should = list()
    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.5,
            query=Q(
                'term',
                iata_faa=_query
            )
        )
    )
    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.3,
            query=Q(
                'term',
                main_city_code=_query
            )
        )
    )

    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.4,
            query=Q(
                'term',
                city_fa=_query
            )
        )
    )
    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.3,
            query=Q(
                'term',
                city=_query
            )
        )
    )

    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.2,
            query=Q(
                'term',
                country_fa=_query
            )
        )
    )
    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.1,
            query=Q(
                'term',
                country=_query
            )
        )
    )
    # query_bool_should.append(
    # Q(
    # 		'constant_score',
    # 		boost=1.5,
    # 		query=Q(
    # 			'term',
    # 			airport_type=1
    # 		)
    # 	)
    # )

    query_bool_should.append(
        Q(
            'query_string',
            query="text:(%s)" % _query,
        )
    )

    query = s.query(
        "bool",
        should=query_bool_should,
        minimum_should_match=1,
    )
    return query[:max]


@cached(60 * 60 * 24 * 30)
def es_get_airport_from_kw(**kwargs):
    query = _s.doc_type('AirportAll').query("match", **kwargs)
    output = None
    if query:
        output = query[0]
    else:
        logger.error("Fleeo:Flight:utils:airport.py : Could't find airport matching given KWargs: %s" % kwargs)

    return output


DEFAULT_AIRPORT = es_get_airport_from_kw(iata_faa=settings.DEFAULT_USER_AIRPORT)


@cached(60 * 60 * 24 * 30)
def es_get_neareset_airport_from_city(city, exact=True, culture_code=settings.LANGUAGE_CODE,
                                      max=settings.FLIGHT_AJAX_COMPLETER_MAX):
    """
    @NO_CACHE
    :param _query:
    :return:
    """
    s = _s.doc_type('CityAll')
    if exact:
        if culture_code == 'fa':
            query_str = "name_fa:(%s)" % city
        else:
            query_str = "name:(%s)" % city
        query = s.query("query_string", query=query_str)
    else:
        query = s.query("query_string", query="text:(%s)" % city)

    # print json.dumps(query.to_dict())
    result = query.get_results(end=1)
    if result:
        result = result.pop()
    else:
        return []
    location = result['location'].split(',')
    if len(location) < 2:
        return
    return es_get_nearest_airport_from_location(location, result['country_id'], max)


@cached(60 * 60 * 24 * 30)
def es_get_nearest_airport_from_location(location, country_id, max_count=settings.FLIGHT_AJAX_COMPLETER_MAX):
    """
    Find nearest airport by iata code
    :param iata: IATA or FAA code of target airport
    :return: Array of airports near to
    """
    output = list()
    if len(location) < 2:
        return output

    s = _s.doc_type('AirportAll')

    s = s.sort({
        "_geo_distance": {
            "location": {"lat": location[0], "lon": location[1]},
            "order": "asc",
            "unit": "km",
            "distance_type": "plane"
        }
    })

    query = s.query(
        'term', country_id=country_id
    ).filter(
        'geo_distance',
        _cache="true",
        distance='150km',
        location={"lat": location[0], "lon": location[1]},
    )

    if query:
        for airport in query[:max_count]:
            output.append(airport)
    return output


@cached(60 * 60 * 24 * 30)
def es_get_airport_from_location(country, city=None, count=1):
    s = _s.doc_type('AirportAll')
    query_bool_should = list()
    if city:
        query_bool_should.append(
            Q(
                'constant_score',
                boost=1.3,
                query=Q(
                    'query_string',
                    query="city:(%s)" % city
                )
            )
        )

    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.3,
            query=Q(
                'query_string',
                query="text:(%s)" % country
            )
        )
    )

    query_bool_should.append(
        Q(
            'constant_score',
            boost=1.2,
            query=Q(
                'term',
                airport_type=1
            )
        )
    )

    query = s.query(
        "bool",
        should=query_bool_should,
        minimum_should_match=1,
    )
    if not query:
        return list()
    else:
        return query[:count]


@cached(60 * 60 * 24 * 30)
def nearest_airport_from_query(_query, culture_code=settings.LANGUAGE_CODE, max=settings.FLIGHT_AJAX_COMPLETER_MAX):
    results = es_get_airport_from_query(_query, max)
    nearest_airport = False
    if not results:
        nearest_airport = True
        results = es_get_neareset_airport_from_city(_query, False, culture_code, max)
    return results


@cached(60 * 60 * 24 * 30)
def formatted_airport_from_query(culture_code=settings.LANGUAGE_CODE, _query=None):
    results = nearest_airport_from_query(_query, culture_code)
    countries = list()
    for r in results:
        if r['country_id'] not in countries:
            countries.append(r['country_id'])

    grouped_by_countries = list()
    for c_id in countries:
        _current_country_results = []
        main_city_code = None
        for result in results:
            if c_id == result['country_id']:
                if result['airport_type'] == 1:
                    main_city_code = result['main_city_code']
                    _current_country_results.insert(0, result)
                elif main_city_code == result['main_city_code']:
                    _current_country_results.insert(1, result)
                else:
                    _current_country_results.append(result)
        grouped_by_countries.extend(_current_country_results)

    output = list()
    for airport in grouped_by_countries:
        output.append(ui_formatted_airport(airport=airport, culture_code=culture_code))
    return output


@cached(60 * 60 * 24 * 30)
def nearest_airport_to_airport_from_kw(**kwargs):
    """
    Find nearest airport by iata code
    :param iata: IATA or FAA code of target airport
    :return: Array of airports near to
    """
    airport = es_get_airport_from_kw(**kwargs)
    if not airport:
        return

    location = airport['location'].split(',')
    if len(location) < 2:
        return

    return es_get_nearest_airport_from_location(location, airport['country_id'])


@cached(60 * 60 * 24 * 30)
def formatted_airport_from_kw(culture_code=settings.LANGUAGE_CODE, **kwargs):
    # @TODO define a locale decorator to remove locale from KWargs
    airport = es_get_airport_from_kw(**kwargs)
    if not airport:
        return {}

    return ui_formatted_airport(airport, culture_code)


def ui_formatted_airport(airport, culture_code=settings.LANGUAGE_CODE):
    if airport['location']:
        lat, lon = airport['location'].split(',')
    else:
        lat, lon = list(None, None)

    output = {
        'Aliases': None,
        'Iata': airport['iata_faa'],
        'Icao': airport['icao'],
        'ContinentCode': airport['continent_code'],
        'CountryCode': airport['country_code'],
        'Latitude': lat,
        'Longitude': lon,
        'MainCityCode': airport['main_city_code'] if airport['main_city_code'] else '',
        'TimeZone': airport['timezone'],
        'Type': airport['airport_type'],
    }
    if culture_code == 'fa':  # @UPGRADE
        output.update({
            'CountryName': airport['country_fa'] if airport['country_fa'] else airport['country'],
            'MainCityName': airport['city_fa'] if airport['city_fa'] else airport['city'],
            'Name': airport['name_fa'] if airport['name_fa'] else airport['name'],
            'StateName': airport['region_fa'] if airport['region_fa'] else airport['region'],
        })
    else:
        output.update({
            'CountryName': airport['country'],
            'MainCityName': airport['city'],
            'Name': airport['name'],
            'StateName': airport['region'],
        })
    return output
