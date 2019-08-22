<template>
    <v-dialog v-model="dialog" :max-width="currentStep == 1 ? 600 : 750" @keydown.esc="cancel()" persistent>
        <v-toolbar color="grey lighten-3" light flat height="75">
            <v-toolbar-title>
                <v-layout row wrap>
                    <div class="talent__card__left mt-2 text-xs-left">
                        <v-avatar :size="avatarSize" class="mb-2">
                            <img :src="avatarUrl(currentTalent)">
                        </v-avatar>
                    </div>
                    <div class="talent__card__right mb-2 mt-1 ml-3 text-xs-left">
                        <div>Schedule interview</div>
                        <div class="body-2">{{currentTalent.display_name}}</div>
                    </div>
                </v-layout>
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <span class="step_of">Step {{currentStep}} of 2</span>
        </v-toolbar>
        <v-stepper v-model="currentStep">
            <v-stepper-header>
                <v-stepper-step step="1" :complete="currentStep > 1">Schedule event</v-stepper-step>
                <v-divider></v-divider>
                <v-stepper-step step="2" :complete="currentStep > 2">Notify attendees</v-stepper-step>
            </v-stepper-header>
            <v-stepper-items>
                <v-stepper-content step="1">
                    <v-btn depressed block color="primary" @click.prevent="calendar_dialog = true">
                        <v-icon left dark>calendar_today</v-icon>
                        Find time
                    </v-btn>
                    <v-container grid-list-md text-xs-center>
                        <v-layout row wrap>
                            <v-flex xs12 md4>
                                <v-menu
                                        ref="date_picker_menu"
                                        v-model="date_picker_menu"
                                        :close-on-content-click="false"
                                        :nudge-right="40"
                                        :return-value.sync="interview_date"
                                        lazy
                                        transition="scale-transition"
                                        offset-y
                                        full-width
                                        min-width="290px"
                                >
                                    <template v-slot:activator="{ on }">
                                        <v-text-field
                                                :value="formattedInterviewDate"
                                                label="Date"
                                                prepend-icon="event"
                                                readonly
                                                v-on="on"
                                        ></v-text-field>
                                    </template>
                                    <v-date-picker v-model="interview_date" no-title scrollable>
                                        <v-spacer></v-spacer>
                                        <v-btn flat color="primary" @click="date_picker_menu = false">Cancel</v-btn>
                                        <v-btn flat color="primary" @click="$refs.date_picker_menu.save(interview_date)">OK</v-btn>
                                    </v-date-picker>
                                </v-menu>
                            </v-flex>
                            <v-flex xs12 md3>
                                <v-menu
                                        ref="time_picker_menu"
                                        v-model="time_picker_menu"
                                        :close-on-content-click="false"
                                        :nudge-right="40"
                                        :return-value.sync="interview_time"
                                        lazy
                                        transition="scale-transition"
                                        offset-y
                                        full-width
                                        max-width="290px"
                                        min-width="290px"
                                >
                                    <template v-slot:activator="{ on }">
                                        <v-text-field
                                                :value="interview_time"
                                                label="time"
                                                prepend-icon="access_time"
                                                readonly
                                                v-on="on"
                                        ></v-text-field>
                                    </template>
                                    <v-time-picker
                                            v-if="time_picker_menu"
                                            v-model="interview_time"
                                            format="24hr"
                                            full-width
                                            @click:minute="$refs.time_picker_menu.save(interview_time)"
                                    ></v-time-picker>
                                </v-menu>
                            </v-flex>
                            <v-flex xs12 md5>
                                <v-text-field
                                        v-model="interview_duration"
                                        label="Duration (minutes)"
                                ></v-text-field>
                            </v-flex>
                            <v-flex xs12>
                                <v-autocomplete
                                        :items="members"
                                        label="interview members"
                                        item-text="full_name"
                                        item-value="uuid"
                                        v-model="interview_members_uuid"
                                        :rules="rules.member"
                                        required
                                        multiple
                                >
                                    <template
                                            slot="selection"
                                            slot-scope="data"
                                    >
                                        <v-chip
                                                :selected="data.selected"
                                                close
                                                class="chip--select-multi"
                                                @input="remove_member(data.item)"
                                        >
                                            <v-avatar>
                                                <img :src="avatarUrl(data.item)">
                                            </v-avatar>
                                            {{ data.item.full_name }}
                                        </v-chip>
                                    </template>
                                    <template
                                            slot="item"
                                            slot-scope="data"
                                    >
                                        <template v-if="typeof data.item !== 'object'">
                                            <v-list-tile-content v-text="data.item"></v-list-tile-content>
                                        </template>
                                        <template v-else>
                                            <v-list-tile-avatar>
                                                <img :src="avatarUrl(data.item)">
                                            </v-list-tile-avatar>
                                            <v-list-tile-content>
                                                <v-list-tile-title v-html="data.item.full_name"></v-list-tile-title>
                                                <v-list-tile-sub-title v-html="data.item.role_name"></v-list-tile-sub-title>
                                            </v-list-tile-content>
                                        </template>
                                    </template>
                                </v-autocomplete>
                            </v-flex>
                            <v-flex xs12>
                                <v-select
                                        :items="interview_types"
                                        v-model="interview_type"
                                        label="interview type"
                                        persistent-hint
                                >
                                </v-select>
                            </v-flex>
                            <v-flex xs12 text-xs-right>
                                <v-btn depressed color="primary" @click.native="currentStep = 2" large>Notify attendees</v-btn>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-stepper-content>
                <v-stepper-content step="2">
                    <v-container grid-list-md>
                        <v-layout row wrap>
                            <v-flex xs12>
                                <v-card class="tbh__card mb-2">
                                    <v-card-title
                                            class="grey lighten-2"
                                            style="padding: 1rem"
                                            primary-title
                                    >
                                        Summary
                                    </v-card-title>
                                    <v-card-text>
                                        <div class="body-2 mb-1">
                                            <b>{{interviewTypeText(interview_type)}}</b> on <b>{{ formattedInterviewDate }}</b>
                                            at <b>{{interview_time}} - {{ interview_end_time }}</b> with <b>{{currentTalent.display_name}}</b>
                                        </div>
                                        <div class="body-2 mb-3">
                                            schedule in talent timezone: <b>{{formattedInterviewScheduleInTalentTZ}}</b>
                                        </div>
                                        <div class="interview_members mb-1">
                                            <v-chip
                                                    v-for="member in selected_members"
                                            >
                                                <v-avatar>
                                                    <img :src="avatarUrl(member)">
                                                </v-avatar>
                                                {{ member.full_name }}
                                            </v-chip>
                                        </div>
                                    </v-card-text>
                                </v-card>
                                <v-card class="tbh__card mb-2">
                                    <v-card-title
                                            class="grey lighten-2"
                                            style="padding: 1rem"
                                            primary-title
                                    >
                                        Email notification to candidate
                                    </v-card-title>
                                    <v-card-text>
                                        <form-input-editor :field="interview_note_candidate"></form-input-editor>
                                    </v-card-text>
                                </v-card>
                                <v-card class="tbh__card mb-2">
                                    <v-card-title
                                            class="grey lighten-2"
                                            style="padding: 1rem"
                                            primary-title
                                    >
                                        Email notification to interviewer(s)
                                    </v-card-title>
                                    <v-card-text>
                                        <form-input-editor :field="interview_note_interviewers"></form-input-editor>
                                    </v-card-text>
                                </v-card>
                            </v-flex>
                            <v-flex xs6 text-xs-left>
                                <v-btn depressed @click.native="currentStep = 1" large>Schedule event</v-btn>
                            </v-flex>
                            <v-flex xs6 text-xs-right>

                                <v-btn depressed color="primary" :loading="submitLoading" large @click.prevent="submitSchedule">Submit</v-btn>
                            </v-flex>
                        </v-layout>
                    </v-container>
                </v-stepper-content>
            </v-stepper-items>
        </v-stepper>
        <template v-if="calendar_dialog">
            <schedule-calendar-dialog :dialog="calendar_dialog" @close="calendar_dialog = false"
                                      @date-selected="set_interview_duration"></schedule-calendar-dialog>
        </template>
    </v-dialog>
