from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Transaction, IncomeSource, Budget, Reminder, RecurringTransaction, UserProfile, Group, GroupMembership, GroupExpense, GroupPayment


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile serializer: user fields + 2FA status."""
    id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username')
    email = serializers.EmailField(source='user.email')
    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    is_2fa_enabled = serializers.BooleanField(read_only=True)
    esewa_id = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    bank_account_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'is_2fa_enabled',
                  'esewa_id', 'bank_name', 'bank_account_number']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        user.save()
        # Update payment info fields directly on profile
        for field in ('esewa_id', 'bank_name', 'bank_account_number'):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        return instance

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


class GroupMemberSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model = GroupMembership
        fields = ['id', 'username', 'email', 'joined_at']
        read_only_fields = ['id', 'username', 'email', 'joined_at']


class GroupExpenseSerializer(serializers.ModelSerializer):
    paid_by_username = serializers.ReadOnlyField(source='paid_by.username')
    share_per_member = serializers.SerializerMethodField()
    split_details = serializers.SerializerMethodField()

    class Meta:
        model = GroupExpense
        fields = ['id', 'group', 'title', 'amount', 'paid_by_username', 'date', 'notes', 'share_per_member', 'split_details', 'created_at']
        read_only_fields = ['id', 'group', 'paid_by_username', 'share_per_member', 'split_details', 'created_at']

    def get_share_per_member(self, obj):
        member_count = obj.group.memberships.count()
        if member_count == 0:
            return float(obj.amount)
        return round(float(obj.amount) / member_count, 2)

    def get_split_details(self, obj):
        """Per-member breakdown: who owes the payer and how much."""
        members = list(obj.group.memberships.select_related('user').all())
        member_count = len(members)
        if member_count == 0:
            return []
        share = round(float(obj.amount) / member_count, 2)
        payer = obj.paid_by.username
        return [
            {
                'username': m.user.username,
                'share': share,
                'paid': m.user.username == payer,
            }
            for m in members
        ]


class GroupSerializer(serializers.ModelSerializer):
    created_by_username = serializers.ReadOnlyField(source='created_by.username')
    member_count = serializers.SerializerMethodField()
    members = GroupMemberSerializer(source='memberships', many=True, read_only=True)
    expenses = GroupExpenseSerializer(many=True, read_only=True)
    your_balance = serializers.SerializerMethodField()
    settlements = serializers.SerializerMethodField()
    confirmed_payments = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'created_by_username', 'member_count', 'members', 'expenses', 'your_balance', 'settlements', 'confirmed_payments', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by_username', 'member_count', 'members', 'expenses', 'your_balance', 'settlements', 'confirmed_payments', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_your_balance(self, obj):
        """Returns how much the current user owes (positive) or is owed (negative)."""
        request = self.context.get('request')
        if not request:
            return 0.0
        user = request.user
        member_count = obj.memberships.count()
        if member_count == 0:
            return 0.0

        owe = 0.0   # amount this user owes others
        owed = 0.0  # amount others owe this user

        for expense in obj.expenses.all():
            share = float(expense.amount) / member_count
            if expense.paid_by == user:
                # user paid — everyone else owes them their share
                owed += float(expense.amount) - share
            else:
                # someone else paid — user owes their share
                owe += share

        return round(owe - owed, 2)

    def get_settlements(self, obj):
        """
        Minimum set of transfers to settle all debts, minus confirmed payments.
        Each entry includes payee payment info and any pending payment record.
        """
        members = list(obj.memberships.select_related('user__profile').all())
        member_count = len(members)
        if member_count < 2:
            return []

        user_map = {m.user.username: m.user for m in members}

        # Net balance per username: positive = owed money, negative = owes money
        balances = {m.user.username: 0.0 for m in members}

        for expense in obj.expenses.select_related('paid_by').all():
            share = float(expense.amount) / member_count
            payer = expense.paid_by.username
            if payer in balances:
                balances[payer] += float(expense.amount) - share
            for m in members:
                if m.user.username != payer:
                    balances[m.user.username] -= share

        # Subtract confirmed payments
        for payment in obj.payments.filter(is_confirmed=True).select_related('paid_by', 'paid_to'):
            payer_u = payment.paid_by.username
            payee_u = payment.paid_to.username
            amt = float(payment.amount)
            if payer_u in balances:
                balances[payer_u] += amt        # debt reduced
            if payee_u in balances:
                balances[payee_u] -= amt        # credit reduced

        # Build pending payments index: (from, to) → payment obj
        pending = {}
        for payment in obj.payments.filter(is_confirmed=False).select_related('paid_by', 'paid_to'):
            key = (payment.paid_by.username, payment.paid_to.username)
            pending[key] = payment

        # Greedy min-cash-flow
        creditors = sorted([(u, b) for u, b in balances.items() if b > 0.005], key=lambda x: -x[1])
        debtors   = sorted([(u, -b) for u, b in balances.items() if b < -0.005], key=lambda x: -x[1])
        creditors = list(creditors)
        debtors   = list(debtors)

        settlements = []
        ci, di = 0, 0

        while ci < len(creditors) and di < len(debtors):
            creditor, credit = creditors[ci]
            debtor,   debt   = debtors[di]
            amount = min(credit, debt)

            # Payee payment info
            payee_user = user_map.get(creditor)
            payment_info = {}
            if payee_user:
                try:
                    prof = payee_user.profile
                    payment_info = {
                        'esewa_id': prof.esewa_id or '',
                        'bank_name': prof.bank_name or '',
                        'bank_account_number': prof.bank_account_number or '',
                        'has_info': bool(prof.esewa_id or prof.bank_account_number),
                    }
                except Exception:
                    payment_info = {'esewa_id': '', 'bank_name': '', 'bank_account_number': '', 'has_info': False}

            # Pending payment record
            pend = pending.get((debtor, creditor))
            pending_payment = {
                'id': pend.id,
                'amount': float(pend.amount),
                'note': pend.note,
            } if pend else None

            settlements.append({
                'from': debtor,
                'to': creditor,
                'amount': round(amount, 2),
                'to_payment_info': payment_info,
                'pending_payment': pending_payment,
            })

            creditors[ci] = (creditor, credit - amount)
            debtors[di]   = (debtor,   debt   - amount)
            if creditors[ci][1] < 0.005:
                ci += 1
            if debtors[di][1] < 0.005:
                di += 1

        return settlements

    def get_confirmed_payments(self, obj):
        """List of confirmed payments for display as settled cards."""
        payments = obj.payments.filter(is_confirmed=True).select_related('paid_by', 'paid_to')
        return [
            {
                'id': p.id,
                'from': p.paid_by.username,
                'to': p.paid_to.username,
                'amount': float(p.amount),
                'note': p.note,
                'confirmed_at': p.confirmed_at.isoformat() if p.confirmed_at else None,
            }
            for p in payments
        ]


class GroupListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view (no nested expenses)."""
    member_count = serializers.SerializerMethodField()
    expense_count = serializers.SerializerMethodField()
    your_balance = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ['id', 'name', 'member_count', 'expense_count', 'your_balance', 'created_at']
        read_only_fields = fields

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_expense_count(self, obj):
        return obj.expenses.count()

    def get_your_balance(self, obj):
        request = self.context.get('request')
        if not request:
            return 0.0
        user = request.user
        member_count = obj.memberships.count()
        if member_count == 0:
            return 0.0
        owe = 0.0
        owed = 0.0
        for expense in obj.expenses.all():
            share = float(expense.amount) / member_count
            if expense.paid_by == user:
                owed += float(expense.amount) - share
            else:
                owe += share
        # Subtract confirmed payments
        for payment in obj.payments.filter(is_confirmed=True).select_related('paid_by', 'paid_to'):
            if payment.paid_by == user:
                owe -= float(payment.amount)
            if payment.paid_to == user:
                owed -= float(payment.amount)
        return round(owe - owed, 2)
