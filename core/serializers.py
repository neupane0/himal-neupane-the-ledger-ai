from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Transaction, IncomeSource, Budget, Reminder, RecurringTransaction

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


class BudgetSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    spent = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = ["id", "owner", "category", "limit_amount", "month", "spent", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "spent", "created_at", "updated_at"]

    def get_spent(self, obj):
        """Calculate spent amount from transactions in the same month/category"""
        from django.db.models import Sum
        from datetime import date
        
        # Get first and last day of the budget month
        first_day = obj.month.replace(day=1)
        if first_day.month == 12:
            last_day = first_day.replace(year=first_day.year + 1, month=1, day=1)
        else:
            last_day = first_day.replace(month=first_day.month + 1, day=1)
        
        total = Transaction.objects.filter(
            owner=obj.owner,
            category__iexact=obj.category,
            date__gte=first_day,
            date__lt=last_day
        ).exclude(category__iexact='Income').aggregate(total=Sum('amount'))['total']
        
        return float(total) if total else 0.0


class ReminderSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Reminder
        fields = [
            "id", "owner", "title", "amount", "due_date", "frequency",
            "is_paid", "email_reminder", "reminder_days_before", 
            "notes", "is_overdue", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "owner", "is_overdue", "created_at", "updated_at"]


class RecurringTransactionSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = RecurringTransaction
        fields = [
            "id", "owner", "title", "amount", "category", "frequency",
            "start_date", "end_date", "next_due_date", "is_active",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "next_due_date", "created_at", "updated_at"]

    def create(self, validated_data):
        # next_due_date defaults to start_date when creating
        validated_data['next_due_date'] = validated_data.get('start_date')
        return super().create(validated_data)
