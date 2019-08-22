<template>
    <job-admin-layout :job="currentJob">
        <template slot="content">
            <v-layout row wrap>
                <v-flex xs8 class="job__edit__base">
                    <v-card class="tbh__card clearfix">
                        <form-builder
                                ref="jobDetailsForm"
                                transition="card"
                                class="job__new"
                                :scope="'editJobForm'"
                                :formFields.sync="details_form.formFields"
                                :loading="details_form.loading"
                                :success="details_form.success"
                                :error="details_form.error"
                                :error-message="details_form.errorMessage"
                                @submit-form="SubmitJobDetailsForm">
                        </form-builder>
                    </v-card>
                </v-flex>
                <v-flex xs4 class="job__edit__side">
                    <v-card class="tbh__card clearfix">
                        <h3 class="tbh__block__title">Job Status</h3>
                        <form-builder
                                ref="statusForm"
                                transition="card"
                                class="job__status__form"
                                :scope="'editJobStatusForm'"
                                :formFields.sync="status_form.formFields"
                                :loading="status_form.loading"
                                :success="status_form.success"
                                :error="status_form.error"
                                :error-message="status_form.errorMessage"
                                @submit-form="handleStatusSubmit">
                        </form-builder>
                    </v-card>
                </v-flex>
            </v-layout>
        </template>
    </job-admin-layout>
