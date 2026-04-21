"""Permissions pour le workflow d'approbation.

- ``IsSupervisor`` : membre du groupe ``supervisors`` (ou superuser Django).
  Requis pour approuver / rejeter une ``PendingChange``.
"""

from rest_framework import permissions


def is_supervisor(user) -> bool:
    """Renvoie True si l'utilisateur peut valider des modifications."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name="supervisors").exists()


class IsSupervisor(permissions.BasePermission):
    """Autorise uniquement les superviseurs et superusers."""

    message = "Seuls les superviseurs peuvent approuver ou rejeter une modification."

    def has_permission(self, request, view):
        return is_supervisor(request.user)
