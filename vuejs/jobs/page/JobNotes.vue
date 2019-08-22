<template>
    <job-admin-layout :job="currentJob">
        <template slot="topbar" slot-scope="slotProps">
            <layout-menu-context-nav
                    :heading="pageTitle"
                    :loading="loading"
                    :refresh="true"
                    @refresh="fetchData">
            </layout-menu-context-nav>
        </template>
        <template slot="content" slot-scope="slotProps">
            <v-layout justify-center align-center row wrap>
                <v-flex xs6>
                    <v-card class="tbh__card tbh__card__p__m job__notes__add">
                        <form-builder
                                transition="card"
                                ref="addNoteForm"
                                :scope="'addNoteForm'"
                                :formFields.sync="form.fields"
                                :loading="form.loading"
                                :success="form.success"
                                :error="form.error"
                                :error-message="form.errorMessage"
                                @submit-form="addJobNote">
                        </form-builder>
                    </v-card>
                </v-flex>
            </v-layout>
            <v-layout justify-center align-center row wrap v-if="!loading">
                <v-flex xs6>
                    <no-items
                            v-if="!loading && !items.length"
                            :arrow="true"
                            icon="cloud_circle"
                            title="write your first note">
                        <div slot="text">
                            There is no note for this job!
                        </div>
                    </no-items>
                    <v-card v-else="!loading && items.length" class="tbh__card tbh__card__note mb-2" v-for="(item, index) in items">
                        <v-container fluid grid-list-md>
                            <v-layout row wrap>
                                <v-list-tile-avatar>
                                    <img :src="avatarUrl(item.owner)">
                                </v-list-tile-avatar>
                                <v-list-tile-content>
                                    <v-list-tile-sub-title>
                                        <span class="full_name">{{item.owner.full_name}}</span>
                                        <v-chip small disabled class="role_name">{{item.role_attr}}</v-chip>
                                    </v-list-tile-sub-title>
                                    <template>
                                        <runtime-template :template="item.message"></runtime-template>
                                    </template>
                                </v-list-tile-content>
                            </v-layout>
                        </v-container>
                    </v-card>
                </v-flex>
            </v-layout>
        </template>
    </job-admin-layout>

</template>
<script>
    import {
        jobs as JobsApi
    } from 'Employer/api'

    import Api from 'Employer/services/Api'
    import utils from 'Employer/utils'
    import PageHelper from 'Employer/mixins/PageHelper'
    import FormHelper from 'Employer/mixins/FormHelper'
    import UserHelper from 'Employer/mixins/UserHelper'
    import CompanyHelper from 'Employer/mixins/CompanyHelper'
    import JobHelper from 'Employer/mixins/JobHelper'
    import PaginationHelper from 'Employer/mixins/PaginationHelper'
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import RuntimeTemplate from "Employer/utils/runtime-render";

    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import JobAdminLayout from 'Employer/pages/jobs/JobAdminLayout'
    import NoItems from 'Employer/components/partials/NoItems'


    export default {
        mixins: [PageHelper, FormHelper, PaginationHelper, UserHelper, CompanyHelper, JobHelper],
        components: {
            NoItems,
            JobAdminLayout,
            layoutMenuContextNav,
            LayoutMenuContextSub,
            LayoutContent,
            FormBuilder,
            RuntimeTemplate,
        },
        data() {
            return {
                pageTitle: 'Job Notes',

                form: {
                    loading: false,
                    success: false,
                    error: false,
                    errorMessage: {},
                    fields: {
                        message: {
                            value: '',
                            label: 'note',
                            outline: true,
                            required: true,
                            type: 'textarea',
                            flex: 'xs12',
                            rows: 2,
                            mention: {
                                lookup: 'username',
                                // REQUIRED: array of objects to match
                                values: this.get_mentionable_users(),
                                // function called on select that returns the content to insert
                                selectTemplate: (item) => {
                                    return '@' + item.original.username + ' '
                                },
                                menuItemTemplate: this.mentionMenuItemTemplate
                            }
                        },
                    }
                },
            }
        },
        computed: {},
        mounted() {
            this.fetchData()
        },
        methods: {
            addJobNote(fields) {
                this.formSubmit(
                    this.form,
                    this.createNoteRequest(fields)
                )
            },
            createNoteRequest(note) {
                return new Promise((resolve, reject) => {
                    JobsApi
                        .addJobNote(note).then(response => {
                        this.form.fields.message.value = ''
                        this.flash('Note added successfully!', 'success', {
                            timeout: 2000,
                        });
                        resolve(response.data);
                        this.fetchData()
                    }, error => {
                        reject(error);
                    })
                })
            },
            nextPageRequest() {
                return new Promise((resolve, reject) => {
                    return Api
                        .withCurrentCompany()
                        .withCurrentJob()
                        .makeRequest({
                            url: 'job__note',
                            method: 'get',
                        })
                        .then(response => {
                            resolve(response.data);
                        })
                        .catch(error => {
                            reject(error);
                        })
                })

            }
        }
    }
</script>
