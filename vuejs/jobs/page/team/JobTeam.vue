<template>
    <job-admin-layout :job="currentJob">
        <template slot="topbar" slot-scope="slotProps">
            <layout-menu-context-nav
                    :heading="pageTitle"
                    :loading="loading"
                    :refresh="true"
                    @refresh="fetchJobMembers"
            >
            </layout-menu-context-nav>
            <layout-menu-context-sub
                    :items="subNav">
            </layout-menu-context-sub>
        </template>

        <template slot="content" slot-scope="slotProps">
            <v-data-table
                    :headers="headers"
                    :items="members"
                    class="tbh__card"
                    v-if="!loading"
                    id="members-table"
            >
                <template slot="items" slot-scope="props">
                    <td class="text-xs-right">
                        <v-list-tile
                                :key="props.item.full_name"
                                avatar
                                @click=""
                        >
                            <v-list-tile-avatar>
                                <img :src="avatarUrl(props.item)">
                            </v-list-tile-avatar>

                            <v-list-tile-content>
                                <v-list-tile-title v-html="props.item.full_name"></v-list-tile-title>
                                <v-list-tile-sub-title v-html="props.item.email" class="grey--text text--darken-2"></v-list-tile-sub-title>
                            </v-list-tile-content>
                        </v-list-tile>
                    </td>
                    <td class="text-xs-left">
                        {{props.item.role_name}}
                    </td>

                    <td class="text-xs-left">
                        <v-checkbox
                                :label="`${props.item.is_admin ? 'Yes' : 'No'}`"
                                v-model="props.item.is_admin"
                                disabled
                        ></v-checkbox>
                    </td>

                    <td class="text-xs-left">
                        <v-checkbox
                                :label="`${props.item.view_all_jobs ? 'Yes' : 'No'}`"
                                v-model="props.item.view_all_jobs"
                                disabled
                        ></v-checkbox>
                    </td>

                    <td class="text-xs-left">{{ props.item.protein }}</td>
                    <td class="justify-center">
                        <v-icon
                                @click="props.item.view_all_jobs ? showRemoveHelpDialog(props.item) : removeTeamMemberConfirm(props.item)"
                        >
                            delete
                        </v-icon>
                    </td>
                </template>
                <template slot="no-data">
                    <v-btn depressed color="primary" @click="fetchJobMembers">Reset</v-btn>
                </template>
            </v-data-table>
            <confirm-dialog :close_finally="false" ref="confirm_dialog"></confirm-dialog>
            <v-dialog
                    ref="cant_remove_dialog"
                    v-model="cant_remove_dialog"
                    hide-overlay
                    width="500"
            >
                <v-card
                        color="red"
                        dark
                >
                    <v-card-text class="subheading">
                        You can only remove per-job memberships from a job. since {{selectedUserFullname}} role has company wide access to
                        jobs you need to change it's role from company team members page then assign it to each job separately!
                    </v-card-text>
                    <v-card-actions justify-center align-center>
                        <v-spacer></v-spacer>
                        <v-btn depressed :to="{name: 'settings_company_team'}">
                            <span class="tk-layout-menubar-nav__link__text">company team settings</span>
                        </v-btn>
                        <v-btn depressed
                               light
                               color="white"
                               @click="cant_remove_dialog = false"
                        >
                            close
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-dialog>
            <job-invite-team-dialog :dialog="dialog_join_team" @close="dialog_join_team=false"></job-invite-team-dialog>
            <job-add-team-dialog :dialog="dialog_add_team" :current-members="members"
                                 @close="dialog_add_team=false"></job-add-team-dialog>
            <router-view/>
        </template>
    </job-admin-layout>
