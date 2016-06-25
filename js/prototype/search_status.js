var SearchStatus = Class.create({
    initialize: function(options) {
        options = Object.extend((typeof _StatusOptions !== 'undefined' ? _StatusOptions : {}), (options || {}));
        this.flightSearch = options.flightSearch;
        var lang = Language;
        if (AC.g.mobile){
            this.showFilters = false;
            $(options.container).remove();
            $j('body').append('<div id="search-status" class="block search-status mobile"></div>');
            this.container = $('search-status');
        }else{
            this.container = $(options.container);
        }
        this.maxInitTime = options.maxInitTime || 10;
        this.onStatusUpdate = options.onStatusUpdate || Prototype.emptyFunction;
        this.statusTextElement = $(options.statustext) || $$('.statustext')[0];
        this.firstTime = true;
        this.render();
    },
    render: function() {
        var lang = Language;
        var t = this;
        this.elements = [];
        var frag = document.createDocumentFragment();
        var status = new Element('div', {
            'class': 'status'
        });
        var progressFragment = document.createDocumentFragment();
        var nProgressTextSmall = this.nProgressTextSmall = new Element('div', {
            'class': 'text_small'
        });
        nProgressTextSmall.innerHTML = '<p class="progress-header" id="progress-header">' + Language['FlightResults_Status_SearchingFlights'] + '</div><div class="progress-sub"></p>';
        progressFragment.appendChild(nProgressTextSmall);

        if (!AC.g.mobile) {
            var nProgressBar = this.nProgressBar = new Element('div', {
                'class': 'progressbar s_f s_f_results_a2'
            });
            nProgressBar.innerHTML = '<div class="inner s_f s_f_results_a1" style="width:0px;"><div class="overlay"></div></div>';
            progressFragment.appendChild(nProgressBar);
            this.progressBar = new ProgressBarEx({
                element: nProgressBar,
                width: 220,
                height: 13
            });
        }

        status.innerHTML = '<div class="progress-header"></div><div class="progress-sub"></div>';
        frag.appendChild(status);
        this.statusElement = status;

        if (!AC.g.mobile){
            var html = '<div class="progress"></div>';
        }else{
            var html = '<i class="toggleFilters icon-sliders"></i><div class="progress"></div>';
        }
        var c = this.container;
        c.innerHTML = html;
        var nProgress = this.nProgress = c.select('.progress')[0];
        if (AC.g.mobile) {
            var toggleFilters = c.select('.toggleFilters')[0];
            toggleFilters.on('click', function() {
                $j('body').toggleClass('showFilters');
                if (t.showFilters) {
                    t.showFilters = false;
                    $j('#filter-groups').hide();
                    t.flightSearch.flightRenderer.scrollElementIntoView($j('#flight-results'));
                }else{
                    t.showFilters = true;
                    $j('#filter-groups').show();
                    t.flightSearch.flightRenderer.scrollElementIntoView($j('#filter-groups'));
                }
                return false;
            });
        }
        nProgress.appendChild(progressFragment);
        AC.attachBehaviors($j(this.container));
        this.elements = [status];
    },
    setStatusText: function(status) {
        var html = '';
        switch (true) {
            case status === 'init':
                html = '<div class="statustext-inner block init"><div class="progress-header">';
                html += Language['FlightStatus_SearchText_1'];
                html += '<span> ';
                html += Language['FlightStatus_SearchText_2'];
                html += '</span></div>';
                html += '</div>';
                break;
            case status === 'clearStartDelay':
                html = '<div class="statustext-inner block start-delayed"><div class="progress-header">';
                html += Language['FlightStatus_SearchDelayed_1'];
                html += '<span> ';
                html += Language['FlightStatus_SearchDelayed_2'];
                html += '</span></div>';
                html += '</div>';
                break;
            case status === 'noresults':
                html = '<div class="statustext-inner block noresults"><div class="progress-header">';
                html += Language['FlightStatus_NoResults_1'];
                html += '<span> ';
                html += Language['FlightStatus_NoResults_2'];
                html += '</span></div>';
                html += '</div>';
                break;
            case status === 'errorResults':
                html = '<div class="statustext-inner block error-results"><div class="progress-header">';
                html += Language['FlightStatus_NoResults_1'];
                html += '<span> ';
                html += Language['FlightStatus_ErrorResults_1'];
                html += '</span></div>';
                html += '</div>';
                break;
        }
        this.statusTextElement.innerHTML = html;
    },
    updateSmallStatusText: function() {
        var top = this.statusElement.down('.progress-header');
        var bottom = this.statusElement.down('.progress-sub');
        var remainingSuppliers = this.supplierCount - this.resultSupplierCount;
        switch (this.currentState) {
            case 'initResults':
                var nProgress = this.nProgress;
                nProgress.select('.progress-sub')[0].innerHTML = String.format(Language['FlightStatus_Bar_Results_3'], this.resultCount);
                this.nProgressTextSmall.select('.progress-header')[0].innerHTML = Language['FlightResults_Status_SearchingFlights'];
            case 'startSearch':
                var doneText;
                var moreResultsText;
                bottom.innerHTML = String.format(Language['FlightStatus_Bar_Suppliers_1'], '<b>' + this.supplierCount + '</b>') + ' ' + moreResultsText;
                break;
            case 'done':
                this.nProgressTextSmall.select('.progress-header')[0].innerHTML = Language['FlightResults_Status_SearchComplete'];
                this.nProgressTextSmall.select('.progress-sub')[0].innerHTML = String.format(Language['FlightStatus_Bar_Results_4'], '<b>' + this.resultCount + '</b>')
                if (!AC.g.mobile) {
                    this.currentProgress.complete();
                }
                if (this.filteredCount == -1) {
                    this.gotoWheelFrame(1);
                    var noResultsText = Language['FlightStatus_Bar_NoResults_1'];
                    if (remainingSuppliers == 1)
                        noResultsText = Language['FlightStatus_Bar_NoResults_2'];
                    else if (remainingSuppliers > 1)
                        noResultsText = String.format(Language['FlightStatus_Bar_NoResults_3'], '<b>' + remainingSuppliers + '</b>');
                    top.innerHTML = Language['FlightStatus_Bar_Done'] + ' <span class="result-count-done">' + String.format(Language['FlightStatus_Bar_Results_4'], '<b>' + this.resultCount + '</b>') + '</span>';
                    bottom.innerHTML = String.format(Language['FlightStatus_Bar_Suppliers_2'], '<b>' + this.resultSupplierCount + '</b>') + ' ' + noResultsText;
                } else {
                    var topHtml;
                    if (this.filteredCount == 0) {
                        topHtml = Language['FlightStatus_Bar_Filtering_4'] + ' <span class="no-results">' + Language['FlightStatus_Bar_Filtering_5'] + '</span>';
                        this.gotoWheelFrame(6);
                    } else {
                        topHtml = Language['FlightStatus_Bar_Filtering_1'] + ' <span class="filtering">' + String.format(Language['FlightStatus_Bar_Filtering_2'], '<b>' + this.filteredCount + '</b>') + '</span>';
                        this.gotoWheelFrame(3);
                    }
                    top.innerHTML = topHtml;
                    bottom.innerHTML = String.format(Language['FlightStatus_Bar_Filtering_3'], '<b>' + this.resultCount + '</b>') + ' - <span class="show-all-tickets">' + Language['FlightStatus_Bar_ShowAllFilters'] + '</span>';
                    bottom.down('.show-all-tickets').on('click', this.clearFiltersClick.bindAsEventListener(this));
                }
                break;
        }
    },
    gotoWheelFrame: function(frame) {
        if (this.currentWheelFrame != frame) {
            this.currentWheelFrame = frame;
            try {
                if (Prototype.Browser.IE) {
                    var w = document.wheel;
                    if (w)
                        w.GotoFrame(frame);
                } else {
                    var w = this.wheelObj || $('wheel');
                    if (w) {
                        var func = w.GotoFrame;
                        if (typeof func == 'function') {
                            func.call(w, frame);
                        } else {
                            var w = document.wheel;
                            if (w)
                                w.GotoFrame(frame);
                        }
                    }
                }
            } catch (e) {}
        }
    },
    updateStatus: function() {
        var status = arguments[0];
        var updateSmallStatus = true;
        switch (status) {
            case 'preInit':
                this.hideProgress();
                //this.setSize('max');
                //this.scaleWheel('max', 0);
                //this.wheelElement.hide();
                return;
                break;
            case 'init':
                //this.setSize('max');
                $(document).fire('acquia:status-' + status);
                this.elements.invoke('hide');
                this.updateStatus.bind(this, 'startSearch').defer();
                this.setStatusText(status);
                this.statusTextElement.show();
                this.supplierCount = 0;
                this.resultSupplierCount = 0;
                this.resultCount = 0;
                this.filteredCount = -1;
                this.progress = 0;
                this.progressStepSize = 100 / 30;
                break;
            case 'startSearch':
                var c = this.nProgressTextSmall;
                c.select('.progress-header')[0].innerHTML = Language['FlightResults_Status_SearchingFlights'];
                c.select('.progress-sub')[0].innerHTML = String.format(Language['FlightStatus_Bar_Results_3'], 0);
                this.startTime = (new Date()).getTime();
                /*this.wheelElement.show();
                if (!this.firstTime)
                    this.scaleWheel('max', 0);*/
                this.gotoWheelFrame(0);
                this.firstTime = false;
                if (this.currentDelay)
                    window.clearTimeout(this.currentDelay);
                this.currentDelay = this.updateStatus.bind(this, 'clearStartDelay').delay(10);
                this.startDelayed = true;
                var t = this;
                if (!AC.g.mobile) {
                    var currentProgress = this.currentProgress = this.progressBar.start({
                        onComplete: function() {
                            if (t.resultCount)
                                t.nProgressBar.firstChild.removeClassName('s_f_results_a1').addClassName('s_f_results_a3');
                        }
                    });
                    this.showProgress();
                }
                break;
            case 'clearStartDelay':
                this.startDelayed = false;
                this.revealDetails();
                if (this.currentState === 'startSearch')
                    this.setStatusText(status);
                return;
                break;
            case 'initResults':
                this.statusTextElement.hide();
                var arg = arguments[1],
                    count = arg.count;
                this.statusElement.appear();
                var eventName = 'acquia:status-' + status;
                $(document).fire(eventName);
                $(document).fire('flightsearch:loadads');
                if (typeof dataLayer != 'undefined') {
                    dataLayer.push({
                        'event': eventName
                    });
                    dataLayer.push({
                        'event': 'flightsearch:loadads'
                    });
                }
                break;
//            case 'setSupplierCount':
//                var arg = arguments[1];
//                this.supplierCount = arg;
//                this.updateSmallStatusText();
//                return;
//                break;
            case 'setResultSupplierCount':
                var arg = arguments[1];
                var sCount = arg.resultSupplierCount - this.resultSupplierCount;
                this.resultSupplierCount = arg.resultSupplierCount;
                this.updateSmallStatusText();
                this.progress += sCount * this.progressStepSize;
                return;
                break;
            case 'setFilteredCount':
                var arg = arguments[1];
                this.filteredCount = arg.filteredCount;
                this.updateSmallStatusText();
                return;
                break;
            case 'setCount':
                var arg = arguments[1];
                if (!arg.hasOwnProperty('count'))
                    return;
                this.resultCount = arg.count;
                if (this.currentState === 'startSearch')
                    this.updateStatus('initResults', {
                        count: arg.count
                    });
                $(document).fire('acquia:status-' + status, {
                    count: arg.count
                });
                return;
                break;
            case 'done':
                var state = this.currentState;
                if (!AC.g.mobile) {
                    this.hideProgressBar();
                }
                switch (state) {
                    case 'startSearch':
                        if (!AC.g.mobile){
                            this.currentProgress.complete();
                        }
                        this.revealDetails();
                        this.setStatusText('noresults');
                        this.gotoWheelFrame(2);
                        updateSmallStatus = false;
                        this.nProgressTextSmall.select('.progress-header')[0].innerHTML = Language['FlightResults_Status_SearchComplete'];
                        this.nProgressTextSmall.select('.progress-sub')[0].innerHTML = String.format(Language['FlightStatus_Bar_Results_4'], '<b>' + this.resultCount + '</b>')
                        break;
                    case 'initResults':
                        if (this.startDelayed)
                            this.updateStatus('clearStartDelay');
                        break;
                }
                $(document).fire('acquia:status-' + status);
                break;
            case 'error':
                var state = this.currentState;
                switch (state) {
                    case 'startSearch':
                        if (!AC.g.mobile){
                            this.currentProgress.complete();
                        }                        this.revealDetails();
                        this.setStatusText('errorResults');
                        this.gotoWheelFrame(2);
                        updateSmallStatus = false;
                        this.nProgressTextSmall.select('.progress-header')[0].innerHTML = Language['FlightResults_Status_SearchComplete'];
                        this.nProgressTextSmall.select('.progress-sub')[0].innerHTML = String.format(Language['FlightStatus_Bar_Results_4'], '<b>' + this.resultCount + '</b>')
                        break;
                    case 'initResults':
                        if (this.startDelayed)
                            this.updateStatus('clearStartDelay');
                        break;
                }
                $(document).fire('acquia:status-' + status);
                break;
            default:
                break;
        }
        this.currentState = status;
        if (updateSmallStatus)
            this.updateSmallStatusText();
        this.onStatusUpdate(status);
    },
    hideProgress: function() {
        this.nProgressTextSmall.hide();
        this.nProgressBar.hide();
        this.nProgressBar.select('.inner')[0].setStyle({
            'width': '0px'
        });
    },
    hideProgressBar: function() {
        this.nProgressBar.hide();
    },
    showProgress: function() {
        this.nProgressBar.firstChild.removeClassName('s_f_results_a3').addClassName('s_f_results_a1');
        this.nProgressTextSmall.show();
        this.nProgressBar.show();
    },
    revealDetails: function() {
        if (this.currentDelay)
        ;
        window.clearTimeout(this.currentDelay);
        t = this;
    },
    clearFiltersClick: function(ev) {
        if (this.manager)
            this.manager.clearFilters();
        ev.stop();
        return false;
    }
});