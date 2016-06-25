/**
 * @file Acquia services
 * Bind Behaviours to the base search form.
 */
(function(a) {
    AC.extend("Service", {
        // Base
        Base: function(url) {
            this.serviceBaseURL = url;
            this.init();
            return this;
        },
    });

    AC.extend("Service.Base.prototype", {
        init: function(){
            this.cache = new AC.utils.Cache();
        },
        outputErr: function(msg){
            if (typeof console !== 'undefined' && !!console.error) {
                console.error(msg);
            }
        },
        getURL: function(params, path, baseURL) {
            if (path === void 0) {
                path = '';
            }
            if (baseURL === void 0) {
                baseURL = this.serviceBaseURL;
            }
            return baseURL + path + '?' + $j.param(params);
        },
        getAPIEndpoint: function() {
            return AC.get_settings('flight.path.api.base');
        },
        /**
         * Set cookie
         *
         * @param string {name} cookie key
         * @param string {value} cookie value
         * @param string {domain} domain to set cookie for
         * @param int {expires} cookie expires time
         * @param string {path} cookie path
         */
        setCookie: function(name, value, domain, expires, path, secure) {
            if (domain === void 0) {
                domain = '';
            }
            if (expires === void 0) {
                expires = 365;
            }
            if (path === void 0) {
                path = '/';
            }
            if (secure === void 0) {
                secure = '';
            }
            var today = new Date();
            today.setTime(today.getTime());
            if (expires)
                expires = expires * 1000 * 60 * 60 * 24;
            var expiresDate = new Date(today.getTime() + (expires));
            document.cookie = name + "=" + escape(value) + ((expires) ? ";expires=" + expiresDate.toGMTString() : "") + ((path) ? ";path=" + path : "") + ((domain) ? ";domain=" + domain : "") + ((secure) ? ";secure" : "");
        },
        /**
         * Get cookie
         */
        getCookie: function(key) {
            var start = document.cookie.indexOf(name + "=");
            var len = start + name.length + 1;
            if ((!start) && (name != document.cookie.substring(0, name.length))) {
                return null;
            }
            if (start == -1)
                return null;
            var end = document.cookie.indexOf(";", len);
            if (end == -1)
                end = document.cookie.length;
            return unescape(document.cookie.substring(len, end));
        },
    });

    AC.extend("Service", {
        // Flight service
        Airport: function(culture) {
            AC.Service.Base.call(this, this.getAPIEndpoint());
            this.culture = culture;
            return this;
        },
    });
    __extends(AC.Service.Airport, AC.Service.Base);

    AC.extend("Service.Airport.prototype", {
        getAPIEndpoint: function() {
            return AC.get_settings('flight.path.api.airport');
        },
        LookupCities: function(text, maxCount, onLoad, onError, context) {
            context = context || this;
            _that = this;
            onError = onError || function(options) {};
            var cacheKey = "lookup:" + text.toUpperCase() + '-' + maxCount;
            var results = this.cache.get(cacheKey);
            if (!!results) {
                onLoad(results);
                return;
            }
            if (!!context.jXHR)
                context.jXHR.abort();
            context.jXHR = $j.ajax({
                url: this.getURL({
                    query: text,
                    maxCount: maxCount,
                    cultureCode: this.culture
                }),
                dataType: 'json',
                type: 'GET',
                success: function(results) {
                    var sanitizedResult = _that.sanitizeLookupResult(results);
                    _that.cache.set(cacheKey, sanitizedResult);
                    onLoad(sanitizedResult);
                },
                error: function(jqx, status, error) {
                    if (status !== 'abort')
                        onError(arguments);
                }
            });
        },
        sanitizeLookupResult: function(results) {
            var mainCity;
            for (var i = 0, len = results.length; i < len; i++) {
                var result = results[i];
                if (result.Type === 1) {
                    mainCity = result;
                } else if (!!mainCity && result.MainCityCode === mainCity.Iata) {
                    mainCity.IsParent = true;
                    result.IsChild = true;
                }
            }

            return results;
        },
        GetCityByIata: function(code, onLoad, onError, context) {
            var _this = this;
            onError = onError || function() {};
            context = context || this;
            if (!!context.jXHR)
                context.jXHR.abort();
            var requestCode = code.slice(0, 3);
            var requestUrl = this.getURL({
                iataCode: requestCode,
                cultureCode: this.culture
            });
            context.jXHR = jQuery.ajax({
                url: requestUrl,
                dataType: 'json',
                type: 'GET',
                success: function(result) {
                    if (result.Type === 3 && /-{1}/.exec(code)) {
                        result.Iata = code;
                        result.Type = 2;
                    }
                    onLoad(result);
                },
                error: function(jqx, status, error) {
                    if (status !== 'abort')
                        _this.outputErr('Failed to retrieve airport');
                }
            });
        },
        /**
         * Persist model data
         * @see SearchFormFlight.prototype.persistModel
         * @CHANGE
         */
        PersistModel: function(value) {
            var cookieDomain = '';
            var cookieValue = value instanceof Array ? value.join('&') : value;
            this.setCookie(AC.get_settings('flight.search.cookie_key'), cookieValue, cookieDomain);
        },
        /**
         * Get persisted model data
         */
        GetPersistedModel: function() {
            return this.getCookie(AC.get_settings('flight.search.cookie_key'));
        },
    });

    AC.extend("Service", {
        // Flight service
        City: function(culture) {
            AC.Service.Base.call(this, this.getAPIEndpoint());
            this.culture = culture;
            return this;
        },
    });
    __extends(AC.Service.City, AC.Service.Base);

    AC.extend("Service.City.prototype", {
        getAPIEndpoint: function() {
            return AC.get_settings('flight.path.api.city');
        },
        LookupCities: function(text, maxCount, onLoad, onError, context) {
            context = context || this;
            _that = this;
            onError = onError || function(options) {};
            var cacheKey = "lookup:" + text.toUpperCase() + '-' + maxCount;
            var results = this.cache.get(cacheKey);
            if (!!results) {
                onLoad(results);
                return;
            }
            if (!!context.jXHR)
                context.jXHR.abort();
            context.jXHR = $j.ajax({
                url: this.getURL({
                    query: text,
                    maxCount: maxCount,
                    cultureCode: this.culture
                }),
                type: 'GET',
                success: function(results) {
                    _that.cache.set(cacheKey, results);
                    onLoad(results);
                },
                error: function(jqx, status, error) {
                    if (status !== 'abort')
                        onError(arguments);
                }
            });
        },
    });

})($j || jQuery);



