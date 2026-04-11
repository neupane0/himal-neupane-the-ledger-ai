from django.contrib.auth.models import User

from core.models import UserProfile


def create_user(
    username: str = "alice",
    email: str = "alice@example.com",
    password: str = "password123",
):
    return User.objects.create_user(username=username, email=email, password=password)


def create_profile(user, **kwargs):
    return UserProfile.objects.create(user=user, **kwargs)
