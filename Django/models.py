import os

from django.conf import settings
from django.utils import timezone
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.auth import get_user_model
from django.template.defaultfilters import slugify
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.contrib.gis.db import models
from django.utils.functional import cached_property
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.utils.encoding import python_2_unicode_compatible, smart_text

try:
    from collections import OrderedDict as SortedDict
except ImportError:
    from django.utils.datastructures import SortedDict

from cities_light.models import City

from tb.core.loading import get_model
from tb.core.compat import AUTH_USER_MODEL
from tb.core.utils.slug import slugify_uniquely
from tb.core.utils.time import timestamp_ms
from tb.models.fields.json import JSONField
from .managers import MembershipManager
from tb.apps.notifications.choices import NotifyLevel

# from tb.apps.user.permissions.utils import assign_role, remove_role, clear_roles
Role = get_model('user', 'Role')


def unique_company_avatar_filename(instance, filename):
    base_path = Company.AVATAR_ROOT
    file_type = os.path.splitext(filename)[1]
    filename = "{}{}".format(instance.slug, file_type)
    return os.path.join(base_path, filename)


class Membership(models.Model):
    # This model stores all company memberships. Also
    # stores invitations to memberships that does not have
    # assigned user.
    MALE = 'male'
    FEMALE = 'female'
    GENDERS = (
        (MALE, _("Male")),
        (FEMALE, _("Female")),
    )
    TITLE_FOUNDER = 'founder'
    TITLE_DIRECTOR = 'director'
    TITLE_HR_DIRECTOR = 'hr_director'
    TITLE_HR_RECRUITER = 'hr_recruiter'
    TITLE_CTO = 'cto'
    TITLE_VP_OF_ENGINEERING = 'vp_of_engineering'
    TITLE_TEAM_LEADER = 'team_leader'
    TITLE_DEVELOPER = 'developer'
    TITLE_OFFICE_MANAGER = 'office_manager'
    TITLE_OTHER = 'other'

    TITLES = (
        (TITLE_FOUNDER, _("Founder")),
        (TITLE_DIRECTOR, _("Director")),
        (TITLE_HR_DIRECTOR, _("HR Director")),
        (TITLE_HR_RECRUITER, _("HR Recruiter")),
        (TITLE_CTO, _("cto")),
        (TITLE_VP_OF_ENGINEERING, _("VP of Engineering")),
        (TITLE_TEAM_LEADER, _("Team Leader")),
        (TITLE_DEVELOPER, _("Developer")),
        (TITLE_OFFICE_MANAGER, _("Office Manager")),
        (TITLE_OTHER, _("Other")),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, default=None,
                             related_name="memberships")
    company = models.ForeignKey("Company", null=False, blank=False, related_name="memberships")
    role = models.ForeignKey("user.Role", null=False, blank=False, related_name="memberships")
    jobs = models.ManyToManyField("job.Job", related_name="memberships", blank=True, null=True, )
    title = models.CharField(max_length=256, choices=TITLES, verbose_name=_("Title"), default=TITLE_OFFICE_MANAGER)
    is_admin = models.BooleanField(default=False, null=False, blank=False)
    is_active = models.BooleanField(default=True, null=False, blank=False)

    # Invitation metadata
    email = models.EmailField(max_length=255, default=None, null=True, blank=True, verbose_name=_("email"))
    created_at = models.DateTimeField(default=timezone.now,
                                      verbose_name=_("create at"))
    token = models.CharField(max_length=60, blank=True, null=True, default=None,
                             verbose_name=_("token"))

    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="ihaveinvited+",
                                   null=True, blank=True)

    invitation_extra_text = models.TextField(null=True, blank=True,
                                             verbose_name=_("invitation extra text"))

    user_order = models.BigIntegerField(default=timestamp_ms, null=False, blank=False,
                                        verbose_name=_("user order"))

    objects = MembershipManager()

    class Meta:
        verbose_name = "membership"
        verbose_name_plural = "memberships"
        unique_together = ("user", "company")
        ordering = ["company", "user__first_name", "user__last_name", "user__username", "user__email", "email"]

    def __str__(self):
        return "<Membership {0}, {1}, {2}>".format(self.company.slug, self.role.slug, self.user)

    def get_related_people(self):
        related_people = get_user_model().objects.filter(id=self.user.id)
        return related_people

    def get_company_members(self):
        return self.objects.filter(company=self.company)

    def clean(self):
        # TODO: Review and do it more robust
        memberships = Membership.objects.filter(user=self.user, company=self.company)
        if self.user and memberships.count() > 0 and memberships[0].id != self.id:
            raise ValidationError(_('The user is already member of the company'))


