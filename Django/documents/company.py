from django.conf import settings

from django_elasticsearch_dsl import DocType, Index, fields
from tb.core.loading import get_model
from cities_light.models import City
from libs.es import html_strip_analyzer, edgengram_analyzer, RawObjectField, simple_text_analyzer

Company = get_model('company', 'Company')

INDEX = Index(settings.ELASTICSEARCH_INDEX_NAMES[__name__])
INDEX.settings(
    number_of_shards=1,
    number_of_replicas=1
)


@INDEX.doc_type
class CompanyDocument(DocType):
    id = fields.IntegerField(attr='id')

    name = fields.TextField(
        analyzer=edgengram_analyzer,
        fields={
            'raw': fields.KeywordField(),
        }
    )
    geo = fields.GeoPointField(attr='geo_es_format')
    description = fields.TextField()
    avatar = fields.FileField()
    city = fields.ObjectField(
        properties={
            'id': fields.IntegerField(),
            'name': fields.TextField(
                fields={
                    'raw': fields.KeywordField(),
                }
            ),
            'name_fa': fields.TextField(
                fields={
                    'raw': fields.KeywordField(),
                }
            ),
            'geo': fields.GeoPointField(
                attr='geo_es_format'
            ),
            'region': fields.TextField(
                attr='region.name',
                fields={
                    'raw': fields.KeywordField(),
                }
            )

        }
    )

    related_models = [City, ]

    class Meta:
        model = Company
        fields = [
            'slug',
            'description_extra',
            'size',
            'website',
            'founded',
            'facebook',
            'twitter',
            'linkedin',
            'verified',
        ]

