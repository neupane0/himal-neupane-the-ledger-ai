from datetime import date

from django.test import TestCase

from core.models import Budget, Transaction
from core.serializers import BudgetSerializer
from core.tests.support import create_user


class BudgetSpentSerializerTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def test_budget_serializer_calculates_spent_excluding_income(self):
        budget = Budget.objects.create(
            owner=self.user,
            category="Food",
            limit_amount="300.00",
            month=date(2026, 4, 1),
        )
        Transaction.objects.create(
            owner=self.user,
            title="Lunch",
            amount="12.50",
            date=date(2026, 4, 3),
            category="Food",
        )
        Transaction.objects.create(
            owner=self.user,
            title="Salary",
            amount="2000.00",
            date=date(2026, 4, 3),
            category="Income",
        )
        Transaction.objects.create(
            owner=self.user,
            title="April groceries",
            amount="20.00",
            date=date(2026, 4, 20),
            category="food",
        )

        data = BudgetSerializer(budget).data

        self.assertEqual(data["spent"], 32.5)
