<template>
    <job-admin-layout :job="currentJob">
        <template slot="topbar" slot-scope="slotProps">
            <layout-menu-context-nav
                    :heading="pageTitle"
                    :loading="loading"
                    :refresh="true"
                    @refresh="fetchData"
                    create="Add candidate"
                    @create="navigateToDiscover"
            >
            </layout-menu-context-nav>

        </template>

        <template slot="content" slot-scope="slotProps">
            <template v-if="!loading">
                <no-items
                        v-if="!loading && !total"
                        :arrow="true"
                        icon="info"
                        title="Add your first candidate">
                    <div slot="text">
                        <p>Start filling your Hiring Queue by asking a talent for an interview.</p>
                        <v-btn depressed
                               outline
                               color="primary"
                               :to="{ name: 'talents__root' }"
                        >
                            <v-icon left dark>people</v-icon>
                            Search Talents
                        </v-btn>
                    </div>
                </no-items>
                <v-data-table
                        v-else="!loading && items.length"
                        :headers="headers"
                        :items="items"
                        class="tbh__card"
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
                                    <img :src="avatarUrl(props.item.talent)">
                                </v-list-tile-avatar>

                                <v-list-tile-content>
                                    <v-list-tile-title v-html="props.item.talent.display_name"></v-list-tile-title>
                                </v-list-tile-content>
                            </v-list-tile>
                        </td>
                        <td class="text-xs-left" v-html="offerStatusText(props.item.status)"></td>
                        <td class="text-xs-left" v-html="offerEmploymentTypeText(props.item.employment_type)"></td>
                        <td class="text-xs-left" v-html="OfferSalaryText(props.item.salary, props.item.currency)"></td>

                        <td class="text-xs-left" v-html="displayDateTime(props.item.sent_time)"></td>
                        <td class="text-xs-left" v-html="displayDatesToFutureText(props.item.expire_date)"></td>
                        <td class="text-xs-left">
                            <v-btn depressed flat small @click.prevent="showOfferMessage(props.item)" color="primary">offer message</v-btn>
                            <v-btn depressed flat small @click.prevent="showTalentMessage(props.item)" color="primary">talent message</v-btn>
                        </td>
                    </template>
                    <template slot="no-data">
                        <v-btn depressed color="primary" @click="fetchData">Reset</v-btn>
                    </template>
                </v-data-table>

                <v-dialog
                        v-model="offer_message_dialog"
                        width="500"
                >
                    <v-card v-if="selected_offer">
                        <v-card-title
                                class="headline grey lighten-2"
                                primary-title
                        >
                            Offer message
                        </v-card-title>
                        <v-card-text v-html="selected_offer.message"></v-card-text>

                        <v-card-actions>
                            <v-spacer></v-spacer>
                            <v-btn depressed
                                   color="primary"
                                   @click="offer_message_dialog = false"
                            >
                                close
                            </v-btn>
                        </v-card-actions>
                    </v-card>
                </v-dialog>
            </template>
        </template>
    </job-admin-layout>

</template>
<script>
    import Api from 'Employer/services/Api'
    import utils from 'Employer/utils'
    import PageHelper from 'Employer/mixins/PageHelper'
    import UserHelper from 'Employer/mixins/UserHelper'
    import JobHelper from 'Employer/mixins/JobHelper'
    import PaginationHelper from 'Employer/mixins/PaginationHelper'
    import OfferHelper from 'Employer/mixins/OfferHelper'

    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import JobAdminLayout from 'Employer/pages/jobs/JobAdminLayout'
    import NoItems from 'Employer/components/partials/NoItems'
    import DateHelper from "Employer/mixins/DateHelper";


    export default {
        mixins: [PageHelper, UserHelper, PaginationHelper, JobHelper, OfferHelper, DateHelper],
        components: {
            NoItems,
            JobAdminLayout,
            layoutMenuContextNav,
            LayoutMenuContextSub,
            LayoutContent,
        },
        data() {
            return {
                pageTitle: 'Job Offers',
                selected_offer: null,
                offer_message_dialog: false,
                headers: [
                    {
                        text: 'talent',
                        align: 'left',
                        value: 'full_name'
                    },
                    {text: 'Status', value: 'status'},
                    {text: 'employment type', value: 'employment_type'},
                    {text: 'salary', value: 'salary'},
                    {text: 'Send Date', value: 'sent_time'},
                    {text: 'Expiration Date', value: 'expire_date'},
                    {text: 'Actions', value: 'action'},
                ]
            }
        },
        computed: {},
        mounted() {
            this.fetchData()
        },
        methods: {
            showOfferMessage(offer) {
                this.selected_offer = offer
                this.offer_message_dialog = true
            },
            displayDateTime(datetime) {
                return utils.displayDateTime(datetime)
            },
            navigateToDiscover() {
                this.$router.push({
                    name: 'talents__discovery',
                })
            },
            nextPageRequest() {
                return new Promise((resolve, reject) => {
                    return Api
                        .withCurrentCompany()
                        .withCurrentJob()
                        .makeRequest({
                            url: 'offer__by_job',
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
