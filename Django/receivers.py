from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
from tb.core.loading import get_model

from . import signals


@receiver(post_save, sender=get_model("company", "Company"), dispatch_uid='company_post_save')
def process_company_save(sender, instance, created, **kwargs):
    """
    Populate new project dependent default data
    """
    # update es entity
    # registry.update(instance)

    if not created:
        return

    if instance._importing:
        return

    template = getattr(instance, "creation_template", None)
    if template is None:
        CompanyTemplate = get_model("company", "CompanyTemplate")
        template = CompanyTemplate.objects.get(slug=settings.DEFAULT_COMPANY_TEMPLATE)

    template.apply_to_company(instance)
    instance.save()

    Role = get_model("user", "Role")

    try:
        owner_role = instance.roles.get(slug=settings.DEFAULT_COMPANY_OWNER_ROLE)
    except Role.DoesNotExist:
        owner_role = instance.roles.first()

    if owner_role:
        Membership = get_model("company", "Membership")
        Membership.objects.create(user=instance.owner, company=instance, role=owner_role, is_admin=True, email=instance.owner.email)

    # add company calendar
    # Calendar = get_model("schedule", "CompanyTemplate")


@receiver(post_delete, sender=get_model("company", "Company"), dispatch_uid='company_post_delete')
def delete_document(sender, **kwargs):
    pass
    # registry.delete(instance)


@receiver(signals.membership_changed)
def process_membership_changed(sender, user, **kwargs):
    user.refresh_cached_memberships()
