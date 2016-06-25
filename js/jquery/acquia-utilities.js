/**
 * @file Acquia Utilities
 * 	Contains some general helper functions.
 */
(function($) {

AC.utils = {
	/**
	 * Retrieves the current browser info.
	 * Code from jQuery Migrate: http://code.jquery.com/jquery-migrate-1.2.0.js
	 * @return an object containing the browser info, for example for IE version 7
	 * it would return:
	 * {msie:true, version:7}
	 */
	browserInfo : function(){
		var browser = {},
			ua,
			match,
			matched;

		if(AC.g.browser){
			return AC.g.browser;
		}

		ua = navigator.userAgent.toLowerCase();

		match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
			/(webkit)[ \/]([\w.]+)/.exec( ua ) ||
			/(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
			/(msie) ([\w.]+)/.exec( ua ) ||
			ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
			[];

		matched = {
			browser: match[ 1 ] || "",
			version: match[ 2 ] || "0"
		};

		if ( matched.browser ) {
			browser[ matched.browser ] = true;
			browser.version = matched.version;
		}

		// Chrome is Webkit, but Webkit is also Safari.
		if ( browser.chrome ) {
			browser.webkit = true;
		} else if ( browser.webkit ) {
			browser.safari = true;
		}

		AC.g.browser = browser;

		return browser;
	},

	/**
	 * Checks if the current device is a mobile device. If it is a mobile device, and it is within
	 * the recognized devices, adds its specific class to the body.
	 * @return {boolean} setting if the device is a mobile device or not
	 */
	isMobile : function(){
		if(typeof AC.g.mobile !== 'undefined') {
			return AC.g.mobile;
		}
		var userAgent = navigator.userAgent.toLowerCase(),
			devices = [{
				'class': 'iphone',
				regex: /iphone/
			}, {
				'class': 'ipad',
				regex: /ipad/
			}, {
				'class': 'ipod',
				regex: /ipod/
			}, {
				'class': 'android',
				regex: /android/
			}, {
				'class': 'bb',
				regex: /blackberry/
			}, {
				'class': 'iemobile',
				regex: /iemobile/
			}],
			i, len;

		// @DEBUG
		AC.g.mobile = false;

		if (jQuery().Modernizr) {

			if ((Modernizr.touch && !(navigator.userAgent.indexOf("iPad") != -1)) || (Modernizr.touch && (navigator.userAgent.indexOf("iPhone") != -1)) || (Modernizr.touch && (navigator.userAgent.indexOf("Android") != -1))) {
				AC.g.mobile = true;
				AC.g.mobile.type = navigator.userAgent;
			}
		} else if ('ontouchstart' in document.documentElement) {

			AC.g.mobile = true;
			for(i = 0, len = devices.length; i < len; i += 1) {
				if(devices[i].regex.test(userAgent)) {
					$('body').addClass(devices[i]['class']);
					AC.g.mobile.type = devices[i]['class'];
				}
			}
		}

		if (AC.g.mobile) {
			$('body').addClass('mobile-device');
		}else{
			$('body').addClass('desktop-device');
		}

		return AC.g.mobile;
	},

	/**
	 * check if given variable is an array
	 * @param {void} obj - variable to check
	 * @return {boolean} if the variable is an array or not
	 */
	isArray : function( obj ){
		var objToString = Object.prototype.toString;
		return objToString.call( obj ) === '[object Array]';
	},

	/**
	 * turn element or nodeList into an array
	 * @param {object} obj - element or nodeList
	 * @return {array} converted object to array
	 */
	makeArray : function( obj ){
		var ary = [];
		if ( isArray( obj ) ) {
			// use object if already an array
			ary = obj;
		} else if ( typeof obj.length === 'number' ) {
			// convert nodeList to array
			for ( var i=0, len = obj.length; i < len; i++ ) {
				ary.push( obj[i] );
			}
		} else {
			// array of single index
			ary.push( obj );
		}
		return ary;
	},

	/**
	 * turn element or nodeList into an array
	 * @param {string} imgSrc - source of image
	 * @return {array} array of iamge dimensions
	 */
	getImgSize : function( imgSrc ){
		var newImg = new Image();

		newImg.onload = function() {
			return {width: newImg.width, height:newImg.height};
		}

		newImg.src = imgSrc;
	},

	/**
	 * Does browser support transitions?
	 * @return {boolean} transition support
	 */
	supportsTransitions : function(  ){
		var docBody = document.body || document.documentElement;
		var styles = docBody.style;
		var prop = "transition";
		if (typeof styles[prop] === "string") {
			return true;
		}
		// Tests for vendor specific prop
		vendor = ["Moz", "Webkit", "Khtml", "O", "ms"];
		prop = prop.charAt(0).toUpperCase() + prop.substr(1);
		var i;
		for (i = 0; i < vendor.length; i++) {
			if (typeof styles[vendor[i] + prop] === "string") {
				return true;
			}
		}
		return false;
	},

	/**
	 * is given HTTP method CSRF safe?
	 */
	csrfSafeMethod: function(method) {
		// these HTTP methods do not require CSRF protection
		return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
	},
	/**
	 * Is the URL domestic?
	 */
	sameOrigin: function(url) {
		// test that a given url is a same-origin URL
		// url could be relative or scheme relative or absolute
		var host = document.location.host; // host + port
		var protocol = document.location.protocol;
		var sr_origin = '//' + host;
		var origin = protocol + sr_origin;
		// Allow absolute or scheme relative URLs to same origin
		return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
			(url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
			// or any other URL that isn't scheme relative or absolute i.e relative.
			!(/^(\/\/|http:|https:).*/.test(url));
	},
	/**
	 * Setup CSRF token before sending AJAX post request
	 */
	ajaxCSRFSetup: function(){
		$.ajaxSetup({
			beforeSend: function(xhr, settings) {
				if (!AC.utils.csrfSafeMethod(settings.type) && AC.utils.sameOrigin(settings.url)) {
					// Send the token to same-origin, relative URLs only.
					// Send the token only if the method warrants CSRF protection
					// Using the CSRFToken value acquired earlier
					xhr.setRequestHeader("X-CSRFToken", Cookies.get('csrftoken'));
				}
			}
		});
	},
	/**
	 *
	 */
	buildFlightSearchURLFromSegments: function(searchData, absolute){
		if (typeof searchData['segments'] == 'undefined') {
			console.log('Invalid Search data: \n' + searchData);
			return;
		}

		var segments = searchData['segments']
		if (typeof searchData['tripType'] !== 'undefined') {
			var tripType = searchData['tripType']
		}else{
			var tripType = segments.length == 1 ? 'o': (segments.length ==2 ? 'r' : 'm')
		}
		if (typeof searchData['directOnly'] !== 'undefined') {
			var directOnly = searchData['directOnly']
		}else{
			var directOnly = false
		}
		if (typeof searchData['includeNearby'] !== 'undefined') {
			var includeNearby = searchData['includeNearby']
		}else{
			var includeNearby = false
		}
		if (typeof searchData['ticketClass'] !== 'undefined') {
			var ticketClass = searchData['ticketClass']
		}else{
			var ticketClass = 'e'
		}

		if (tripType === 'o')
			segments.length = 1;

		var url = '';
		var len = segments.length;
		if (tripType != 'm') {
			var segment = segments[0]
			origin_destination = String.format('{origin}-{destination}', {origin: segment.Origin, destination: segment.Destination});
			var depart = segment.Depart;
			if (typeof depart === 'string' && depart.length) {
				depart = Date.fromISO(depart);
			}
			depart = !!depart ? depart.toLocalDate(localDateClass || null, get_format('DATE_FORMAT_URL')) : '';
			url += String.format('{origin_destination}/{date}/', {
				origin_destination: origin_destination,
				date: depart
			});
			// Round Trip
			if (tripType == 'r' && len == 2) {
				segment = segments[1];
				depart = segment.Depart;
				if (typeof depart === 'string' && depart.length) {
					depart = new Date(depart);
				}
				depart = !!depart ? depart.toLocalDate(localDateClass, get_format('DATE_FORMAT_URL')) : '';
				url += String.format('{date}/', {date: depart});
			}
		}else{
			for (var i = 0; i < len; i++) {
				var segment = segments[i],
					origin_destination = String.format('{origin}-{destination}', {origin: segment.Origin, destination: segment.Destination})

				var depart = segment.Depart;
				if (typeof depart === 'string' && depart.length) {
					depart = new Date(depart);
				}
				depart = !!depart ? depart.toLocalDate(localDateClass, get_format('DATE_FORMAT_URL')) : '';
				url += String.format('{origin_destination}/{date}/', {
					origin_destination: origin_destination,
					date: depart
				})
			}
		}

		url += String.format('{ticket_class}/', {
			ticket_class: ticketClass || 'e'
		})

		url += String.format('{direct}/', {
			direct: (!!directOnly ? 'direct' : 'all')
		})

		url += String.format('{nearby}/', {
			nearby: (includeNearby ? 'nearby' : 'exact')
		})

		if (absolute == true) {
			url = '/' + AC.get_settings('flight.path.search') + '/#' + url;
			url = url.replace("http://", "[http]").replace("//", "/").replace("[http]", "http://");
		}
		return url;
	},

};

})(jQuery);


(function(a) {
    AC.extend("utils", {
        Cache: function() {
            this.data = {};
            return this;
        },
    });
    AC.extend("utils.Cache.prototype", {
        get: function(k){
            return this.data[k];
        },
        set: function(k, v){
            this.data[k] = v;
        },
    });
})($j || jQuery);


(function(a) {
	// @MOVE to Flight redirect page
	var spinnerOptions = {
		lines: 13,
		length: 20,
		width: 4,
		radius: 15,
		corners: 1,
		rotate: 0,
		direction: 1,
		speed: 1.2,
		trail: 76,
		shadow: false,
		hwaccel: true,
		className: 'spinner',
		zIndex: 1,
		color: 'rgba(0,0,0,.6)',
	};
    AC.extend("utils", {
        redirect: function(data) {
            this.data = a.extend({}, redirect_params, data);
            this.init();
            return this;
        },
    });
    AC.extend("utils.redirect.prototype", {
        init: function(){
        		this.spinner = new Spinner(spinnerOptions).spin();
        		this.spinWrapper = a('#spin-wrapper');
        		this.when = a('#redirect-when');
        		this.errors = a('#errors');
        	this.spinWrapper.append(this.spinner.el);

			this.errors.html('');
			if (typeof this.data['deep_url'] != 'undefined') {
				this.when.html(gettext('now'));
				window.location = url_params.url;
				return false;
			}
			this.when.html(gettext('shortly'));

            var that = this,
                promise = this.requestRedirectURL();
            promise.done(function(data) {
                if (typeof data.url != "undefined" && data.url != null) {
					window.location = data.url;
                }else{
                    failed();
                }
            });
			var failed = function(){
                    that.spinner.spin(false);
                    that.spinWrapper.fadeOut();
                    that.errors.html(gettext('Sorry - Hit a problem finding fares for your requested flight. Please try again.'));
			};
            promise.fail(function() {
				failed();
            });
        },
        requestRedirectURL: function() {
        	AC.utils.ajaxCSRFSetup();
            var promise = a.ajax({
                type: "POST",
                data: JSON.stringify(this.data),
                url: AC.get_settings('flight.path.api.deeplink'),
                contentType: "application/json;charset=utf-8",
            });
            return promise;
        },
    });
})($j || jQuery);


(function(a) {
    AC.extend("utils", {
        ajaxsend: function(el) {
        	this.el = a(el);
            this.init();
            return this;
        },
    });
    AC.extend("utils.ajaxsend.prototype", {
    	handleSubmit: function(){
    		this.errors.html('').hide();
    		this.is_posting = true;
    		this.btn.addClass('ac-loading');
    		var that = this,
                promise = this.requestAjaxPost();
            promise.done(function(data) {
            	that.btn.removeClass('ac-loading');
            	if (typeof data['success'] != 'undefined') {
					if (data['success'] == false) {
						var errors = data['errors'][0];
						a.each( errors, function( key, value ) {
						 	var input = a('*[name="'+key+'"]', that.el);
						 	input.closest('.form-group').addClass('aj-error').find('.field-error').text(value).fadeIn();
						});
						return false;
					}
            	}
            	that.el.find('.hide-on-send').fadeOut(300, function(){
            		that.el.find('.show-on-success').fadeIn();
            	});
            });
            promise.fail(function() {
				that.handleFailed();
            });
            return false;
    	},
        init: function(){
        	this.errors = this.el.find('.field-error');
        	this.is_posting = false;
        	var that = this;
        	this.el.on('submit', function(){
        		if (!that.is_posting){
        			return that.handleSubmit();
        		}
        		return false;
        	});
        	this.btn = this.el.find('.ac-w-loader');
        	this.btn.on('click', function(){
				that.handleSubmit();
        	});
        },
        handleFailed: function(){
        	this.errors.html(gettext('Sorry - Hit a problem finding fares for your requested flight. Please try again.'));
        },
        requestAjaxPost: function() {
            var promise = a.ajax({
                type: "POST",
                data: this.el.serialize(),
                url: this.el.attr('action'),
                contentType: "application/x-www-form-urlencoded",
            });
            return promise;
        },
    });
    a(function() {
    	a('form.ajax-send').each(function(){
    		new AC.utils.ajaxsend(a(this));
    	});
    })

	// Scroll to
	a.fn.scrollTo = function( target, options, callback ){
	  if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
	  var settings = a.extend({
		scrollTarget  : target,
		offsetTop     : 50,
		duration      : 500,
		easing        : 'swing'
	  }, options);
	  return this.each(function(){
		var scrollPane = a(this);
		var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : a(settings.scrollTarget);
		var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
		scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
		  if (typeof callback == 'function') { callback.call(this); }
		});
	  });
	}
})($j || jQuery);

