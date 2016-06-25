(function($) {
    $document = $(document),
        $window = $(window),
        $body = $('body');

    /**
     * Contains the init functionality.
     * @type {Object}
     */
    AC.init = {

        /**
         * Inits all the main functionality. Calls all the init functions.
         */
        initSite: function() {
            var init = this,
                clickMsg = '';
            // mobile detection based on screen size
            AC.utils.isMobile();
        },
    };

    /**
     * Set Global vars
     */
    AC.setGlobals = function() {
        var defaults = {
            switchWidth: 780,
            breakPoints: {
                'mobile': 480,
                'tablet': 768,
                'big_scr': 960,
                'desktop': 1200,
            },
        };

        AC.g = $.extend(true, defaults, AC.g || {});

        // Custom touch events
        AC.g.lang = Cookies.get('userLanguage');
        AC.g.touches = {};
        AC.g.touches.touching = false;
        AC.g.touches.touch = false;
        AC.g.touches.currX = 0;
        AC.g.touches.currY = 0;
        AC.g.touches.cachedX = 0;
        AC.g.touches.cachedY = 0;
        AC.g.touches.count = 0;

        // Default side padding
        AC.g.padding = 15;

        AC.g.direction = $('html').css('direction');
        if (typeof AC.g.direction == "undefined") {
            AC.g.direction = $('html').attr('dir');
        }
    };

    /**
     * Video Control
     */
    AC.video = function() {
        return;
        var iframe = $('#player1')[0],
            player = $f(iframe),
            status = $('.status');

        // When the player is ready, add listeners for pause, finish, and playProgress
        player.addEvent('ready', function() {
            status.text('ready');

            player.addEvent('pause', onPause);
            player.addEvent('finish', onFinish);
            player.addEvent('playProgress', onPlayProgress);
        });

        // Call the API when a button is pressed
        $('button').bind('click', function() {
            player.api($(this).text().toLowerCase());
        });

        function onPause(id) {
            status.text('paused');
        }

        function onFinish(id) {
            status.text('finished');
        }

        function onPlayProgress(data, id) {
            status.text(data.seconds + 's played');
        }
    };

    AC.onReady = {
        init: function() {
            $('body').removeClass('no-js').addClass('has-js');
        },
    };

    AC.onLoad = {
        init: function() {

        },
    };

    // Set Globals
    AC.setGlobals();
    AC.init.initSite()

    $document.ready(AC.onReady.init);
    $window.load(AC.onLoad.init);
}($j || jQuery));