from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from progression.models import (
    Avatar,
    ExternalAchievement,
    Quest,
    QuestCompletion,
    School,
    SkillNode,
    StudentProfile,
    UnlockedSkill,
    ensure_default_quests,
    ensure_default_skill_tree,
)


DEMO_STUDENTS_SPEC = [
    {
        "username": "frank_devops",
        "email": "frank@careerquest.fr",
        "school_name": "Epitech Digital",
        "school_city": "Paris",
        "github_username": "frank-kenfack",
        "linkedin_profile_url": "https://www.linkedin.com/in/frank-kenfack",
        "min_experience_points": 950,
        "unlocked_skill_codes": ["docker-containers", "cloud-networking", "gitlab-cicd"],
        "completed_quest_codes": ["quest-docker-stack", "quest-gitlab-pipeline"],
    },
    {
        "username": "lina_cloud",
        "email": "lina@imt.fr",
        "school_name": "IMT Atlantique",
        "school_city": "Nantes",
        "github_username": "lina-cloud",
        "linkedin_profile_url": "https://www.linkedin.com/in/lina-cloud",
        "min_experience_points": 540,
        "unlocked_skill_codes": ["cloud-networking", "kubernetes-cluster"],
        "completed_quest_codes": ["quest-cka-kubernetes"],
    },
    {
        "username": "maxime_k8s",
        "email": "maxime@centralesupelec.fr",
        "school_name": "CentraleSupelec",
        "school_city": "Gif-sur-Yvette",
        "github_username": "maxime-k8s",
        "linkedin_profile_url": "https://www.linkedin.com/in/maxime-k8s",
        "min_experience_points": 320,
        "unlocked_skill_codes": ["django-rest-api"],
        "completed_quest_codes": ["quest-rest-jwt"],
    },
    {
        "username": "chloe_fullstack",
        "email": "chloe@insa-lyon.fr",
        "school_name": "INSA Lyon",
        "school_city": "Lyon",
        "github_username": "chloe-fullstack",
        "linkedin_profile_url": "https://www.linkedin.com/in/chloe-fullstack",
        "min_experience_points": 430,
        "unlocked_skill_codes": ["react-components", "react-architecture"],
        "completed_quest_codes": ["quest-react-vitest"],
    },
    {
        "username": "yanis_secops",
        "email": "yanis@epitech.fr",
        "school_name": "Epitech Digital",
        "school_city": "Paris",
        "github_username": "yanis-secops",
        "linkedin_profile_url": "",
        "min_experience_points": 140,
        "unlocked_skill_codes": ["docker-containers"],
        "completed_quest_codes": [],
    },
]


class Command(BaseCommand):
    help = "Peuple la base de donnees avec un jeu de demonstration idempotent (ecoles, etudiants, competences, quetes)."

    @transaction.atomic
    def handle(self, *args, **options):
        ensure_default_skill_tree()
        ensure_default_quests()

        skills_by_code = {skill.code: skill for skill in SkillNode.objects.all()}
        quests_by_code = {quest.code: quest for quest in Quest.objects.all()}

        for student_spec in DEMO_STUDENTS_SPEC:
            school_instance, _ = School.objects.get_or_create(
                name=student_spec["school_name"],
                defaults={"city": student_spec["school_city"]},
            )

            user_account, was_created = User.objects.get_or_create(
                username=student_spec["username"],
                defaults={"email": student_spec["email"]},
            )
            if was_created:
                user_account.set_password("StrongPassword2026!")
                user_account.save()

            profile_instance, _ = StudentProfile.objects.get_or_create(
                user=user_account,
                defaults={
                    "school": school_instance,
                    "github_username": student_spec["github_username"],
                    "linkedin_profile_url": student_spec["linkedin_profile_url"],
                },
            )
            if profile_instance.school is None:
                profile_instance.school = school_instance
                profile_instance.save(update_fields=["school"])

            avatar_instance, _ = Avatar.objects.get_or_create(student=profile_instance)
            if avatar_instance.experience_points < student_spec["min_experience_points"]:
                avatar_instance.experience_points = student_spec["min_experience_points"]
            avatar_instance.recalculate_progression()
            avatar_instance.save()

            for skill_code in student_spec["unlocked_skill_codes"]:
                skill_node = skills_by_code.get(skill_code)
                if skill_node:
                    UnlockedSkill.objects.get_or_create(
                        student=profile_instance,
                        skill=skill_node,
                    )

            for quest_code in student_spec["completed_quest_codes"]:
                quest_item = quests_by_code.get(quest_code)
                if quest_item:
                    QuestCompletion.objects.get_or_create(
                        student=profile_instance,
                        quest=quest_item,
                        defaults={
                            "status": "completed",
                            "proof_url": "https://github.com/frank-kenfack/CareerQuest",
                            "completed_at": timezone.now(),
                        },
                    )

            if student_spec["github_username"]:
                ExternalAchievement.objects.get_or_create(
                    student=profile_instance,
                    provider="github",
                    external_key="github-account-linked",
                    defaults={
                        "title": f"Compte GitHub @{student_spec['github_username']} connecte",
                        "xp_awarded": 50,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Jeu de demonstration initialise : {School.objects.count()} ecoles, "
                f"{StudentProfile.objects.count()} etudiants, {SkillNode.objects.count()} competences, "
                f"{Quest.objects.count()} quetes."
            )
        )
