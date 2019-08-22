import GateMixin from 'Employer/gates/GateMixin'

export default {
    mixins: [
        GateMixin
    ],
    mounted() {
        this.fetchJobByID(this.$route.params.jobID)
    },
    methods: {
        fetchJobByID(jobID) {
            this.$store.dispatch('fetchJob', {
                jobID: jobID
            }).then(response => {
                this.job = response
                this.formFill(this.form, response)
            }, error => {
            })
        },
    },
}
