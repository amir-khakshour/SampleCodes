/*
 * DiamondComposer > Views > Base View
 *
 * @author Amir Khakshour
 * @copyright 2015 DiamondLayers
 */
(function ( $ ) {
    var db = Diamond.Builder,
        store = db.storage,
        sc = db.shortcodeCollections || {},
        tools = db.Utils;

    db.Views.Base = Backbone.View.extend({
        el:'#db-container',
        views:{},
        events:{
            "click #db-add-new-row":'createRow',
            'click .db-not-empty-add-element, .add-element-to-layout':'addElement',
            'click #db-add-new-element':'addElement',
            'click .add-text-block-to-content':'addTextBlock',
            'click .db-switch':'switchComposer',
            'click #save-template-btn':'saveTemplate',
            'click [data-template_id]':'loadTemplate',
            'click .remove-template':'removeTemplate',
            'click #db-convert':'convert',
            'click #db-save-post':'save'
        },
        initialize:function () {
            sc = db.shortcodeCollections;
            this.accessPolicy = '';
            if (this.accessPolicy == 'no') return false;
            this.buildRelevance();
            _.bindAll(this, 'switchComposer', 'dropButton', 'processScroll', 'updateRowsSorting', 'updateElementsSorting');
            sc.bind('add', this.addShortcode, this);
            sc.bind('destroy', this.checkEmpty, this);
            sc.bind('reset', this.addAll, this);
            this.render();
        },
        render:function () {
            this.$switchButton = $('<a class="db-switch acquia-button" href="#">'
                + '<i class="icon"></i>'
                + '<span>' + window.i18nLocale.builder_switch_btn + '</span>'
                + '</a>').insertBefore('.db-container').wrap('<p class="db-switch-wrapper" />');

            this.$switchButton.click(this.switchComposer);
            this.$metablock_content = $('.db-content');
            this.$content = $("#db-visual");
            // @CONVERTED
            this.$post = this.$el.closest('.text-format-wrapper').find('.form-type-textarea, .filter-wrapper');
            this.mceID = this.$el.parent('#db-wrapper').next('.form-type-textarea').find('textarea.form-textarea').attr('id');
            db.mceID = this.mceID;
            this.$vcStatus = $('#db_vc_js_status');
            this.$loading_block = $('.db-loading');
            this.setSortable();
            this.setDraggable();
            return this;
        },
        addAll:function () {
            this.views = {};
            this.$content.removeClass('loading').html('');
            sc.each(function (shortcode) {
                this.appendShortcode(shortcode);
                this.setSortable();
            }, this);
            this.checkEmpty();
            this.$loading_block.hide();
        },
        getView:function (model) {
            var view;
            if (_.isObject(db.map[model.get('shortcode')]) && _.isString(db.map[model.get('shortcode')].views) && db.map[model.get('shortcode')].views.length) {
                view = new window[db.map[model.get('shortcode')].views]({model:model});
            } else {
                view = new db.Views.Shortcode({model:model});
            }
            model.set({view: view});
            return view;
        },
        setDraggable:function () {
            this.$content.droppable({
                greedy:true,
                accept:".dropable_el,.dropable_row",
                hoverClass:"db_ui-state-active",
                drop:this.dropButton
            });
        },
        dropButton:function (event, ui) {
            if (ui.draggable.is('#db-add-new-element')) {
                this.addElement();
            } else if (ui.draggable.is('#db-add-new-row')) {
                this.createRow();
            }
        },
        appendShortcode:function (model) {
            var view = this.getView(model),
                position = model.get('order'),
                $element_to_add = model.get('parent_id') !== false ?
                    this.views[model.get('parent_id')].$content :
                    this.$content;
            this.views[model.id] = view;
            if (model.get('parent_id')) {
                var parent_view = this.views[model.get('parent_id')];
                parent_view.unsetEmpty();
            }
            $element_to_add.append(view.render().el);
            view.ready();
            view.changeShortcodeParams(model); // Refactor
            view.checkIsEmpty();
            this.setNotEmpty();
        },
        addShortcode:function (model) {
            var view = this.getView(model),
                position = model.get('order'),
                $element_to_add = model.get('parent_id') !== false ?
                    this.views[model.get('parent_id')].$content :
                    this.$content;
            view.use_default_content = model.get('cloned') !== true;
            this.views[model.id] = view;
            var before_shortcode = _.last(sc.filter(function (shortcode) {
                return shortcode.get('parent_id') === this.get('parent_id') && parseFloat(shortcode.get('order')) < parseFloat(this.get('order'));
            }, model));
            if (before_shortcode) {
                view.render().$el.insertAfter('[data-mid=' + before_shortcode.id + ']');
            } else {
                $element_to_add.prepend(view.render().el);
            }

            if (model.get('parent_id')) {
                var parent_view = this.views[model.get('parent_id')];
                parent_view.checkIsEmpty();
            }
            model.trigger('change:params', model);
            view.ready();
            this.setSortable();
            this.setNotEmpty();
        },
        /**
         * Remove template from server database.
         * @param e - Event object
         */
        removeTemplate:function (e) {
            e.preventDefault();
            var $button = $(e.currentTarget);
            var template_name = $button.closest('.template-item').find('.label').text();
            var answer = confirm(window.i18nLocale.confirm_deleting_template.replace('{template_name}', template_name));
            if (answer) {
                // this.reloadTemplateList(data);
                $.post(window.ajaxurl, {
                    action:'delete_template',
                    template_id:$button.attr('rel')
                });
                $button.closest('.template-item').remove();
            }
        },
        /**
         * Load saved template from server.
         * @param e - Event object
         */
        loadTemplate:function (e) {
            e.preventDefault();
            var $button = $(e.currentTarget);
            $.ajax({
                type:'POST',
                url:window.ajaxurl,
                data:{
                    action:'db_load_template_shortcodes',
                    template_id:$button.attr('data-template_id')
                }
            }).done(function (shortcodes) {
                _.each(db.filters.templates, function (callback) {
                    shortcodes = callback(shortcodes);
                });
                db.storage.append(shortcodes);
                sc.fetch({reset: true});
            });
        },
        convert:function (e) {
            e.preventDefault();
            if (confirm((window.i18nLocale.are_you_sure_convert_to_new_version)))
                $.ajax({
                    type:'POST',
                    url:window.ajaxurl,
                    data:{
                        action:'db_get_convert_elements_backend_html',
                        data:db.storage.getContent()
                    },
                    context:this
                }).done(function (response) {
                    db.storage.setContent(response);
                    db.storage.checksum = false; // To be sure that data will fetched from editor.
                    sc.fetch({reset: true});
                    $('#db_vc_js_interface_version').val('2');
                });
        },
        /**
         * Save current shortcode design as template with title.
         * @param e - Event object
         */
        saveTemplate:function (e) {
            e.preventDefault();
            var name = window.prompt(window.i18nLocale.please_enter_templates_name, ''),
                shortcodes = '',
                data;

            if (_.isString(name) && name.length) {
                shortcodes = db.storage.getContent();
                data = {
                    action:'save_template',
                    template:shortcodes,
                    template_name:name
                };

                this.reloadTemplateList(data);
            }
        },
        reloadTemplateList:function (data) {
            $.post(window.ajaxurl, data, function (html) {
                $('.template-items ul').html(html);
            });
        },
        addTextBlock:function (e) {
            e.preventDefault();
            var row = sc.create({shortcode:'ac_row'}),
                column = sc.create({shortcode:'ac_col', params:{width:'1/1'}, parent_id:row.id, root_id:row.id }),
                text_block = sc.create({shortcode:'ac_col_text', params: tools.getDefaults('ac_col_text'), parent_id:column.id, root_id:row.id });
            return text_block;
        },
        /**
         * Create row
         */
        createRow:function () {
            var row = sc.create({shortcode:'ac_row'});
            sc.create({shortcode:'ac_col', params:{width:'1/1'}, parent_id:row.id, root_id:row.id });
            return row;
        },
        /**
         * Add Element with a help of modal view.
         */
        addElement:function (e) {
            e.preventDefault();
            if (!_.isUndefined(db.modal) && _.isObject(db.modal)) {
                db.modal.dismiss();
            }
            new db.Views.Block({model:{position_to_add:'end'}}).show(this);
        },
        sortingStarted:function (event, ui) {
            $('#db-visual').addClass('sorting-started');
        },
        sortingStopped:function (event, ui) {
            $('#db-visual').removeClass('sorting-started');
        },
        updateElementsSorting:function (event, ui) {
            _.defer(function (app, event, ui) {
                var $current_container = ui.item.parent().closest('[data-mid]'),
                    parent = $current_container.data('model'),
                    model = ui.item.data('model'),
                    models = app.views[parent.id].$content.find('> [data-mid]'),
                    i = 0;
                // Change parent if block moved to another container.
                if (!_.isNull(ui.sender)) {
                    var old_parent_id = model.get('parent_id');
                    store.lock();
                    model.save({parent_id:parent.id});
                    app.views[old_parent_id].checkIsEmpty();
                    app.views[parent.id].checkIsEmpty();
                }
                models.each(function () {
                    var shortcode = $(this).data('model');
                    store.lock();
                    shortcode.save({'order':i++});
                });
                model.save();
            }, this, event, ui);

        },
        updateRowsSorting:function () {
            _.defer(function (app) {
                var $rows = app.$content.find('> .db-ac-row');
                $rows.each(function () {
                    var index = $(this).index();
                    if ($rows.length - 1 > index) store.lock();
                    $(this).data('model').save({'order':index});
                });
            }, this);
        },
        setSortable:function () {
            var that = this;
            $('.db-visual').sortable({
                forcePlaceholderSize:true,
                placeholder:"widgets-placeholder",
                // cursorAt: { left: 10, top : 20 },
                cursor:"move",
                items:"> .db-ac-row", // db-sortablee
                handle:'.col-move',
                distance:0.5,
                start:this.sortingStarted,
                stop:this.sortingStopped,
                update:this.updateRowsSorting,
                over:function (event, ui) {
                    ui.placeholder.css({maxWidth:ui.placeholder.parent().width()});
                },
                start:function (event, ui) {
                    console.log(ui);
                },
            });
            $('.db-column-container').sortable({
                forcePlaceholderSize:true,
                connectWith:".db-column-container",
                placeholder:"widgets-placeholder",
                // cursorAt: { left: 10, top : 20 },
                cursor:"move",
                items:"> .db-sortable", //db-sortable
                distance:0.5,
                tolerance:'pointer',
                start:function ( event, ui ) {
                    $(ui.item).addClass('startSorting');
                    ui.placeholder.css({height: 26});
                    $('#db-visual').addClass('sorting-started');
                    $('.vc_not_inner_content').addClass('dragging_in');
                },
                stop:function (event, ui) {
                    $(ui.item).removeClass('startSorting');
                    $('#db-visual').removeClass('sorting-started');
                    $('.dragging_in').removeClass('dragging_in');
                },
                update:this.updateElementsSorting,
                over:function (event, ui) {
                    var tag = ui.item.data('sc'),
                        parent_tag = ui.placeholder.closest('[data-sc]').data('sc'),
                        allowed_container_element = !_.isUndefined(db.map[parent_tag].allowed_container_element) ? db.map[parent_tag].allowed_container_element : true;

                    if (!db.Utils.check_relevance(parent_tag, tag)) {
                        ui.placeholder.addClass('hidden-placeholder');
                        //return false;
                    }
                    else if (db.map[ui.item.data('sc')].is_container && !(allowed_container_element === true || allowed_container_element === ui.item.data('sc').replace(/_inner$/, ''))) {
                        ui.placeholder.addClass('hidden-placeholder');
                        //return false;
                    }else{
                        ui.placeholder.removeClass('hidden-placeholder');
                        ui.placeholder.css({maxWidth:ui.placeholder.parent().width()});
                    }

                },
                beforeStop:function (event, ui) {
                    var tag = ui.item.data('sc'),
                        parent_tag = ui.placeholder.closest('[data-sc]').data('sc'),
                        allowed_container_element = !_.isUndefined(db.map[parent_tag].allowed_container_element) ? db.map[parent_tag].allowed_container_element : true;
                    if (!db.Utils.check_relevance(parent_tag, tag)) {
                        $('#db-visual').removeClass('sorting-started');
                        return false;
                    }
                    if (db.map[ui.item.data('sc')].is_container && !(allowed_container_element === true || allowed_container_element === ui.item.data('sc').replace(/_inner$/, ''))) { // && ui.item.hasClass('db_container_block')
                        $('#db-visual').removeClass('sorting-started');
                        return false;
                    }
                }
            });
            return this;
        },
        setNotEmpty:function () {
            this.$metablock_content.removeClass('empty');
        },
        setIsEmpty:function () {
            this.$metablock_content.addClass('empty');
        },
        checkEmpty:function (model) {
            if (_.isObject(model) && model.get('parent_id') !== false && model.get('parent_id') != model.id) {
                var parent_view = this.views[model.get('parent_id')];
                parent_view.checkIsEmpty();
            }
            if (this.$content.find('[data-sc]').length === 0) {
                this.setIsEmpty();
            } else {
                this.setNotEmpty();
            }
        },
        switchComposer:function (e) {
            this.$switchButton.toggleClass('on');
            if (_.isObject(e)) e.preventDefault();
            if (this.status == 'shown') {
                if (!_.isUndefined(this.$switchButton)) this.$switchButton.find('span').text(window.i18nLocale.builder_switch_btn);
                this.close();
                this.status = 'closed';
            } else {
                if (!_.isUndefined(this.$switchButton)) this.$switchButton.find('span').text(window.i18nLocale.classic_switch_btn);
                this.show();
                this.status = 'shown';
            }
        },
        show:function () {
            this.$el.show();
            this.$post.hide();
            this.$vcStatus.val("true");
            this.navOnScroll();
            if (db.storage.isContentChanged()) {
                db.app.setLoading();
                db.app.views = {};

                window.setTimeout(function () {
                    sc.fetch({reset: true});
                }, 100);
            }
        },
        setLoading:function () {
            this.setNotEmpty();
            this.$loading_block.show();
        },
        close:function () {
            this.$vcStatus.val("false");
            this.$el.hide();
            this.$post.show();
        },
        checkVcStatus:function () {
            if (this.$vcStatus.val() === 'true' || this.accessPolicy === 'only') {
                this.switchComposer();
            }
        },
        setNavTop:function () {
            this.navTop = $('#builder-main-nav').length && $('#builder-main-nav').offset().top - 28;

        },
        save:function () {
            $('#db-save-post').text(window.i18nLocale.loading);
            $('#publish').click();
        },
        navOnScroll:function () {
            var $win = $(window);
            this.setNavTop();
            this.$nav = $('#builder-main-nav');
            this.processScroll();
            $win.unbind('scroll.composer').on('scroll.composer', this.processScroll);
        },
        processScroll:function (e) {
            this.scrollTop = $(window).scrollTop();
            if (this.scrollTop >= this.navTop && !this.isFixed) {
                this.isFixed = 1;
                this.$nav.addClass('fixed');
            } else if (this.scrollTop <= this.navTop && this.isFixed) {
                this.isFixed = 0;
                this.$nav.removeClass('fixed');
            }
        },
        buildRelevance:function () {
            db.shortcodeRelevance = {};
            _.map(db.map, function (object) {
                if (_.isObject(object.as_parent) && _.isString(object.as_parent.only)) {
                    db.shortcodeRelevance['parent_only_' + object.tag] = object.as_parent.only.split(',');
                }
                if (_.isObject(object.as_parent) && _.isString(object.as_parent.except)) {
                    db.shortcodeRelevance['parent_except_' + object.tag] = object.as_parent.except.split(',');
                }
                if (_.isObject(object.as_child) && _.isString(object.as_child.only)) {
                    db.shortcodeRelevance['child_only_' + object.tag] = object.as_child.only.split(',');
                }
                if (_.isObject(object.as_child) && _.isString(object.as_child.except)) {
                    db.shortcodeRelevance['child_except_' + object.tag] = object.as_child.except.split(',');
                }
            });
        }
    });

    // Init Base View
    $(function(){
        db.app = new db.Views.Base();
        db.app.checkVcStatus();
    });
})( window.jQuery );
