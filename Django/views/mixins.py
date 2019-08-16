from tb.core.loading import get_model


class WithCompanyHeaderMixin(object):
    def initial_view_objects(self, request):
        company__slug = self._header_data.get('company', None)
        if company__slug is not None:
            membership = request.user.cached_membership_for_company(company__slug, True)
            if membership:
                self._objects['company'] = membership.company

        return super().initial_view_objects(request)

    def get_permission_object(self, request):
        return self._objects.get('company', None)
