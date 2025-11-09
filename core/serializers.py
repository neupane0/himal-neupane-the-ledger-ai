from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Transaction

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']

class TransactionSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    
    class Meta:
        model = Transaction
        fields = ["id", "owner", "title", "amount", "date", "category", "notes"]
        read_only_fields = ['id', 'owner']
