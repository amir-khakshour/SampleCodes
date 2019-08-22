<template>
    <job-admin-layout :job="currentJob">
        <template slot="topbar" slot-scope="slotProps">
            <layout-menu-context-nav
                    :heading="pageTitle"
                    :loading="loading"
                    :refresh="true"
                    @refresh="fetchJobCandidates"
            >
                <template slot="actions">
                    <form-input :field="viewGroup" control="viewGroup"></form-input>
                </template>
            </layout-menu-context-nav>
        </template>

        <template slot="content" slot-scope="slotProps">
            <container
                    class="tbh__stages__container"
                    lock-axis="x"
                    orientation="horizontal"
                    drag-handle-selector=".list-drag-handle">
                <v-layout row wrap>
                    <v-flex class="tbh__stage" :class="`tbh__stage__${stage.key}`" v-for="(stage, idx) in stages">
                        <v-card class="tbh__card tbh__card__stage" ref="list" :data-id="stage.key">
                            <div class="tbh__stage__title v-toolbar__content pa-2 mt-2" style="height: 30px;">
                                <div style="width: 100%;" v-if="loading">
                                    <ContentLoader :width="240" :height="30" :speed="2" secondaryColor="#bebebe">
                                        <rect x="10" y="0" rx="0" ry="5" width="220" height="20"/>
                                        <rect x="240" y="0" rx="0" ry="5" width="25" height="20"/>
                                    </ContentLoader>
                                </div>
                                <template v-else>
                                    <v-icon class="tbh__stage__title__icon">brightness_1</v-icon> &nbsp;
                                    <span class="tbh__stage__title__val">{{stage.title}}</span>&nbsp;
                                    <v-spacer></v-spacer>
                                    <span class="tbh__stage__title__total"
                                          v-html="stage['interviews'].length"></span>
                                </template>
                            </div>
                            <container
                                    class="drop_container"
                                    group-name="candidates-list"
                                    drag-class="card-ghost"
                                    drop-class="card-ghost-drop"
                                    non-drag-area-selector=".icon"
                                    :animation-duration="100"
                                    @drop="e => onCandidateDrop(e, stage.key, idx)"
                            >
                                <div v-if="loading">
                                    <div style="height: 60px; width: 100%;" v-for="i in getRandomArr()">
                                        <ContentLoader :width="240" :height="56" :speed="2" secondaryColor="#bebebe">
                                            <rect x="70" y="15" rx="4" ry="4" width="117" height="6.4"/>
                                            <rect x="70" y="35" rx="3" ry="3" width="85" height="6.4"/>
                                            <circle cx="30" cy="30" r="20"/>
                                        </ContentLoader>
                                    </div>
                                </div>
                                <draggable v-else v-for="item in stage.interviews">
                                    <v-hover :key="`interview-${item.id}`">
                                        <v-card
                                                class="tbh__card tbh__card__candidate"
                                                @click.prevent="goToInterviewPage(item)"
                                                slot-scope="{ hover }"
                                                :class="`elevation-${hover ? 5 : 'none'}`">
                                            <v-list-tile
                                                    avatar
                                                    @click=""
                                            >
                                                <v-list-tile-avatar>
                                                    <img :src="avatarUrl(item.talent)">
                                                </v-list-tile-avatar>
                                                <v-list-tile-content>
                                                    <v-list-tile-title v-html="item.talent.display_name"></v-list-tile-title>
                                                    <v-list-tile-sub-title
                                                            v-html="displayDatesToNow(item.result_created_at)"></v-list-tile-sub-title>
                                                </v-list-tile-content>
                                            </v-list-tile>
                                        </v-card>
                                    </v-hover>
                                </draggable>
                            </container>
                        </v-card>
                    </v-flex>
                </v-layout>
            </container>
        </template>
    </job-admin-layout>
