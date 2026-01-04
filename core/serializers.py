from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Transaction, IncomeSource

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']

class TransactionSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    
    class Meta:
        model = Transaction
        fields = ["id", "owner", "title", "amount", "date", "category", "notes", "receipt_image"]
        read_only_fields = ['id', 'owner']


class IncomeSourceSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = IncomeSource
        fields = ["id", "owner", "name", "monthly_amount", "active", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]
