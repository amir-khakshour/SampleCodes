<template>
    <simple-tool-bar :tabs="tabs" align="center">
        <template slot="header" slot-scope="props">
            <router-link
                    :to="backTo"
                    class="tbh__goback__link">
                <v-icon>keyboard_backspace</v-icon>
            </router-link>
            <v-layout row wrap>
                <v-flex md6>
                    <div class="talent__card">
                        <v-layout row wrap>
                            <div class="talent__card__left">
                                <v-avatar
                                        :size="avatarSize"
                                        color="grey lighten-4 talent__card__avatar ml-3 mr-3 mb-3"
                                >
                                    <v-img
                                            :src="avatarUrl(currentTalent)"
                                            aspect-ratio="1"
                                            max-width="120"
                                    ></v-img>
                                </v-avatar>
                            </div>
                            <div class="talent__card__right">
                                <div class="talent__card__details ml-3 mr-3 mb-3">
                                    <h6 class="title mb-2 mt-0">
                                        {{ currentTalent.display_name }}
                                    </h6>
                                    <div class="talent__card__details__accepted_date mb-2">
                                        accepted
                                        <span v-html="displayDatesToNow(currentInterview.offer.result_created_at)"></span>
                                    </div>
                                    <div v-if="currentInterview.is_disqualified" class="talent__card__details__accepted_date mb-2">
                                        <v-icon color="warning">warning</v-icon>
                                        <b>disqualified</b>
                                        <span v-html="displayDatesToNow(currentInterview.disqualify_time)"></span>
                                    </div>
                                    <div v-else class="talent__card__details__stage mb-2" :class="`tbh__stage__${currentInterview.stage}`">
                                        <v-icon class="tbh__stage__title__icon">brightness_1</v-icon> &nbsp;
                                        <b v-html="interviewStageText(currentInterview.stage)"></b>
                                    </div>
                                    <div class="talent__card__details__timezone mb-2">
                                        <v-icon class="tbh__stage__title__icon">language</v-icon> &nbsp;
                                        <b v-html="currentTalent.timezone"></b> -
                                        <b v-html="currentTalentTime"></b>
                                    </div>

                                    <div class="talent__card__details__buttons mt-3">
                                        <v-btn v-if="resumeIsPdf" small flat color="primary" class="ml-0 mt-0 mr-0 mb-2"
                                               @click.prevent="dialog_talent_resume=true">
                                            <v-icon dark>attach_file</v-icon>&nbsp;Resume
                                        </v-btn>
                                        <v-btn v-else target="_blank" small flat color="primary" class="ma-0" :href="currentTalent.resume">
                                            <v-icon dark>attach_file</v-icon>&nbsp;Resume
                                        </v-btn>
                                        <v-btn small flat color="primary" target="_blank" class="ml-0 mt-0 mr-0 mb-2"
                                               :href="currentTalent.www"
                                               v-if="currentTalent.www">Website
                                        </v-btn>
                                        <v-btn small flat color="primary" target="_blank" class="ml-0 mt-0 mr-0 mb-2"
                                               :href="currentTalent.linkedin"
                                               v-if="currentTalent.linkedin">Linkedin
                                        </v-btn>
                                        <v-btn small flat color="primary" target="_blank" class="ml-0 mt-0 mr-0 mb-2"
                                               :href="currentTalent.facebook"
                                               v-if="currentTalent.facebook">Facebook
                                        </v-btn>
                                        <v-btn small flat color="primary" target="_blank" class="ml-0 mt-0 mr-0 mb-2"
                                               :href="`https://twitter.com/${currentTalent.twitter}`"
                                               v-if="currentTalent.twitter">
                                            Twitter
                                        </v-btn>
                                    </div>
                                </div>
                            </div>
                        </v-layout>
                    </div>
                </v-flex>
                <v-flex md6>
                    <div class="offer_details__job title mb-2 mt-0">
                        <router-link
                                :to="{ name: 'job__gate', params: {jobID: currentJob.id}}"
                                class="tbh__no_border__link">
                            <v-icon color="primary">work</v-icon>
                            {{currentJob.title}}
                        </router-link>
                    </div>
                    <div class="offer_details__meta">
                        <div>
                            <span class="dt_label">Salary:</span>
                            <span>{{ OfferSalaryText(currentInterview.offer.salary, currentInterview.offer.currency) }}</span>
                        </div>
                        <div>
                            <span class="dt_label">Payment Type:</span>
                            <span>{{ offerPaymentFrequencyText(currentInterview.offer.frequency) }}</span>
                        </div>
                        <div>
                            <span class="dt_label">Employment Type:</span>
                            <span>{{ offerEmploymentTypeText(currentInterview.offer.employment_type) }}</span>
                        </div>
                    </div>
                </v-flex>
            </v-layout>
        </template>

        <template slot="tabs" slot-scope="props" v-if="disableTabs">
            <slot name="tabs"></slot>
        </template>


        <template slot="menubar" slot-scope="props">
            <slot name="menubar_inside"></slot>
        </template>

        <template slot="menubar" slot-scope="props">
            <slot name="topbar"></slot>
        </template>

        <template slot="content" slot-scope="props">
            <v-container fluid>
                <v-layout row wrap>
                    <v-flex md4 xl3 v-if="!disableSide" class="tbh__content__sidebar">
                        <slot name="sidebar">
                            <v-card class="tbh__card__block tbh__card clearfix">
                                <div class="tbh__card__block__header">
                                    <h6 class="h4 header-text">
                                        <span class="label">Next step</span>
                                    </h6>
                                </div>
                                <div class="tbh__card__block__content mt-2">
                                    <v-select
                                            :items="stageChange.options"
                                            :disabled="currentInterview.is_disqualified"
                                            v-model="stageChange.value"
                                            single-line
                                            item-text="title"
                                            item-value="key"
                                            persistent-hint
                                    >
                                        <template slot="selection" slot-scope="data">
                                            <div class="talent__card__details__stage mb-2"
                                                 :class="[`tbh__stage__${data.item.key}`]">
                                                <v-icon class="tbh__stage__title__icon">brightness_1</v-icon> &nbsp;
                                                <b v-html="data.item.title"></b>
                                            </div>
                                        </template>
                                        <template slot="item" slot-scope="data">
                                            <template v-if="typeof data.item !== 'object'">
                                                <v-list-tile-content v-text="data.item"></v-list-tile-content>
                                            </template>
                                            <template v-else>
                                                <div class="talent__card__details__stage mb-2"
                                                     :class="[`tbh__stage__${data.item.key}`, {'current_stage': currentInterview.stage === data.item.key}]">
                                                    <template v-if="currentInterview.stage === data.item.key">
                                                        <v-icon class="current_stage_arrow">arrow_forward</v-icon>
                                                        <v-icon class="tbh__stage__title__icon">brightness_1</v-icon>
                                                        <b v-html="data.item.title" class="current_stage_text"></b>
                                                    </template>
                                                    <template v-else>
                                                        <v-icon class="tbh__stage__title__icon">brightness_1</v-icon>
                                                        <span v-html="data.item.title"></span>
                                                    </template>
                                                </div>
                                            </template>
                                        </template>
                                    </v-select>
                                    <div class="tbh__disqualify__sub-block">
                                        <v-btn v-if="currentInterview.is_disqualified" large depressed block color="warning"
                                               @click="requalifyCandidate()"
                                               :loading="requalify_loading">
                                            <v-icon left dark>thumb_up</v-icon>
                                            Requalify
                                        </v-btn>
                                        <v-btn v-else depressed block large color="error" @click="show_disqualify_dialog = true">
                                            <v-icon left dark>thumb_down</v-icon>
                                            Disqualify Candidate
                                        </v-btn>

                                    </div>
                                </div>
                            </v-card>
                            <confirm-dialog ref="confirm_dialog"></confirm-dialog>
                            <v-dialog v-model="show_disqualify_dialog" width="500">
                                <v-toolbar color="grey lighten-3" light dense flat>
                                    <v-toolbar-title>Disqualify {{ currentTalent.display_name }}</v-toolbar-title>
                                </v-toolbar>
                                <v-card tile>
                                    <v-card-text>
                                        <form-builder
                                                transition="card"
                                                ref="disqualifyForm"
                                                :scope="'disqualifyForm'"
                                                :formFields.sync="disqualifyForm.fields"
                                                :loading="disqualifyForm.loading"
                                                :success="disqualifyForm.success"
                                                :disable-submit="true"
                                                :error="disqualifyForm.error"
                                                :error-message="disqualifyForm.errorMessage"
                                                @submit-form="submitDisqualification">
                                        </form-builder>
                                    </v-card-text>
                                    <v-card-actions>
                                        <v-spacer></v-spacer>
                                        <v-btn depressed flat="flat" @click.native="show_disqualify_dialog = false">Cancel</v-btn>
                                        <v-btn depressed color="primary" flat @click.prevent="$refs.disqualifyForm.submitForm()"
                                               :loading="disqualifyForm.loading">
                                            Confirm
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </v-dialog>
                        </slot>
                    </v-flex>
                    <v-flex v-bind="{[`md${disableSide ? '12' : '8'}`]: true, [`xl${disableSide ? '12' : '9'}`]: true}">
                        <slot name="content"></slot>
                    </v-flex>
                </v-layout>
            </v-container>

            <v-dialog
                    v-model="dialog_talent_resume"
                    fullscreen
            >
                <v-card tile class="talent__card__details" v-if="dialog_talent_resume">
                    <v-toolbar card light color="grey lighten-2">
                        <v-btn icon light @click="dialog_talent_resume = false">
                            <v-icon>close</v-icon>
                        </v-btn>
                        <v-toolbar-title>{{currentTalent.display_name}} resume</v-toolbar-title>
                        <v-spacer></v-spacer>
                    </v-toolbar>

                    <v-card-text class="grey-bg">
                        <talent-card-resume :talent="currentTalent"></talent-card-resume>
                    </v-card-text>
                </v-card>
            </v-dialog>

        </template>

    </simple-tool-bar>
