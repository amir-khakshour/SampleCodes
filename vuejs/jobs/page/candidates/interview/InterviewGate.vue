<template>
    <div class="tbh__gate__interview" v-if="!loading">
        <router-view></router-view>
    </div>
</template>

<script>
    import Api from 'Employer/services/Api'
    import GateMixin from 'Employer/gates/GateMixin'
    import InterviewHelper from 'Employer/mixins/InterviewHelper'

    export default {
        mixins: [
            GateMixin,
            InterviewHelper
        ],
        mounted() {
            this.fetchGateData()
        },
        methods: {
            fetchGateData() {
                let request = Api
                    .withCurrentCompany()
                    .withCurrentInterview(this.selectedInterviewId)
                    .makeRequest({
                        url: {
                            base: 'interview__root',
                            suffix: ['Detailed']
                        },
                        method: 'post',
                    })
                    .then(response => {
                        this.$store.dispatch('setInterview', response.data)
                        this.$store.dispatch('setTalent', response.data.talent)
                    })
                    .catch(response => {
                        // @todo log error
                        // this.$router.push({name: 'company_gate'})
                    })
                this.requestLoading(request)
            }
        },
    }

</script>
