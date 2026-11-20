from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from progression.models import (
    Avatar,
    Quest,
    SkillNode,
    StudentProfile,
    ensure_default_quests,
    ensure_default_skill_tree,
)


class HealthCheckEndpointTest(TestCase):
    def test_health_check_returns_connected_database_status(self):
        response = self.client.get(reverse("health-check"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["service"], "careerquest-backend")
        self.assertEqual(payload["database"], "connected")
        self.assertIn(payload["database_engine"], ("sqlite", "postgresql"))


class StudentAuthenticationFlowTest(TestCase):
    def setUp(self):
        self.api_client = APIClient()

    def test_student_registration_creates_profile_and_level_one_avatar(self):
        registration_payload = {
            "username": "frank_devops",
            "email": "frank@careerquest.fr",
            "password": "StrongPassword2026!",
            "school_name": "Epitech Digital",
            "school_city": "Paris",
            "github_username": "frank-kenfack",
        }

        response = self.api_client.post(
            reverse("auth-register"),
            registration_payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response_body = response.json()
        self.assertIn("tokens", response_body)
        self.assertIn("access", response_body["tokens"])
        self.assertIn("refresh", response_body["tokens"])

        student_payload = response_body["student"]
        self.assertEqual(student_payload["username"], "frank_devops")
        self.assertEqual(student_payload["school"]["name"], "Epitech Digital")
        self.assertEqual(student_payload["avatar"]["level"], 1)
        self.assertEqual(student_payload["avatar"]["experience_points"], 0)
        self.assertEqual(student_payload["avatar"]["title"], "Novice")
        self.assertEqual(student_payload["avatar"]["visual_tier"], "novice")

    def test_student_login_and_authenticated_profile_retrieval(self):
        self.api_client.post(
            reverse("auth-register"),
            {
                "username": "lina_cloud",
                "email": "lina@careerquest.fr",
                "password": "StrongPassword2026!",
                "school_name": "IMT Atlantique",
            },
            format="json",
        )

        login_response = self.api_client.post(
            reverse("auth-login"),
            {
                "username": "lina_cloud",
                "password": "StrongPassword2026!",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token = login_response.json()["access"]

        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        profile_response = self.api_client.get(reverse("auth-me"))

        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        profile_payload = profile_response.json()
        self.assertEqual(profile_payload["username"], "lina_cloud")
        self.assertEqual(profile_payload["avatar"]["level"], 1)

    def test_unauthenticated_access_to_me_endpoint_is_rejected(self):
        response = self.api_client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AvatarProgressionEngineTest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        user_account = User.objects.create_user(
            username="maxime_k8s",
            email="maxime@careerquest.fr",
            password="StrongPassword2026!",
        )
        self.student_profile = StudentProfile.objects.create(user=user_account)
        self.avatar = Avatar.objects.create(student=self.student_profile)

    def test_avatar_evolves_across_all_four_visual_tiers_as_xp_increases(self):
        first_step = self.avatar.award_experience(150)
        self.assertEqual(first_step["new_level"], 2)
        self.assertTrue(first_step["leveled_up"])
        self.assertEqual(self.avatar.visual_tier, "novice")
        self.assertEqual(self.avatar.title, "Novice")
        self.assertEqual(self.avatar.current_level_progress_percent, 50)
        self.assertEqual(self.avatar.xp_for_next_level, 200)

        second_step = self.avatar.award_experience(100)
        self.assertEqual(second_step["new_level"], 3)
        self.assertTrue(second_step["tier_evolved"])
        self.assertEqual(self.avatar.visual_tier, "apprenti")
        self.assertEqual(self.avatar.title, "Apprenti DevOps")

        third_step = self.avatar.award_experience(200)
        self.assertEqual(third_step["new_level"], 5)
        self.assertTrue(third_step["tier_evolved"])
        self.assertEqual(self.avatar.visual_tier, "confirme")
        self.assertEqual(self.avatar.title, "Ingenieur Cloud Confirme")

        fourth_step = self.avatar.award_experience(300)
        self.assertEqual(fourth_step["new_level"], 8)
        self.assertTrue(fourth_step["tier_evolved"])
        self.assertEqual(self.avatar.visual_tier, "maitre")
        self.assertEqual(self.avatar.title, "Maitre Architecte Fullstack")

    def test_award_experience_rejects_non_positive_values(self):
        with self.assertRaises(ValueError):
            self.avatar.award_experience(0)
        with self.assertRaises(ValueError):
            self.avatar.award_experience(-50)

    def test_progression_tiers_and_authenticated_award_xp_endpoints(self):
        tiers_response = self.api_client.get(reverse("avatar-progression-tiers"))
        self.assertEqual(tiers_response.status_code, status.HTTP_200_OK)
        tiers_payload = tiers_response.json()
        self.assertEqual(tiers_payload["xp_per_level"], 100)
        self.assertEqual(len(tiers_payload["tiers"]), 4)

        login_response = self.api_client.post(
            reverse("auth-login"),
            {"username": "maxime_k8s", "password": "StrongPassword2026!"},
            format="json",
        )
        access_token = login_response.json()["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        award_response = self.api_client.post(
            reverse("avatar-award-xp"),
            {"earned_xp": 220},
            format="json",
        )
        self.assertEqual(award_response.status_code, status.HTTP_200_OK)
        award_body = award_response.json()
        self.assertEqual(award_body["progression"]["new_level"], 3)
        self.assertTrue(award_body["progression"]["leveled_up"])
        self.assertEqual(award_body["avatar"]["visual_tier"], "apprenti")
        self.assertEqual(award_body["avatar"]["title"], "Apprenti DevOps")


class SkillTreeEndpointsTest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        ensure_default_skill_tree()
        register_response = self.api_client.post(
            reverse("auth-register"),
            {
                "username": "clara_skills",
                "email": "clara@careerquest.fr",
                "password": "StrongPassword2026!",
                "school_name": "Epitech Digital",
            },
            format="json",
        )
        self.access_token = register_response.json()["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_list_skills_returns_default_tree_with_availability_states(self):
        response = self.api_client.get(reverse("skill-tree-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        skill_nodes = response.json()
        self.assertEqual(len(skill_nodes), 8)

        docker_node = next(node for node in skill_nodes if node["code"] == "docker-containers")
        cicd_node = next(node for node in skill_nodes if node["code"] == "gitlab-cicd")

        self.assertFalse(docker_node["is_unlocked"])
        self.assertTrue(docker_node["is_available"])
        self.assertFalse(cicd_node["is_unlocked"])
        self.assertFalse(cicd_node["is_available"])

    def test_unlock_root_skill_awards_xp_and_unlocks_child_availability(self):
        docker_skill = SkillNode.objects.get(code="docker-containers")
        unlock_response = self.api_client.post(
            reverse("skill-node-unlock", kwargs={"skill_id": docker_skill.id}),
            format="json",
        )
        self.assertEqual(unlock_response.status_code, status.HTTP_200_OK)
        unlock_payload = unlock_response.json()
        self.assertTrue(unlock_payload["unlocked_skill"]["is_unlocked"])
        self.assertEqual(unlock_payload["avatar"]["level"], 2)
        self.assertEqual(unlock_payload["avatar"]["experience_points"], 100)

        tree_response = self.api_client.get(reverse("skill-tree-list"))
        cicd_node = next(node for node in tree_response.json() if node["code"] == "gitlab-cicd")
        self.assertTrue(cicd_node["is_available"])

    def test_unlock_child_skill_fails_when_parent_skill_is_locked(self):
        cicd_skill = SkillNode.objects.get(code="gitlab-cicd")
        response = self.api_client.post(
            reverse("skill-node-unlock", kwargs={"skill_id": cicd_skill.id}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("doit etre debloquee au prealable", response.json()["detail"])

    def test_unlock_same_skill_twice_is_rejected(self):
        docker_skill = SkillNode.objects.get(code="docker-containers")
        first_response = self.api_client.post(
            reverse("skill-node-unlock", kwargs={"skill_id": docker_skill.id}),
            format="json",
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)

        second_response = self.api_client.post(
            reverse("skill-node-unlock", kwargs={"skill_id": docker_skill.id}),
            format="json",
        )
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("deja debloquee", second_response.json()["detail"])


class QuestSystemEndpointsTest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        ensure_default_quests()
        register_response = self.api_client.post(
            reverse("auth-register"),
            {
                "username": "thomas_quests",
                "email": "thomas@careerquest.fr",
                "password": "StrongPassword2026!",
                "school_name": "Epitech Digital",
            },
            format="json",
        )
        self.access_token = register_response.json()["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_list_quests_returns_all_three_quest_categories_and_filters_by_type(self):
        all_response = self.api_client.get(reverse("quest-list"))
        self.assertEqual(all_response.status_code, status.HTTP_200_OK)
        all_quests = all_response.json()
        self.assertEqual(len(all_quests), 6)
        self.assertTrue(all(q["student_status"] == "not_started" for q in all_quests))

        cert_response = self.api_client.get(f"{reverse('quest-list')}?quest_type=certification")
        self.assertEqual(cert_response.status_code, status.HTTP_200_OK)
        cert_quests = cert_response.json()
        self.assertEqual(len(cert_quests), 2)
        self.assertTrue(all(q["quest_type"] == "certification" for q in cert_quests))

    def test_start_and_complete_quest_awards_xp_and_updates_avatar(self):
        docker_quest = Quest.objects.get(code="quest-docker-stack")

        start_response = self.api_client.post(
            reverse("quest-start", kwargs={"quest_id": docker_quest.id}),
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        self.assertEqual(start_response.json()["quest"]["student_status"], "in_progress")

        complete_response = self.api_client.post(
            reverse("quest-complete", kwargs={"quest_id": docker_quest.id}),
            {"proof_url": "https://github.com/frank-kenfack/CareerQuest"},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        complete_payload = complete_response.json()
        self.assertEqual(complete_payload["quest"]["student_status"], "completed")
        self.assertEqual(
            complete_payload["quest"]["proof_url"],
            "https://github.com/frank-kenfack/CareerQuest",
        )
        self.assertEqual(complete_payload["avatar"]["experience_points"], 150)
        self.assertEqual(complete_payload["avatar"]["level"], 2)

    def test_completing_same_quest_twice_is_rejected_without_duplicate_xp(self):
        cka_quest = Quest.objects.get(code="quest-cka-kubernetes")

        first_completion = self.api_client.post(
            reverse("quest-complete", kwargs={"quest_id": cka_quest.id}),
            {"proof_url": "https://training.linuxfoundation.org/cka"},
            format="json",
        )
        self.assertEqual(first_completion.status_code, status.HTTP_200_OK)
        self.assertEqual(first_completion.json()["avatar"]["experience_points"], 250)

        duplicate_completion = self.api_client.post(
            reverse("quest-complete", kwargs={"quest_id": cka_quest.id}),
            format="json",
        )
        self.assertEqual(duplicate_completion.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("deja ete validee", duplicate_completion.json()["detail"])

        profile_response = self.api_client.get(reverse("auth-me"))
        self.assertEqual(profile_response.json()["avatar"]["experience_points"], 250)


class GithubIntegrationSyncTest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        register_response = self.api_client.post(
            reverse("auth-register"),
            {
                "username": "sarah_git",
                "email": "sarah@careerquest.fr",
                "password": "StrongPassword2026!",
                "school_name": "Epitech Digital",
                "github_username": "frank-kenfack",
            },
            format="json",
        )
        self.access_token = register_response.json()["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    @patch("progression.views.fetch_github_repositories")
    def test_github_sync_unlocks_achievements_and_awards_xp(self, mocked_fetch_repos):
        mocked_fetch_repos.return_value = [
            {"name": "CareerQuest", "language": "Python"},
            {"name": "k8s-infra", "language": "TypeScript"},
        ]

        sync_response = self.api_client.post(
            reverse("github-sync"),
            {"github_username": "frank-kenfack"},
            format="json",
        )
        self.assertEqual(sync_response.status_code, status.HTTP_200_OK)
        sync_payload = sync_response.json()

        self.assertEqual(sync_payload["github_username"], "frank-kenfack")
        self.assertEqual(sync_payload["repositories_analyzed_count"], 2)
        self.assertEqual(len(sync_payload["newly_unlocked_achievements"]), 4)
        self.assertEqual(sync_payload["newly_awarded_xp"], 420)
        self.assertEqual(sync_payload["avatar"]["experience_points"], 420)
        self.assertEqual(sync_payload["avatar"]["level"], 5)
        self.assertEqual(sync_payload["avatar"]["visual_tier"], "confirme")

    @patch("progression.views.fetch_github_repositories")
    def test_github_sync_is_idempotent_on_repeated_calls(self, mocked_fetch_repos):
        mocked_fetch_repos.return_value = [
            {"name": "CareerQuest", "language": "Python"},
        ]

        first_sync = self.api_client.post(reverse("github-sync"), format="json")
        self.assertEqual(first_sync.status_code, status.HTTP_200_OK)
        self.assertEqual(first_sync.json()["newly_awarded_xp"], 420)

        second_sync = self.api_client.post(reverse("github-sync"), format="json")
        self.assertEqual(second_sync.status_code, status.HTTP_200_OK)
        second_payload = second_sync.json()
        self.assertEqual(second_payload["newly_awarded_xp"], 0)
        self.assertEqual(len(second_payload["newly_unlocked_achievements"]), 0)
        self.assertEqual(len(second_payload["all_achievements"]), 4)
        self.assertEqual(second_payload["avatar"]["experience_points"], 420)

    def test_github_sync_rejects_missing_username(self):
        no_github_register = self.api_client.post(
            reverse("auth-register"),
            {
                "username": "paul_nogit",
                "email": "paul@careerquest.fr",
                "password": "StrongPassword2026!",
            },
            format="json",
        )
        token = no_github_register.json()["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.api_client.post(reverse("github-sync"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("identifiant GitHub", response.json()["detail"])


class LinkedinIntegrationSyncTest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        register_response = self.api_client.post(
            reverse("auth-register"),
            {
                "username": "lucas_linkedin",
                "email": "lucas@careerquest.fr",
                "password": "StrongPassword2026!",
                "school_name": "Epitech Digital",
            },
            format="json",
        )
        self.access_token = register_response.json()["tokens"]["access"]
        self.api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    def test_linkedin_sync_links_profile_imports_certification_and_awards_xp(self):
        response = self.api_client.post(
            reverse("linkedin-sync"),
            {
                "linkedin_profile_url": "https://www.linkedin.com/in/frank-kenfack",
                "certification_title": "Kubernetes Administrator (CKA)",
                "certification_issuer": "Linux Foundation",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["linkedin_profile_url"], "https://www.linkedin.com/in/frank-kenfack")
        self.assertEqual(payload["newly_awarded_xp"], 225)
        self.assertEqual(len(payload["newly_unlocked_achievements"]), 2)
        self.assertEqual(payload["avatar"]["experience_points"], 225)
        self.assertEqual(payload["avatar"]["level"], 3)
        self.assertEqual(payload["avatar"]["visual_tier"], "apprenti")

    def test_linkedin_sync_is_idempotent_for_same_certification(self):
        sync_body = {
            "linkedin_profile_url": "https://www.linkedin.com/in/frank-kenfack",
            "certification_title": "Docker Certified Associate",
            "certification_issuer": "Docker Inc",
        }
        first_response = self.api_client.post(reverse("linkedin-sync"), sync_body, format="json")
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(first_response.json()["newly_awarded_xp"], 225)

        second_response = self.api_client.post(reverse("linkedin-sync"), sync_body, format="json")
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.json()["newly_awarded_xp"], 0)
        self.assertEqual(second_response.json()["avatar"]["experience_points"], 225)

    def test_linkedin_sync_rejects_invalid_linkedin_url(self):
        response = self.api_client.post(
            reverse("linkedin-sync"),
            {"linkedin_profile_url": "https://example.com/not-linkedin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("linkedin.com/in/", response.json()["detail"])
