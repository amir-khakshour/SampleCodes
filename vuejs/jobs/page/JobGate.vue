<template>
    <div class="tbh__gate__job" v-if="!loading">
        <router-view></router-view>
    </div>
</template>

<script>
    import Api from 'Employer/services/Api'
    import GateMixin from 'Employer/gates/GateMixin'

    export default {
        mixins: [
            GateMixin
        ],
        computed: {
            selectedJobId() {
                return this.$route.params.jobID
            },
        },
        mounted() {
            this.fetchJob()
        },
        methods: {
            fetchJob() {
                let request = Api
                    .withCurrentCompany()
                    .withCurrentJob(this.selectedJobId)
                    .makeRequest({
                        url: 'job__job_gate',
                        method: 'get',
                    })
                    .then(response => {
                        this.$store.dispatch('setJob', response.data)
                    })
                    .catch(response => {
                        // @todo log error
                        this.$router.push({name: 'company_gate'})
                    })
                this.requestLoading(request)
            }
        },
    }

</script>
