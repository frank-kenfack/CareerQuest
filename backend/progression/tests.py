from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from progression.models import Avatar, SkillNode, StudentProfile, ensure_default_skill_tree


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
