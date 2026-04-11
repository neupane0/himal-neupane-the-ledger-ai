from datetime import date, timedelta

from django.test import TestCase

from core.models import RecurringTransaction, Transaction
from core.tests.support import create_user


class RecurringEndDateTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def test_recurring_transaction_stops_after_end_date(self):
        rule = RecurringTransaction.objects.create(
            owner=self.user,
            title="Gym",
            amount="40.00",
            category="Health",
            frequency=RecurringTransaction.FREQ_DAILY,
            start_date=date.today() - timedelta(days=1),
            end_date=date.today() - timedelta(days=1),
            next_due_date=date.today() - timedelta(days=1),
        )

        created = RecurringTransaction.materialize_due(self.user)

        self.assertEqual(len(created), 1)
        self.assertEqual(Transaction.objects.filter(owner=self.user, title="Gym").count(), 1)
        rule.refresh_from_db()
        self.assertFalse(rule.is_active)
