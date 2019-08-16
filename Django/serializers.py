import serpy

from django.contrib.auth import get_user_model

from rest_framework import serializers
from django_elasticsearch_dsl_drf.serializers import DocumentSerializer

from tb.core.loading import get_class, get_model
from tb.core.api.serializers import TBLightSerializer
from tb.core.user import get_user_photo_url, get_user_big_photo_url, get_user_gravatar_id
from tb.core.permissions.choices import MEMBERS_PERMISSIONS

from .documents import CompanyDocument

UserModel = get_user_model()
Company = get_model('company', 'Company')
Membership = get_model('company', 'Membership')
UserBasicInfoSerializer = get_class('user.serializers', 'UserBasicInfoSerializer')
MEMBERS_PERMISSIONS_DICT = dict(MEMBERS_PERMISSIONS)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        exclude = ('owner', 'creator')


class CompanyRolesSerializer(TBLightSerializer):
    slug = serpy.Field()
    bundle = serpy.Field()
    name = serpy.Field()
    description = serpy.Field()
    permissions = serpy.MethodField()

    def get_permissions(self, instance):
        return [{'value': perm, 'desc': MEMBERS_PERMISSIONS_DICT[perm]} for perm in instance.permissions]


class CompanyBasicInfoSerializer(TBLightSerializer):
    name = serpy.Field()
    slug = serpy.Field()
    size = serpy.Field()
    verified = serpy.Field()
    avatar = serpy.MethodField()
    gravatar_id = serpy.MethodField()
    city_raw = serpy.MethodField()

    def get_avatar(self, instance):
        request = self.context.get('request')
        if request and instance.avatar:
            avatar_url = instance.avatar.url
            return request.build_absolute_uri(avatar_url)

    def get_gravatar_id(self, obj):
        return get_user_gravatar_id(obj.owner)

    def get_city_raw(self, obj):
        if obj.city:
            return ", ".join([obj.city.name, obj.city.region.name if obj.city.region else 'NA', obj.city.country.name])

    class Meta:
        model = Company
        fields = '__all__'


class CompanyDetailedInfoSerializer(CompanyBasicInfoSerializer):
    admins = serpy.MethodField()
    roles = serpy.MethodField()
    website = serpy.Field()
    facebook = serpy.Field()
    twitter = serpy.Field()
    linkedin = serpy.Field()
    id = serpy.Field()
    city = serpy.MethodField()
    city_raw = serpy.MethodField()

    def get_admins(self, instance):
        from django.contrib.postgres.aggregates.general import ArrayAgg
        qs = Membership.objects.filter(company_id=instance.id).select_related('user', 'role')
        qs = qs.annotate(arr=ArrayAgg('jobs'))
        return MembershipBasicInfoSerializer(qs, many=True).data

    def get_roles(self, instance):
        return CompanyRolesSerializer(instance.roles.filter(company__id=instance.id), many=True).data

    def get_city(self, obj):
        if obj.city:
            return obj.city.pk

    def get_city_raw(self, obj):
        if obj.city:
            return ", ".join([obj.city.name, obj.city.region.name if obj.city.region else 'NA', obj.city.country.name])


class CompanyDocumentSerializer(DocumentSerializer):
    """Serializer for the Book document."""

    class Meta(object):
        """Meta options."""
        document = CompanyDocument
        exclude = (
            'owner',
            'creator',
        )


class MembershipBasicInfoSerializer(TBLightSerializer):
    is_admin = serpy.Field()
    role_name = serpy.MethodField()
    role_slug = serpy.MethodField()
    username = serpy.MethodField()
    full_name = serpy.MethodField()
    is_user_active = serpy.MethodField()
    invited_by = serpy.MethodField()
    view_all_jobs = serpy.MethodField()
    avatar = serpy.MethodField()
    gravatar_id = serpy.MethodField()
    uuid = serpy.MethodField()
    email = serpy.MethodField()
    jobs = serpy.MethodField()

    def get_view_all_jobs(self, obj):
        return obj.role.inherit_permissions if obj.role else False

    def get_invited_by(self, obj):
        if obj.invited_by:
            return UserBasicInfoSerializer(obj.invited_by).data

    def get_role_slug(self, obj):
        return obj.role.slug if obj.role else None

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    def get_username(self, obj):
        return obj.user.username

    def get_uuid(self, obj):
        return obj.user.uuid

    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_is_user_active(self, obj):
        return obj.user.is_active if obj.user else False

    def get_color(self, obj):
        return obj.user.color if obj.user else None

    def get_email(self, obj):
        return obj.user.email if obj.user else None

    def get_jobs(self, obj):
        if hasattr(obj, 'job_ids'):
            return obj.job_ids
        return obj.jobs.all().values_list('id', flat=True)

    # def get_is_owner(self, obj):
    #     return (obj and obj.user_id and obj.company_id and obj.company.owner_id and
    #             obj.user_id == obj.company.owner_id)

    def get_avatar(self, obj):
        return get_user_photo_url(obj.user)

    def get_gravatar_id(self, obj):
        return get_user_gravatar_id(obj.user)


