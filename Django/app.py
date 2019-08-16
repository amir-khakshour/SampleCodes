from django.conf import settings
from django.conf.urls import url, include
from django.contrib.auth.decorators import login_required
from django.views import generic
from rest_framework.routers import SimpleRouter
from tb.core.application import Application
from tb.core.loading import get_class


class CompanyApplication(Application):
    name = 'company'
    CompanyViewset = get_class('company.views.api', 'CompanyViewset')
    CompanyDocumentViewset = get_class('company.views.api', 'CompanyDocumentViewSet')
    MembershipViewset = get_class('company.views.api', 'MembershipViewset')
    router = SimpleRouter()

    def get_api_urls(self):
        self.router.register(
            r'%s' % (settings.API_PATH_FLATTEN['company__root']),
            self.CompanyViewset,
            base_name='api_company__root'
        )
        self.router.register(
            r'%s' % (settings.API_PATH_FLATTEN['company__query']),
            self.CompanyDocumentViewset,
            base_name='api_company__query'
        )

        self.router.register(
            r'%s' % (settings.API_PATH_FLATTEN['membership__root']),
            self.MembershipViewset,
            base_name='api_membership__root'
        )

        return [
            url(r'^', include(self.router.urls)),
        ]

    def get_urls(self):
        urls = []
        return self.post_process_urls(urls)


application = CompanyApplication()
