from datetime import date

from django.urls import reverse
from rest_framework.test import APITestCase

from core.models import RecurringTransaction
from core.tests.support import create_user


class RecurringToggleActiveViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_recurring_transaction_toggle_active(self):
        rule = RecurringTransaction.objects.create(
            owner=self.user,
            title="Gym",
            amount="40.00",
            category="Health",
            frequency=RecurringTransaction.FREQ_MONTHLY,
            start_date=date.today(),
            next_due_date=date.today(),
            is_active=True,
        )

        response = self.client.post(reverse("recurring-transaction-toggle-active", args=[rule.pk]))

        self.assertEqual(response.status_code, 200)
        rule.refresh_from_db()
        self.assertFalse(rule.is_active)
