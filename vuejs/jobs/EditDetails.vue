<template>
    <job-edit-layout
            :form="form"
            :job="currentJob"
            :handleSubmit="handleSubmit">
        <template slot="content" slot-scope="slotProps">
            <v-card class="tbh__card" v-if="contentLoaded">
                <form-builder
                        ref="sectionForm"
                        transition="card"
                        class="job__new"
                        :scope="'editJobForm'"
                        :formFields.sync="form.formFields"
                        :loading="form.loading"
                        :success="form.success"
                        :error="form.error"
                        :error-message="form.errorMessage"
                        @submit-form="SubmitEditJob">
                </form-builder>
            </v-card>
        </template>
    </job-edit-layout>
</template>
<script>

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
    import JobEditLayout from 'Employer/pages/jobs/EditLayout'
    import JobHelper from 'Employer/mixins/JobHelper'


    import {
        geo as GeoApi
    } from 'Employer/api'

    export default {
        mixins: [PageHelper, FormHelper, JobHelper],
        components: {
            JobEditLayout,
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
                pageTitle: 'Edit Job',
                job: {},
                form: {
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
            this.formFill(this.form, this.currentJob)
            this.contentLoaded = true
        },
        methods: {
            handleSubmit() {
                this.$refs.sectionForm.submitForm()
            },
            SubmitEditJob(fields) {
                this.formSubmit(
                    this.form,
                    this.editJobRequest(fields)
                )
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
