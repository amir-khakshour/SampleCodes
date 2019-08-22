<template>
    <layout-leaf-node :gobackto="{name: 'jobs_available'}">
        <template slot="header">Create new job</template>
        <template slot="content">
            <v-card class="tbh__card">
                <form-builder
                        transition="card"
                        class="job__new"
                        :scope="'newJob'"
                        :formFields.sync="form.formFields"
                        :loading="form.loading"
                        :success="form.success"
                        :error="form.error"
                        :error-message="form.errorMessage"
                        @submit-form="submitNewJob">
                </form-builder>
            </v-card>
        </template>
    </layout-leaf-node>
</template>
<script>

    import LayoutLeafNode from 'Employer/components/partials/LayoutLeafNode.vue'
    import utils from 'Employer/utils'

    import PageHelper from 'Employer/mixins/PageHelper'
    import FormHelper from 'Employer/mixins/FormHelper'
    import JobHelper from 'Employer/mixins/JobHelper'

    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormInput from 'Employer/components/forms/FormInput'
    import TableBuilder from 'Employer/components/tables/TableBuilder'
    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import Modal from 'Employer/components/partials/Modal'
    import FormSubmit from 'Employer/components/forms/FormSubmit'

    import {
        geo as GeoApi
    } from 'Employer/api'

    export default {
        mixins: [PageHelper, FormHelper, JobHelper],
        components: {
            LayoutLeafNode,
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
                pageTitle: 'New Job',
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
                            flex: 'xs8',
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
                        city: {
                            value: {
                                value: '',
                                text: '',
                            },
                            label: 'City',
                            type: 'ajax-select',
                            flex: 'xs12',
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
                                    value: 35,
                                    label: 'Minimum Hours per week',
                                    placeholder: '35',
                                    hint: 'e.g. 35',
                                    flex: 'xs4',
                                },
                                max_hours: {
                                    value: 45,
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
        methods: {
            submitNewJob(fields) {
                this.formSubmit(
                    this.form,
                    this.createJobRequest(fields)
                )
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
