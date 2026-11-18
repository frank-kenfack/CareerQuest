from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from progression.views import (
    current_student_profile,
    health_check,
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
]
