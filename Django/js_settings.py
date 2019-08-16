from .models import Company


def javascript_settings():
    output = {
        'COMPANY_SIZE_CHOICES': Company.COMPANY_SIZE_CHOICES,
    }
    return output
