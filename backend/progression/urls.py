from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from progression.views import (
    award_avatar_experience,
    current_student_profile,
    health_check,
    list_avatar_progression_tiers,
    list_schools,
    register_student,
)

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("auth/register/", register_student, name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", current_student_profile, name="auth-me"),
    path("schools/", list_schools, name="school-list"),
    path("avatar/progression-tiers/", list_avatar_progression_tiers, name="avatar-progression-tiers"),
    path("avatar/award-xp/", award_avatar_experience, name="avatar-award-xp"),
]
