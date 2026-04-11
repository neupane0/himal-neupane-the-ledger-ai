from django.urls import reverse
from rest_framework.test import APITestCase

from core.tests.support import create_profile, create_user


class ProfileViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.profile = create_profile(self.user)
        self.client.force_authenticate(user=self.user)

    def test_profile_view_get_and_update(self):
        response = self.client.get(reverse("profile"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "alice")

        update_response = self.client.put(
            reverse("profile"),
            {
                "username": "alice-updated",
                "email": "updated@example.com",
                "first_name": "Alice",
                "last_name": "Updated",
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "alice-updated")
        self.assertEqual(self.user.email, "updated@example.com")
