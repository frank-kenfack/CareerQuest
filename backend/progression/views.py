from django.db import connections
from django.db.utils import OperationalError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from progression.models import (
    AVATAR_PROGRESSION_TIERS,
    Avatar,
    School,
    StudentProfile,
)
from progression.serializers import (
    AvatarSerializer,
    AwardExperienceSerializer,
    SchoolSerializer,
    StudentProfileSerializer,
    StudentRegistrationSerializer,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    default_connection = connections["default"]
    try:
        default_connection.cursor()
    except OperationalError:
        return Response(
            {
                "status": "degraded",
                "service": "careerquest-backend",
                "database": "unreachable",
                "database_engine": default_connection.vendor,
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "status": "ok",
            "service": "careerquest-backend",
            "database": "connected",
            "database_engine": default_connection.vendor,
            "registered_students_count": StudentProfile.objects.count(),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def register_student(request):
    registration_serializer = StudentRegistrationSerializer(data=request.data)
    registration_serializer.is_valid(raise_exception=True)
    student_profile = registration_serializer.save()

    refresh_token = RefreshToken.for_user(student_profile.user)
    profile_payload = StudentProfileSerializer(student_profile).data

    return Response(
        {
            "student": profile_payload,
            "tokens": {
                "refresh": str(refresh_token),
                "access": str(refresh_token.access_token),
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_student_profile(request):
    student_profile, was_created = StudentProfile.objects.get_or_create(user=request.user)
    if was_created:
        Avatar.objects.get_or_create(student=student_profile)
    return Response(
        StudentProfileSerializer(student_profile).data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def list_schools(request):
    schools = School.objects.all()
    return Response(
        SchoolSerializer(schools, many=True).data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def list_avatar_progression_tiers(request):
    return Response(
        {
            "xp_per_level": Avatar.XP_PER_LEVEL,
            "tiers": AVATAR_PROGRESSION_TIERS,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def award_avatar_experience(request):
    award_serializer = AwardExperienceSerializer(data=request.data)
    award_serializer.is_valid(raise_exception=True)

    student_profile, _ = StudentProfile.objects.get_or_create(user=request.user)
    student_avatar, _ = Avatar.objects.get_or_create(student=student_profile)

    progression_summary = student_avatar.award_experience(
        award_serializer.validated_data["earned_xp"]
    )

    return Response(
        {
            "progression": progression_summary,
            "avatar": AvatarSerializer(student_avatar).data,
        },
        status=status.HTTP_200_OK,
    )
