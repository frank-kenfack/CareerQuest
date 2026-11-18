from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models


class School(models.Model):
    name = models.CharField(max_length=150, unique=True)
    city = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "school"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.city})"


class StudentProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    school = models.ForeignKey(
        School,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students",
    )
    github_username = models.CharField(max_length=100, blank=True, default="")
    linkedin_profile_url = models.URLField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_profile"

    def __str__(self):
        return self.user.username


class Avatar(models.Model):
    VISUAL_TIER_CHOICES = [
        ("novice", "Novice"),
        ("apprenti", "Apprenti"),
        ("confirme", "Confirme"),
        ("maitre", "Maitre"),
    ]

    student = models.OneToOneField(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="avatar",
    )
    level = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    experience_points = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
    )
    title = models.CharField(max_length=100, default="Novice")
    visual_tier = models.CharField(
        max_length=50,
        choices=VISUAL_TIER_CHOICES,
        default="novice",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "avatar"

    def __str__(self):
        return f"{self.student.user.username} - Niveau {self.level} ({self.title})"
