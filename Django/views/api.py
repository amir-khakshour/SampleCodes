# -*- coding: utf-8 -*-

from django.http import Http404
from django.db import transaction
from rest_framework import permissions
from rest_framework.decorators import action

from django_elasticsearch_dsl_drf.constants import (
    LOOKUP_FILTER_TERMS,
    LOOKUP_FILTER_RANGE,
    LOOKUP_FILTER_PREFIX,
    LOOKUP_FILTER_WILDCARD,
    LOOKUP_QUERY_IN,
    LOOKUP_QUERY_GT,
    LOOKUP_QUERY_GTE,
    LOOKUP_QUERY_LT,
    LOOKUP_QUERY_LTE,
    LOOKUP_QUERY_EXCLUDE,
)
from django_elasticsearch_dsl_drf.filter_backends import (
    FilteringFilterBackend,
    IdsFilterBackend,
    OrderingFilterBackend,
    DefaultOrderingFilterBackend,
    CompoundSearchFilterBackend,
)
from django_elasticsearch_dsl_drf.viewsets import DocumentViewSet

from libs.es import SizeLimitFilterBackend
from tb.core.api.pagination import ESDrfPagination

from tb.core.loading import get_class, get_model
from tb.core import filters
from tb.core.api import response
from tb.core.api.viewsets import TBModelViewSet
from tb.core.api.mixins import object_required
from tb.core.api.utils import tb_get_object_or_404

from ..documents import CompanyDocument
from ..serializers import CompanySerializer, CompanyDocumentSerializer
from .. import permissions as CompanyPermissions
from .mixins import WithCompanyHeaderMixin
from .. import signals

Role = get_model('user', 'Role')
Company = get_model('company', 'Company')
Membership = get_model('company', 'Membership')
WithJobHeaderMixin = get_class('job.views.mixins', 'WithJobHeaderMixin')


