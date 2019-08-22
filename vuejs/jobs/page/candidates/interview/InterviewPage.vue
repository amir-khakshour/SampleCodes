<template>
    <interview-admin-layout>
        <template slot="topbar" slot-scope="slotProps">
            <layout-menu-context-nav
                    :heading="pageTitle"
                    :loading="loading"
                    :refresh="true"
                    @refresh="fetchData"
            >
            </layout-menu-context-nav>
        </template>
        <template slot="content">
            <v-card class="tbh__card tbh__card__p__m interview_message__add mb-2">
                <v-layout row wrap>
                    <div class="talent__card__left tbh__flex__avatar">
                        <v-avatar :size="avatarSize" class="mt-4 mb-2">
                            <img :src="avatarUrl(currentUser)">
                        </v-avatar>
                        <div class="message__author_name mt-2">{{currentUser.full_name}}</div>
                        <v-chip light small disabled class="role_name">{{currentRole.role_name}}</v-chip>
                    </div>
                    <div class="flex talent__card__right">
                        <form-builder
                                transition="card"
                                ref="messageForm"
                                :scope="'messageForm'"
                                :formFields.sync="messageForm.fields"
                                :loading="messageForm.loading"
                                :success="messageForm.success"
                                :error="messageForm.error"
                                :error-message="messageForm.errorMessage"
                                @submit-form="submitMessage">
                        </form-builder>
                    </div>
                </v-layout>
            </v-card>
            <v-data-iterator
                    v-if="!loading && items.length"
                    :items="items"
                    :rows-per-page-items="rowsPerPageItems"
                    :pagination.sync="pagination"
                    :total-items="total"
                    content-tag="v-layout"
                    row
                    wrap
            >
                <template
                        slot="item"
                        slot-scope="props"
                >
                    <v-card class="tbh__card tbh__card__p__m interview_message__item mb-2">
                        <v-layout row wrap>
                            <div class="talent__card__left tbh__flex__avatar">
                                <v-avatar :size="avatarSize" class="mt-4 mb-2">
                                    <img :src="props.item.owner.uuid == currentTalent.user_uuid ? avatarUrl(currentTalent) : avatarUrl(props.item.owner)">
                                </v-avatar>
                            </div>
                            <div class="talent__card__right mt-4 mb-2 ml-3">
                                <div class="message__owner__info">
                                    <span class="message__author_name">
                                        {{props.item.owner.uuid == currentTalent.user_uuid ? currentTalent.display_name : props.item.owner.full_name}}
                                    </span>
                                    <v-chip v-if="props.item.owner.uuid == currentTalent.user_uuid" dark small disabled color="indigo"
                                            class="role_name" text-color="white">Candidate
                                    </v-chip>
                                    <v-chip v-else light small disabled class="role_name">{{props.item.role_attr}}</v-chip>
                                </div>
                                <div class="interview__message__content mt-2" v-html="props.item.message"></div>
                                <div class="interview__message__time" v-html="displayDatesToNow(props.item.created_at)"></div>
                            </div>
                        </v-layout>
                    </v-card>
                </template>
            </v-data-iterator>

            <v-card class="tbh__card tbh__card__p__m interview_message__item">
                <v-layout row wrap>
                    <div class="talent__card__left tbh__flex__avatar">
                        <v-avatar :size="avatarSize" class="mt-4 mb-2">
                            <img :src="avatarUrl(currentTalent)">
                        </v-avatar>
                    </div>
                    <div class="talent__card__right mt-4 mb-2 ml-3">
                        <div class="message__owner__info">
                            <span class="message__author_name">{{currentTalent.display_name}}</span>
                            <v-chip dark small disabled color="indigo" class="role_name" text-color="white">Candidate</v-chip>
                        </div>
                        <div class="interview__message__content mt-2" v-html="currentInterview.offer.result_message"></div>
                        <div class="interview__message__time" v-html="displayDatesToNow(currentInterview.offer.result_created_at)"></div>
                    </div>
                </v-layout>
            </v-card>
        </template>
    </interview-admin-layout>
</template>
<script>
    import {mapGetters} from 'vuex'
    import Api from "Employer/services/Api";
    import InterviewAdminLayout from './InterviewAdminLayout'
    import InterviewHelper from "Employer/mixins/InterviewHelper";
    import TalentHelper from "Employer/mixins/TalentHelper";
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormHelper from "Employer/mixins/FormHelper";
    import UserHelper from "Employer/mixins/UserHelper";
    import DateHelper from "Employer/mixins/DateHelper";
    import PaginationHelper from "Employer/mixins/PaginationHelper";
    import PageHelper from "Employer/mixins/PageHelper";
    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'

    export default {
        mixins: [PageHelper, InterviewHelper, TalentHelper, FormHelper, UserHelper, DateHelper, PaginationHelper],
        components: {
            InterviewAdminLayout,
            layoutMenuContextNav,
            FormBuilder,
        },

        data: () => ({
            pageTitle: 'messaging',
            avatarSize: 95,
            messageForm: {
                loading: false,
                success: false,
                error: false,
                errorMessage: {},
                fields: {
                    message: {
                        value: '',
                        label: 'message',
                        outline: true,
                        required: true,
                        type: 'textarea',
                        flex: 'xs12',
                        rows: 4,
                        placeholder: 'message to candidate and team members ...',
                    },
                },
            },

        }),
        computed: {
            ...mapGetters({
                currentRole: 'getCurrentRole',
            }),
        },
        mounted() {
            this.$store.subscribe((mutation, state) => {
                if (mutation.type == 'SOCKET_ONMESSAGE') {
                    if (this.$store.getters.getEvent.type == 'INTERVIEW_RELOAD'
                        && this.$store.getters.getEvent.namespace == this.currentInterview.id) {
                        this.fetchData()
                    }
                }
            })
            this.fetchData()
        },
        methods: {
            nextPageRequest() {
                return new Promise((resolve, reject) => {
                    let params = {
                        page: this.pagination.page,
                        rowsPerPage: this.pagination.rowsPerPage,
                    }
                    return Api
                        .withCurrentCompany()
                        .withCurrentInterview()
                        .makeRequest({
                            url: 'interview__message__root',
                            method: 'get',
                            params: params,
                        })
                        .then(response => {
                            resolve(response.data);
                        })
                        .catch(error => {
                            reject(error);
                            this.loading = false
                        })
                })
            },
            submitMessage(data) {
                this.formSubmit(
                    this.messageForm,
                    this.interviewMessagePostRequest(data)
                )
            },

            interviewMessagePostRequest(data) {
                return Api
                    .withCurrentCompany()
                    .withCurrentInterview()
                    .makeRequest({
                        url: 'interview__message__root',
                        method: 'post',
                        data: data
                    })
                    .then(response => {
                        if (response) {
                            this.flash('Your message has been sent successfully!', 'success', {
                                timeout: 2000,
                            });
                        }
                    })
            },

        }
    }
</script>
<style lang="scss">
    .current_stage_arrow {
        margin-bottom: -0.2rem;
    }

    .current_stage_text {
        color: rgba(0, 0, 0, .87) !important;
    }

    .message__author_name {
        font-size: 1.1rem;
        line-height: 1.2rem;
        display: inline-block;
    }

    .interview__message__content {
        font-size: 1.15rem;
        line-height: 1.8rem;
    }

    .interview_message__item {
        position: relative;
    }

    .interview__message__time {
        position: absolute;
        top: 0;
        right: 0;
        padding: 2rem;
    }
</style>
