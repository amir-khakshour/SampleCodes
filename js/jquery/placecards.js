/**
 * jQuery Plugins > Utilities > placeCards
 *
 * Making recent and cheapest flights block in the front page
 */
(function(b, a) {
    b.extend("utils", {
        placeCards: function() {
            this.init();
            return this;
        }
    })

    b.extend("utils.placeCards.prototype", {
        init: function(){
            var that = this;
            this.place_card_container = a('#place-cards-container'),
            this.place_cards = a('#place-cards');
            this.current_page = 1;
            this.is_loading = false;
            this.load_more_btn = this.place_card_container.find('.ac-submit');
            this.load_more_btn.on('click', function(){that.handleLoadMore()});
            this.populateCards();
            return this;
        },
        populateCards: function(card_container){
            for (var i=0; i< place_cards.length; i++) {
                var place = place_cards[i],
                    id = place['id'],
                    $place = a('#'+id);

                var url = AC.utils.buildFlightSearchURLFromSegments({
                    segments: place.segments,
                    ticketClass: place.ticketClass
                }, true);
                $place.find('.place-anchor').attr('href', url);
                var price = GCurrency.convertToIRR(place['price'], place['currency'].toUpperCase());
                price = GCurrency.displayPrice(price);
                $place.find('.price').html(price);
            }
        },
        handleLoadMore: function(){
            if (this.is_loading)
                return false
            this.load_more_btn.addClass('ac-loading');
            var that = this,
                promise = this.requestMorePlaceCards();
            promise.done(function(data) {
                that.current_page +=1;
                that.load_more_btn.removeClass('ac-loading');
                this.is_loading = false;
                if (data) {
                    var $data = a(data);
                    that.place_cards.append($data);
                    AC.attachBehaviors(that.place_cards);
                    that.populateCards();
                    return false;
                }else{
                    that.load_more_btn.text(gettext("No more flights.")).addClass('all-loaded');
                }
                // else track or report failure
            });
            return false;
        },
        requestMorePlaceCards: function() {
            var promise = a.ajax({
                type: "GET",
                url: AC.get_settings('flight.path.place_cards') + '/' + (this.current_page +1),
                contentType: "text/html;charset=utf-8",
            });
            return promise;
        },
    })

})(window.AC, window.$j || window.jQuery);
