from django.test import TestCase

from core.models import RecurringTransaction
from core.serializers import RecurringTransactionSerializer
from core.tests.support import create_user


class RecurringTransactionSerializerTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def test_recurring_transaction_serializer_sets_next_due_date_from_start_date(self):
        serializer = RecurringTransactionSerializer(
            data={
                "title": "Spotify",
                "amount": "9.99",
                "category": "Entertainment",
                "frequency": RecurringTransaction.FREQ_MONTHLY,
                "start_date": "2026-04-11",
                "end_date": None,
                "is_active": True,
                "notes": "",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        rule = serializer.save(owner=self.user)

        self.assertEqual(rule.next_due_date.isoformat(), "2026-04-11")
        self.assertEqual(rule.owner, self.user)
