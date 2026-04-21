from datetime import date, timedelta

from django.urls import reverse
from rest_framework.test import APITestCase

from core.models import RecurringTransaction, Transaction
from core.tests.support import create_user


class TransactionMaterializationViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_transaction_list_materializes_due_recurring_entries(self):
        RecurringTransaction.objects.create(
            owner=self.user,
            title="Netflix",
            amount="15.00",
            category="Entertainment",
            frequency=RecurringTransaction.FREQ_DAILY,
            start_date=date.today() - timedelta(days=2),
            next_due_date=date.today() - timedelta(days=2),
        )

        response = self.client.get(reverse("transaction-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Transaction.objects.filter(owner=self.user, title="Netflix").count(), 3)