class Company(models.Model):
    AVATAR_ROOT = 'company/avatars'

    COMPANY_SIZE_0_1 = "0"
    COMPANY_SIZE_2_10 = "2"
    COMPANY_SIZE_11_15 = "11"
    COMPANY_SIZE_51_200 = "51"
    COMPANY_SIZE_201_500 = "201"
    COMPANY_SIZE_501_1000 = "501"
    COMPANY_SIZE_1001_5000 = "501"
    COMPANY_SIZE_5001_10000 = "50001"
    COMPANY_SIZE_100001_PLUS = "10001"

    COMPANY_SIZE_CHOICES = SortedDict([
        (COMPANY_SIZE_0_1, _("0-1 employees")),
        (COMPANY_SIZE_2_10, _("2-10 employees")),
        (COMPANY_SIZE_11_15, _("11-50 employees")),
        (COMPANY_SIZE_51_200, _("51-200 employees")),
        (COMPANY_SIZE_201_500, _("201-500 employees")),
        (COMPANY_SIZE_501_1000, _("501-1,000 employees")),
        (COMPANY_SIZE_1001_5000, _("1,001-5,000 employees")),
        (COMPANY_SIZE_5001_10000, _("5,001-10,000 employees")),
        (COMPANY_SIZE_100001_PLUS, _("10,001+ employees")),
    ])

    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=255, null=True, blank=True, verbose_name=_("slug"))
    description = models.TextField(
        help_text="company description",
        null=True, blank=True,
    )
    description_extra = models.TextField(
        help_text="company description extra",
        null=True, blank=True,
    )

    size = models.CharField(
        max_length=5,
        choices=list(COMPANY_SIZE_CHOICES.items()),
        help_text=_("company size"),
        default=COMPANY_SIZE_2_10,
        blank=True
    )

    founded = models.DateField(max_length=255, null=True, blank=True)
    avatar = models.ImageField(upload_to=unique_company_avatar_filename, blank=True, null=True)
    website = models.URLField(verbose_name="website", blank=True, null=True)

    facebook = models.CharField(
        max_length=256,
        blank=True,
        null=True,
        help_text="Please leave empty if none"
    )
    twitter = models.CharField(
        max_length=256,
        blank=True,
        null=True,
        help_text="Please leave empty if none"
    )
    linkedin = models.CharField(
        max_length=256,
        blank=True,
        null=True,
        help_text="Please leave empty if none"
    )
    city = models.ForeignKey(
        City,
        blank=True,
        null=True,
        related_name='companies',
        help_text="city where the company is located in"
    )
    latitude = models.CharField(max_length=255, null=True, blank=True, verbose_name=_("Location's latitude"))
    longitude = models.CharField(max_length=255, null=True, blank=True, verbose_name=_("Location's longitude"))
    the_geom = models.PointField(null=True, blank=True, editable=False, srid=4326, verbose_name=_("point"))
    verified = models.BooleanField(default=False, verbose_name=_("Verified"))
    owner = models.ForeignKey(AUTH_USER_MODEL, related_name="owned_companies", verbose_name=_("owner"), null=True,
                              blank=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="companies",
                                     through="Membership", verbose_name=_("members"),
                                     through_fields=("company", "user"))
    creator = models.ForeignKey(AUTH_USER_MODEL, related_name="+", verbose_name=_("creator"))

    _importing = None

    class Meta:
        app_label = 'company'
        verbose_name_plural = "companies"
        ordering = ['name']
        permissions = (
            ('view_section', 'view company details'),
            ('edit_company', 'edit company details'),
            ('add_member', 'add team member to company'),
        )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.longitude and self.latitude:
            the_geom = 'POINT(%s %s)' % (self.longitude, self.latitude)
            self.the_geom = GEOSGeometry(the_geom, srid=4326)
        super(Company, self).save(*args, **kwargs)

        if not self.slug:  # @todo find a better solution
            self.slug = "%s--%s" % (self.pk, slugify(self.name))
            self.save()

    @property
    def full_name(self):
        return self.name

    def gen_company_name(self):
        return "%s HR Team - %s" % (slugify(self.name), self.owner_id)

    def get_absolute_url(self):
        return reverse('company', args=(self.id, self.slug,))

    def geo_es_format(self):
        if self.latitude and self.longitude:
            return {
                "lat": self.latitude if self.latitude else None,
                "lon": self.latitude if self.latitude else None,
            }

    @cached_property
    def cached_memberships(self):
        return {m.user.id: m for m in self.memberships.exclude(user__isnull=True).select_related("user", "company", "role")}

    def cached_memberships_for_user(self, user):
        return self.cached_memberships.get(user.id, None)

    @cached_property
    def cached_notify_policies(self):
        return {np.user.id: np for np in self.notify_policies.select_related("user", "company")}

    def cached_notify_policy_for_user(self, user):
        """
        Get notification level for specified company and user.
        """
        policy = self.cached_notify_policies.get(user.id, None)
        if policy is None:
            model_cls = get_model("notifications", "NotifyPolicy")
            policy = model_cls.objects.create(
                company=self,
                user=user,
                notify_level=NotifyLevel.involved)

            del self.cached_notify_policies

        return policy

    def _get_q_watchers(self):
        return Q(notify_policies__company_id=self.id) & ~Q(notify_policies__notify_level=NotifyLevel.none)

    def get_watchers(self):
        return get_user_model().objects.filter(self._get_q_watchers())

    def get_related_people(self):
        related_people_q = Q()

        ## - Owner
        if self.owner_id:
            related_people_q.add(Q(id=self.owner_id), Q.OR)

        ## - Watchers
        related_people_q.add(self._get_q_watchers(), Q.OR)

        ## - Apply filters
        related_people = get_user_model().objects.filter(related_people_q)

        ## - Exclude inactive and system users and remove duplicate
        related_people = related_people.exclude(is_active=False)
        related_people = related_people.exclude(is_system=True)
        related_people = related_people.distinct()
        return related_people


