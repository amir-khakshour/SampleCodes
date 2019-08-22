<template>
    <simple-tool-bar :tabs="tabs">
        <template slot="toolbar" slot-scope="props">
        </template>

        <template slot="content" slot-scope="props">
            <router-view></router-view>
        </template>
    </simple-tool-bar>
</template>

<script>
    import SimpleToolBar from 'Employer/components/partials/SimpleToolBar.vue'

    export default {
        components: {
            SimpleToolBar,
        },
        data() {
            return {
                tabs: [
                    {to: {name: 'jobs_available'}, text: 'Active Jobs'},
                    {to: {name: 'jobs_archived'}, text: 'Archived'},
                ],
                drawerRight: true,
            }
        },
        computed: {},
        watch: {},
    }
</script>
