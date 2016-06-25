/**
 *  Search form for flights  - when flight tab selected
 */
var SearchForm;
(function(SearchForm) {
    'use strict';
    (function(TripType) {
        TripType[TripType["ONEWAY"] = 'o'] = "ONEWAY";
        TripType[TripType["RETURN"] = 'r'] = "RETURN";
        TripType[TripType["MULTI"] = 'm'] = "MULTI";
    })(SearchForm.TripType || (SearchForm.TripType = {}));
    var TripType = SearchForm.TripType;
    (function(AirportType) {
        AirportType[AirportType["UNSPECIFIED"] = -1] = "UNSPECIFIED";
        AirportType[AirportType["MAINCITY"] = 0] = "MAINCITY";
        AirportType[AirportType["AIRPORT"] = 1] = "AIRPORT";
    })(SearchForm.AirportType || (SearchForm.AirportType = {}));
    var AirportType = SearchForm.AirportType;
    /**
     * initiating Flight form
     *
     * @param dict {model} dict of current model data from backend
     * @param jquery node {element} jQuery('.main-flight-search')
     * @param object {dataService} an instance of utils.service.FlightService
     * @see SearchForm.prototype.initForms()
     */
    var SearchFormFlight = (function() {
        function SearchFormFlight(name, element, factory, dataService, init, model, currencyCode, getSearchIntent) {
            this.name = name;
            this.element = element;
            this.factory = factory;
            this.dataService = dataService;
            this.init = init;
            this.model = model;
            this.currencyCode = currencyCode;
            this.getSearchIntent = getSearchIntent;
            this.maxSegmentCount = 4;
            this.UIValid = true;
            this.watermarkOrigin = Language['SearchForm.Flight.Watermark.Origin'];
            this.watermarkDestination = Language['SearchForm.Flight.Watermark.Destination'];
            this.__init__();
        }

        SearchFormFlight.prototype.__init__ = function() {
            this.tripType = this.getTripType();
            this.sanitizeModelDates();
            this.model.SegmentsMulti = this.cloneSegments(this.model.Segments);
            this.model.Segments.length = Math.min(this.model.Segments.length, 2);
            this.searchType = this.model.SearchType;
        };

        /**
         * Create a copy of model segments
         *  change the segment date string to Date object for further processing
         */
        SearchFormFlight.prototype.cloneSegments = function(segments) {
            var copy = JSON.parse(JSON.stringify(segments));
            for (var i = 0, len = copy.length; i < len; i++) {
                copy[i].Depart = new Date(segments[i].Depart);
            }
            return copy;
        };
        /**
         * Sanitize Model Dates
         *
         *  For each segment check if segment Depart date which is a string Date
         *  is compatible with our configured date type:
         *  /^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{1,2}:\d{1,2}/
         *  if it's not replace it with the current date object.
         */
        SearchFormFlight.prototype.sanitizeModelDates = function() {
            var re = /^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{1,2}:\d{1,2}/;
            var model = this.model;
            var segments = model.Segments;
            for (var i = 0, len = segments.length; i < len; i++) {
                var segment = segments[i];
                var match = re.exec(segment.Depart);
                if (match && match.length)
                    segment.Depart = Date.fromISO(match[0]);
                else
                    segment.Depart = new Date();
            }
        };
        /**
         * Set trip type - based on constant keys
         */
        SearchFormFlight.prototype.setTripType = function(tripType, userTriggered) {
            switch (tripType) {
                case 'o':
                    var calendarReturn = this.segmentRowRoundTrip.controls['return-date'];
                    calendarReturn.setCleared(true);
                    break;
                case 'r':
                    var model = this.model;
                    var segments = model.Segments;
                    var segmentHomeBound = segments[1];
                    if (!segmentHomeBound) {
                        segmentHomeBound = this.cloneSegments([segments[0]])[0];
                    }
                    var calendarReturn = this.segmentRowRoundTrip.controls['return-date'];
                    var controlReturnDate = calendarReturn.getDate();
                    var returnDate = segmentHomeBound.Depart;
                    segmentHomeBound.Destination = segments[0].Origin;
                    segmentHomeBound.Origin = segments[0].Destination;
                    calendarReturn.setCleared(false, returnDate);
                    if (+controlReturnDate !== +returnDate)
                        calendarReturn.setDate(returnDate);
                    break;
                case 'm':
                    break;
            }
            this.selectTripType.setValue(tripType + '');
            this.tripType = tripType;
            if (userTriggered)
                this.tripTypeChanged(tripType, userTriggered);
        };

        /**
         * Init form - called from SearchForm.prototype.__init__
         *  this will be called after __init__
         */
        SearchFormFlight.prototype.initForm = function() {
            var _this = this;
            var that = this;
            var element = this.element;
            var model = this.model;
            var segments = model.Segments;
            var ticketClass = model.TicketClass;
            var includeNearby = model.IncludeNearby;
            var directOnly = model.DirectOnly;
            var factory = this.factory;
            var dataService = this.dataService;
            var element = this.element;
            var getCheckedChangedHandler = function(func) {
                return function(ev) {
                    var checked = jQuery(ev.target).prop('checked');
                    func.call(null, checked);
                };
            };
            // Check Direct
            // @CHANGE
            var chkDirect = this.chkDirect = element.find('input#chk_direct');
            chkDirect.prop('checked', directOnly ? 'checked' : null);
            chkDirect.change(getCheckedChangedHandler(function(checked) {
                model.DirectOnly = checked;
                _this.formChanged('direct-only', checked);
            }));
            // Check Nearby
            // @CHANGE
            var chkNearby = this.chkNearby = element.find('input#chk_nearby');
            chkNearby.prop('checked', (includeNearby ? 'checked' : null));
            chkNearby.change(getCheckedChangedHandler(function(checked) {
                model.IncludeNearby = checked;
                _this.formChanged('include-nearby', checked);
            }));

            // Select trip type
            // @CHANGE
            var selectTripType = element.find('#flight-triptype');
            selectTripType.val(this.tripType);
            this.selectTripType = factory.CreateSelectBox(selectTripType, true, function(value) {
                _this.setTripType(TripType[TripType[value]], true);
            });

            // Select Ticket Class
            var selectTicketClass = element.find('#flights-ticketclass');
            selectTicketClass.val(ticketClass);
            this.selectTicketClass = factory.CreateSelectBox(selectTicketClass, false, function(ticketClass) {
                model.TicketClass = ticketClass;
                _this.formChanged('ticket-class', ticketClass);
            });

            // init base segment
            this.initSegmentsRoundTrip();

            // init sub segments
            this.initSegmentsMulti();

            this.parentSearchBox = this.element.parents('.ac-searchbox-wrapper');
            this.initForm = function() {
                _this.setFormScope();
                if (!_this.getValid()) {
                    _this.updateUI();
                }
            };


            this.element.find('.ac-on-init-remove').remove();
            this.setFormScope();
        };
        /**
         * @TODO comment this method
         */
        SearchFormFlight.prototype.updateUI = function() {
            var tripType = this.tripType;
            var model = this.model;
            var segments;
            switch (tripType) {
                case 4:
                    segments = model.SegmentsMulti;
                    var segmentRowsMulti = this.segmentRowsMulti;
                    for (var i = 0, len = segments.length; i < len; i++) {
                        segmentRowsMulti[i].controls['depart-date'].setDate(segments[i].Depart);
                    }
                    break;
                default:
                    segments = model.Segments;
                    var segmentRowRoundTrip = this.segmentRowRoundTrip;
                    segmentRowRoundTrip.controls['depart-date'].setDate(segments[0].Depart);
                    if (this.tripType === 2)
                        segmentRowRoundTrip.controls['return-date'].setDate(segments[1].Depart);
                    break;
            }
            this.setValid(true);
        };

        /**
         * init base segment row - segmentRowRoundTrip
         */
        SearchFormFlight.prototype.initSegmentsRoundTrip = function() {
            var _this = this;
            var model = this.model;
            var segments = model.Segments;
            var element = this.element;
            var factory = this.factory;
            var dataService = this.dataService;
            var segmentRowRoundTrip = element.find('.form-items.base-segment');
            var t = this;
            var segmentOut = segments[0];
            //
            var segmentHome = segments[1];
            // for round trip flights we also need home segment
            // if we got no home segment, clone the out segment and substitute its origin and destination.
            if (!segmentHome) {
                segmentHome = this.cloneSegments([segmentOut])[0];
                var origin = segmentHome.Origin;
                segmentHome.Origin = segmentHome.Destination;
                segmentHome.Destination = origin;
                segments[1] = segmentHome;
            }

            this.segmentRowRoundTrip = this.initSegmentRow(segmentOut, segmentRowRoundTrip, segmentHome);
            $ev.observe('control:flight-searchform-changed', function(options) {
                if (_this.getSearchIntent())
                    return;
                var key = options.key;
                if (key === 'segment') {
                    var value = options.value || {};
                    var index = value.index;
                    var rowControls;
                    var isMulti = _this.tripType === 'm';
                    if (isMulti)
                        rowControls = _this.segmentRowsMulti[index].controls;
                    else
                        rowControls = _this.segmentRowRoundTrip.controls;
                    switch (value.part) {
                        case 'origin':
                            rowControls['destination'].focus();
                            break;
                        case 'destination':
                            var ev = value.ev || {};
                            if (ev.shiftKey)
                                rowControls['origin'].focus();
                            else
                                rowControls['depart-date'].open();
                            break;
                        case 'depart':
                            if (_this.tripType === 'r' && index === 0)
                                rowControls['return-date'].open();
                            else if (_this.tripType === 'm') {
                                var segRow = _this.segmentRowsMulti[index + 1];
                                if (!!segRow)
                                    segRow.controls['origin'].focus();
                            }
                            break;
                    }
                }
            }, this, false);
        };

        /**
         * Called when form inputs changes
         * @param key
         * @param value
         */
        SearchFormFlight.prototype.formChanged = function(key, value) {
            $ev.fire('control:flight-searchform-changed', {
                key: key,
                value: value
            });
        };

        /**
         * called when trip type changes
         * @see SearchFormFlight.prototype.setTripType
         */
        SearchFormFlight.prototype.tripTypeChanged = function(tripType, userTriggered) {
            this.setFormScope();
            if (userTriggered)
                this.formChanged('triptype', tripType);
        };

        /**
         * called when a segment changes
         *
         * @param int {segmentIndex} index of segment row
         * @param string {part} origin or destination
         * @param dict {value} segment value
         * @param bool {isMulti} whether given segment is in multiple-trip type segments or not
         * @param bool {triggeredByUser} triggeredByUser
         * @param object {ev} event triggered this change
         * @see SearchFormFlight.prototype.initSegmentRow
         */
        SearchFormFlight.prototype.segmentChanged = function(segmentIndex, part, value, isMulti, triggeredByUser, ev) {
            var segments = isMulti ? this.model.SegmentsMulti : this.model.Segments,
                segment = segments[segmentIndex];
            switch (part) {
                case 'origin':
                    segment.Origin = value.Iata;
                    break;
                case 'destination':
                    segment.Destination = value.Iata;
                    break;
                case 'depart':
                    segment.Depart = value;
                    break;
            }
            if (triggeredByUser) {
                if (isMulti)
                    this.checkDatesMulti(segmentIndex);
                else {
                    this.checkDatesRoundTrip(segmentIndex);
                }
                this.formChanged('segment', {
                    part: part,
                    index: segmentIndex,
                    segment: segment,
                    ev: ev
                });
            }
        };

        /**
         * Check Round trip dates
         */
        SearchFormFlight.prototype.checkDatesRoundTrip = function(srcIndex) {
            var segments = this.model.Segments;
            if (+segments[1].Depart < +segments[0].Depart) {
                if (srcIndex === 0) {
                    segments[1].Depart = new Date(segments[0].Depart + "");
                    this.segmentRowRoundTrip.controls['return-date'].setDate(segments[1].Depart, this.tripType === 'r');
                } else {
                    segments[0].Depart = new Date(segments[1].Depart + "");
                    this.segmentRowRoundTrip.controls['depart-date'].setDate(segments[0].Depart);
                }
            }
        };

        /**
         * Check multi trip dates
         */
        SearchFormFlight.prototype.checkDatesMulti = function(srcIndex) {
            var model = this.model;
            var segments = model.SegmentsMulti;
            var segmentRowsMulti = this.segmentRowsMulti;
            var d = Date,
                today = (new Date()).getDateOnly(),
                dates = segments.map(function(s) {
                    return s.Depart;
                }),
                d1 = dates[0],
                d2, changed = false;
            if (d1 < today) {
                d1 = today;
                segmentRowsMulti[0].controls['depart-date'].setDate(d1);
                changed = true;
            }
            if (dates.length > 1) {
                for (var i = 0, len = dates.length; i < len; i++) {
                    d2 = dates[i + 1];
                    if (d2) {
                        if (d1 > d2) {
                            changed = true;
                            var index = srcIndex == i ? i + 1 : i;
                            var date = (srcIndex === i ? d1 : d2);
                            segments[index].Depart = date;
                            segmentRowsMulti[index].controls['depart-date'].setDate(date);
                            this.checkDatesMulti(index);
                            break;
                        }
                    } else
                        break;
                    d1 = d2;
                }
            }
            return changed;
        };

        /**
         * Resolve Index number of given Segment
         */
        SearchFormFlight.prototype.resolveSegmentIndex = function(element) {
            var index = -1;
            switch (this.tripType) {
                case 'm':
                    var row = element.closest('.sub-segment').first();
                    index = this.element.find('.segment').index(row) -1;
                    break;
                default:
                    return 0;
                    break;
            }
            return index;
        };

        /**
         * Init one row of flight. e.g. base segment
         */
        SearchFormFlight.prototype.initSegmentRow = function(segment, row, segmentHome) {
            var _this = this;
            if (segmentHome === void 0) {
                segmentHome = null;
            }
            var isMulti = !segmentHome;
            var factory = this.factory;
            var dataService = this.dataService;
            var originCode = segment.Origin;
            var destinationCode = segment.Destination;
            var departDate = segment.Depart;
            var inputOrigin = row.find('.form-item_origin input');
            var inputDestination = row.find('.form-item_destination input');
            var inputDepart = row.find('.form-item_departure input').attr('id', '');
            var buttonSwapAirports = row.find('.ac-swap-route');
            var removeButton = row.find('.remove-trip');
            var rowControls = {};
            removeButton.on('click', function() {
                _this.removeMultiSegment(row);
            });
            // Create geolocate for origin
            rowControls['origin'] = factory.CreateCompleter(inputOrigin, "flights", dataService, Language["SearchForm.Flight.Watermark.Origin"], this.formatCityName, this.getCompleterItemFormatter(), null, function(ui, options) {
                var item = options.item;
                var target = ui.target;
                var index = _this.resolveSegmentIndex(row);
                _this.segmentChanged(index, 'origin', item, isMulti, true, ui);
                if (!!segmentHome)
                    _this.segmentChanged(1, 'destination', item, false, false, ui);
            });

            // Create geolocate for destination
            rowControls['destination'] = factory.CreateCompleter(inputDestination, "flights", dataService, Language["SearchForm.Flight.Watermark.Destination"], this.formatCityName, this.getCompleterItemFormatter(), null, function(ui, options) {
                var item = options.item;
                var target = ui.target;
                var index = _this.resolveSegmentIndex(row);
                _this.segmentChanged(index, 'destination', item, isMulti, true, ui);
                if (!!segmentHome)
                    _this.segmentChanged(1, 'origin', item, false, false, ui);
                $ev.fire('control:flight-searchform-destination-changed', {
                    key: options
                });
            });

            // Create Calendar for departure date
            var calendarDepart = rowControls['depart-date'] = this.factory.CreateCalendar(inputDepart, {
                minDate: new Date(),
                firstDay: 1,
                date: departDate,
                onSelect: function(ui, data) {
                    var target = ui.target;
                    var index = _this.resolveSegmentIndex(row);
                    // global dates
                    var day = data.g_selectedDay;
                    var month = data.g_selectedMonth;
                    var year = data.g_selectedYear;
                    var date = new Date(year, month, day);
                    _this.segmentChanged(index, 'depart', date, isMulti, true, ui);
                    ui.target.blur();
                },

                getHighlightDates: function() {
                    var dates = {};
                    switch (_this.tripType) {
                        case 'r':
                            dates[+_this.model.Segments[1].Depart] = {
                                'class': 'ui-datepicker-return',
                                text: 'Return date'
                            };
                            break;
                        case 'm':
                            break;
                    }
                    return dates;
                }
            });

            if (_this.localDateClass == null) {
                var datepicker_el = rowControls['depart-date'].calendar;
            }

            // Create Calendar for return date if we
            if (!!segmentHome) {
                var returnDate = segmentHome.Depart;
                var inputReturn = row.find('.form-item_return input');
                var calendarReturn = rowControls['return-date'] = this.factory.CreateCalendar(inputReturn, {
                    minDate: new Date(),
                    firstDay: 1,
                    date: returnDate,
                    onSelect: function(ui, data) {
                        var target = ui.target;
                        var day = data.g_selectedDay;
                        var month = data.g_selectedMonth;
                        var year = data.g_selectedYear;
                        var date = new Date(year, month, day, 0, 0, 0, 0);
                        if (_this.tripType === 'o') {
                            _this.model.Segments[1].Depart = date;
                            _this.setTripType('r', false);
                        }
                        $ev.fire("control:searchform-return-datechanged", {
                            newDate: date
                        });
                        _this.segmentChanged(1, 'depart', date, isMulti, true, ui);
                        ui.target.blur();
                    },
                    clearable: true,
                    onClear: function() {
                        _this.setTripType('o', true);
                    },
                    getHighlightDates: function() {
                        var dates = {};
                        dates[+_this.model.Segments[0].Depart] = {
                            'class': 'ui-datepicker-depart',
                            text: gettext('Departure date')
                        };
                        return dates;
                    }
                });
                if (this.tripType === 'o')
                    calendarReturn.setCleared(true);
            }
            buttonSwapAirports.on('click', function(ev) {
                var target = jQuery(ev.target);
                var index = _this.resolveSegmentIndex(jQuery(target));
                _this.swapAirports(index);
            });
            return {
                origin: originCode,
                destination: destinationCode,
                depart: departDate,
                element: row,
                controls: rowControls
            };
        };
        SearchFormFlight.prototype.doSwap = function(segment, segmentRow) {
            if (segmentRow === void 0) {
                segmentRow = null;
            }
            var origin = segment.Origin;
            var destination = segment.Destination;
            if (!origin || !destination)
                return;
            segment.Destination = origin;
            segment.Origin = destination;
            if (!!segmentRow) {
                var completerOrigin = segmentRow.controls['origin'];
                var completerDestination = segmentRow.controls['destination'];
                var valueOrigin = completerOrigin.getText();
                var valueDestination = completerDestination.getText();
                completerOrigin.setText(valueDestination);
                completerDestination.setText(valueOrigin);
            }
            return this;
        };
        SearchFormFlight.prototype.swapAirports = function(index) {
            switch (this.tripType) {
                case 'm':
                    this.doSwap(this.model.SegmentsMulti[index], this.segmentRowsMulti[index]);
                    break;
                default:
                    this.doSwap(this.model.Segments[0], this.segmentRowRoundTrip);
                    this.doSwap(this.model.Segments[1], null);
                    break;
            }
            this.formChanged('segment', {
                part: 'airport-swap',
                index: index
            });
        };

        /**
         * Init Sub-Segments
         *
         */
        SearchFormFlight.prototype.initSegmentsMulti = function() {
            var model = this.model;
            var segments = model.SegmentsMulti;
            var segmentDOMRows = [];
            var segRows = this.element.find('.form-items.sub-segment');
            var rowTemplate = this.rowTemplate = segRows.first().clone();
            rowTemplate.find('.remove-trip').addClass('ac-enabled');
            for (var i = 0, len = segments.length; i < len; i++) {
                var segment = segments[i];
                var origin = segment.Origin;
                var destination = segment.Destination;
                var depart = segment.Depart;
                var segRow = segRows.eq(i);
                if (!segRow)
                    segRow = this.createSegmentRow();
                if (!!i) {
                    var removeTrip = segRow.find('.remove-trip');
                    removeTrip.addClass('ac-enabled');
                }
                // no home segment for multisegment trips
                segmentDOMRows.push(this.initSegmentRow(segment, segRow, null));
            }
            this.segmentRowsMulti = segmentDOMRows;
            this.element.find('.new-segment').on('click', this.addMultiSegment.bind(this));
        };

        /**
         * Add a new segment row in  Multi - destination mode
         */
        SearchFormFlight.prototype.addMultiSegment = function(triggerFormScopeChange) {
            if (triggerFormScopeChange === void 0) {
                triggerFormScopeChange = true;
            }
            var model = this.model;
            var segments = model.SegmentsMulti;
            var segmentCount = segments.length;
            if (segmentCount >= this.maxSegmentCount)
                return;
            var lastSegment = segments[segmentCount - 1];
            var rows = this.segmentRowsMulti;
            var lastRow = rows[segmentCount - 1];
            var lastElement = jQuery(lastRow.element);
            var newSegment = jQuery.extend({}, lastSegment);
            var tmp = newSegment.Origin
            newSegment.Origin = newSegment.Destination;
            newSegment.Destination = tmp;
            var newRow = this.rowTemplate.clone();
            var newOriginText = lastElement.find('.form-item_origin input').val();
            var newDestText = lastElement.find('.form-item_destination input').val();
            newOriginText = newOriginText !== this.watermarkDestination ? newOriginText : this.watermarkOrigin;
            newDestText = newDestText !== this.watermarkDestination ? newDestText : this.watermarkOrigin;
            newRow.find('.form-item_origin input').val(newOriginText);
            newRow.find('.form-item_destination input').val(this.watermarkDestination);
            rows.push(this.initSegmentRow(newSegment, newRow));
            newRow.find('.ac-on-init-remove').remove();
            newRow.insertAfter(lastElement);
            segments.push(newSegment);
            if (triggerFormScopeChange)
                this.setFormScope();
        };

        /**
         * Remove Multi-Segment rows
         */
        SearchFormFlight.prototype.removeMultiSegment = function(row, triggerFormScopeChange) {
            if (triggerFormScopeChange === void 0) {
                triggerFormScopeChange = true;
            }
            var index = this.element.find('.sub-segment').index(row);
            var model = this.model;
            var segments = model.SegmentsMulti;
            var rows = this.segmentRowsMulti;
            segments.splice(index, 1);
            rows.splice(index, 1);
            row.remove();
            if (triggerFormScopeChange)
                this.setFormScope();
        };
        SearchFormFlight.prototype.createSegmentRow = function() {
            var domelement = null;
            return domelement;
        };

        /**
         * Set form wrapper classes by form scope
         */
        SearchFormFlight.prototype.setFormScope = function() {
            var tripType = this.tripType;
            switch (tripType) {
                case 'o':
                case 'r':
                    this.parentSearchBox.removeClass('ac-searchbox-wrap-multi seg-1 seg-2 seg-3 seg-4');
                    break;
                case 'm':
                    this.parentSearchBox.removeClass(' seg-1 seg-2 seg-3 seg-4').addClass('ac-searchbox-wrap-multi seg-' + this.model.SegmentsMulti.length);
                    break;
            }
            this.setSegmentVisibility();
        };
        /**
         * Update segment Visibility
         */
        SearchFormFlight.prototype.setSegmentVisibility = function() {
            var hideElement = function(e) {
                e.hide();
            };
            var showElement = function(e) {
                e.show();
            };
            var element = this.element;
            var segmentRowRoundtrip = [this.segmentRowRoundTrip.element];
            var segmentRowsMulti = jQuery.map(this.segmentRowsMulti, function(row) {
                return row.element;
            });
            var segmentRowMultiNew = [element.find('.new-segment').first()];
            var setVisibility = function(elements, func) {
                if (!!elements.each)
                    elements.each(func);
                else {
                    for (var i = 0, e; e = elements[i]; i++) {
                        func(e);
                    }
                }
            };
            switch (this.tripType) {
                case 'm':
                    setVisibility(segmentRowRoundtrip, hideElement);
                    setVisibility(segmentRowsMulti, showElement);
                    if (this.model.SegmentsMulti.length < this.maxSegmentCount)
                        setVisibility(segmentRowMultiNew, showElement);
                    else
                        setVisibility(segmentRowMultiNew, hideElement);
                    break;
                default:
                    setVisibility(segmentRowRoundtrip, showElement);
                    setVisibility(segmentRowsMulti, hideElement);
                    setVisibility(segmentRowMultiNew, hideElement);
                    break;
            }
        };
        SearchFormFlight.prototype.setCurrency = function(currencyCode) {
            this.currencyCode = currencyCode;
        };
        SearchFormFlight.prototype.onClose = function() {
            this.parentSearchBox.removeClass(' ');
        };
        SearchFormFlight.prototype.getTripType = function() {
            var model = this.model;
            var segments = model.Segments;
            var tripType = 'o';
            switch (true) {
                case segments.length === 1:
                    tripType = 'o';
                    break;
                case segments.length === 0 || (segments.length === 2 && segments[0].Origin === segments[1].Destination && segments[1].Origin === segments[0].Destination):
                    tripType = 'r';
                    break;
                default:
                    tripType = 'm';
                    break;
            }
            return tripType;
        };
        SearchFormFlight.prototype.getCompleterItemFormatter = function() {
            var _this = this;
            var parentItemClass = 'ac-geolocate-item-parent';
            var childItemClass = 'ac-geolocate-item-child';

            function escapeRegExp(str) {
                return typeof str !== 'undefined' ? str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") : '';
            }
            var formatCompleterItem = function(ul, item) {
                var term = this.term.split(' ').join('|'),
                    isChild = item.IsChild,
                    re = new RegExp('(' + escapeRegExp(term) + ')', 'gi'),
                    hl = '<span class="h">$1</span>',
                    stateName = item.StateName,
                    countryName = (!!stateName ? stateName + ', ' : '') + item.CountryName;

                if (!!item.MainCityName) {
                    countryName = countryName + ', ' + item.MainCityName;
                }

                var label = jQuery('<div>', {
                        'class': 'label'
                    }),
                    labelName = jQuery('<div>', {
                        'class': 'name'
                    }).append(item.Name.replace(re, hl)).appendTo(label),
                    labelPlaceName = jQuery('<div>', {
                        'class': 'place-name'
                    }).append(countryName.replace(re, hl)).appendTo(label),
                    labelIata = jQuery('<div>', {
                        'class': 'iata'
                    }).append(item.Iata.slice(0, 3).replace(re, hl)).appendTo(label),
                    icon = jQuery('<div>', {
                        'class': 'icon'
                    });
                item.displayName = function() {
                    return _this.formatCityName(item);
                };
                var cssClass = 'ac-geolocate-item';
                if (item.IsParent)
                    cssClass += ' ' + parentItemClass;
                else if (item.IsChild)
                    cssClass += ' ' + childItemClass;
                return jQuery('<li>', {
                    'class': cssClass
                }).data('ui-autocomplete-item', item).append(icon).append(label).appendTo(ul);
            };
            this.getCompleterItemFormatter = function() {
                return formatCompleterItem;
            };
            return this.getCompleterItemFormatter();
        };
        /**
         * Format the value of Geolocate input
         */
        SearchFormFlight.prototype.formatCityName = function(city) {
            var iata = city.Iata;
            var isMainCity = iata === city.MainCityCode;
            var airportName = city.Name;
            return String.format(get_format('FLIGHT_GEOLOCATE_FORMAT'), {
                iata: iata.slice(0, 3),
                city: city.MainCityName,
                airport: airportName,
                country: city.CountryName,
            });
        };

        /**
         * Build Search URL in a AngularJS style
         * @see SearchFormFlight.prototype.startSearch
         */
        SearchFormFlight.prototype.buildSearchUrl = function(absolute) {
            var model = this.model;
            var tripType = this.tripType;
            var segments = [];
            segments.push.apply(segments, (tripType !== 'm') ? model.Segments : model.SegmentsMulti);
            if (tripType === 'o')
                segments.length = 1;

            return AC.utils.buildFlightSearchURLFromSegments({
                segments: segments,
                tripType: tripType,
                directOnly: model.DirectOnly,
                includeNearby: model.IncludeNearby,
                ticketClass: model.TicketClass,
            }, absolute)
        };

        /**
         * Form validation
         *  Validates flight form
         * @see SearchFormFlight.prototype.startSearch
         */
        SearchFormFlight.prototype.isValid = function() {
            var errorCnt = 0;
            var model = this.model;
            switch (this.tripType) {
                case 'o':
                    if (model.Segments[0].Depart.constructor != Date || model.Segments[0].Depart == null) {
                        errorCnt++;
                        this.segmentRowRoundTrip.controls['depart-date'].validated(false, Language["HotelSearchForm.InvalidDate"]);
                    }
                    if (!model.Segments[0].Origin) {
                        errorCnt++;
                        this.segmentRowRoundTrip.controls['origin'].validated(false, Language["HotelSearchForm.InvalidCity"]);
                    }
                    if (!model.Segments[0].Destination) {
                        errorCnt++;
                        this.segmentRowRoundTrip.controls['destination'].validated(false, Language["HotelSearchForm.InvalidCity"]);
                    }
                    break;
                case 'r':
                    for (var i = 0, segment; segment = model.Segments[i]; i++) {
                        if (segment.Depart.constructor != Date || segment.Depart == null) {
                            errorCnt++;
                            this.segmentRowRoundTrip.controls[i === 0 ? 'depart-date' : 'return-date'].validated(false, Language["HotelSearchForm.InvalidDate"]);
                        }
                        if (!segment.Origin) {
                            errorCnt++;
                            this.segmentRowRoundTrip.controls[i === 0 ? 'origin' : 'destination'].validated(false, Language["HotelSearchForm.InvalidCity"]);
                        }
                        if (!segment.Destination) {
                            errorCnt++;
                            this.segmentRowRoundTrip.controls[i === 0 ? 'destination' : 'origin'].validated(false, Language["HotelSearchForm.InvalidCity"]);
                        }
                    }
                    break;
                case 'm':
                    for (var i = 0, segment; segment = model.SegmentsMulti[i]; i++) {
                        if (segment.Depart.constructor != Date || segment.Depart == null) {
                            errorCnt++;
                            this.segmentRowsMulti[i].controls['depart-date'].validated(false, Language["HotelSearchForm.InvalidDate"]);
                        }
                        if (!segment.Origin) {
                            errorCnt++;
                            this.segmentRowsMulti[i].controls['origin'].validated(false, Language["HotelSearchForm.InvalidCity"]);
                        }
                        if (!segment.Destination) {
                            errorCnt++;
                            this.segmentRowsMulti[i].controls['destination'].validated(false, Language["HotelSearchForm.InvalidCity"]);
                        }
                    }
                    break;
            }
            if (errorCnt == 0)
                return true;
            return false;
        };
        // Setter - set UI valid
        SearchFormFlight.prototype.setValid = function(value) {
            this.UIValid = value;
        };
        // Getter - get UI status
        SearchFormFlight.prototype.getValid = function() {
            return this.UIValid;
        };
        SearchFormFlight.prototype.getTimespan = function() {
            var model = this.model;
            var segments = this.tripType === 'm' ? model.SegmentsMulti : model.Segments;
            return {
                start: segments[0].Depart,
                end: !!segments[1] ? segments[1].Depart : null
            };
        };
        SearchFormFlight.prototype.setTimespan = function(timespan) {
            var model = this.model;
            var segments = this.tripType === 'm' ? model.SegmentsMulti : model.Segments;
            if (!!timespan.start)
                segments[0].Depart = timespan.start;
            if (!!timespan.end && !!segments[1])
                segments[1].Depart = timespan.end;
            if (this.tripType === 'm')
                this.checkDatesMulti(0);
            this.setValid(false);
        };
        SearchFormFlight.prototype.getSegments = function() {
            return this.tripType === 'm' ? this.model.SegmentsMulti : this.model.Segments;
        };
        SearchFormFlight.prototype.getDestination = function() {
            var segments = this.getSegments();
            return {
                key: segments[0].Destination.slice(0, 3),
                type: 1
            };
        };
        /**
         * @TODO comment this method
         */
        SearchFormFlight.prototype.setDestination = function(code, type) {
            var _this = this;
            type = type || 1;
            var onload = function(city) {
                var cityName = _this.formatCityName(city);
                var segments = _this.model.Segments;
                var segmentsMulti = _this.model.SegmentsMulti;
                var segments = _this.getSegments();
                var destination = code;
                segments[0].Destination = destination;
                !!segments[1] ? segments[1].Origin = destination : null;
                var segmentRows = _this.tripType === 'm' ? _this.segmentRowsMulti : [_this.segmentRowRoundTrip];
                segmentRows[0].controls['destination'].setText(cityName);
                if (segmentRows.length > 1)
                    segmentRows[1].controls['origin'].setText(cityName);
            };
            var onError = function() {};
            this.dataService.GetCityByIata(code, onload, onError);
        };
        /**
         * Save model date to cookies
         * @see SearchFormFlight.prototype.startSearch
         */
        SearchFormFlight.prototype.persistModel = function() {
            var model = this.model;
            var directOnly = model.DirectOnly;
            var includeNearby = model.IncludeNearby;
            var tripType = this.tripType;
            var segments = tripType === 'm' ? model.SegmentsMulti : model.Segments.slice(0, (tripType === 'o' ? 1 : 2));
            var ticketClass = model.TicketClass;
            var modelData = [];
            for (var i = 0; i < segments.length; i++) {
                var segment = segments[i];
                var departDate = segment.Depart;
                var dateString = departDate.getDate() + '-' + (departDate.getMonth() + 1) + '-' + departDate.getFullYear();
                modelData.push('seg-' + i + '=' + segment.Origin + ':' + segment.Destination + ':' + dateString);
            }
            modelData.push('ticketClass=' + ticketClass);
            modelData.push('timestamp=' + new Date().toISOString());
            modelData.push('directOnly=' + directOnly);
            modelData.push('includeNearby=' + includeNearby);
            this.dataService.PersistModel(modelData);
        };
        /**
         * Init Search process
         * @see SearchForm.prototype.startSearch
         */
        SearchFormFlight.prototype.startSearch = function(newWindow) {
            if (!this.isValid())
                return;
            this.persistModel();
            switch (this.searchType) {
                case 0:
                    var searchUrl = this.buildSearchUrl(true);
                    if (newWindow)
                        window.open(searchUrl);
                    else
                        window.location.href = searchUrl;
                    break;
                case 1:
                    var model = this.model;
                    var tripType = this.tripType;
                    window.location.hash = this.buildSearchUrl();
                    $ev.fire('control:flightsearch-start', {
                        tripType: this.tripType,
                        model: this.model
                    });
                    break;
            }
        };
        SearchFormFlight.prototype.searchByHash = function() {
            // Start Query Here
            var preModel = this.model;
            var hashString = window.location.hash.toUpperCase();
            var queryModel = this.getModelByQuery(hashString);
            var segments = queryModel.segments;
            var tripType = queryModel.getTripType();
            var segmentCount = segments.length;
            var currentDate = new Date();

            if (tripType != this.tripType)
                this.setTripType(tripType, true);
            switch (tripType) {
                case 'o':
                    break;
                case 'r':
                    break;
                case 'm':
                    var preSegmentCount = preModel.SegmentsMulti.length;
                    if (segmentCount !== preModel.SegmentsMulti.length) {
                        var i = segmentCount;
                        if (i < preSegmentCount) {
                            var rows = this.segmentRowsMulti;
                            while (i++ < preSegmentCount) {
                                this.removeMultiSegment(rows[rows.length - 1].element, i === preSegmentCount);
                            }
                        } else if (i > preSegmentCount) {
                            while (i-- > preSegmentCount) {
                                this.addMultiSegment(i === preSegmentCount);
                            }
                        }
                    }
                    break;
            }
            // @CHANGE WHOLE SWITCH AND INSIDE
            switch (true) {
                case tripType === 'r':
                    var segmentRoundTrip = this.segmentRowRoundTrip,
                        originCompleter = segmentRoundTrip.controls['origin'],
                        destinationCompleter = segmentRoundTrip.controls['destination'],
                        calendarReturn = segmentRoundTrip.controls['return-date'];

                    var querySegmentHomebound = segments[1],
                        returnDate = querySegmentHomebound.Depart,
                        returnDate = new localDateClass(returnDate[0], returnDate[1]-1, returnDate[2]);

                    if (returnDate && returnDate.getGregorianDate) {
                        returnDate = returnDate.getGregorianDate();
                    }
                    if (returnDate < currentDate) {
                        returnDate = currentDate
                    }
                    var modelSegmentHomebound = this.model.Segments[1];
                    modelSegmentHomebound.Origin = querySegmentHomebound.Origin;
                    modelSegmentHomebound.Destination = querySegmentHomebound.Destination;
                    modelSegmentHomebound.Depart = returnDate;
                    var calendarReturn = segmentRoundTrip.controls['return-date'];
                    calendarReturn.setDate(returnDate);
                    // Update UI
                    originCompleter.loadCity(modelSegmentHomebound.Origin);
                    destinationCompleter.loadCity(modelSegmentHomebound.Destination);

                case tripType === 'o':
                    var segmentRoundTrip = this.segmentRowRoundTrip,
                        originCompleter = segmentRoundTrip.controls['origin'],
                        destinationCompleter = segmentRoundTrip.controls['destination'],
                        calendarDepart = segmentRoundTrip.controls['depart-date'];
                    var modelSegmentOutbound = this.model.Segments[0],
                        querySegmentOutbound = segments[0],
                        departDate = querySegmentOutbound.Depart,
                        departDate = new localDateClass(departDate[0], departDate[1]-1, departDate[2]);
                    if (departDate && departDate.getGregorianDate) {
                        departDate = departDate.getGregorianDate();
                    }
                    if (departDate < currentDate) {
                        departDate = currentDate
                    }
                    modelSegmentOutbound.Origin = querySegmentOutbound.Origin;
                    modelSegmentOutbound.Destination = querySegmentOutbound.Destination;
                    modelSegmentOutbound.Depart = departDate;
                    calendarDepart.setDate(departDate);
                    originCompleter.loadCity(querySegmentOutbound.Origin, function() {}, function() {});
                    destinationCompleter.loadCity(querySegmentOutbound.Destination);
                    break;
                case tripType === 'm':
                    var segmentRows = this.segmentRowsMulti;
                    var modelSegments = this.model.SegmentsMulti;
                    for (var i = 0, len = segments.length; i < len; i++) {
                        var segmentRow = segmentRows[i],
                            controls = segmentRow.controls,
                            originCompleter = controls['origin'],
                            destinationCompleter = controls['destination'],
                            departCalendar = controls['depart-date'];

                        var segment = segments[i],
                            originCode = segment.Origin,
                            destinationCode = segment.Destination,
                            departDate = segment.Depart,
                            departDate = new localDateClass(departDate[0], departDate[1]-1, departDate[2]);

                            if (departDate && departDate.getGregorianDate) {
                                departDate = departDate.getGregorianDate();
                            }
                        if (departDate < currentDate) {
                            departDate = currentDate
                        }
                        // Update Model Data
                        var modelSegment = modelSegments[i] || (modelSegments[i] = {
                            Origin: '',
                            Destination: '',
                            Depart: new Date()
                        });
                        modelSegment.Origin = originCode;
                        modelSegment.Destination = destinationCode;
                        modelSegment.Depart = departDate;

                        // Update UI
                        originCompleter.loadCity(originCode);
                        destinationCompleter.loadCity(destinationCode);
                        departCalendar.setDate(departDate);
                    }
                    break;
            }

            var ticketClass = this.model.TicketClass = queryModel.ticketClass;
            this.selectTicketClass.setValue(ticketClass);
            var directOnly = this.model.DirectOnly = queryModel.directOnly;
            this.chkDirect.prop('checked', directOnly ? 'checked' : null);
            var includeNearby = this.model.IncludeNearby = queryModel.includeNearby;
            this.chkNearby.prop('checked', includeNearby ? 'checked' : null);
            this.startSearch(false);
        };
        SearchFormFlight.prototype.getModelByQuery = function(queryString) {
            if (!queryString)
                return null;

            queryString = queryString.replace(/^\?|^\#/, '');
            var ticketTypes = Object.keys(AC.get_settings('flight.ticket-types')).map(function(str){return str.toUpperCase()}).join(''),
                regx_str = "(.*)\/([" + ticketTypes +"])\/(.*)",
                found = queryString.match(regx_str);
            if (!found) {
                // Redirect to frontpage in case of wrong URL
                window.location = '';
            }
            var place_dates = found[1].split(/\//),
                options = found[3].split(/\//),
                ticketClass = found[2],
                includeNearby = options.indexOf('NEARBY') > -1 ? true: false,
                directOnly = options.indexOf('DIRECT') > -1 ? true: false;

            if (place_dates.length == 0) {
                window.location = '';
            }

            var origin_dest_regx = '([a-zA-Z]{3})-([a-zA-Z]{3})',
                date_regx = get_format('DATE_FORMAT_URL_REGX_JS'),
                date_regx_order = get_format('DATE_FORMAT_URL_REGX_ORDER'),
                seg_counter = 0,
                segments = [];

            for (var i=0; i < place_dates.length; i++) {
                if (place_dates[i].match(origin_dest_regx)) {
                    var origin_dest = place_dates[i].match(origin_dest_regx);
                    segments[seg_counter] = {
                        'Origin': origin_dest[1],
                        'Destination': origin_dest[2],
                    }
                }else if (place_dates[i].match(date_regx)) {
                    var date = place_dates[i].match(date_regx);
                    var date = [
                        date[parseInt(date_regx_order['year'])+1],
                        date[parseInt(date_regx_order['month'])+1],
                        date[parseInt(date_regx_order['day'])+1]
                    ];

                    if (typeof segments[seg_counter] != "undefined" &&
                    typeof segments[seg_counter]['Depart'] == "undefined") {
                        segments[seg_counter]['Depart'] = date;
                        seg_counter += 1;
                    }else if (seg_counter == 1) { // Round trip types
                        segments[seg_counter] = {
                            'Origin':  segments[seg_counter-1]['Destination'],
                            'Destination':  segments[seg_counter-1]['Origin'],
                        }
                        segments[seg_counter]['Depart'] = date;
                    }
                }
            }

            var currentDate = new localDateClass();
            currentDate = [currentDate.getFullYear(), currentDate.getMonth()+1, currentDate.getDate()];
            for (var i=0; i< segments.length; i++) {
                var seg = segments[i];
                if (typeof seg['Depart'] == 'undefined') {
                    segments[i]['Depart'] = currentDate;
                }
            }
            var model = {
                segments: segments,
                ticketClass: ticketClass.toLowerCase(),
                directOnly: directOnly,
                includeNearby: includeNearby,
                getTripType: function() {
                    var model = this.model;
                    var tripType = 'r';
                    var segments = this.segments;
                    var segmentCount = segments.length;
                    switch (true) {
                        case segmentCount === 1:
                            tripType = 'o';
                            break;
                        case segmentCount === 2:
                            var segment1 = segments[0];
                            var segment2 = segments[1];
                            if (segment1.Origin === segment2.Destination && segment1.Destination === segment2.Origin) {
                                tripType = 'r';
                                break;
                            }
                        case segmentCount > 2:
                            tripType = 'm';
                            break;
                    }
                    return (this.getTripType = function() {
                        return tripType;
                    })();
                }
            };
            return model;
        };

        return SearchFormFlight;
    })();
    SearchForm.SearchFormFlight = SearchFormFlight;
    var Airport = (function() {
        function Airport(Code, Type) {
            this.Code = Code;
            this.Type = Type;
            this.toString = function() {
                return this.Code;
            };
        }
        return Airport;
    })();
    SearchForm.Airport = Airport;
})(SearchForm || (SearchForm = {}));