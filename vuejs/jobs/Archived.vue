<template>
    <div id="page__jobs__archived" class="page__jobs__archived page__jobs__list">
        <layout-menu-context-nav
                :heading="pageTitle"
                :loading="loading"
                :refresh="true"
                @refresh="fetchData">
        </layout-menu-context-nav>
        <v-container fluid grid-list-md>
            <template v-if="loading">
                <v-layout raw wrap>
                    <v-flex v-for="i in [1,2]"
                            xs12 md6 lg4 xl3
                            class="mb-3"
                    >
                        <div style="width: 410px">
                            <ContentLoader :width="200" :height="250" :speed="2" secondaryColor="#bebebe">
                                <rect data-v-1fdd15da="" x="20" y="20" rx="4" ry="4" width="145" height="10"/>
                                <rect data-v-1fdd15da="" x="170" y="20" rx="4" ry="4" width="20" height="10"/>
                                <rect data-v-1fdd15da="" x="20" y="40" rx="3" ry="3" width="150" height="6"/>
                                <rect data-v-1fdd15da="" x="20" y="55" rx="3" ry="3" width="110" height="6"/>
                                <rect data-v-1fdd15da="" x="20" y="70" rx="3" ry="3" width="95" height="6"/>
                                <rect data-v-1fdd15da="" x="20" y="85" rx="3" ry="3" width="50" height="6"/>
                            </ContentLoader>
                        </div>
                    </v-flex>
                </v-layout>
            </template>
            <template v-else>
                <no-items
                        v-if="!items.length"
                        icon="touch_app"
                        title="No archived Job">
                </no-items>
                <v-data-iterator
                        v-if="items.length"
                        :items="items"
                        :rows-per-page-items="rowsPerPageItems"
                        :pagination.sync="pagination"
                        :total-items="total"
                        content-tag="v-layout"
                        row
                        wrap
                >
                    <v-flex
                            slot="item"
                            slot-scope="props"
                            xs12 md6 lg4 xl3
                            class="mb-3"
                    >
                        <v-hover>
                            <v-card class="mb-1 tbh__card tbh__card__clickable"
                                    :to="{ name: 'job__candidates', params: { jobID: props.item.id } }" slot-scope="{ hover }"
                                    :class="`elevation-${hover ? 3 : 'none'}`">
                                <v-toolbar class="no-box-shadow" light color="white">
                                    <v-toolbar-title v-text="props.item.title"></v-toolbar-title>
                                    <v-spacer></v-spacer>
                                    <actions-menu
                                            :base="getActionsMenuBase(props.item)"
                                            :items="getActionsMenuItems(props.item)">
                                    </actions-menu>
                                </v-toolbar>
                                <v-divider class="mt-0"></v-divider>

                                <v-card-title primary-title class="pt-0">
                                    <ul class="ac-list">
                                        <li>
                                            <span class="dt_label">Status:</span>
                                            <span class="dt_value">
                                                <v-chip small label :color="getJobStatusColorByID(props.item.status)"
                                                        text-color="white">
                                                    Status: {{ getJobStatusByID(props.item.status) }}
                                                </v-chip>
                                            </span>
                                        </li>
                                        <li>
                                            <span class="dt_label">City:</span>
                                            <span class="dt_value">{{props.item.city_raw}}</span>
                                        </li>
                                        <li>
                                            <span class="dt_label">Department:</span>
                                            <span class="dt_value">{{props.item.department}}</span>
                                        </li>
                                        <li>
                                            <span class="dt_label">Offers:</span>
                                            <span class="dt_value">0</span>
                                        </li>
                                        <li>
                                            <span class="dt_label">Candidates:</span>
                                            <span class="dt_value">0</span>
                                        </li>
                                    </ul>
                                </v-card-title>
                            </v-card>
                        </v-hover>
                    </v-flex>
                </v-data-iterator>
            </template>
        </v-container>
        <confirm-dialog ref="confirm_dialog"></confirm-dialog>
    </div>
</template>

<script>
    import {
        ContentLoader,
    } from 'vue-content-loader'
    import Api from 'Employer/services/Api'

    import FormInput from 'Employer/components/forms/FormInput.vue'
    import NoItems from 'Employer/components/partials/NoItems'
    import Paginate from 'Employer/components/partials/Paginate'
    import PaginationHelper from 'Employer/mixins/PaginationHelper'

    import PageHelper from 'Employer/mixins/PageHelper'
    import JobHelper from 'Employer/mixins/JobHelper'

    import SimpleToolBar from 'Employer/components/partials/SimpleToolBar.vue'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import ActionsMenu from 'Employer/components/partials/ActionsMenu'
    import LayoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav.vue'
    import ConfirmDialog from 'Employer/components/partials/ConfirmDialog'

    export default {
        mixins: [PageHelper, JobHelper, PaginationHelper],
        components: {
            Paginate,
            LayoutContent,
            SimpleToolBar,
            LayoutMenuContextNav,
            FormInput,
            NoItems,
            ActionsMenu,
            ConfirmDialog,
            ContentLoader,
        },
        data() {
            return {
                tabs: [
                    {name: 'jobs_available', text: 'Active Jobs'},
                    {name: 'jobs_archived', text: 'Archived'},
                ],
                pageTitle: 'Archived Jobs',
                sortBy: {
                    'default': 'Default',
                    'department': 'Department',
                    'status': 'Status',
                    'title': 'Title',
                },
                showCreateUser: false,
            }
        },
        computed: {
            hasJobs() {
                return this.items.length > 0
            },
        },
        watch: {},
        mounted() {
            this.fetchData()
        },
        methods: {
            getActionsMenuBase(job) {
                return {
                    title: 'edit',
                    icon: 'build',
                    action: () => {
                        this.$router.push({
                            name: 'job_edit__details',
                            params: {
                                jobID: job.id
                            }
                        })
                    },
                }
            },
            getActionsMenuItems(job) {
                return [
                    {
                        title: 'duplicate',
                        action: () => this.duplicateJobConfirm(job),
                    },
                    {
                        title: 'publish',
                        action: () => this.enableJobConfirm(job),
                    },
                    {
                        title: 'delete',
                        action: () => this.deleteJobConfirm(job),
                    }
                ]
            },
            nextPageRequest() {
                return new Promise((resolve, reject) => {
                    return Api
                        .withCurrentCompany()
                        .makeRequest({
                            url: 'job__archived',
                            method: 'get',
                            query_params: this.queryParamsFromPagination,
                        })
                        .then(response => {
                            resolve(response.data);
                        })
                        .catch(error => {
                            reject(error);
                        })
                })

            },
        }
    }
</script>
