/*
 * DiamondComposer > Views > Shortcode
 *
 * @author Amir Khakshour
 * @copyright 2015 DiamondLayers
 */
(function ( $ ) {
    var db = Diamond.Builder,
        sc = db.shortcodeCollections;

    db.Views.Shortcode = Backbone.View.extend({
        tagName:'div',
        $content:'',
        use_default_content:false,
        params:{},
        events:{
            'click .col-delete':'deleteShortcode',
            'click .col-add':'addElement',
            'click .col-edit, .col-edit_trigger':'editElement',
            'click .col-clone':'clone',
            'click .col-toggle':'toggleElement',
        },
        removeView:function () {
            this.remove();
        },
        initialize:function () {
            this.model.bind('destroy', this.removeView, this);
            this.model.bind('change:params', this.changeShortcodeParams, this);
            this.model.bind('change_parent_id', this.changeShortcodeParent, this);
            this.createParams();
        },
        createParams:function () {
            var tag = this.model.get('shortcode'),
                params = _.isObject(db.map[tag]) && _.isArray(db.map[tag].params) ? db.map[tag].params : [];
            _.each(params, function (param) {
                this.params[param.param_name] = param;
            }, this);
        },
        setContent:function () {
            this.$content = this.$el.find('> .db-visual-sc > .db-parent');
        },
        setEmpty:function () {
        },
        unsetEmpty:function () {

        },
        checkIsEmpty:function () {
            if (this.model.get('parent_id')) {
                db.app.views[this.model.get('parent_id')].checkIsEmpty();
            }
        },
        /**
         * Convert html into correct element
         * @param html
         */
        html2element:function (html) {
            var attributes = {},
                $template;
            if (_.isString(html)) {
                this.template = _.template(html);
                $template = $(this.template(this.model.toJSON()).trim());
            } else {
                this.template = html;
                $template = html;
            }
            _.each($template.get(0).attributes, function (attr) {
                attributes[attr.name] = attr.value;
            });
            this.$el.attr(attributes).html($template.html());
            this.setContent();
            this.renderContent();
        },
        render:function () {
            var $sc_template_el = $('#db-sc-template-' + this.model.get('shortcode'));
            if ($sc_template_el.is('script')) {
                this.html2element( _.template( $sc_template_el.html(),
                    this.model.toJSON(),
                    db.templateOptions.default ) );
            } else {
                var params = this.model.get('params');
                $.ajax({
                    type:'POST',
                    url:window.ajaxurl,
                    data:{
                        action:'db_get_element_backend_html',
                        data_element:this.model.get('shortcode'),
                        data_width:_.isUndefined(params.width) ? '1/1' : params.width
                    },
                    dataType:'html',
                    context:this
                }).done(function (html) {
                    this.html2element(html);
                });
            }
            return this;
        },
        renderContent:function () {
            this.$el.attr('data-mid', this.model.get('id'));
            this.$el.data('model', this.model);
            return this;
        },
        changedContent:function (view) {

        },
        _loadDefaults:function () {
            var tag = this.model.get('shortcode');
            if (this.use_default_content === true && _.isObject(db.map[tag]) && _.isString(db.map[tag].default_content) && db.map[tag].default_content.length) {
                this.use_default_content = false;
                sc.createFromString(db.map[tag].default_content, this.model);
            }
        },
        _callJsCallback:function () {
            //Fire INIT callback if it is defined
            var tag = this.model.get('shortcode');
            if (_.isObject(db.map[tag]) && _.isObject(db.map[tag].js_callback) && !_.isUndefined(db.map[tag].js_callback.init)) {
                var fn = db.map[tag].js_callback.init;
                window[fn](this.$el);
            }
        },
        ready:function (e) {
            this._loadDefaults();
            this._callJsCallback();
            if (this.model.get('parent_id') && _.isObject(db.app.views[this.model.get('parent_id')])) {
                db.app.views[this.model.get('parent_id')].changedContent(this);
            }
            return this;
        },
        // View utils {{
        addShorcode: function (model) {
            var view = new ShortcodeView({model:model});
            this.$content.append(view.render().el);
            app.setSortable();
        },
        changeShortcodeParams:function (model) {
            var params = model.get('params'),
                settings = db.map[model.get('shortcode')],
                inverted_value;
            if (_.isArray(settings.params)) {
                _.each(settings.params, function (p) {
                    var name = p.param_name,
                        value = params[name],
                        $wrapper = this.$el.find('> .db-visual-sc'),
                        label_value = value,
                        $admin_label = $wrapper.children('.admin_label_' + name);
                    //
                    //if (_.isObject(vc.atts[p.type]) && _.isFunction(vc.atts[p.type].render)) {
                    //    value = vc.atts[p.type].render.call(this, p, value);
                    //}
                    if ($wrapper.children('.' + p.param_name).is('div, h1,h2,h3,h4,h5,h6, span, i, b, strong, button')) {
                        $wrapper.children('[name=' + p.param_name + ']').html(value);
                    } else if ($wrapper.children('.' + p.param_name).is('img, iframe')) {
                        $wrapper.children('[name=' + p.param_name + ']').attr('src', value);
                    } else {
                        $wrapper.children('[name=' + p.param_name + ']').val(value);
                    }
                    if ($admin_label.length) {
                        if (_.isObject(p.value) && !_.isArray(p.value) && p.type == 'checkbox') {
                            inverted_value = _.invert(p.value);
                            label_value = _.map(value.split(/[\s]*\,[\s]*/),function (val) {
                                return _.isString(inverted_value[val]) ? inverted_value[val] : val;
                            }).join(', ');
                        } else if (_.isObject(p.value) && !_.isArray(p.value)) {
                            inverted_value = _.invert(p.value);
                            label_value = _.isString(inverted_value[value]) ? inverted_value[value] : value;
                        }

                        if (_.isUndefined(label_value)) {
                            label_value = window.i18nLocale.n_a;
                        }
                        $admin_label.html('<label>' + $admin_label.find('label').text() + '</label>: ' + label_value);
                        //if (value !== '' && !_.isUndefined(value))
                        //    $admin_label.show().removeClass('hidden-label');
                        //else
                        //    $admin_label.hide().addClass('hidden-label');
                    }
                }, this);
            }
            if (this.model.get('parent_id') !== false && _.isObject(view = db.app.views[this.model.get('parent_id')])) {
                view.checkIsEmpty();
            }
        },
        changeShortcodeParent:function (model) {
            if (this.model.get('parent_id') === false) return model;
            var $parent_view = $('[data-mid=' + this.model.get('parent_id') + ']'),
                view = db.app.views[this.model.get('parent_id')];
            this.$el.appendTo($parent_view.find('> .db-visual-sc > .db-column-container'));
            view.checkIsEmpty();
        },
        // }}
        // Event Actions {{
        deleteShortcode:function (e) {
            if (_.isObject(e)) e.preventDefault();
            var answer = confirm(i18nLocale.press_ok_to_delete_section);
            if (answer === true) this.model.destroy();
        },

        addElement:function (e) {
            if (_.isObject(e)) e.preventDefault();
            new db.Views.Block({model:{position_to_add:!_.isObject(e) || !$(e.currentTarget).closest('.bottom-controls').hasClass('bottom-controls') ? 'start' : 'end'}}).show(this);
        },
        editElement:function (e) {
            if (_.isObject(e)) e.preventDefault();
            var settings_view = new db.Views.Settings({model:this.model});
            settings_view.show();
        },
        clone:function (e) {
            if (_.isObject(e)) e.preventDefault();
            db.clone_index = db.clone_index / 10;
            return this.cloneModel(this.model, this.model.get('parent_id'));
        },
        toggleElement:function (e) {
            if (_.isObject(e)) e.preventDefault();
            $(e.currentTarget).toggleClass('active');
            this.$el.toggleClass('toggled');
            this.$el.find('.db-visual-sc:first').toggle();

            view = this.getParentRow(this.model);
            if (view) {
                view.sizeRows();
            }
        },
        getParentRow: function(model){
            if (model.get('parent_id')) {
                var view = db.app.views[model.get('parent_id')];
                if (view.model.get('shortcode').match(/^vc\_row/)) {
                    return view;
                }else {
                    return this.getParentRow(view.model);
                }
            }
            return false;
        },
        cloneModel:function (model, parent_id, save_order) {
            var shortcodes_to_resort = [],
                new_order = _.isBoolean(save_order) && save_order === true ? model.get('order') : parseFloat(model.get('order')) + db.clone_index,
                model_clone = sc.create({shortcode:model.get('shortcode'), id: db.Utils.guid(), parent_id:parent_id, order:new_order, cloned:true, cloned_from:model.toJSON(), params:_.extend({}, model.get('params'))});
            _.each(sc.where({parent_id:model.id}), function (shortcode) {
                this.cloneModel(shortcode, model_clone.get('id'), true);
            }, this);
            return model_clone;
        }
        // }}
    });
})( window.jQuery );
