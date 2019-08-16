from django.utils.translation import ugettext as _

ERROR_COMPANY_WITHOUT_OWNER = 'company_without_owner'


def check_if_company_can_be_created_or_updated(company):
    """Return if the company can be create or update (the privacity).

    :param company: A company object.

    :return: {bool, error_mesage} return a tuple (can be created or updated, error message).
    """
    if company.owner is None:
        return {'can_be_updated': False, 'reason': ERROR_COMPANY_WITHOUT_OWNER}

    current_companies = company.owner.owned_companys.all().count()
    max_allowed_companies = company.owner.max_companies
    error_company_exceeded = _("You can't have more than %s companies") % max_allowed_companies

    current_memberships = company.memberships.count() or 1
    max_memberships = company.owner.max_memberships_companies
    error_memberships_exceeded = _("This company reaches your current limit of memberships for private companys")

    if max_allowed_companies is not None and current_companies >= max_allowed_companies:
        return False, error_company_exceeded

    if max_memberships is not None and current_memberships > max_memberships:
        return False, error_memberships_exceeded

    return True, None
