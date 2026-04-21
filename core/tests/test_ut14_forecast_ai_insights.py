from datetime import date, timedelta
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from core.models import Reminder
from core.tests.support import create_user


class ReminderToggleEmailViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_reminder_toggle_paid_and_send_test_email(self):
        reminder = Reminder.objects.create(
            owner=self.user,
            title="Electricity",
            amount="80.00",
            due_date=date.today() + timedelta(days=3),
        )

        toggle_response = self.client.post(reverse("reminder-toggle-paid", args=[reminder.pk]))

        self.assertEqual(toggle_response.status_code, 200)
        reminder.refresh_from_db()
        self.assertTrue(reminder.is_paid)

        with patch("core.email_service.send_reminder_email", return_value=True) as mocked_send:
            email_response = self.client.post(reverse("reminder-send-test-email"))

        self.assertEqual(email_response.status_code, 200)
        mocked_send.assert_called_once()
