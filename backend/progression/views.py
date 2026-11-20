from django.db import connections, transaction
from django.db.utils import OperationalError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from progression.models import (
    AVATAR_PROGRESSION_TIERS,
    Avatar,
    Quest,
    QuestCompletion,
    School,
    SkillNode,
    StudentProfile,
    UnlockedSkill,
    ensure_default_quests,
    ensure_default_skill_tree,
)
from progression.serializers import (
    AvatarSerializer,
    AwardExperienceSerializer,
    QuestCompletionInputSerializer,
    QuestSerializer,
    SchoolSerializer,
    SkillNodeSerializer,
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


@api_view(["GET"])
@permission_classes([AllowAny])
def list_skill_tree(request):
    ensure_default_skill_tree()
    skills = SkillNode.objects.select_related("parent_skill").all()

    unlocked_skill_ids = set()
    student_level = 1

    if request.user and request.user.is_authenticated:
        student_profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        student_avatar, _ = Avatar.objects.get_or_create(student=student_profile)
        student_level = student_avatar.level
        unlocked_skill_ids = set(
            UnlockedSkill.objects.filter(student=student_profile).values_list("skill_id", flat=True)
        )

    serializer = SkillNodeSerializer(
        skills,
        many=True,
        context={
            "unlocked_skill_ids": unlocked_skill_ids,
            "student_level": student_level,
        },
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def unlock_skill_node(request, skill_id):
    ensure_default_skill_tree()
    target_skill = get_object_or_404(SkillNode.objects.select_related("parent_skill"), pk=skill_id)

    student_profile, _ = StudentProfile.objects.get_or_create(user=request.user)
    student_avatar, _ = Avatar.objects.get_or_create(student=student_profile)

    if UnlockedSkill.objects.filter(student=student_profile, skill=target_skill).exists():
        return Response(
            {"detail": "Cette competence est deja debloquee."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if target_skill.parent_skill_id is not None:
        parent_is_unlocked = UnlockedSkill.objects.filter(
            student=student_profile,
            skill_id=target_skill.parent_skill_id,
        ).exists()
        if not parent_is_unlocked:
            return Response(
                {
                    "detail": (
                        f"La competence parente « {target_skill.parent_skill.name} » "
                        "doit etre debloquee au prealable."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    if student_avatar.level < target_skill.required_level:
        return Response(
            {
                "detail": (
                    f"Niveau {target_skill.required_level} requis pour debloquer "
                    f"« {target_skill.name} » (niveau actuel : {student_avatar.level})."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        UnlockedSkill.objects.create(student=student_profile, skill=target_skill)
        progression_summary = student_avatar.award_experience(target_skill.xp_reward)

    unlocked_skill_ids = set(
        UnlockedSkill.objects.filter(student=student_profile).values_list("skill_id", flat=True)
    )
    serialized_skill = SkillNodeSerializer(
        target_skill,
        context={
            "unlocked_skill_ids": unlocked_skill_ids,
            "student_level": student_avatar.level,
        },
    ).data

    return Response(
        {
            "unlocked_skill": serialized_skill,
            "progression": progression_summary,
            "avatar": AvatarSerializer(student_avatar).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def list_quests(request):
    ensure_default_quests()
    quests_queryset = Quest.objects.select_related("related_skill").all()

    requested_type = request.query_params.get("quest_type", "").strip()
    if requested_type in ("project", "training", "certification"):
        quests_queryset = quests_queryset.filter(quest_type=requested_type)

    completions_by_quest_id = {}
    if request.user and request.user.is_authenticated:
        student_profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        completions_by_quest_id = {
            record.quest_id: record
            for record in QuestCompletion.objects.filter(student=student_profile)
        }

    serializer = QuestSerializer(
        quests_queryset,
        many=True,
        context={"completions_by_quest_id": completions_by_quest_id},
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_quest(request, quest_id):
    ensure_default_quests()
    target_quest = get_object_or_404(Quest.objects.select_related("related_skill"), pk=quest_id)
    student_profile, _ = StudentProfile.objects.get_or_create(user=request.user)
    Avatar.objects.get_or_create(student=student_profile)

    existing_completion = QuestCompletion.objects.filter(
        student=student_profile,
        quest=target_quest,
    ).first()

    if existing_completion and existing_completion.status == "completed":
        return Response(
            {"detail": "Cette quete est deja validee."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    completion_record, _ = QuestCompletion.objects.get_or_create(
        student=student_profile,
        quest=target_quest,
        defaults={"status": "in_progress"},
    )

    serialized_quest = QuestSerializer(
        target_quest,
        context={"completions_by_quest_id": {target_quest.id: completion_record}},
    ).data
    return Response({"quest": serialized_quest}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_quest(request, quest_id):
    ensure_default_quests()
    target_quest = get_object_or_404(Quest.objects.select_related("related_skill"), pk=quest_id)
    input_serializer = QuestCompletionInputSerializer(data=request.data)
    input_serializer.is_valid(raise_exception=True)

    student_profile, _ = StudentProfile.objects.get_or_create(user=request.user)
    student_avatar, _ = Avatar.objects.get_or_create(student=student_profile)

    existing_completion = QuestCompletion.objects.filter(
        student=student_profile,
        quest=target_quest,
    ).first()

    if existing_completion and existing_completion.status == "completed":
        return Response(
            {"detail": "Cette quete a deja ete validee et recompensee."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    proof_url = input_serializer.validated_data.get("proof_url", "").strip()

    with transaction.atomic():
        completion_record, _ = QuestCompletion.objects.update_or_create(
            student=student_profile,
            quest=target_quest,
            defaults={
                "status": "completed",
                "proof_url": proof_url,
                "completed_at": timezone.now(),
            },
        )
        progression_summary = student_avatar.award_experience(target_quest.xp_reward)

    serialized_quest = QuestSerializer(
        target_quest,
        context={"completions_by_quest_id": {target_quest.id: completion_record}},
    ).data

    return Response(
        {
            "quest": serialized_quest,
            "progression": progression_summary,
            "avatar": AvatarSerializer(student_avatar).data,
        },
        status=status.HTTP_200_OK,
    )
