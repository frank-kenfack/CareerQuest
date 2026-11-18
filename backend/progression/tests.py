from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


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
