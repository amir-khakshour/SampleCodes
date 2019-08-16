from django.apps import AppConfig


class CompanyConfig(AppConfig):
    label = 'company'
    name = 'tb.apps.company'
    verbose_name = 'Company'

    def ready(self):
        from . import receivers
        from django.utils.module_loading import autodiscover_modules
        autodiscover_modules('roles')