class NoCompany(object):
    pk = None
    id = None

    def __init__(self):
        pass

    def __str__(self):
        return 'NoCompany'

    def __eq__(self, other):
        return isinstance(other, self.__class__)

    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return 1  # instances always return the same hash value


class CompanyApplications(models.Model):
    APPLICATION_TYPE_REMOTE_DEVELOPER = "R"
    APPLICATION_TYPE_FULLTIME_DEVELOPER = "F"

    APPLICATION_TYPES = SortedDict([
        (APPLICATION_TYPE_REMOTE_DEVELOPER, _("Hire Remote developer")),
        (APPLICATION_TYPE_FULLTIME_DEVELOPER, _("Hire FullTime developer")),
    ])

    job_type = models.CharField(
        max_length=5,
        choices=list(APPLICATION_TYPES.items()),
        help_text=_("application type"),
        default=APPLICATION_TYPE_REMOTE_DEVELOPER,
        blank=True
    )
    company = models.ForeignKey(Company)

    job_title = models.CharField(
        max_length=255,
        help_text="Job title",
        null=True, blank=True,
    )
    job_description = models.TextField(
        help_text="Job description",
        null=True, blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'company'
        ordering = ['created_at']


class CompanyTemplate(models.Model):
    name = models.CharField(max_length=250, null=False, blank=False,
                            verbose_name=_("name"))
    slug = models.SlugField(max_length=250, null=False, blank=True,
                            verbose_name=_("slug"), unique=True)
    description = models.TextField(null=False, blank=False,
                                   verbose_name=_("description"))
    order = models.BigIntegerField(default=timestamp_ms, null=False, blank=False,
                                   verbose_name=_("user order"))
    created_date = models.DateTimeField(null=False, blank=False,
                                        verbose_name=_("created date"),
                                        default=timezone.now)
    modified_date = models.DateTimeField(null=False, blank=False,
                                         verbose_name=_("modified date"))
    default_owner_role = models.CharField(max_length=50, null=False,
                                          blank=False,
                                          verbose_name=_("default owner's role"))
    is_contact_activated = models.BooleanField(default=True, null=False, blank=True,
                                               verbose_name=_("active contact"))
    default_options = JSONField(null=True, blank=True, verbose_name=_("default options"))
    roles = JSONField(null=True, blank=True, verbose_name=_("roles"))
    _importing = None

    class Meta:
        verbose_name = "company template"
        verbose_name_plural = "company templates"
        ordering = ["order", "name"]

    def __str__(self):
        return self.name

    def __repr__(self):
        return "<Company Template {0}>".format(self.slug)

    def save(self, *args, **kwargs):
        if not self._importing or not self.modified_date:
            self.modified_date = timezone.now()
        if not self.slug:
            self.slug = slugify_uniquely(self.name, self.__class__)
        super().save(*args, **kwargs)

    def load_data_from_company(self, company):
        self.default_options = {
        }

        self.roles = []
        for role in company.roles.all():
            self.roles.append({
                "name": role.name,
                "slug": role.slug,
                "permissions": role.permissions,
                "order": role.order,
            })

        try:
            owner_membership = Membership.objects.get(company=company, user=company.owner)
            self.default_owner_role = owner_membership.role.slug
        except Membership.DoesNotExist:
            self.default_owner_role = self.roles[0].get("slug", None)

    def apply_to_company(self, company):
        Role = get_model("user", "Role")

        if company.id is None:
            raise Exception("company need an id (must be a saved company)")

        company.creation_template = self

        for role in self.roles:
            Role.objects.create(
                name=role["name"],
                slug=role["slug"],
                order=role["order"],
                company=company,
                permissions=role['permissions']
            )
        return company