(function(a) {
    AC.extend("utils", {
        heroSlider: function() {
        	this.heroSliderWrap = a('.hero-slider');
        	this.slider = a('#hero-bg');
        	this.sliderTitle = a('#hero-slider-title');
            this.init();
            return this;
        },
    });
    AC.extend("utils.heroSlider.prototype", {
        init: function(){
        	this.counter = -1;
        	this.new_id = null;
        	this.newSliderData = null;
        	this.loadNextSlide();
        },
        handleFailed: function(){
        	// @Log faile
        },
        getTime: function() {
        	return new Date().getTime();
        },
        doOnSliderImageLoad: function() {
        	var that = this;
        	this.new_id = 'ac-dynslider-bg-' + that.counter;
			var newSlide = a("<div>", {id: this.new_id}).css({'background-image':'url('+this.newSliderData['url']+')'})
				newTitle = '';
			if (this.newSliderData['title']) {
				newTitle += this.newSliderData['title'] + ', ';
			}
			if (this.newSliderData['city']) {
				newTitle += this.newSliderData['city'] + ', ';
			}
			if (this.newSliderData['country']) {
				newTitle += this.newSliderData['country'];
			}
			var nextShow = 5000 - (this.getTime() - this.lastFetch);
			if (nextShow <0)
				nextShow = 0
			setTimeout(function(){
				that.showNextSlide(newSlide, newTitle)
			}, nextShow);
        },
        showNextSlide: function(newSlide, newTitle) {
        	var that = this;
			if (this.counter > 0){
				this.slider.prepend(newSlide);
				a('#'+this.old_id).fadeOut(300, function() {
					a(this).remove();
					that.sliderTitle.html('<i class="ac-icon icon-info"></i><i>' + newTitle + '</i>');
					that.loadNextSlide();
				})
			}else{
				this.heroSliderWrap.css({'background': 'transparent'});
				newSlide.css('display', 'none');
				this.slider.append(newSlide);
				a('#'+this.new_id).fadeIn(500);
				this.sliderTitle.html('<i class="ac-icon icon-info"></i><i>' + newTitle + '</i>');
				this.loadNextSlide();
			}
        },
        loadNextSlide: function(){
        	if (this.counter == 40)
        		return
        	this.counter +=1;
        	this.old_id = this.new_id;
    		var that = this,
                promise = this.requestNextSlider();
            this.lastFetch = this.getTime();

            promise.done(function(data) {
            	that.newSliderData = data;
				var slideIMG = new Image();
				slideIMG.onload = function(){
					that.doOnSliderImageLoad()
				}
				slideIMG.src = data['url'];
            });
            promise.fail(function() {
				that.handleFailed();
            });
        },
        requestNextSlider: function() {
        	var params = '';
        	// @DEBUG
        	if (AC.g.mobile) {
        		params = '?mobile';
        	}
            var promise = a.ajax({
                type: "GET",
                url: AC.get_settings('base.path.dynslider') + '/' + this.counter +'.json' + params,
                contentType: "application/json;charset=utf-8",
            });
            return promise;
        },
    });
})($j || jQuery);

// t: current time, b: begInnIng value, c: change In value, d: duration
jQuery.easing['jswing'] = jQuery.easing['swing'];

jQuery.extend( jQuery.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert(jQuery.easing.default);
		return jQuery.easing[jQuery.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - jQuery.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return jQuery.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return jQuery.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});
