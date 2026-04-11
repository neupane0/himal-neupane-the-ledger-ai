from django.urls import reverse
from rest_framework.test import APITestCase

from core.tests.support import create_user


class ChangePasswordViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_change_password_updates_login_secret(self):
        response = self.client.post(
            reverse("change_password"),
            {
                "current_password": "password123",
                "new_password": "newpassword123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword123"))