class CompanyViewset(WithCompanyHeaderMixin, TBModelViewSet):
    """
    Requirements:
        - be able to put data only if the user is it's creator or it's the owner

    """
    serializer_class = CompanySerializer
    queryset = Company.objects.all()
    permission_classes = (CompanyPermissions.CompanyPermission,)

    lawyer = None

    def get_object(self):
        return self._objects.get('company', None)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class MembershipViewset(WithCompanyHeaderMixin, WithJobHeaderMixin, TBModelViewSet):
    permission_classes = (CompanyPermissions.CompanyVerified, CompanyPermissions.MembershipPermission,)
    serializer_class = get_class('company.serializers', 'MembershipSerializer')
    model = Membership
    paginator = None

    def get_queryset(self):
        qs = Membership.objects.all()
        qs = qs.select_related('company', 'role', 'user')
        return qs

    def retrieve(self, request, *args, **kwargs):
        qs = self.get_queryset()
        action = self.request.query_params.get('action', None)
        if action == "by_slug":
            self.lookup_field = "slug"
            # If we retrieve the project by slug we want to filter by user the
            # permissions and return 404 in case the user don't have access
            flt = filters.get_filter_expression_can_view_companies(self.request.user)

            qs = qs.filter(flt)
        self.object = tb_get_object_or_404(qs, **kwargs)

        self.check_permissions(request, 'retrieve', self.object)

        if self.object is None:
            raise Http404

        serializer = self.get_serializer(self.object)
        return response.Ok(data=serializer.data)

    @action(detail=False, url_path='CompanyGate', methods=['get'])
    @object_required('company')
    def company_gate(self, request, *args, **kwargs):
        serializer_class = get_class('company.serializers', 'MembershipDetailedSerializer')
        membership = request.user.cached_membership_for_company(self._objects.get('company'))
        serializer = self.get_serializer(membership, serializer=serializer_class)
        return response.Ok(data=serializer.data)

    @action(detail=False, url_path='UserGate')
    def user_gate(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        qs = qs.filter(user=request.user)
        serializer = self.get_read_serializer(qs, many=True)
        return response.Ok(data=serializer.data)

    @action(detail=False, url_path='ChangeRole', methods=['post'])
    @object_required('company')
    def change_role(self, request, *args, **kwargs):
        """
        required actions:
            - refresh user cached memberships
        :param request:
        :param args:
        :param kwargs:
        :return:
        """
        serializer_class = get_class('company.serializers', 'MembershipDetailedSerializer')
        role = tb_get_object_or_404(Role, slug=request.data.get('role'), company_id=self._objects.get('company').pk)
        membership = tb_get_object_or_404(Membership, user__uuid=request.data.get('user'), company_id=self._objects.get('company').pk)
        membership.role = role
        membership.jobs.clear()
        membership.save()
        signals.membership_changed.send(sender=self.__class__, user=membership.user)
        serializer = self.get_serializer(membership, serializer=serializer_class)
        return response.Ok(data=serializer.data)

    @action(detail=False, url_path='Invite', methods=['post', ])
    def invite(self, request, **kwargs):
        Role = get_model('user', 'Role')
        try:
            role = Role.objects.get(slug=request.data.get('role', None), company=self._objects['company'])
        except Role.DoesNotExist:
            return response.BadRequest(["role doesn't exist!"])
        return response.Ok(data=[])

    @action(detail=False, url_path='AddByJob', methods=['post', ])
    @object_required('company')
    @object_required('job')
    def add_by_job(self, request, **kwargs):

        # check if job exists in the selected company
        if self._objects['job'].company_id != self._objects['company'].id:
            return response.BadRequest(errors=["Job is not created in the selected company!"])

        if request.data.get('members', None) is None:
            return response.BadRequest(errors=["members cant be empty!"])

        with transaction.atomic():
            for membership in Membership.objects.filter(user__uuid__in=list(request.data.get('members', None))):
                membership.jobs.add(self._objects['job'].id)
            signals.membership_changed.send(sender=self.__class__, user=membership.user)

        return response.Created(data=[])

    @action(detail=False, url_path='RemoveByJob', methods=['delete', ])
    @object_required('company')
    @object_required('job')
    def remove_by_job(self, request, **kwargs):
        with transaction.atomic():
            if request.data.get('uuid', None) is None:
                return response.BadRequest(errors=["member UUID cant be empty!"])
            membership = tb_get_object_or_404(Membership, user__uuid=request.data.get('uuid'), company_id=self._objects['company'].id)
            membership.jobs.remove(self._objects['job'].id)
            membership.save()

            signals.membership_changed.send(sender=self.__class__, user=membership.user)

        return response.NoContent(data=[])

    @action(detail=False, url_path='RemoveMember', methods=['delete', ])
    @object_required('company')
    def remove_member(self, request, **kwargs):
        with transaction.atomic():
            if request.data.get('uuid', None) is None:
                return response.BadRequest(errors=["member UUID cant be empty!"])
            membership = tb_get_object_or_404(Membership, user__uuid=request.data.get('uuid'), company_id=self._objects['company'].id)
            user = membership.user
            membership.delete()
            signals.membership_changed.send(sender=self.__class__, user=user)
        return response.NoContent(data=[])


class CompanyDocumentViewSet(DocumentViewSet):
    """The BookDocument view."""
    page_size_query_param = '__size'

    document = CompanyDocument
    serializer_class = CompanyDocumentSerializer
    pagination_class = ESDrfPagination

    lookup_field = 'id'
    filter_backends = [
        FilteringFilterBackend,
        IdsFilterBackend,
        OrderingFilterBackend,
        DefaultOrderingFilterBackend,
        CompoundSearchFilterBackend,
        SizeLimitFilterBackend,
    ]
    # Define search fields
    search_fields = {
        'name': {'boost': 10},
        'city.name': None,
        'city.name_fa': None,
    }
    # Define filter fields
    filter_fields = {
        'id': {
            'field': 'id',
            # Note, that we limit the lookups of id field in this example,
            # to `range`, `in`, `gt`, `gte`, `lt` and `lte` filters.
            'lookups': [
                LOOKUP_FILTER_RANGE,
                LOOKUP_QUERY_IN,
                LOOKUP_QUERY_GT,
                LOOKUP_QUERY_GTE,
                LOOKUP_QUERY_LT,
                LOOKUP_QUERY_LTE,
            ],
        },
        'name': 'name.raw',
        'city_id': {
            'field': 'country.id',
            'lookups': [
                LOOKUP_QUERY_IN,
                LOOKUP_FILTER_TERMS
            ],
        },
    }
    # Define ordering fields
    ordering_fields = {
        'id': 'id',
        'name': 'name.raw',
        'name_fa': 'name_fa.raw',
    }
    # Specify default ordering
    ordering = ('_score', 'id', 'name.raw',)

    def get_permissions(self):
        return [permissions.IsAuthenticated(), ]
