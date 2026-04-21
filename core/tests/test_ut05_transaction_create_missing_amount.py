from django.test import TestCase

from core.models import UserProfile
from core.serializers import UserProfileSerializer
from core.tests.support import create_user


class UserProfileUpdateSerializerTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.profile = UserProfile.objects.create(user=self.user)

    def test_user_profile_serializer_updates_user_fields(self):
        serializer = UserProfileSerializer(
            instance=self.profile,
            data={
                "username": "alice2",
                "email": "alice2@example.com",
                "first_name": "Alice",
                "last_name": "Wonder",
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "alice2")
        self.assertEqual(self.user.email, "alice2@example.com")
        self.assertEqual(self.user.first_name, "Alice")
        self.assertEqual(self.user.last_name, "Wonder")