</template>
<script>
    import utils from 'Employer/utils'
    import Api from 'Employer/services/Api'
    import moment from 'moment'
    import TalentHelper from "Employer/mixins/TalentHelper";
    import UserHelper from "Employer/mixins/UserHelper";
    import ScheduleCalendarDialog from "./ScheduleCalendarDialog";
    import InterviewHelper from "Employer/mixins/InterviewHelper";
    import FormInputEditor from 'Employer/components/forms/inputs/FormInputEditor'
    import CompanyHelper from "Employer/mixins/CompanyHelper";
    import JobHelper from "Employer/mixins/JobHelper";
    import PageHelper from "Employer/mixins/PageHelper";

    export default {
        mixins: [PageHelper, CompanyHelper, TalentHelper, UserHelper, InterviewHelper, JobHelper],
        props: {
            dialog: Boolean,
        },
        components: {
            ScheduleCalendarDialog,
            FormInputEditor,
        },
        computed: {
            members() {
                return this.$store.getters.getCompanyAdmins
            },
            selected_members() {
                return this.interview_members_uuid && this.interview_members_uuid.length ? this.members.filter((member) => {
                    return this.interview_members_uuid.indexOf(member.uuid) > -1
                }) : []
            },
            formattedInterviewDate() {
                return this.interview_date ? moment(this.interview_date).format('D MMM YYYY') : ''
            },
            formattedInterviewScheduleInTalentTZ() {
                return this.interview_start_dt ? moment(this.interview_start_dt).tz(this.currentTalent.timezone).format('D MMM YYYY HH:mm') : ''
            },
            interview_end_time() {
                if (!this.interview_date || !this.interview_time || !this.interview_duration) {
                    return
                }
                return this.interview_end_dt.format('HH:mm')
            },
            interview_start_dt() {
                return moment(`${moment(this.interview_date).format('D MMM YYYY')} ${this.interview_time}`, 'D MMM YYYY HH:mm')
            },
            interview_end_dt() {
                let interview_start_dt = this.interview_start_dt.clone()
                return interview_start_dt.add(this.interview_duration, 'minutes')
            },
        },
        watch: {
            interview_start_dt() {
                this.set_default_templates()
            },
            interview_end_dt() {
                this.set_default_templates()
            },
            selected_members() {
                this.set_default_templates()
            },
        },
        data: () => ({
            currentStep: 1,
            avatarSize: 46,
            date_picker_menu: false,
            time_picker_menu: false,
            interview_date: moment().add(2, 'hours').format('YYYY-MM-DD'),
            interview_time: moment().add(2, 'hours').format('HH:mm'),
            interview_type: 'O',
            interview_duration: 5,
            calendar_dialog: false,
            interview_members_uuid: [],
            rules: {
                member: [
                    (val) => val && val.length > 0 || 'please select at least a team member'
                ],

            },
            interview_types: utils.dictToSelectOption(AC.get_settings('offer.EVENT_TYPE_CHOICES')),
            color_event: null,
            icon_event: null,
            interview_note_interviewers: {
                value: '',
                required: true,
                flex: 'xs12',
                rules: [
                    (val) => val && val.length > 0 || 'description is required'
                ],
            },
            interview_note_candidate: {
                value: '',
                required: true,
                flex: 'xs12',
                rules: [
                    (val) => val && val.length > 0 || 'description is required'
                ],
            },
            submitLoading: false,
        }),
        mounted() {
            this.interview_members_uuid = [this.$store.getters.getCurrentRole.uuid]
        },
        methods: {
            submitSchedule() {
                this.submitLoading = true
                let interviewers_uuid = []
                Object.values(this.selected_members).forEach((member) => {
                    interviewers_uuid.push(member.uuid)
                })

                let data = {
                    interviewers: interviewers_uuid,
                    start_date: this.interview_start_dt.utc().format(AC.get_settings('user.date_format_js_2_py')),
                    end_date: this.interview_end_dt.utc().format(AC.get_settings('user.date_format_js_2_py')),
                    note_candidate: this.interview_note_candidate.value,
                    note_interviewers: this.interview_note_interviewers.value,
                    color_event: this.color_event,
                    icon_event: this.icon_event,
                    event_type: this.interview_type,
                }

                Api
                    .withCurrentCompany()
                    .withCurrentInterview()
                    .makeRequest({
                        url: 'interview__schedule__root',
                        method: 'post',
                        data: data
                    })
                    .then(response => {
                        if (response) {
                            this.flash('Your message has been sent successfully!', 'success', {
                                timeout: 2000,
                            });
                            this.$emit('close', response)
                        }
                        this.submitLoading = false
                    })
            },
            set_default_templates() {
                this.interview_note_candidate.value = this.interview_note_candidate_template()
                this.interview_note_interviewers.value = this.interview_note_candidate_template(true)
            },
            interview_note_candidate_template(for_team) {
                let interviewers_name = []
                Object.values(this.selected_members).forEach((member) => {
                    interviewers_name.push(member.full_name)
                })
                interviewers_name = interviewers_name.join(', ')

                let formatted_interview_dt = '',
                    formatted_interview_date_talent_tz = ''
                if (this.interview_start_dt && this.interview_end_dt) {
                    formatted_interview_dt = moment(this.interview_start_dt).format('dddd, D MMMM YYYY') + ' at ' +
                        moment(this.interview_start_dt).format('HH:mm') + ' - ' + moment(this.interview_end_dt).format('HH:mm')

                    formatted_interview_date_talent_tz = moment(this.interview_start_dt).tz(this.currentTalent.timezone).format('D MMM YYYY HH:mm')
                }
                let candidate_details = ''
                if (for_team === true) {
                    candidate_details = '<p style="margin: 0;"><span style="color:#4D6072; font-family: Arial, Helvetica, sans-serif; margin: 0;">Candidate</span></p></br>' +
                        '<p style="margin: 0;"><strong><a style="color: #1999E3; font-family: Arial, Helvetica, sans-serif; margin: 0;" href="' + this.employerDashboardPath(this.talentPath(this.currentTalent)) + '">' +
                        this.currentTalent.display_name + '</a></strong> - ' +
                        '<a style="color: #1999E3; font-family: Arial, Helvetica, sans-serif; margin: 0;" href="' + this.employerDashboardPath(this.jobPath(this.currentJob)) + '">' +
                        this.currentJob.title + '</a><br><br></p>'
                }
                return '<span style="font-size: 15px; font-family: Arial, Helvetica, sans-serif; margin: 0;">' +
                    this.currentCompany.name + " invited you to " +
                    '</span>\n<br/>    <span style="font-size: 15px; font-family: Arial, Helvetica, sans-serif; margin: 0;"><strong>' +
                    this.interviewTypeText(this.interview_type) +
                    '</strong></span><p style="margin: 0;"><br><span style="color:#4D6072; margin: 0;">when</span></p>\n' +
                    '<p style="font-family: Arial, Helvetica, sans-serif; margin: 0;"><strong>' + formatted_interview_dt + '</strong></p>\n' +
                    '<p style="font-family: Arial, Helvetica, sans-serif; margin: 0;">in (' + this.currentTalent.timezone +
                    '): <strong>' + formatted_interview_date_talent_tz + '</strong></p><br/>' +
                    candidate_details +
                    '<p style="margin: 0;"><span style="color:#4D6072; font-family: Arial, Helvetica, sans-serif; margin: 0;"> Interviewer </span></p>\n' +
                    '<p style="font-family: Arial, Helvetica, sans-serif;  margin: 0;">' + interviewers_name + '</p>'
            },
            interview_date_start() {
                return this.interview_date.format('MMM D at hh:mm')
            },
            remove_member(member) {
                this.interview_members_uuid = this.interview_members_uuid.filter((uuid) => {
                    return uuid !== member.uuid
                });
            },
            set_interview_duration(calendarEvent) {
                let start_date = calendarEvent.start,
                    end_date = calendarEvent.end
                this.interview_date = start_date.date.toISOString().substr(0, 10)
                this.interview_time = start_date.date.format('HH:mm')
                this.interview_duration = end_date.date.diff(start_date.date, 'minutes')
                this.color_event = calendarEvent.event.data.color
                this.icon_event = calendarEvent.event.data.icon
            },
            cancel() {
                this.dialog = false
            }
        },
    }
</script>