</template>
<script>

    import {
        geo as GeoApi
    } from 'Employer/api'
    import Api from 'Employer/services/Api'
    import PageHelper from 'Employer/mixins/PageHelper'
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormInput from 'Employer/components/forms/FormInput'
    import TableBuilder from 'Employer/components/tables/TableBuilder'
    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import FormHelper from 'Employer/mixins/FormHelper'
    import Modal from 'Employer/components/partials/Modal'
    import FormSubmit from 'Employer/components/forms/FormSubmit'
    import utils from 'Employer/utils'
    import JobAdminLayout from 'Employer/pages/jobs/JobAdminLayout'
    import JobHelper from 'Employer/mixins/JobHelper'

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
        mixins: [PageHelper, FormHelper, JobHelper],
        components: {
            JobAdminLayout,
            layoutMenuContextNav,
            LayoutMenuContextSub,
            LayoutContent,
            FormBuilder,
            TableBuilder,
            FormInput,
            Modal,
            FormSubmit,
        },
        data() {
            return {
                pageTitle: 'Job Candidates',
                job: {},
                jobStatus: {value: this.$store.getters.getJob.status},
                status_form: {
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
                            onConfirm: this.confirmStatusChange,
                        },
                    },
                },
                details_form: {
                    loading: false,
                    success: false,
                    error: false,
                    errorMessage: {},
                    formFields: {
                        title: {
                            autofocus: true,
                            value: '',
                            label: 'Title',
                            flex: 'xs4',
                            placeholder: 'e.g. FrontEnd developer',
                            required: true,
                            validation: 'required|min:6',
                            rules: [
                                (val) => val.length > 0 || 'title is required'
                            ],
                        },
                        department: {
                            value: '',
                            label: 'Department',
                            placeholder: 'Select Department',
                            flex: 'xs4',
                        },
                        // country: {
                        //     value: '',
                        //     label: 'Country',
                        //     type: 'ajax-select',
                        //     flex: 'xs4',
                        //     options: this.fetchCountries,
                        //     required: true,
                        //     rules: [
                        //         (val) => val.length > 0 || 'country  is required'
                        //     ],
                        // },
                        // region: {
                        //     value: '',
                        //     label: 'Region',
                        //     type: 'ajax-select',
                        //     flex: 'xs4',
                        //     options: this.fetchRegions,
                        //     required: true,
                        //     rules: [
                        //         (val) => val.length > 0 || 'region is required'
                        //     ],
                        // },
                        city: {
                            value: {
                                value: '',
                                text: '',
                            },
                            label: 'City',
                            type: 'ajax-select',
                            flex: 'xs4',
                            options: this.fetchCities,
                            required: true,
                            rules: [
                                (val) => val.length > 0 || 'city is required'
                            ],
                        },
                        keywords: {
                            value: '',
                            label: 'Keywords',
                            type: 'tag',
                            flex: 'xs8',
                            hint: 'If discovery mode is enabled you\'ll receive a list of suggested talents for this job in discovery page.',
                            rules: [
                                (val) => {
                                    if (this.details_form.formFields.discovery_mode.value && val.length == 0 ) {
                                        return 'If discovery mode is enabled you need to add at least one keyword'
                                    }
                                    return true
                                }
                            ],
                        },
                        discovery_mode: {
                            value: false,
                            label: 'Enable discovery mode',
                            type: 'switch',
                            flex: 'xs4',
                        },
                        remote: {
                            value: false,
                            label: 'Remote',
                            type: 'switch',
                            flex: 'xs12',
                        },
                        description: {
                            value: '',
                            label: 'Job description',
                            type: 'editor',
                            flex: 'xs12',
                        },
                        requirements: {
                            value: '',
                            label: 'Job requirements',
                            type: 'editor',
                            flex: 'xs12',
                        },
                        optionals: {
                            type: 'section',
                            title: 'optional settings',
                            formFields: {
                                employment_type: {
                                    value: '',
                                    label: 'Employment type',
                                    placeholder: 'Select employment type',
                                    flex: 'xs4',
                                    type: 'select',
                                    options: utils.dictToSelectOption(AC.get_settings('job.EMPLOYMENT_TYPES'), true)
                                },
                                min_hours: {
                                    value: '',
                                    label: 'Minimum Hours per week',
                                    placeholder: '35',
                                    hint: 'e.g. 35',
                                    flex: 'xs4',
                                },
                                max_hours: {
                                    value: '',
                                    label: 'Minimum Hours per week',
                                    placeholder: '45',
                                    hint: 'e.g. 45',
                                    flex: 'xs4',
                                },
                                required_education: {
                                    value: '',
                                    label: 'required education',
                                    placeholder: 'Select required education',
                                    flex: 'xs6',
                                    type: 'select',
                                    options: utils.dictToSelectOption(AC.get_settings('job.EDUCATION_TYPES'), true)
                                },
                                required_experience: {
                                    value: '',
                                    label: 'Required experience',
                                    placeholder: 'Select required experience',
                                    flex: 'xs6',
                                    type: 'select',
                                    options: utils.dictToSelectOption(AC.get_settings('job.EXPERIENCE_TYPES'), true)
                                },

                            },
                        }
                    }
                },
            }
        },
        mounted() {
            this.formFill(this.details_form, this.currentJob)
        },
        methods: {
            confirmDialogData(jobStatus) {
                return jobStatus &&
                typeof dialogHeaderByJobStatus[jobStatus] !== 'undefined' ?
                    dialogHeaderByJobStatus[jobStatus] : {title: '', desc: '', icon: ''}
            },
            SubmitJobDetailsForm(data) {
                this.formSubmit(
                    this.details_form,
                    this.editJobRequest(data)
                )
            },
            handleStatusSubmit(data) {
                // submit from status change form also saves the details
                this.$refs.jobDetailsForm.submitForm()
            },
            confirmStatusChange(status) {
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
                                status: status
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
                        .finally(() => {
                            this.loading = false
                        })
                })
            },
            editJobRequest(fields) {
                let request = Api
                    .withCurrentCompany()
                    .makeRequest({
                        url: {
                            base: 'job__root',
                            suffix: [this.selectedJobId,]
                        },
                        method: 'PUT',
                        data: fields
                    })
                    .then(response => {
                        if (response) {
                            this.$store.dispatch('setJob', response.data)
                            this.flash('Job saved successfully!', 'success', {
                                timeout: 2000,
                            });
                        }
                    })
                return request
            },
            fetchCities(val) {
                return new Promise((resolve, reject) => {
                    GeoApi.queryCity({
                        search: val,
                        page_size: 100
                    }).then(response => {
                        let items = []
                        if (response.data.results) {
                            let results = response.data.results
                            Object.keys(results).forEach((key) => {
                                items.push({
                                    text: results[key]['name'] + ', ' +
                                        results[key]['region']['name'] + ', ' + results[key]['country']['name'],
                                    value: results[key]['id'],
                                })
                            })
                        }
                        resolve(items);
                    }, error => {
                        reject(error);
                    })
                })
            },
        }
    }
</script>