class MembershipSerializer(MembershipBasicInfoSerializer):
    company = serpy.MethodField()

    def get_company(self, obj):
        return CompanyBasicInfoSerializer(instance=obj.company, context=self.context).data


class MembershipDetailedSerializer(MembershipSerializer):
    abilities = serpy.MethodField()
    jobs = serpy.MethodField()

    def get_abilities(self, obj):
        return obj.role.permissions

    def get_jobs(self, obj):
        if hasattr(obj, 'job_ids'):
            return obj.job_ids
        return obj.jobs.all().values_list('id', flat=True)

    def get_company(self, obj):
        return CompanyDetailedInfoSerializer(instance=obj.company, context=self.context).data


class JobMembersSerializer(TBLightSerializer):
    role_name = serpy.MethodField()
    role_slug = serpy.MethodField()
    full_name = serpy.MethodField()
    is_user_active = serpy.MethodField()
    invited_by = serpy.MethodField()
    view_all_jobs = serpy.MethodField()
    is_admin = serpy.Field()
    # is_owner = serpy.MethodField()
    avatar = serpy.MethodField()
    email = serpy.MethodField()
    uuid = serpy.MethodField()
    user = UserBasicInfoSerializer()

    def get_view_all_jobs(self, obj):
        return obj.role.inherit_permissions if obj.role else False

    def get_invited_by(self, obj):
        if obj.invited_by:
            return UserBasicInfoSerializer(obj.invited_by).data

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    def get_role_slug(self, obj):
        return obj.role.slug if obj.role else None

    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_is_user_active(self, obj):
        return obj.user.is_active if obj.user else False

    def get_color(self, obj):
        return obj.user.color if obj.user else None

    def get_email(self, obj):
        return obj.user.email

    def get_avatar(self, obj):
        return get_user_photo_url(obj.user)

    def get_gravatar_id(self, obj):
        return get_user_gravatar_id(obj.user)

    def get_uuid(self, obj):
        return obj.user.uuid

    # def get_is_owner(self, obj):
    #     return (obj and obj.user_id and obj.company_id and obj.company.owner_id and
    #             obj.user_id == obj.company.owner_id)

    class Meta:
        model = get_model('company', 'Membership')
        fields = ('role_slug', 'role_name', 'full_name', 'is_user_active', 'invited_by')


class UserMembershipSerializer(serializers.ModelSerializer):
    company = CompanyBasicInfoSerializer()
    role_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    is_user_active = serializers.SerializerMethodField()
    invited_by = UserBasicInfoSerializer()
    # is_owner = serializers.SerializerMethodField()
    abilities = serializers.SerializerMethodField()

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    def get_abilities(self, obj):
        return obj.role.permissions

    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_is_user_active(self, obj):
        return obj.user.is_active if obj.user else False

    def get_color(self, obj):
        return obj.user.color if obj.user else None

    def get_photo(self, obj):
        return get_user_photo_url(obj.user)

    def get_gravatar_id(self, obj):
        return get_user_gravatar_id(obj.user)

    #
    # def get_company_name(self, obj):
    #     return obj.company.name if obj and obj.company else ""
    #
    # def get_company_slug(self, obj):
    #     return obj.company.slug if obj and obj.company else ""
    #
    # def get_is_owner(self, obj):
    #     return (obj and obj.user_id and obj.company_id and obj.company.owner_id and
    #             obj.user_id == obj.company.owner_id)

    class Meta:
        model = get_model('company', 'Membership')
        fields = ('company', 'role_name', 'abilities', 'full_name', 'is_user_active', 'invited_by', 'is_admin')
