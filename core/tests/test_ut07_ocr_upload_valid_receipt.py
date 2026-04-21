from datetime import date, timedelta

from django.test import TestCase

from core.models import (
    AssistantConversation,
    AssistantMessage,
    Budget,
    IncomeSource,
    Reminder,
    Transaction,
    UserProfile,
)
from core.tests.support import create_user


class ModelStringTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def test_user_profile_and_string_representations(self):
        profile = UserProfile.objects.create(user=self.user, totp_secret="secret", is_2fa_enabled=True)
        transaction = Transaction.objects.create(
            owner=self.user,
            title="Groceries",
            amount="12.50",
            date=date.today(),
            category="Food",
        )
        income = IncomeSource.objects.create(
            owner=self.user,
            name="Salary",
            monthly_amount="2500.00",
        )
        conversation = AssistantConversation.objects.create(owner=self.user, title="Budget help")
        message = AssistantMessage.objects.create(
            conversation=conversation,
            role=AssistantMessage.ROLE_ASSISTANT,
            content="Keep an eye on recurring subscriptions.",
        )
        budget = Budget.objects.create(
            owner=self.user,
            category="Food",
            limit_amount="300.00",
            month=date.today().replace(day=1),
        )
        reminder = Reminder.objects.create(
            owner=self.user,
            title="Rent",
            amount="800.00",
            due_date=date.today() - timedelta(days=1),
        )

        self.assertEqual(str(profile), "Profile(alice)")
        self.assertEqual(str(transaction), "Groceries - $12.50")
        self.assertEqual(str(income), "Salary - 2500.00/mo")
        self.assertEqual(str(conversation), "Budget help")
        self.assertEqual(str(message), "assistant: Keep an eye on recurring subscriptions.")
        self.assertEqual(str(budget), f"Food - $300.00 ({budget.month.strftime('%b %Y')})")
        self.assertTrue(reminder.is_overdue)
        self.assertEqual(str(reminder), f"Rent - $800.00 (Due: {reminder.due_date})")
