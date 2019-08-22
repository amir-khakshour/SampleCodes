<template>
    <v-dialog ref="dialog" v-model="dialog" fullscreen hide-overlay transition="dialog-bottom-transition" content-class="tbh__calendar__dialog">
        <v-card>
            <ds-calendar-app ref="app"
                             :calendar="calendar"
                             :read-only="readOnly"
                             @change="saveState">

                <template slot="title">
                    Find interview time
                </template>

                <template slot="menuRight">
                    <v-btn icon light @click="$emit('close')">
                        <v-icon>close</v-icon>
                    </v-btn>
                </template>

                <template slot="eventPopover" slot-scope="slotData">
                    <ds-calendar-event-popover
                            v-bind="slotData"
                            :read-only="readOnly"
                            @finish="saveState"
                    ></ds-calendar-event-popover>
                </template>

                <template slot="eventCreatePopover" slot-scope="{placeholder, calendar, close}">
                    <ds-calendar-event-create-popover
                            :calendar-event="placeholder"
                            :calendar="calendar"
                            :close="$refs.app.$refs.calendar.clearPlaceholder"
                            @created="eventCreate"
                            @create-edit="$refs.app.editPlaceholder"
                            @create-popover-closed="saveState"
                    ></ds-calendar-event-create-popover>
                </template>

                <template slot="eventTimeTitle" slot-scope="{calendarEvent, details}">
                    <div>
                        <v-icon class="ds-ev-icon"
                                v-if="details.icon"
                                size="14"
                                :style="{color: details.forecolor}">
                            {{ details.icon }}
                        </v-icon>
                        <strong class="ds-ev-title">{{ details.title }}</strong>
                    </div>
                    <div class="ds-ev-description">{{ getCalendarTime( calendarEvent ) }}</div>
                </template>

            </ds-calendar-app>
        </v-card>
    </v-dialog>
</template>
<script>
    import {Calendar, Weekday, Month} from 'dayspan';
    import Vue from 'vue';

    export default {
        data: () => ({
            storeKey: 'dayspanState',
            calendar: Calendar.days(4),
            readOnly: false,
        }),
        props: {
            dialog: Boolean,
        },
        mounted() {
            this.loadState();
            this.$refs.dialog.fullscreen = true
            document.documentElement.classList.add('overflow-y-hidden');
        },
        methods: {
            eventCreate(created) {
                // this.$emit('date-selected', [created.calendarEvent.start.date, created.calendarEvent.end.date])
                this.$emit('date-selected', created.calendarEvent)
                this.$emit('close')
            },
            getCalendarTime(calendarEvent) {
                let sa = calendarEvent.start.format('a');
                let ea = calendarEvent.end.format('a');
                let sh = calendarEvent.start.format('h');
                let eh = calendarEvent.end.format('h');
                if (calendarEvent.start.minute !== 0) {
                    sh += calendarEvent.start.format(':mm');
                }
                if (calendarEvent.end.minute !== 0) {
                    eh += calendarEvent.end.format(':mm');
                }
                return (sa === ea) ? (sh + ' - ' + eh + ea) : (sh + sa + ' - ' + eh + ea);
            },
            saveState() {
                let state = this.calendar.toInput(true);
                let json = JSON.stringify(state);
                localStorage.setItem(this.storeKey, json);
            },
            loadState() {
                let state = {};
                // try {
                //     let savedState = JSON.parse(localStorage.getItem(this.storeKey));
                //     if (savedState) {
                //         state = savedState;
                //         state.preferToday = false;
                //     }
                // } catch (e) {
                //     // eslint-disable-next-line
                //     console.log(e);
                // }
                // if (!state.events || !state.events.length) {
                //     state.events = this.defaultEvents;
                // }
                // state.events.forEach(ev => {
                //     let defaults = this.$dayspan.getDefaultEventDetails();
                //     ev.data = Vue.util.extend(defaults, ev.data);
                // });
                this.$refs.app.setState(state);
            }
        }
    }
</script>
<style lang="scss">
    .tbh__calendar__dialog {
        overflow: hidden;

        .ds-calendar-container {
            > .ds-gesture-container {
                /*overflow-y: scroll;*/
            }
        }

    }
</style>
