"""Pagination DRF configurée pour listes volumineuses (admin, annuaire)."""

from rest_framework.pagination import PageNumberPagination


class ConfigurablePageNumberPagination(PageNumberPagination):
    """Page par défaut 50 lignes ; le client peut demander jusqu'à ``max_page_size``."""

    page_size = 50
    page_query_param = "page"
    page_size_query_param = "page_size"
    max_page_size = 200
