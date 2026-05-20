import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_pendingchange_and_supervisors_group"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("goal", models.CharField(
                    choices=[
                        ("weight_loss", "Weight Loss"),
                        ("muscle_gain", "Muscle Gain"),
                        ("maintenance", "Maintenance"),
                        ("endurance", "Endurance"),
                    ],
                    default="maintenance",
                    max_length=50,
                )),
                ("daily_calorie_target", models.IntegerField(blank=True, null=True)),
                ("allergies", models.JSONField(default=list)),
                ("dietary_restrictions", models.JSONField(default=list)),
                ("equipment_available", models.JSONField(default=list)),
                ("experience_level", models.CharField(
                    blank=True,
                    choices=[
                        ("beginner", "Beginner"),
                        ("intermediate", "Intermediate"),
                        ("advanced", "Advanced"),
                    ],
                    max_length=20,
                    null=True,
                )),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="MealEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("analyzed_at", models.DateTimeField(auto_now_add=True)),
                ("meal_type", models.CharField(blank=True, max_length=50, null=True)),
                ("detected_foods", models.JSONField(default=list)),
                ("total_calories", models.FloatField(blank=True, null=True)),
                ("macros", models.JSONField(default=dict)),
                ("image_hash", models.CharField(blank=True, max_length=64, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meal_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-analyzed_at"],
            },
        ),
    ]