</template>
<script>
    // @TODO add pending invitations

    import Api from 'Employer/services/Api'
    import PageHelper from 'Employer/mixins/PageHelper'
    import FormBuilder from 'Employer/components/forms/FormBuilder'
    import FormInput from 'Employer/components/forms/FormInput'
    import TableBuilder from 'Employer/components/tables/TableBuilder'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import FormHelper from 'Employer/mixins/FormHelper'
    import Modal from 'Employer/components/partials/Modal'
    import FormSubmit from 'Employer/components/forms/FormSubmit'
    import JobAdminLayout from 'Employer/pages/jobs/JobAdminLayout'
    import JobHelper from 'Employer/mixins/JobHelper'
    import CompanyHelper from 'Employer/mixins/CompanyHelper'
    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import ConfirmDialog from 'Employer/components/partials/ConfirmDialog'
    import UserHelper from "Employer/mixins/UserHelper";
    import JobAddTeamDialog from "./add/JobAddTeam";
    import JobInviteTeamDialog from "./invite/JobInviteTeam";

    export default {
        mixins: [PageHelper, UserHelper, FormHelper, JobHelper, CompanyHelper],
        i18n: {
            job_team: {
                removed_successfully: 'Member successfully removed from job membership'
            },
        },
        components: {
            ConfirmDialog,
            JobAdminLayout,
            layoutMenuContextNav,
            LayoutMenuContextSub,
            LayoutContent,
            FormBuilder,
            TableBuilder,
            FormInput,
            Modal,
            FormSubmit,
            JobAddTeamDialog,
            JobInviteTeamDialog,
        },
        data() {
            return {
                pageTitle: 'Job team members',
                openTeamMemberDialog: false,
                dialog_add_team: false,
                dialog_join_team: false,
                subNav: [
                    {
                        'icon': 'add',
                        'type': 'btn',
                        'text': 'Invite Member',
                        'action': this.openInvitePage,
                    },
                    {
                        'icon': 'group_add',
                        'type': 'btn',
                        'text': 'Add existing team member',
                        'action': this.openAddDialog,
                    },
                ],
                members: {},
                headers: [
                    {
                        text: 'Member',
                        align: 'left',
                        value: 'full_name'
                    },
                    {text: 'Role', value: 'role_name'},
                    {text: 'Is Company Admin?', value: 'is_admin'},
                    {text: 'Can View All Jobs?', value: 'view_all_jobs'},
                    {text: 'Status', value: 'status'},
                    {text: 'Actions', value: 'name', sortable: false}
                ],
                loading: true,
                cant_remove_dialog: false,
                selectedUserFullname: '',
            }
        },
        mounted() {
            this.fetchJobMembers()
        },
        methods: {
            showRemoveHelpDialog(member) {
                this.selectedUserFullname = member.full_name
                this.cant_remove_dialog = true
            },
            openAddDialog() {
                this.dialog_add_team = true
            },
            openInvitePage() {
                this.dialog_join_team = true
            },
            removeTeamMember(member) {
                return Api
                    .withCurrentCompany()
                    .withCurrentJob()
                    .makeRequest({
                        url: 'membership__remove_by_job',
                        method: 'DELETE',
                        data: {
                            'uuid': member.uuid,
                        }
                    })
            },
            fetchJobMembers() {
                this.loading = true
                this.$store.dispatch('fetchJobMembers').then((members) => {
                    this.members = members
                    this.loading = false
                })
            },
            removeTeamMemberConfirm(member) {
                let job = this.$store.getters.getJob
                this.$refs.confirm_dialog
                    .open('Remove Team Member', `Do you want to remove <strong>${member.full_name}</strong> from this job ? </br> ${job.title}`)
                    .then(agreed => {
                        if (agreed) {
                            this.removeTeamMember(member)
                                .then((response) => {
                                    this.success_flash(this.$t('job_team.removed_successfully'))
                                    this.$refs.confirm_dialog.close()
                                    this.fetchJobMembers()
                                })
                                .catch((errors) => {
                                    this.error_flash(this.$t('base.error_on_save'))
                                })
                        }
                        // close
                        this.$refs.confirm_dialog.close()
                    }, error => {
                        console.log(error); // @TODO log error
                    })
            }
        }
    }
</script>

<style lang="scss">
    #members-table tbody td {
        height: 85px;
    }
</style>
