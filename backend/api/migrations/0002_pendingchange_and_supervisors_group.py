"""Migration 0002 : workflow d'approbation des modifications admin.

1. Crée la table `api_pendingchange` (Django-gérée) pour stocker les
   demandes de modification soumises par les administrateurs.
2. Crée le groupe ``supervisors`` qui autorise ses membres à approuver
   ou rejeter ces demandes. Les autres utilisateurs authentifiés ne
   peuvent que soumettre des modifications.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_supervisors_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.get_or_create(name="supervisors")


def remove_supervisors_group(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name="supervisors").delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingChange",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("table_name", models.CharField(max_length=64)),
                ("record_id", models.CharField(max_length=64)),
                (
                    "operation",
                    models.CharField(
                        choices=[
                            ("update", "Mise à jour"),
                            ("delete", "Suppression"),
                        ],
                        default="update",
                        max_length=16,
                    ),
                ),
                ("changes", models.JSONField(blank=True, default=dict)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "En attente"),
                            ("approved", "Approuvée"),
                            ("rejected", "Rejetée"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("review_comment", models.TextField(blank=True, default="")),
                (
                    "requested_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pending_changes_submitted",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pending_changes_reviewed",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-requested_at"],
            },
        ),
        migrations.AddIndex(
            model_name="pendingchange",
            index=models.Index(fields=["status"], name="api_pending_status_idx"),
        ),
        migrations.AddIndex(
            model_name="pendingchange",
            index=models.Index(
                fields=["table_name", "record_id"],
                name="api_pending_table_record_idx",
            ),
        ),
        migrations.RunPython(
            create_supervisors_group, reverse_code=remove_supervisors_group
        ),
    ]
