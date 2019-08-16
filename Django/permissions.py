# -*- coding: utf-8 -*-
from tb.core.api.permissions import TBResourcePermission
from tb.core.api.permissions import IsSuperUser
from tb.core.api.permissions import AllowAny
from tb.core.api.permissions import IsAuthenticated
from tb.core.api.permissions import HasCompanyPerm
from tb.core.api.permissions import IsCompanyAdmin
from tb.core.api.permissions import PermissionComponent
from tb.core.api.permissions import IsCompanyMember


class CompanyPermission(TBResourcePermission):
    enought_perms = IsSuperUser()
    global_perms = None
    retrieve_perms = HasCompanyPerm('view_company')
    partial_update_perms = HasCompanyPerm('modify_company')
    update_perms = HasCompanyPerm('admin_company')
    list_perms = AllowAny()


class MembershipPermission(TBResourcePermission):
    enought_perms = IsSuperUser()
    global_perms = None
    retrieve_perms = IsAuthenticated()
    partial_update_perms = HasCompanyPerm('admin_company')
    list_perms = IsAuthenticated()
    user_gate_perms = IsAuthenticated()
    company_gate_perms = IsCompanyMember()
    invite_perms = HasCompanyPerm('add_member')
    change_role_perms = HasCompanyPerm('admin_company')
    add_by_job_perms = HasCompanyPerm('admin_company') | HasCompanyPerm('add_member')
    remove_by_job_perms = HasCompanyPerm('admin_company') | HasCompanyPerm('remove_member')
    remove_member_perms = HasCompanyPerm('admin_company')


class CompanyVerified(TBResourcePermission):
    def has_permission(self, action: str, obj: object = None):
        company = self.view._objects.get('company', None)
        if company:
            return company.verified
        return True
