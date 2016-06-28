/*
 * DiamondComposer > Views > Block
 *
 * @author Amir Khakshour
 * @copyright 2015 DiamondLayers
 */
(function ( $ ) {
    var  db = Diamond.Builder,
        tools = db.Utils,
        Shortcodes = db.shortcodeCollections;

    db.Views.Block = Backbone.View.extend({
        tagName:'div',
        className:'db_bootstrap_modals',
        template:_.template($('#db-elements-list-modal-template').html() || '<div></div>'),
        data_saved: false,
        events:{
            'click .db-shortcode-sel':'createElement',
            'click .close':'close',
            'hidden':'removeView',
            'shown':'setupShown',
            'click .db-categories-filter [data-filter]':'filterElements',
            'keyup .db-search-categories':'filterElements'
        },
        initialize:function () {
            if (_.isUndefined(this.model)) this.model = {position_to_add:'end'};
        },
        render:function () {
            var that = this,
                $container = this.container.$content,
                item_selector,
                $list,
                tag,
                not_in;

            var settings = Drupal.settings.acquiaModalStyle;
            settings['modalSize']['width'] = .8;
            settings['modalSize']['height'] = .8;
            db.modal = Diamond.Modal.show(settings);
            Diamond.Modal.modal_display(null, {title: i18nLocale.elements_list_modal_header, output: $('#db-elements-list-modal-template').html()});
            this.setElement(db.modal.modal);
            $('.db-search-categories').focus();

            this.template = $('#db-elements-list');
            var $list = this.$el.find('.db-elements-list'),
                item_selector = '.db-shortcode-sel',
                tag = this.container.model ? this.container.model.get('shortcode') : false,
                not_in = this._getNotIn(tag),
                as_parent = tag && !_.isUndefined(db.map[tag].as_parent) ? db.map[tag].as_parent : false;

            this.$content = this.$el.find( '.db-elements-list' );
            this.$content.addClass( 'db-no-filter' );
            this.$content.attr( 'data-filter', '*' );

            if (_.isObject(as_parent)) {
                var parent_selector = [];
                if (_.isString(as_parent.only)) {
                    parent_selector.push(_.reduce(as_parent.only.split(','), function (memo, val) {
                        return ( _.isEmpty(memo) ? '' : ',') + '[data-element="' + val + '"]';
                    }, ''));
                }
                if (_.isString(as_parent.except)) {
                    parent_selector.push(_.reduce(as_parent.except.split(','), function (memo, val) {
                        return ( _.isEmpty(memo) ? '' : ',') + '[data-element!="' + val + '"]';
                    }, ''));
                }
                item_selector = parent_selector.join(',');
            } else {
                item_selector += not_in;
            }

            if (tag !== false && tag !== false && !_.isUndefined(db.map[tag].allowed_container_element)) {
                if (db.map[tag].allowed_container_element === false) {
                    item_selector += ':not([data-is-container=true])';
                } else if (_.isString(db.map[tag].allowed_container_element)) {
                    item_selector += ':not([data-is-container=true][data-element!=' + db.map[tag].allowed_container_element + '])';
                }
            }
            $('.db-categories-filter .isotope-filter a:first', $list).trigger('click');
            $('[data-filter]', this.$el).each(function () {
                if (!$($(this).data('filter') + ':visible', $list).length) $(this).hide();
            });
            return this;
        },
        _getNotIn:_.memoize(function (tag) {
            var selector = _.reduce(db.map, function (memo, shortcode) {
                var separator = _.isEmpty(memo) ? '' : '|';
                if (_.isObject(shortcode.as_child)) {
                    if (_.isString(shortcode.as_child.only)) {
                        if (!_.contains(shortcode.as_child.only.split(','), tag)) {
                            memo += separator + '[data-element=' + shortcode.base + ']';
                        }
                    }
                    if (_.isString(shortcode.as_child.except)) {
                        if (_.contains(shortcode.as_child.except.split(','), tag)) {
                            memo += separator + '[data-element=' + shortcode.base + ']';
                        }
                    }
                } else if (shortcode.as_child === false) {
                    memo += separator + '[data-element=' + shortcode.base + ']';
                }
                return memo;
            }, '');

            return _.isEmpty(selector) ? '' : ':not(' + selector + ')';
        }),
        filterElements:function (e) {
            e.stopPropagation();
            e.preventDefault();
            var $control = $( e.currentTarget ),
                filter = '.db-shortcode-sel',
                name_filter = $( '.db-search-categories' ).val();
            this.$content.removeClass( 'db-no-filter' );
            if ( $control.is( '[data-filter]' ) ) {
                $( '.db-categories-filter .isotope-filter .active', this.$content ).removeClass( 'active' );
                $control.parent().addClass( 'active' );
                var filter_value = $control.data( 'filter' );
                filter += filter_value;
                if ( filter_value == '*' ) {
                    this.$content.addClass( 'db-no-filter' );
                } else {
                    this.$content.removeClass( 'db-no-filter' );
                }
                this.$content.attr( 'data-filter', filter_value.replace( '.category-', '' ) );
                $('.db-search-categories').val( '' );
            } else if ( name_filter.length > 0 ) {
                filter += ":containsi('" + name_filter + "')";
                $( '.db-categories-filter .isotope-filter .active', this.$content ).removeClass( 'active' );
                this.$content.attr( 'data-filter', 'name:' + name_filter );
            } else if ( name_filter.length == 0 ) {
                $( '.db-categories-filter .isotope-filter [data-filter="*"]' ).parent().addClass( 'active' );
                this.$content.attr( 'data-filter', '*' );
                this.$content.addClass( 'db-no-filter' );
            }
            $( '.visible', this.$content ).removeClass( 'visible' );
            $( filter, this.$content ).addClass( 'visible' );
        },

        createElement:function (e) {
            e.preventDefault();
            var model,
                column,
                row,
                $button = $(e.currentTarget),
                tag = $button.data('element');
            if (this.container.$content.is('#db-visual')) {
                row = Shortcodes.create({shortcode:'ac_row'});
                column = Shortcodes.create({shortcode:'ac_col', params:{width:'1/1'}, parent_id:row.id, root_id:row.id });
                if (tag != 'ac_row') {
                    model = Shortcodes.create({
                        shortcode:tag,
                        parent_id:column.id,
                        params:tools.getDefaults(tag),
                        root_id:row.id
                    });
                } else {
                    model = row;
                }
            } else {
                if (tag == 'ac_row') {
                    row = model = Shortcodes.create({
                        shortcode:'ac_row_inner',
                        parent_id:this.container.model.id,
                        order:(this.model.position_to_add == 'start' ? this.getFirstPositionIndex() : Shortcodes.getNextOrder())
                    });
                    Shortcodes.create({shortcode:'ac_col_inner', params:{width:'1/1'}, parent_id:row.id, root_id:row.id });
                } else {
                    model = Shortcodes.create({
                        shortcode:tag,
                        parent_id:this.container.model.id,
                        order:(this.model.position_to_add == 'start' ? this.getFirstPositionIndex() : Shortcodes.getNextOrder()),
                        params:tools.getDefaults(tag),
                        root_id:this.container.model.get('root_id')
                    });
                }
            }
            this.show_settings = _.isBoolean(db.map[$button.data('element')].show_settings_on_create) && db.map[$button.data('element')].show_settings_on_create === false ? false : true;
            this.model = model;
            this.close();
        },
        getFirstPositionIndex:function () {
            db.element_start_index -= 1;
            return db.element_start_index;
        },
        removeView:function () {
            if (this.selected_model && this.selected_model.get('shortcode') != 'ac_row' && this.selected_model.get('shortcode') != 'ac_row_inner') {
                var settings_view = new db.Views.Settings({model:this.selected_model});
                settings_view.show();
            }
            this.remove();
        },
        setupShown:function () {
            $('.db-search-categories').focus();
        },
        show:function (container) {
            this.container = container;
            this.render();
        },
        close:function () {
            db.modal.dismiss();
            if (!_.isUndefined(this.model)){
                var settings_view = new db.Views.Settings({model:this.model});
                settings_view.show();
            }
        }
    });
})( window.jQuery );

