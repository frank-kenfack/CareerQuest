from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers
from progression.models import Avatar, Quest, School, SkillNode, StudentProfile


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name", "city"]


class AvatarSerializer(serializers.ModelSerializer):
    xp_for_next_level = serializers.IntegerField(read_only=True)
    current_level_progress_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = Avatar
        fields = [
            "level",
            "experience_points",
            "xp_for_next_level",
            "current_level_progress_percent",
            "title",
            "visual_tier",
            "updated_at",
        ]


class StudentProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    school = SchoolSerializer(read_only=True)
    avatar = AvatarSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "username",
            "email",
            "school",
            "github_username",
            "linkedin_profile_url",
            "avatar",
            "created_at",
        ]


class StudentRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    school_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    school_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Paris")
    github_username = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    linkedin_profile_url = serializers.URLField(max_length=255, required=False, allow_blank=True, default="")

    def validate_username(self, username_value):
        if User.objects.filter(username=username_value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est deja pris.")
        return username_value

    def validate_email(self, email_value):
        if User.objects.filter(email=email_value).exists():
            raise serializers.ValidationError("Cette adresse e-mail est deja utilisee.")
        return email_value

    @transaction.atomic
    def create(self, validated_data):
        user_account = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        selected_school = None
        school_name = validated_data.get("school_name", "").strip()
        if school_name:
            school_city = validated_data.get("school_city", "Paris").strip() or "Paris"
            selected_school, _ = School.objects.get_or_create(
                name=school_name,
                defaults={"city": school_city},
            )

        student_profile = StudentProfile.objects.create(
            user=user_account,
            school=selected_school,
            github_username=validated_data.get("github_username", "").strip(),
            linkedin_profile_url=validated_data.get("linkedin_profile_url", "").strip(),
        )

        Avatar.objects.create(
            student=student_profile,
            level=1,
            experience_points=0,
            title="Novice",
            visual_tier="novice",
        )

        return student_profile


class AwardExperienceSerializer(serializers.Serializer):
    earned_xp = serializers.IntegerField(min_value=1, max_value=5000)


class SkillNodeSerializer(serializers.ModelSerializer):
    parent_skill_id = serializers.IntegerField(source="parent_skill.id", read_only=True, allow_null=True)
    parent_skill_code = serializers.CharField(source="parent_skill.code", read_only=True, allow_null=True)
    parent_skill_name = serializers.CharField(source="parent_skill.name", read_only=True, allow_null=True)
    is_unlocked = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = SkillNode
        fields = [
            "id",
            "code",
            "name",
            "category",
            "description",
            "xp_reward",
            "required_level",
            "parent_skill_id",
            "parent_skill_code",
            "parent_skill_name",
            "is_unlocked",
            "is_available",
        ]

    def get_is_unlocked(self, skill_node):
        unlocked_ids = self.context.get("unlocked_skill_ids", set())
        return skill_node.id in unlocked_ids

    def get_is_available(self, skill_node):
        unlocked_ids = self.context.get("unlocked_skill_ids", set())
        if skill_node.id in unlocked_ids:
            return False

        student_level = self.context.get("student_level", 1)
        if student_level < skill_node.required_level:
            return False

        if skill_node.parent_skill_id is None:
            return True

        return skill_node.parent_skill_id in unlocked_ids


class QuestSerializer(serializers.ModelSerializer):
    related_skill_id = serializers.IntegerField(source="related_skill.id", read_only=True, allow_null=True)
    related_skill_code = serializers.CharField(source="related_skill.code", read_only=True, allow_null=True)
    related_skill_name = serializers.CharField(source="related_skill.name", read_only=True, allow_null=True)
    student_status = serializers.SerializerMethodField()
    proof_url = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()

    class Meta:
        model = Quest
        fields = [
            "id",
            "code",
            "title",
            "quest_type",
            "description",
            "xp_reward",
            "related_skill_id",
            "related_skill_code",
            "related_skill_name",
            "student_status",
            "proof_url",
            "completed_at",
        ]

    def get_student_status(self, quest):
        completions_by_quest_id = self.context.get("completions_by_quest_id", {})
        completion_record = completions_by_quest_id.get(quest.id)
        if not completion_record:
            return "not_started"
        return completion_record.status

    def get_proof_url(self, quest):
        completions_by_quest_id = self.context.get("completions_by_quest_id", {})
        completion_record = completions_by_quest_id.get(quest.id)
        return completion_record.proof_url if completion_record else ""

    def get_completed_at(self, quest):
        completions_by_quest_id = self.context.get("completions_by_quest_id", {})
        completion_record = completions_by_quest_id.get(quest.id)
        if completion_record and completion_record.completed_at:
            return completion_record.completed_at.isoformat()
        return None


class QuestCompletionInputSerializer(serializers.Serializer):
    proof_url = serializers.URLField(max_length=255, required=False, allow_blank=True, default="")
