<template>
    <simple-tool-bar :tabs="tabs" align="center">
        <template slot="header" slot-scope="props">
            <router-link
                    :to="{ name: 'jobs_available'}"
                    class="tbh__goback__link">
                <v-icon>keyboard_backspace</v-icon>
            </router-link>
            <h1 class="tbh__toolbar__header job__title">{{currentJob.title}}</h1>
            <div class="job__location"><i class="material-icons">place</i><span>{{currentJob.city_raw}}</span></div>
            <div class="job__status">currently: <strong>{{getJobStatusByID(currentJob.status)}}</strong></div>
        </template>

        <template slot="menubar" slot-scope="props">
            <slot name="topbar"></slot>
        </template>

        <template slot="content" slot-scope="props">
            <v-container grid-list-md fluid class="container__edit_job">
                <v-layout row wrap>
                    <v-flex class="job__admin__container">
                        <slot name="content"></slot>
                    </v-flex>
                </v-layout>
            </v-container>
        </template>
    </simple-tool-bar>
</template>

<script>
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormSubmit from 'Employer/components/forms/FormSubmit'
    import SimpleToolBar from 'Employer/components/partials/SimpleToolBar'
    import JobHelper from 'Employer/mixins/JobHelper'

    import {
        cloneDeep,
    } from 'lodash'

    export default {
        components: {
            SimpleToolBar,
            FormSubmit,
            FormBuilder,
        },
        mixins: [JobHelper],
        props: {
            'pageLoading': Boolean,
        },
        data() {
            return {}
        },
        computed: {
            tabs() {
                return [
                    {
                        to: {
                            name: 'job__offers',
                            params: {
                                jobID: this.$route.params.jobID
                            }
                        },
                        text: 'Offers'
                    },
                    {
                        to: {
                            name: 'job__candidates',
                            params: {
                                jobID: this.$route.params.jobID
                            }
                        }, text: 'Candidates'
                    },
                    {
                        to: {
                            name: 'job__notes',
                            params: {
                                jobID: this.$route.params.jobID
                            }
                        }, text: 'notes'
                    },
                    {
                        to: {
                            name: 'job__team',
                            params: {
                                jobID: this.$route.params.jobID
                            }
                        }, text: 'Team members'
                    },
                    {
                        to: {
                            name: 'job__details',
                            params: {
                                jobID: this.$route.params.jobID
                            }
                        }, text: 'details'
                    },
                ]
            },
        },
        methods: {},
    }
</script>
