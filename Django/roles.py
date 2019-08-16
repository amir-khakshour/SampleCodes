from tb.core.permissions.shortcuts import AbstractRoleBundle


class Admin(AbstractRoleBundle):
    permissions = [
        ('candidate_list', 'See Candidates List'),
        ('candidate_view', 'See name, resume, status'),
        ('candidate_add_feedback', 'Add feedback'),
        ('candidate_view_feedback', 'See feedback'),
        ('candidate_add_comment', 'Add comments'),
        ('candidate_view_comment', 'See comments'),
        ('candidate_view_interview', 'See interviews'),
        ('candidate_start_hiring', 'Start new hiring process'),
        ('candidate_schedule_interview', 'Schedule interviews'),
        ('candidate_edit_bg_info', 'Edit background info'),
        ('candidate_edit_status', 'Edit status'),
        ('candidate_see_emails', 'See emails'),
        ('candidate_view_letter', 'See \'offer letter\' document type'),
        ('candidate_view_private_comments', 'See and add private comments'),
        ('job_add', 'View job details'),
        ('job_edit', 'View job details'),
        ('job_view', 'View job details'),
        ('job_delete', 'Delete job'),
        ('job_view_internal_notes', 'View internal notes'),
        ('job_view_applicants', 'View candidate tab'),
        ('job_manage_publishing', 'Manage publishing'),
    ]


class JobCreator(AbstractRoleBundle):
    name = 'Job Creator'

    permissions = [
        ('job_add', 'View job details'),
        ('job_edit', 'View job details'),
        ('job_view', 'View job details'),
        ('job_view_internal_notes', 'View internal notes'),
    ]


class Reporter(AbstractRoleBundle):
    permissions = {
    }


class Recruiter(AbstractRoleBundle):
    permissions = [
        ('candidate_list', 'See Candidates List'),
        ('candidate_view', 'See name, resume, status'),
        ('candidate_add_feedback', 'Add feedback'),
        ('candidate_view_feedback', 'See feedback'),
        ('candidate_add_comment', 'Add comments'),
        ('candidate_view_comment', 'See comments'),
        ('candidate_view_interview', 'See interviews'),
        ('candidate_start_hiring', 'Start new hiring process'),
        ('candidate_schedule_interview', 'Schedule interviews'),
        ('candidate_edit_bg_info', 'Edit background info'),
        ('candidate_edit_status', 'Edit status'),
        ('candidate_see_emails', 'See emails'),
        ('candidate_view_letter', 'See \'offer letter\' document type'),
        ('candidate_view_private_comments', 'See and add private comments'),
        # ('job_add', 'View job details'),
        # ('job_edit', 'View job details'),
        ('job_view', 'View job details'),
        # ('job_delete', 'Delete job'),
        ('job_view_internal_notes', 'View internal notes'),
        ('job_view_applicants', 'View candidate tab'),
        # ('job_manage_publishing', 'Manage publishing'),
    ]


class HiringManager(AbstractRoleBundle):
    name = 'Hiring Manager'
    permissions = [
        ('candidate_list', 'See Candidates List'),
        ('candidate_view', 'See name, resume, status'),
        ('candidate_add_feedback', 'Add feedback'),
        ('candidate_view_feedback', 'See feedback'),
        ('candidate_add_comment', 'Add comments'),
        ('candidate_view_comment', 'See comments'),
        ('candidate_view_interview', 'See interviews'),
        ('candidate_start_hiring', 'Start new hiring process'),
        ('candidate_schedule_interview', 'Schedule interviews'),
        ('candidate_edit_bg_info', 'Edit background info'),
        ('candidate_edit_status', 'Edit status'),
        ('candidate_see_emails', 'See emails'),
        ('candidate_view_letter', 'See \'offer letter\' document type'),
        ('candidate_view_private_comments', 'See and add private comments'),
        # ('job_add', 'View job details'),
        # ('job_edit', 'View job details'),
        ('job_view', 'View job details'),
        # ('job_delete', 'Delete job'),
        ('job_view_internal_notes', 'View internal notes'),
        ('job_view_applicants', 'View candidate tab'),
        # ('job_manage_publishing', 'Manage publishing'),
    ]


