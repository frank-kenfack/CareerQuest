import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("progression", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SkillNode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=60, unique=True)),
                ("name", models.CharField(max_length=120)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("frontend", "Frontend"),
                            ("backend", "Backend"),
                            ("devops", "DevOps"),
                            ("cloud", "Cloud"),
                        ],
                        max_length=50,
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
                    "required_level",
                    models.PositiveIntegerField(
                        default=1,
                        validators=[django.core.validators.MinValueValidator(1)],
                    ),
                ),
                (
                    "parent_skill",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="child_skills",
                        to="progression.skillnode",
                    ),
                ),
            ],
            options={
                "db_table": "skill_node",
                "ordering": ["category", "required_level", "id"],
            },
        ),
        migrations.CreateModel(
            name="UnlockedSkill",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unlocked_at", models.DateTimeField(auto_now_add=True)),
                (
                    "skill",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="unlock_records",
                        to="progression.skillnode",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="unlocked_skills",
                        to="progression.studentprofile",
                    ),
                ),
            ],
            options={
                "db_table": "unlocked_skill",
                "ordering": ["unlocked_at"],
                "unique_together": {("student", "skill")},
            },
        ),
    ]
