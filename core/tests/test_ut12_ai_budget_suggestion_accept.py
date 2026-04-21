from datetime import date, timedelta

from django.test import TestCase

from core.models import RecurringTransaction, Transaction
from core.tests.support import create_user


class RecurringMaterializeDueTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def test_recurring_transaction_materialize_due_creates_transactions(self):
        rule = RecurringTransaction.objects.create(
            owner=self.user,
            title="Netflix",
            amount="15.00",
            category="Entertainment",
            frequency=RecurringTransaction.FREQ_DAILY,
            start_date=date.today() - timedelta(days=2),
            next_due_date=date.today() - timedelta(days=2),
        )

        created = RecurringTransaction.materialize_due(self.user)

        self.assertEqual(len(created), 3)
        self.assertEqual(Transaction.objects.filter(owner=self.user, title="Netflix").count(), 3)
        rule.refresh_from_db()
        self.assertEqual(rule.next_due_date, date.today() + timedelta(days=1))
        self.assertTrue(rule.is_active)
