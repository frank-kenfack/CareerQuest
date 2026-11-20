import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("progression", "0003_quest_questcompletion"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalAchievement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "provider",
                    models.CharField(
                        choices=[
                            ("github", "GitHub"),
                            ("linkedin", "LinkedIn"),
                        ],
                        max_length=30,
                    ),
                ),
                ("external_key", models.CharField(max_length=120)),
                ("title", models.CharField(max_length=150)),
                (
                    "xp_awarded",
                    models.PositiveIntegerField(
                        validators=[django.core.validators.MinValueValidator(1)],
                    ),
                ),
                ("synced_at", models.DateTimeField(auto_now_add=True)),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="external_achievements",
                        to="progression.studentprofile",
                    ),
                ),
            ],
            options={
                "db_table": "external_achievement",
                "ordering": ["-synced_at", "id"],
                "unique_together": {("student", "provider", "external_key")},
            },
        ),
    ]
