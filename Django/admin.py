from django.contrib.gis import admin

from ajax_select import make_ajax_form
from ajax_select.admin import AjaxSelectAdmin, AjaxSelectAdminTabularInline, AjaxSelectAdminStackedInline

from .models import Company, Membership, CompanyApplications, CompanyTemplate


class CompanyModelAdmin(AjaxSelectAdmin):
    form = make_ajax_form(Company, {'city': 'city'})


# In models.py
class CompanyProxy(Company):
    class Meta:
        proxy = True


admin.site.register(Company)
admin.site.register(CompanyProxy, CompanyModelAdmin)
admin.site.register(Membership)
admin.site.register(CompanyApplications)
admin.site.register(CompanyTemplate)
