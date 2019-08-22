<template>
    <simple-tool-bar :tabs="tabs" align="center">
        <template slot="header" slot-scope="props">
            <router-link
                    :to="{ name: 'job__details', params: { jobID: $route.params.jobID }}"
                    class="tbh__goback__link">
                <v-icon>keyboard_backspace</v-icon>
            </router-link>
            <h1 class="tbh__toolbar__header job__title">{{currentJob.title}}</h1>
            <div class="job__location"><i class="material-icons">place</i><span>{{currentJob.city_raw}}</span></div>
            <div class="job__status">currently: <strong>{{getJobStatusByID(currentJob.status)}}</strong></div>
        </template>

        <template slot="toolbar" slot-scope="props">
        </template>

        <template slot="content" slot-scope="props">
            <v-container fluid grid-list-md class="container__edit_job">
                <v-layout row wrap>
                    <v-flex xs8 class="job__edit__base">
                        <slot name="content"></slot>
                    </v-flex>
                    <slot name="sidebar">
                        <v-flex xs4 class="job__edit__side">
                            <v-card class="tbh__card clearfix">
                                <h3 class="tbh__block__title">Job Status</h3>
                                <form-builder
                                        ref="sectionForm"
                                        transition="card"
                                        class="job__status__form"
                                        :scope="'editJobStatusForm'"
                                        :formFields.sync="form.formFields"
                                        :loading="form.loading"
                                        :success="form.success"
                                        :error="form.error"
                                        :error-message="form.errorMessage"
                                        @submit-form="handleSubmit">
                                </form-builder>
                            </v-card>
                        </v-flex>
                    </slot>
                </v-layout>
            </v-container>
        </template>
    </simple-tool-bar>
</template>

<script>
    import Api from 'Employer/services/Api'
    import utils from 'Employer/utils'
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormSubmit from 'Employer/components/forms/FormSubmit'
    import SimpleToolBar from 'Employer/components/partials/SimpleToolBar'
    import JobHelper from 'Employer/mixins/JobHelper'

    import {
        cloneDeep,
    } from 'lodash'

    let dialogHeaderByJobStatus = {
        A: {
            title: "Archive job",
            icon: "A",
            desc: "Your Job's status will be \"Archived.\". Any pending offer will be closed. you can only archive a job which has no open interview process."
        },
        C: {
            title: "Close job",
            icon: "C",
            desc: "Your Job's status will be \"Closed.\". Candidates cannot apply. You can still access the Job's data. To reuse more Job slot(s), you need to archive active Job(s)."
        },
        I: {
            title: "Internal use job",
            icon: "I",
            desc: "Your Job's status will be \"Internal use.\". Only people with the direct Job's link can see it. Candidates can apply. You can access the Job's data."
        },
        P: {
            title: "Publish job",
            icon: "P",
            desc: "Your Job's status will be \"Published.\"  you can assign the job to the offers you send to the talents."
        },
    }
    export default {
        components: {
            SimpleToolBar,
            FormSubmit,
            FormBuilder,
        },
        mixins: [JobHelper],
        props: {
            // 'form': Object,
            'handleSubmit': {
                type: Function,
                default: () => {
                }
            },
            'pageLoading': Boolean,
        },
        data() {
            return {
                jobStatus: {value: this.$store.getters.getJob.status},
                jobStatusHistory: {oldVal: '', newVal: ''},
                confirmDialog: false,
                jobStatusItems: utils.dictToSelectOption(AC.get_settings('job.JOB_STATUS')),
                form: {
                    loading: false,
                    success: false,
                    error: false,
                    errorMessage: {},
                    formFields: {
                        jobStatus: {
                            type: 'confirm-select',
                            autofocus: true,
                            value: this.$store.getters.getJob.status,
                            label: 'Job Status',
                            flex: 'xs12',
                            options: utils.dictToSelectOption(AC.get_settings('job.JOB_STATUS')),
                            dialogDataCallback: this.confirmDialogData,
                            onConfirm: this.submitStatusChange,
                        },
                    },
                }
            }
        },
        watch: {
            // jobStatus(newVal, oldVal) {
            //     if (newVal.value === this.jobStatusHistory.oldVal.value) {
            //         return
            //     }
            //     this.jobStatusHistory.oldVal = oldVal
            //     this.jobStatusHistory.newVal = newVal
            //
            //     let dialog_data = this.confirmDialogData(newVal.value)
            //     this.$refs.confirm_dialog.open(dialog_data['title'], dialog_data['desc']).then(result => {
            //         if (!result) {
            //             this.jobStatus = cloneDeep(oldVal)
            //             this.$nextTick(() => {
            //                 this.jobStatus = cloneDeep(oldVal)
            //             })
            //         } else {
            //             this.submitStatusChange()
            //         }
            //     }, error => {
            //         console.log(error);
            //     })
            // }
        },
        computed: {
            tabs() {
                return [
                    {
                        to: {
                            name: 'job_edit__details',
                            params: {
                                jobID: this.$route.params.jobID
                            }
                        }, text: 'Job details'
                    },
                ]
            },
        },
        methods: {
            confirmDialogData(jobStatus) {
                return jobStatus &&
                typeof dialogHeaderByJobStatus[jobStatus] !== 'undefined' ?
                    dialogHeaderByJobStatus[jobStatus] : {title: '', desc: '', icon: ''}
            },
            submitStatusChange(status) {
                return new Promise((resolve, reject) => {
                    Api
                        .withCurrentCompany()
                        .makeRequest({
                            url: {
                                base: 'job__root',
                                suffix: [this.selectedJobId,]
                            },
                            method: 'patch',
                            data: {
                                status: status.value
                            }
                        })
                        .then(response => {
                            this.$store.dispatch('setJob', response.data)
                            this.flash('Job saved successfully!', 'success', {
                                timeout: 2000,
                            });
                            resolve(response);
                        })
                        .catch(error => {
                            reject(error);
                        })
                })
            },
        },
    }
</script>
