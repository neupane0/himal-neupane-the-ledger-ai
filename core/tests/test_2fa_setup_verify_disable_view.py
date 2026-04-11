import pyotp
from django.urls import reverse
from rest_framework.test import APITestCase

from core.tests.support import create_profile, create_user


class TwoFASetupVerifyDisableViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.profile = create_profile(self.user)
        self.client.force_authenticate(user=self.user)

    def test_setup_verify_and_disable_2fa_flow(self):
        setup_response = self.client.post(reverse("setup_2fa"), format="json")

        self.assertEqual(setup_response.status_code, 200)
        secret = setup_response.data["secret"]
        self.assertTrue(setup_response.data["qr_code"].startswith("data:image/png;base64,"))

        code = pyotp.TOTP(secret).now()
        verify_response = self.client.post(reverse("verify_2fa"), {"code": code}, format="json")

        self.assertEqual(verify_response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_2fa_enabled)

        disable_code = pyotp.TOTP(secret).now()
        disable_response = self.client.post(reverse("disable_2fa"), {"code": disable_code}, format="json")

        self.assertEqual(disable_response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.is_2fa_enabled)
        self.assertEqual(self.profile.totp_secret, "")
