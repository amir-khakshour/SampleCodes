<template>
    <v-dialog
            v-model="getDialog"
            max-width="640"
            scrollable
    >
        <v-card>
            <v-card-title class="display-1">Add existing team member</v-card-title>
            <v-divider></v-divider>
            <div class="card__content">
                <v-container fluid grid-list-md>
                    <p class="subheading">Team members of a Job will receive notifications of all changes in that Job</p>
                    <v-layout row wrap v-if="members">
                        <v-flex xs12>
                            <v-autocomplete
                                    :items="members"
                                    label="select member"
                                    item-text="full_name"
                                    item-value="uuid"
                                    v-model="selectedMembers"
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
                                            @input="remove(data.item)"
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
                    </v-layout>
                </v-container>
            </div>
            <v-divider></v-divider>
            <v-card-actions>
                <v-layout align-end justify-end>
                    <v-btn flat @click="close()">Cancel</v-btn>
                    <v-btn depressed color="primary" @click="submitForm()" :loading="formSubmitLoading">Add</v-btn>
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

    import PageHelper from 'Employer/mixins/PageHelper'
    import FormHelper from 'Employer/mixins/FormHelper'
    import JobHelper from 'Employer/mixins/JobHelper'
    import UserHelper from 'Employer/mixins/UserHelper'
    import CompanyHelper from 'Employer/mixins/CompanyHelper'

    export default {
        mixins: [PageHelper, UserHelper, FormHelper, JobHelper, CompanyHelper],
        components: {},
        props: {
            dialog: false,
            currentMembers: {}
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
            members() {
                // @todo we have list of members already so we should get it from there
                this.loading = true
                let allowed_members = [],
                    already_members = []
                Object.values(this.currentMembers).forEach((member) => {
                    already_members.push(member.uuid)
                })
                Object.values(this.$store.getters.getCompanyAdmins).forEach((member) => {
                    if (!already_members.includes(member.uuid)) {
                        allowed_members.push(member)
                    }
                })
                return allowed_members
            },
        },
        data() {
            return {
                pageTitle: 'Invite team members',
                formSubmitLoading: false,
                selectedRole: null,
                selectedMembers: [],
                jobMembers: [],
                rules: {
                    member: [
                        (val) => val && val.length > 0 || 'please select at least a team member'
                    ],

                }
            }
        },
        watch: {},
        mounted() {
        },
        methods: {
            remove(member) {
                this.selectedMembers = this.selectedMembers.filter((uuid) => {
                    return uuid !== member.uuid
                });
            },
            close() {
                this.$emit('close')
            },
            submitForm() {
                this.formSubmitLoading = true
                return Api
                    .withCurrentCompany()
                    .withCurrentJob()
                    .makeRequest({
                        url: 'membership__add_by_job',
                        method: 'post',
                        data: {
                            members: this.selectedMembers,
                        }
                    })
                    .then(response => {
                        this.flash(`Members joined to ${this.currentJob.title}`, 'success', {
                            timeout: 2000,
                        });
                        this.close()
                    }).finally(() => {
                        this.formSubmitLoading = false
                    })
            },
        },
    }
</script>

<style lang="scss">

</style>
