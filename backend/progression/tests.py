from django.test import TestCase
from django.urls import reverse
from rest_framework import status


class HealthCheckEndpointTest(TestCase):
    def test_health_check_returns_connected_database_status(self):
        response = self.client.get(reverse("health-check"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["service"], "careerquest-backend")
        self.assertEqual(payload["database"], "connected")
