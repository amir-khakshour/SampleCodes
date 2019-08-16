from django.db import models
from django.contrib.auth import models as auth_models
from django.utils import timezone


class MembershipQuerySet(models.query.QuerySet):
    def base_queryset(self):
        """
        Applies select_related and prefetch_related for commonly related
        models to save on queries
        """
        return self.prefetch_related('company', 'role')


class MembershipManager(auth_models.BaseUserManager):
    """
    Uses JobQuerySet and proxies its methods to allow chaining

    Once Django 1.7 lands, this class can probably be removed:
    https://docs.djangoproject.com/en/dev/releases/1.7/#calling-custom-queryset-methods-from-the-manager  # noqa
    """

    def get_queryset(self):
        return MembershipQuerySet(self.model, using=self._db)