</template>

<script>
    import {
        cloneDeep,
    } from 'lodash'
    import Api from "Employer/services/Api";
    import utils from 'Employer/utils'
    import TalentHelper from 'Employer/mixins/TalentHelper'
    import UserHelper from "Employer/mixins/UserHelper";
    import DateHelper from "Employer/mixins/DateHelper";
    import InterviewHelper from "Employer/mixins/InterviewHelper";
    import SimpleToolBar from 'Employer/components/partials/SimpleToolBar'
    import TalentCardDetailed from 'Employer/pages/talents/talent/TalentCardDetailed'
    import TalentCardResume from 'Employer/pages/talents/talent/TalentCardResume'
    import JobHelper from "Employer/mixins/JobHelper";
    import OfferHelper from "Employer/mixins/OfferHelper";
    import ConfirmDialog from 'Employer/components/partials/ConfirmDialog'
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormHelper from "Employer/mixins/FormHelper";


    export default {
        mixins: [FormHelper, TalentHelper, UserHelper, DateHelper, InterviewHelper, JobHelper, OfferHelper],
        components: {
            SimpleToolBar,
            TalentCardDetailed,
            TalentCardResume,
            ConfirmDialog,
            FormBuilder,
        },
        props: {
            'pageLoading': Boolean,
            'disableTabs': {
                type: Boolean,
                default: false
            },
            'disableSide': {
                type: Boolean,
                default: false
            },
            'backTo': {
                type: Object,
                default: () => {
                    return {name: 'job__candidates'}
                },
            },
        },
        data() {
            return {
                avatarSize: '95',
                dialog_talent_resume: false,
                stageChange: {
                    options: AC.get_settings('offer.INTERVIEW_STAGES_SORTED'),
                    label: 'move stage',
                    value: '',
                },
                stageHistory: {oldVal: '', newVal: ''},
                show_disqualify_dialog: false,
                requalify_loading: false,
                disqualifyForm: {
                    loading: false,
                    success: false,
                    error: false,
                    errorMessage: {},
                    fields: {
                        reason: {
                            value: '',
                            label: 'reason',
                            flex: 'xs12',
                            type: 'select',
                            options: utils.objectToSelectOptions(AC.get_settings('offer.DISQUALIFY_REASONS'), 'title', 'key'),
                            rules: [
                                (val) => val.length > 0 || 'reason is required'
                            ],
                        },
                        message: {
                            value: '',
                            label: 'message',
                            outline: true,
                            required: true,
                            type: 'textarea',
                            flex: 'xs12',
                            rows: 4,
                        },
                    },
                },
            }
        },
        watch: {
            'stageChange.value'(newVal, oldVal) {
                if (newVal === this.stageHistory.oldVal) {
                    return
                }
                this.stageHistory.oldVal = oldVal
                this.stageHistory.newVal = newVal

                let dialog_data = this.stageChangeconfirmDialogData(newVal)
                this.$refs.confirm_dialog.open(dialog_data['title'], dialog_data['desc']).then(agree => {
                    if (!agree) {
                        this.$nextTick(() => {
                            this.stageChange.value = cloneDeep(oldVal)
                        })
                    } else {
                        this.stageChange.onConfirm(cloneDeep(newVal)).then(response => {
                            this.$store.dispatch('setInterview', response.data)
                            this.flash(`Interview stage moved ${this.interviewStageText(newVal)} to successfully!`, 'success');
                        }, error => {
                            this.stageChange.value = cloneDeep(oldVal)
                            this.flash(`Moving interview stage failed!`, 'error');
                        }).finally(() => {
                            this.$refs.confirm_dialog.close()
                        })
                    }
                }, error => {
                    console.log(error);  // @log
                })
            },
        },
        computed: {
            resumeIsPdf() {
                return utils.urlIsPdf(this.currentTalent.resume)
            },
            tabs() {
                return [
                    {
                        to: {
                            name: 'interview__page',
                            params: {
                                interviewID: this.selectedInterviewId
                            }
                        },
                        text: 'messaging'
                    },
                    {
                        to: {
                            name: 'interview__notes',
                            params: {
                                interviewID: this.selectedInterviewId
                            }
                        },
                        text: 'Internal Notes'
                    },
                    {
                        to: {
                            name: 'interview__schedule',
                            params: {
                                interviewID: this.selectedInterviewId
                            }
                        },
                        text: 'Schedule'
                    },
                    {
                        to: {
                            name: 'interview__timeline',
                            params: {
                                interviewID: this.selectedInterviewId
                            }
                        },
                        text: 'Timeline'
                    },
                ]
            },
        },
        mounted() {
            this.stageChange.value = this.currentInterview.stage
            this.stageChange.onConfirm = this.onStageChangeConfirm
            this.stageHistory = {oldVal: this.currentInterview.stage, newVal: ''}
        },
        methods: {
            disqualifyCandidateRequest(data) {
                return Api
                    .withCurrentCompany()
                    .withCurrentInterview()
                    .makeRequest({
                        url: {
                            base: 'interview__root',
                            suffix: ['DisqualifyCandidate',]
                        },
                        method: 'post',
                        data: data
                    })
                    .then(response => {
                        if (response) {
                            this.flash('Candidate disqualified successfully!', 'success', {
                                timeout: 2000,
                            });
                        }
                        this.$store.dispatch('setInterview', response.data)
                        this.show_disqualify_dialog = false
                    })
            },
            requalifyCandidate() {
                this.requalify_loading = true
                return Api
                    .withCurrentCompany()
                    .withCurrentInterview()
                    .makeRequest({
                        url: {
                            base: 'interview__root',
                            suffix: ['requalifyCandidate',]
                        },
                        method: 'post',
                    })
                    .then(response => {
                        if (response) {
                            this.flash('Candidate requalified successfully!', 'success', {
                                timeout: 2000,
                            });
                        }
                        this.$store.dispatch('setInterview', response.data)
                    }).finally(() => {
                        this.requalify_loading = false
                    })
            },
            onStageChangeConfirm(new_stage) {
                return this.changeInterviewStageRequest(this.currentInterview.id, new_stage)
            },
            stageChangeconfirmDialogData(new_stage) {
                return {
                    title: 'change interview stage',
                    desc: `please confirm to change this interview status from <b>${this.interviewStageText(this.currentInterview.stage)}</b> to <b>${this.interviewStageText(new_stage)}</b>`,
                    icon: ''
                }
            },
            submitDisqualification(data) {
                this.formSubmit(
                    this.disqualifyForm,
                    this.disqualifyCandidateRequest(data)
                )
            },
            toggleBookmark(talent) {
                this.$store.dispatch('toggleBookmarkTalent', {
                    talent: talent
                }).then((response) => {
                    if (response.created) {
                        this.currentTalent.bookmarked = true
                        this.notify.message = 'Talent added to your bookmark list!'
                        this.notify.color = 'success'
                    } else {
                        this.currentTalent.bookmarked = false
                        this.notify.message = 'Talent removed from your bookmark list'
                        this.notify.color = '#fb8c00'
                    }
                    this.notify.show = true
                })
            },
        },
    }
</script>

<style lang="scss">
    .talent__card__details__buttons {
        button, a {
            background-color: #E9EDFD
        }
    }

    .offer_details__meta {
        span {
            font-size: 1.1rem !important;
        }
    }

    .talent__card__details__accepted_date {
        font-size: 1.1rem
    }
</style>