</template>
<script>
    import {Container, Draggable} from 'vue-smooth-dnd';
    import {makeDropHandler} from './utils/plugins'

    import Api from 'Employer/services/Api'
    import PageHelper from 'Employer/mixins/PageHelper'
    import JobHelper from 'Employer/mixins/JobHelper'
    import DateHelper from 'Employer/mixins/DateHelper'
    import UserHelper from "Employer/mixins/UserHelper";
    import layoutMenuContextNav from 'Employer/components/layout/menubar/LayoutMenuContextNav'
    import LayoutMenuContextSub from 'Employer/components/layout/menubar/LayoutMenuContextSub'
    import LayoutContent from 'Employer/components/layout/LayoutContent'
    import Modal from 'Employer/components/partials/Modal'
    import JobAdminLayout from 'Employer/pages/jobs/JobAdminLayout'
    import NoItems from 'Employer/components/partials/NoItems'
    import ConfirmDialog from 'Employer/components/partials/ConfirmDialog'
    import InterviewHelper from "Employer/mixins/InterviewHelper";
    import FormInput from 'Talent/components/forms/FormInput'
    import {
        ContentLoader,
    } from 'vue-content-loader'

    export default {
        mixins: [PageHelper, JobHelper, NoItems, DateHelper, UserHelper, InterviewHelper],
        components: {
            ConfirmDialog,
            NoItems,
            JobAdminLayout,
            layoutMenuContextNav,
            LayoutMenuContextSub,
            LayoutContent,
            Modal,
            Container,
            Draggable,
            FormInput,
            ContentLoader,
        },
        data() {
            return {
                pageTitle: 'Job Candidates',
                loading: true,
                job: {},
                candidates: [],
                stages: [],
                stage_key_to_idx: {},
                filter_by: 'qualified',
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
                viewGroup: {
                    type: 'button-group',
                    data: 'week',
                    active: 'qualified',
                    options: {
                        qualified: 'Qualified',
                        disqualified: 'Disqualified',
                    },
                }
            }
        },
        computed: {},
        watch: {
            candidates: {
                handler() {
                    // add candidates to stages
                    this.resetStagesCandidates()
                    Object.values(this.candidates).forEach((candidate) => {
                        this.stages[this.stage_key_to_idx[candidate.stage]]['interviews'].push(candidate)
                        // this.$set(this.stages[this.stage_key_to_idx[candidate.stage]]['interviews'], stage_idx, {'interviews': []})
                    })
                },
                deep: true
            },
            'viewGroup.active'(newVal, oldVal) {
                this.setTitleByFilter(newVal)
            },
        },
        created() {
            let stages = AC.get_settings('offer.INTERVIEW_STAGES_SORTED')
            Object.keys(stages).forEach((stage_idx) => {
                this.$set(this.stages, stage_idx, {'interviews': [], total: 0, 'key': stages[stage_idx]['key'], 'title': stages[stage_idx]['title']})
                this.stage_key_to_idx[this.stages[stage_idx]['key']] = stage_idx
            })
            this.viewGroup.onChange = this.changedView
        },
        mounted() {
            this.fetchJobCandidates()
        },
        methods: {
            getRandomArr() {
                return Array(Math.floor(Math.random() * 5) + 1).fill().map((_, i) => i * i);
            },
            refreshStageCounts() {
                let stages = AC.get_settings('offer.INTERVIEW_STAGES_SORTED')
                Object.keys(stages).forEach((stage_idx) => {
                    this.$set(this.stages, stage_idx, {'interviews': [], 'key': stages[stage_idx]['key'], 'title': stages[stage_idx]['title']})
                    this.stage_key_to_idx[this.stages[stage_idx]['key']] = stage_idx
                })
            },
            changedView() {
                this.fetchJobCandidates()
            },
            setTitleByFilter(filter_by) {
                this.pageTitle = `${this.viewGroup.options[filter_by]} offers`
            },
            goToInterviewPage(interview) {
                this.$router.push({name: 'interview__page', params: {interviewID: interview.id}})
            },
            onCandidateDrop: makeDropHandler('onCandidateDropComplete'),
            onCandidateDropComplete(src, trg, element, payload) {
                let src_stage_key = src.params[0],
                    dest_stage_key = trg.params[0]
                let interview = this.stages[this.stage_key_to_idx[src_stage_key]]['interviews'].splice(src.index, 1)[0];
                this.stages[this.stage_key_to_idx[dest_stage_key]]['interviews'].push(interview)
                this.setInterviewStage(interview, dest_stage_key)
                this.$forceUpdate()
            },
            setInterviewStage(interview, stage) {
                this.changeInterviewStageRequest(interview.id, stage)
                    .then(response => {
                    })
                    .catch(error => {
                        // this.flash(this.offerSentMessage, 'error');
                    })
            },
            resetStagesCandidates() {
                Object.values(this.stages).forEach((stage) => {
                    stage['interviews'] = []
                })
            },
            fetchJobCandidates() {
                this.loading = true
                let params = {
                    filter_by: this.viewGroup.active
                }
                return Api
                    .withCurrentCompany()
                    .withCurrentJob()
                    .makeRequest({
                        url: 'interview__root',
                        method: 'get',
                        params: params,
                    })
                    .then(response => {
                        this.candidates = response.data
                    })
                    .catch(error => {
                        // @todo logo here
                    })
                    .finally(() => {
                        this.loading = false
                    })

            }
        }
    }
</script>
<style lang="scss">
    .tbh__stages__container {
        overflow-x: visible;

        > .layout {
            display: flex;
            overflow-x: scroll;
            flex-flow: row;
            flex: 1 1 auto;
            max-width: 100%;
            position: relative;
            min-height: 350px;
        }

    }

    .tbh__card__candidate {
        cursor: pointer;
        margin: 1rem 0.5rem;
        width: auto !important;

        .smooth-dnd-draggable-wrapper.animated & {
            cursor: grabbing;
            cursor: -moz-grabbing;
            cursor: -webkit-grabbing;
        }

        .listitem, .listitem img {
            -webkit-user-select: none; /* Safari */
            -moz-user-select: none; /* Firefox */
            -ms-user-select: none; /* IE10+/Edge */
            user-select: none; /* Standard */
        }
    }

    .drop_container {
        min-height: 450px;
    }

</style>
