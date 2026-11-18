from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from progression.models import Avatar, StudentProfile


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
        # 150 XP -> Niveau 2 (reste au palier novice)
        first_step = self.avatar.award_experience(150)
        self.assertEqual(first_step["new_level"], 2)
        self.assertTrue(first_step["leveled_up"])
        self.assertEqual(self.avatar.visual_tier, "novice")
        self.assertEqual(self.avatar.title, "Novice")
        self.assertEqual(self.avatar.current_level_progress_percent, 50)
        self.assertEqual(self.avatar.xp_for_next_level, 200)

        # +100 XP (total 250 XP) -> Niveau 3 (evolue vers apprenti)
        second_step = self.avatar.award_experience(100)
        self.assertEqual(second_step["new_level"], 3)
        self.assertTrue(second_step["tier_evolved"])
        self.assertEqual(self.avatar.visual_tier, "apprenti")
        self.assertEqual(self.avatar.title, "Apprenti DevOps")

        # +200 XP (total 450 XP) -> Niveau 5 (evolue vers confirme)
        third_step = self.avatar.award_experience(200)
        self.assertEqual(third_step["new_level"], 5)
        self.assertTrue(third_step["tier_evolved"])
        self.assertEqual(self.avatar.visual_tier, "confirme")
        self.assertEqual(self.avatar.title, "Ingenieur Cloud Confirme")

        # +300 XP (total 750 XP) -> Niveau 8 (evolue vers maitre)
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
