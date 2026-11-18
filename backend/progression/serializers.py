from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers
from progression.models import Avatar, School, StudentProfile


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
