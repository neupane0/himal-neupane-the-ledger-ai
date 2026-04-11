from django.urls import reverse
from rest_framework.test import APITestCase

from core.tests.support import create_user


class LoginEmailViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()

    def test_login_view_accepts_email_identifier(self):
        response = self.client.post(
            reverse("login"),
            {"identifier": self.user.email, "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["username"], "alice")
