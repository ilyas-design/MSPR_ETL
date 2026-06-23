"""Filtres de liste pour les endpoints paginés."""

from django.db.models import Q
from rest_framework import filters


class PatientSearchFilter(filters.BaseFilterBackend):
    """Paramètre ``search`` : ID patient (partiel), genre, ou âge entier."""

    def filter_queryset(self, request, queryset, view):
        term = (request.query_params.get("search") or "").strip()
        if not term:
            return queryset
        q = Q(patient_id__icontains=term) | Q(gender__icontains=term)
        try:
            q |= Q(age=int(term))
        except ValueError:
            pass
        return queryset.filter(q)
