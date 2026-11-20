import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("progression", "0002_skillnode_unlockedskill"),
    ]

    operations = [
        migrations.CreateModel(
            name="Quest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=60, unique=True)),
                ("title", models.CharField(max_length=150)),
                (
                    "quest_type",
                    models.CharField(
                        choices=[
                            ("project", "Projet"),
                            ("training", "Formation"),
                            ("certification", "Certification"),
                        ],
                        max_length=30,
                    ),
                ),
                ("description", models.TextField()),
                (
                    "xp_reward",
                    models.PositiveIntegerField(
                        validators=[django.core.validators.MinValueValidator(1)],
                    ),
                ),
                (
                    "related_skill",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="quests",
                        to="progression.skillnode",
                    ),
                ),
            ],
            options={
                "db_table": "quest",
                "ordering": ["quest_type", "id"],
            },
        ),
        migrations.CreateModel(
            name="QuestCompletion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("in_progress", "En cours"),
                            ("completed", "Validee"),
                        ],
                        default="in_progress",
                        max_length=20,
                    ),
                ),
                ("proof_url", models.URLField(blank=True, default="", max_length=255)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "quest",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="completions",
                        to="progression.quest",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="quest_completions",
                        to="progression.studentprofile",
                    ),
                ),
            ],
            options={
                "db_table": "quest_completion",
                "ordering": ["-completed_at", "id"],
                "unique_together": {("student", "quest")},
            },
        ),
    ]
