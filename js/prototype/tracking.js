/**
 * @file Tracking Flights
 * Tracking functionality for flights on flight list page.
 */
 ACTracking = new(Class.create({
    initialize: function() {},
    logUserFlightChoice: function(searchData, clickCount, view, resultPosition, flight, flights, supplierData, filterData) {
        var records = [],
            numberOfSegments = flight.Segments.length;
        for (var segmentIndex = 0; segmentIndex < numberOfSegments; segmentIndex++) {
            var searchSegment = searchData.Segments[segmentIndex];
            var flightSegment = flight.Segments[segmentIndex];
            var record = new SkyGate.Acquia.Logging.UserFlightChoiceRecord();
            record.ClickCount = clickCount;
            record.View = view;
            record.ResultPosition = resultPosition;
            record.Segments = numberOfSegments;
            record.Segment = segmentIndex;
            record.SearchedOrigin = searchSegment.Orig.Code;
            record.SearchedDestination = searchSegment.Dest.Code;
            record.SearchedDeparture = searchSegment.Depart;
            record.SearchedAdults = 1; // @UPGRADE
            record.SearchedChildren = 1;// @UPGRADE
            record.SearchedInfants = 1; // @UPGRADE
            record.Origin = flightSegment.Orig.Code;
            record.Destination = flightSegment.Dest.Code;
            record.Departure = new Date(flightSegment.Depart.valueOf() - flightSegment.Depart.getTimezoneOffset() * 60000);
            record.Arrival = new Date(flightSegment.Arrive.valueOf() - flightSegment.Arrive.getTimezoneOffset() * 60000);
            record.Stops = flightSegment.StopOvers;
            record.Airlines = flightSegment.airlineCodes.join();
            record.Airports = flightSegment.origCode + ',' + flightSegment.stopOverCodes.join() + (flightSegment.stopOverCodes.length > 0 ? ',' : '') + flightSegment.destCode;
            record.Duration = flightSegment.Duration;
            var flightDuration = 0,
                layoverDuration = 0;
            flightSegment.Legs.each(function(leg) {
                flightDuration += leg.Duration;
                layoverDuration += leg.Layover;
            });
            record.FlightDuration = flightDuration;
            record.LayoverDuration = layoverDuration;
            record.Price = flight.priceIRR;
            record.Supplier = flight.SupplierId;
            record.SupplierPosition = supplierData.position;
            record.SupplierPreferred = supplierData.isPreferred;
            record.SupplierCheapest = supplierData.cheapestId;
            record.SupplierCheapestPrice = supplierData.cheapestPrice;
            var minStops = Infinity,
                minDuration = Infinity,
                minFlightDuration = Infinity,
                minLayoverDuration = Infinity,
                minPrice = Infinity;
            flights.each(function(flight) {
                var segment = flight.Segments[segmentIndex],
                    flightDuration = 0,
                    layoverDuration = 0;
                segment.Legs.each(function(leg) {
                    flightDuration += leg.Duration;
                    layoverDuration += leg.Layover;
                });
                if (segment.StopOvers < minStops) minStops = segment.StopOvers;
                if (segment.Duration < minDuration) minDuration = segment.Duration;
                if (flightDuration < minFlightDuration) minFlightDuration = flightDuration;
                if (layoverDuration < minLayoverDuration) minLayoverDuration = layoverDuration;
                if (flight.priceIRR < minPrice) minPrice = flight.priceIRR;
            });
            record.MinStops = minStops;
            record.MinDuration = minDuration;
            record.MinFlightDuration = minFlightDuration;
            record.MinLayoverDuration = minLayoverDuration;
            record.MinPrice = minPrice;
            var segmentFilter = (filterData && filterData.segments) ? filterData.segments[segmentIndex] : null;
            record.FilterMaxStops = (segmentFilter && segmentFilter.stops) ? segmentFilter.stops.max : null;
            record.FilterMaxDuration = (filterData && filterData.duration) ? Math.round(filterData.duration.max) : null;
            record.FilterDepartureAfter = (segmentFilter && segmentFilter.depart) ? segmentFilter.depart.min : null;
            record.FilterDepartureBefore = (segmentFilter && segmentFilter.depart) ? (segmentFilter.depart.max + 1) : null;
            record.FilterArriveAfter = (segmentFilter && segmentFilter.arrive) ? segmentFilter.arrive.min : null;
            record.FilterArriveBefore = (segmentFilter && segmentFilter.arrive) ? (segmentFilter.arrive.max + 1) : null;
            record.FilterOriginAirports = (segmentFilter && segmentFilter.orig) ? segmentFilter.orig.join() : null;
            record.FilterDestinationAirports = (segmentFilter && segmentFilter.dest) ? segmentFilter.dest.join() : null;
            record.FilterViaAirports = (segmentFilter && segmentFilter.via) ? segmentFilter.via.join() : null;
            record.FilterAirlines = (filterData && filterData.airline) ? filterData.airline.join() : null;
            records[segmentIndex] = record;
        }
        ACTrackingWS.LogUserFlightChoice(records);
    },
    logUserOfferChoice: function(searchData, clickCount, view, resultPosition, offer, offers, supplierData, filterData) {
        var records = [],
            flight = offer.Flight,
            numberOfSegments = flight.Segments.length;
        for (var segmentIndex = 0; segmentIndex < numberOfSegments; segmentIndex++) {
            var searchSegment = searchData.Segments[segmentIndex];
            var flightSegment = flight.Segments[segmentIndex];
            var record = new SkyGate.Acquia.Logging.UserFlightChoiceRecord();
            record.ClickCount = clickCount;
            record.View = view;
            record.ResultPosition = resultPosition;
            record.Segments = numberOfSegments;
            record.Segment = segmentIndex;
            record.SearchedOrigin = searchSegment.Origin.Iata;
            record.SearchedDestination = searchSegment.Destination.Iata;
            record.SearchedDeparture = searchSegment.Departure;
            record.SearchedAdults = 1; // @UPGRADE
            record.SearchedChildren = 1;  // @UPGRADE
            record.SearchedInfants = 1;  // @UPGRADE
            record.Origin = flightSegment.Origin.Iata;
            record.Destination = flightSegment.Destination.Iata;
            record.Departure = new Date(flightSegment.Departure.valueOf() - flightSegment.Departure.getTimezoneOffset() * 60000);
            record.Arrival = new Date(flightSegment.Arrival.valueOf() - flightSegment.Arrival.getTimezoneOffset() * 60000);
            record.Stops = flightSegment.StopOvers;
            record.Airlines = flightSegment.AirlineCodes.join();
            record.Airports = flightSegment.Origin.Iata + ',' + flightSegment.StopOverCodes.join() + (flightSegment.StopOverCodes.length > 0 ? ',' : '') + flightSegment.Destination.Iata;
            record.Duration = flightSegment.Duration;
            var flightDuration = 0,
                layoverDuration = 0;
            var lastLeg = null;
            flightSegment.Legs.each(function(leg) {
                flightDuration += leg.Duration;
                layoverDuration = !!lastLeg ? (leg.Departure - lastLeg.Arrival) / 60000 : 0;
                lastLeg = leg;
            });
            record.FlightDuration = flightDuration;
            record.LayoverDuration = layoverDuration;
            record.Price = offer.TotalPriceIRR;
            record.Supplier = offer.Supplier.SupplierId;
            record.SupplierPosition = supplierData.position;
            record.SupplierPreferred = supplierData.isPreferred;
            record.SupplierCheapest = supplierData.cheapestId;
            record.SupplierCheapestPrice = supplierData.cheapestPrice;
            var minStops = Infinity,
                minDuration = Infinity,
                minFlightDuration = Infinity,
                minLayoverDuration = Infinity,
                minPrice = Infinity;
            offers.each(function(offer) {
                var flight = offer.Flight;
                var segment = flight.Segments[segmentIndex],
                    flightDuration = 0,
                    layoverDuration = 0;
                var lastLeg = null;
                segment.Legs.each(function(leg) {
                    flightDuration += leg.Duration;
                    layoverDuration = !!lastLeg ? (leg.Departure - lastLeg.Arrival) / 60000 : 0;
                    lastLeg = leg;
                });
                if (segment.StopOvers < minStops) minStops = segment.StopOvers;
                if (segment.Duration < minDuration) minDuration = segment.Duration;
                if (flightDuration < minFlightDuration) minFlightDuration = flightDuration;
                if (layoverDuration < minLayoverDuration) minLayoverDuration = layoverDuration;
                if (offer.TotalPriceIRR < minPrice) minPrice = offer.TotalPriceIRR;
            });
            record.MinStops = minStops;
            record.MinDuration = minDuration;
            record.MinFlightDuration = minFlightDuration;
            record.MinLayoverDuration = minLayoverDuration;
            record.MinPrice = minPrice;
            var segmentFilter = (filterData && filterData.segments) ? filterData.segments[segmentIndex] : null;
            record.FilterMaxStops = (segmentFilter && segmentFilter.stops) ? segmentFilter.stops.max : null;
            record.FilterMaxDuration = (filterData && filterData.duration) ? Math.round(filterData.duration.max) : null;
            record.FilterDepartureAfter = (segmentFilter && segmentFilter.depart) ? segmentFilter.depart.min : null;
            record.FilterDepartureBefore = (segmentFilter && segmentFilter.depart) ? (segmentFilter.depart.max + 1) : null;
            record.FilterArriveAfter = (segmentFilter && segmentFilter.arrive) ? segmentFilter.arrive.min : null;
            record.FilterArriveBefore = (segmentFilter && segmentFilter.arrive) ? (segmentFilter.arrive.max + 1) : null;
            record.FilterOriginAirports = (segmentFilter && segmentFilter.orig) ? segmentFilter.orig.join() : null;
            record.FilterDestinationAirports = (segmentFilter && segmentFilter.dest) ? segmentFilter.dest.join() : null;
            record.FilterViaAirports = (segmentFilter && segmentFilter.via) ? segmentFilter.via.join() : null;
            record.FilterAirlines = (filterData && filterData.airline) ? filterData.airline.join() : null;
            records[segmentIndex] = record;
        }
        ACTrackingWS.LogUserFlightChoice(records);
    },
    logOffer: function(searchId, offer) {
        var offerEntity = ACTracking.convertOfferToEntity(offer);
        ACTrackingWS.LogOffer(searchId, offerEntity);
    },
    logMix: function(searchId, parentMix, offers) {
        var mixEntity = new Object();
        mixEntity.Index = parentMix.Index;
        mixEntity.Offers = [];
        for (var i = 0; i < offers.length; i++) {
            mixEntity.Offers[i] = ACTracking.convertOfferToEntity(offers[i]);
        }
        ACTrackingWS.LogMix(searchId, mixEntity);
    },
    convertOfferToEntity: function(offer) {
        var offerEntity = new Object(),
            segmentEntity, legEntity, segment, leg, numberOfSegments = offer.Flight.Segments.length,
            numberOfLegs = offer.Flight.Segments.length,
            segmentIndex, legIndex;
        offerEntity.Index = offer.debug.Index;
        offerEntity.IsCheapest = false;
        offerEntity.IsFastest = false;
        offerEntity.IsNearbyAlternative = false;
        offerEntity.Supplier_Id = offer.Supplier.SupplierId;
        offerEntity.Segments = [];
        for (segmentIndex = 0; segmentIndex < numberOfSegments; segmentIndex++) {
            segment = offer.Flight.Segments[segmentIndex];
            segmentEntity = new Object();
            segmentEntity.Index = segmentIndex;
            segmentEntity.Origin = segment.Origin.Iata;
            segmentEntity.Destination = segment.Destination.Iata;
            segmentEntity.Departure = new Date(segment.Departure.valueOf() - segment.Departure.getTimezoneOffset() * 60000);
            segmentEntity.Arrival = new Date(segment.Arrival.valueOf() - segment.Arrival.getTimezoneOffset() * 60000);
            segmentEntity.Duration = segment.Duration;
            segmentEntity.Stops = segment.StopOvers;
            segmentEntity.FareIRR = offer.TotalPriceIRR / numberOfSegments;
            segmentEntity.IsBound = true;
            segmentEntity.Legs = [];
            numberOfLegs = segment.Legs.length;
            for (legIndex = 0; legIndex < numberOfLegs; legIndex++) {
                leg = segment.Legs[legIndex];
                legEntity = new Object();
                legEntity.Index = legIndex;
                legEntity.Origin = leg.Origin.Iata;
                legEntity.Destination = leg.Destination.Iata;
                legEntity.Departure = new Date(leg.Departure.valueOf() - leg.Departure.getTimezoneOffset() * 60000);
                legEntity.Arrival = new Date(leg.Arrival.valueOf() - leg.Arrival.getTimezoneOffset() * 60000);
                legEntity.Duration = leg.Duration;
                legEntity.Airline = leg.Airline.Iata;
                segmentEntity.Legs[legIndex] = legEntity;
            }
            offerEntity.Segments[segmentIndex] = segmentEntity;
        }
        return offerEntity;
    }
}));
