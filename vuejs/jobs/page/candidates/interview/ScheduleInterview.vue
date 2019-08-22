<template>
    <interview-admin-layout>
        <template slot="topbar" slot-scope="slotProps">
            <layout-menu-context-nav
                    :heading="pageTitle"
                    :loading="loading"
                    :refresh="true"
                    @refresh="fetchData"
                    create="schedule interview"
                    @create="openScheduleDialog"
            >
            </layout-menu-context-nav>
        </template>
        <template slot="content" slot-scope="props">
            <v-flex xs12 mb-2 class="text-xs-center" v-if="loading">
                <v-flex xs12 lg8 align-self-center class="interview__timeline__item" v-for="i in [1,2,3,4]">
                    <ContentLoader :width="400" :height="40" :speed="2" secondaryColor="#bebebe">
                        <rect x="10" y="10" rx="0" ry="0" width="15" height="15"/>
                        <rect x="40" y="10" rx="0" ry="0" width="25" height="5"/>
                        <rect x="40" y="20" rx="0" ry="0" width="35" height="5"/>
                        <rect x="90" y="12" rx="0" ry="0" width="95" height="3"/>
                        <rect x="90" y="20" rx="0" ry="0" width="95" height="5"/>
                    </ContentLoader>
                </v-flex>
            </v-flex>
            <template v-else>
                <v-flex xs12 v-if="!loading && !total">
                    <no-items
                            :arrow="true"
                            icon="update"
                            title="No schedule available">
                        <div slot="text">
                            <p>There are no schedule for this candidate!</p>
                        </div>
                    </no-items>
                </v-flex>
                <v-data-iterator
                        v-else="!loading && !!total"
                        :items="items"
                        :rows-per-page-items="rowsPerPageItems"
                        :total-items="total"
                        :pagination.sync="pagination"
                        content-tag="v-layout"
                        row
                        wrap
                >
                    <v-flex xs12 mb-2 slot="item" slot-scope="props">
                        <v-flex xs12 lg8 align-self-center class="interview__timeline__item">
                        </v-flex>
                    </v-flex>
                </v-data-iterator>
                <schedule-dialog :dialog.sync="schedule_dialog" @close="schedule_dialog=false"></schedule-dialog>
            </template>
        </template>
    </interview-admin-layout>
</template>

<script>
    import {
        ContentLoader,
    } from 'vue-content-loader'

    import Api from 'Employer/services/Api'
    import PageHelper from 'Employer/mixins/PageHelper'
    import PaginationHelper from 'Employer/mixins/PaginationHelper'
    import UserHelper from 'Employer/mixins/UserHelper'
    import NoItems from 'Employer/components/partials/NoItems'
    import InterviewHelper from "Employer/mixins/InterviewHelper";
    import NotificationHelper from "Employer/mixins/NotificationHelper";
    import InterviewAdminLayout from './InterviewAdminLayout'
    import UpdateItem from 'Employer/pages/updates/UpdateItem'

    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import ScheduleDialog from './schedule/ScheduleDialog'

    export default {
        mixins: [PageHelper, UserHelper, PaginationHelper, InterviewHelper, NotificationHelper],
        components: {
            InterviewAdminLayout,
            UpdateItem,
            NoItems,
            ContentLoader,
            layoutMenuContextNav,
            LayoutMenuContextSub,
            ScheduleDialog,
        },
        data: () => ({
            pageTitle: 'Interview schedule',
            total: 0,
            items: [],
            schedule_dialog: false,
            subNav: []
        }),
        mounted() {
            this.fetchData()
            this.subNav = [
                {
                    'icon': 'add',
                    'type': 'btn',
                    'text': 'schedule interview',
                    'action': this.openScheduleDialog,
                },
            ]
        },
        methods: {
            openScheduleDialog() {
                this.schedule_dialog = true
            },
            nextPageRequest() {
                return new Promise((resolve, reject) => {
                    let params = {
                        page: this.pagination.page,
                        rowsPerPage: this.pagination.rowsPerPage,
                    }
                    return Api
                        .withCurrentCompany()
                        .withCurrentInterview()
                        .makeRequest({
                            url: 'interview__schedule__root',
                            method: 'get',
                            params: params,
                        })
                        .then(response => {
                            resolve(response.data);
                        })
                        .catch(error => {
                            reject(error);
                            this.loading = false
                        })
                })
            },
        }

    }
</script>
<style lang="scss">
    .interview__timeline__item {
        margin: 0 auto !important;
    }
</style>
