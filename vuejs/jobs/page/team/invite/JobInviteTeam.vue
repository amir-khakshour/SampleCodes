<template>
    <v-dialog
            v-model="getDialog"
            max-width="680"
            scrollable
    >
        <v-card>
            <v-card-title class="display-1">Invite new member</v-card-title>
            <v-divider></v-divider>
            <div class="card__content" style="height: 300px;">
                <form-builder
                        ref="InviteTeamMemberForm"
                        transition="card"
                        subheading="Team members of a Job will receive notifications of all changes in that Job"
                        class="invite_team_member"
                        :scope="'InviteTeamMember'"
                        :formFields.sync="form.formFields"
                        :loading="form.loading"
                        :success="form.success"
                        :error="form.error"
                        :error-message="form.errorMessage"
                        :disableSubmit="true"
                        @submit-form="sendInvitation">
                </form-builder>

                <v-expansion-panel v-if="selectedRole">
                    <v-expansion-panel-content
                            v-model="panel"
                    >
                        <div slot="header">{{panel ? 'Hide access details' : 'Show access details'}}</div>
                        <v-card>
                            <v-card-text>
                                <span v-for="perm in rolesBySlug[selectedRole].permissions" class="tbh__role__permission">
                                    <v-icon color="green">check_circle_outline</v-icon> <span>{{perm.desc}}</span>
                                </span>
                            </v-card-text>
                        </v-card>
                    </v-expansion-panel-content>
                </v-expansion-panel>
            </div>
            <v-divider></v-divider>
            <v-card-actions>
                <v-layout align-end justify-end>
                    <v-btn flat @click="close()">Cancel</v-btn>
                    <v-btn depressed color="primary" @click="$refs.InviteTeamMemberForm.submitForm()" :loading="formSubmitLoading">Send Invitation
                    </v-btn>
                </v-layout>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
<script>
    import {
        debounce,
    } from 'lodash'

    import Api from 'Employer/services/Api'
    import utils from 'Employer/utils'
    import PageHelper from 'Employer/mixins/PageHelper'
    import FormHelper from 'Employer/mixins/FormHelper'
    import JobHelper from 'Employer/mixins/JobHelper'
    import CompanyHelper from 'Employer/mixins/CompanyHelper'
    import FormBuilder from 'Employer/components/forms/FormBuilder'

    export default {
        mixins: [PageHelper, FormHelper, JobHelper, CompanyHelper],
        components: {
            FormBuilder,
        },
        props: {
            dialog: false
        },
        data() {
            return {
                pageTitle: 'Invite team members',
                panel: false,
                formSubmitLoading: false,
                form: {
                    loading: false,
                    success: false,
                    error: false,
                    errorMessage: {},
                    formFields: {
                        email: {
                            value: '',
                            label: 'Email',
                            flex: 'xs6',
                            type: 'input',
                            required: true,
                            validation: 'required',
                            rules: [
                                v => !!v || 'E-mail is required',
                                utils.rules.email
                            ],
                        },
                        role: {
                            type: 'select',
                            label: 'Role',
                            value: null,
                            placeholder: 'Select Department',
                            flex: 'xs6',
                            required: true,
                            options: this.currentCompanyRoleOptions(),
                            rules: [(v) => !!v || 'role is required']
                        },
                    }
                }
            }
        },
        computed: {
            getDialog: {
                get() {
                    return this.dialog
                },
                set(val) {
                    if (!val) {
                        this.$emit('close')
                    }
                }
            },
            rolesBySlug() {
                let items = {}
                Object.values(this.currentCompany.roles).forEach((role) => {
                    items[role['slug']] = role
                })
                return items
            },
            selectedRole() {
                return this.form.formFields.role.data
            },
        },
        created() {
        },
        mounted() {

        },
        methods: {
            sendInvitation(data) {
                this.formSubmitLoading = true
                return Api
                    .withCurrentCompany()
                    .withCurrentJob()
                    .makeRequest({
                        url: 'invitation__company_invite',
                        method: 'post',
                        data: {
                            email: data.email,
                            role: data.role,
                        }
                    })
                    .then(response => {
                        this.flash(`Invitation is sent to ${data.email}`, 'success', {
                            timeout: 2000,
                        });
                        this.close()
                    }).finally(() => {
                        this.formSubmitLoading = false
                    })
            },
            change: debounce(function () {
                if (this._isDestroyed) return
                this.current = -1
                this.filterUsers()
            }, 300),
            onchange() {
            },
            focus() {
                this.current = -1
            },
            filterUsers() {

            },
            close() {
                this.$emit('close')
            }
        },
    }
</script>

<style lang="scss">
    .job_invite_team--dialog {
        overflow: visible !important;
    }
</style>