class Coordinator(AbstractRoleBundle):
    permissions = [
        ('candidate_list', 'See Candidates List'),
        ('candidate_view', 'See name, resume, status'),
        ('candidate_add_feedback', 'Add feedback'),
        ('candidate_view_feedback', 'See feedback'),
        ('candidate_add_comment', 'Add comments'),
        ('candidate_view_comment', 'See comments'),
        ('candidate_view_interview', 'See interviews'),
        ('candidate_start_hiring', 'Start new hiring process'),
        ('candidate_schedule_interview', 'Schedule interviews'),
        ('candidate_edit_bg_info', 'Edit background info'),
        ('candidate_edit_status', 'Edit status'),
        ('candidate_see_emails', 'See emails'),
        ('candidate_view_letter', 'See \'offer letter\' document type'),
        ('candidate_view_private_comments', 'See and add private comments'),
        # ('job_add', 'View job details'),
        # ('job_edit', 'View job details'),
        ('job_view', 'View job details'),
        # ('job_delete', 'Delete job'),
        ('job_view_internal_notes', 'View internal notes'),
        ('job_view_applicants', 'View candidate tab'),
        # ('job_manage_publishing', 'Manage publishing'),
    ]


class Contributor(AbstractRoleBundle):
    permissions = [
        ('candidate_list', 'See Candidates List'),
        ('candidate_view', 'See name, resume, status'),
        ('candidate_add_feedback', 'Add feedback'),
        ('candidate_view_feedback', 'See feedback'),
        ('candidate_add_comment', 'Add comments'),
        ('candidate_view_comment', 'See comments'),
        ('candidate_view_interview', 'See interviews'),
        # ('candidate_start_hiring', 'Start new hiring process'),
        # ('candidate_schedule_interview', 'Schedule interviews'),
        # ('candidate_edit_bg_info', 'Edit background info'),
        # ('candidate_edit_status', 'Edit status'),
        # ('candidate_see_emails', 'See emails'),
        # ('candidate_view_letter', 'See \'offer letter\' document type'),
        # ('candidate_view_private_comments', 'See and add private comments'),
        # ('job_add', 'View job details'),
        # ('job_edit', 'View job details'),
        # ('job_view', 'View job details'),
        # ('job_delete', 'Delete job'),
        # ('job_view_internal_notes', 'View internal notes'),
        # ('job_view_applicants', 'View candidate tab'),
        # ('job_manage_publishing', 'Manage publishing'),
    ]


class UnassignedUsers(AbstractRoleBundle):
    name = 'Unassigned Users'
    permissions = [
        # ('candidate_list', 'See Candidates List'),
        # ('candidate_view', 'See name, resume, status'),
        # ('candidate_add_feedback', 'Add feedback'),
        # ('candidate_view_feedback', 'See feedback'),
        # ('candidate_add_comment', 'Add comments'),
        # ('candidate_view_comment', 'See comments'),
        # ('candidate_view_interview', 'See interviews'),
        # ('candidate_start_hiring', 'Start new hiring process'),
        # ('candidate_schedule_interview', 'Schedule interviews'),
        # ('candidate_edit_bg_info', 'Edit background info'),
        # ('candidate_edit_status', 'Edit status'),
        # ('candidate_see_emails', 'See emails'),
        # ('candidate_view_letter', 'See \'offer letter\' document type'),
        # ('candidate_view_private_comments', 'See and add private comments'),
        # ('job_add', 'View job details'),
        # ('job_edit', 'View job details'),
        ('job_view', 'View job details'),
        # ('job_delete', 'Delete job'),
        ('job_view_internal_notes', 'View internal notes'),
        # ('job_view_applicants', 'View candidate tab'),
        # ('job_manage_publishing', 'Manage publishing'),
    ]
