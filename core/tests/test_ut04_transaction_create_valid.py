from datetime import date

from django.urls import reverse
from rest_framework.test import APITestCase

from core.tests.support import create_user


class TransactionCreateViewTests(APITestCase):
    def setUp(self):
        self.user = create_user()
        self.client.force_authenticate(user=self.user)

    def test_transaction_create_scopes_to_authenticated_user(self):
        response = self.client.post(
            reverse("transaction-list"),
            {
                "title": "Coffee",
                "amount": "4.50",
                "date": date.today().isoformat(),
                "category": "Food",
                "notes": "Morning coffee",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["owner"], self.user.username)
