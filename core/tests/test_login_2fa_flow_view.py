import pyotp
from django.urls import reverse
from rest_framework.test import APITestCase

from core.models import UserProfile
from core.tests.support import create_user


class Login2FAFlowViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.profile = UserProfile.objects.create(user=self.user)

    def test_login_requires_2fa_then_verify_login(self):
        secret = "JBSWY3DPEHPK3PXP"
        self.profile.totp_secret = secret
        self.profile.is_2fa_enabled = True
        self.profile.save()

        login_response = self.client.post(
            reverse("login"),
            {"username": self.user.username, "password": "password123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.data["requires_2fa"])
        self.assertEqual(self.client.session.get("pending_2fa_user_id"), self.user.id)

        code = pyotp.TOTP(secret).now()
        verify_response = self.client.post(reverse("verify_2fa_login"), {"code": code}, format="json")

        self.assertEqual(verify_response.status_code, 200)
        self.assertEqual(int(self.client.session["_auth_user_id"]), self.user.id)
        self.assertNotIn("pending_2fa_user_id", self.client.session)
