from django.conf import settings
from django.db import models
from django.utils import timezone
from dateutil.relativedelta import relativedelta


class UserProfile(models.Model):
    """Extended user profile with 2FA support and payment info."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    totp_secret = models.CharField(max_length=64, blank=True, default="")
    is_2fa_enabled = models.BooleanField(default=False)
    # Payment info for group expense settlements
    esewa_id = models.CharField(max_length=100, blank=True, default="")
    bank_name = models.CharField(max_length=100, blank=True, default="")
    bank_account_number = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user.username})"


class Transaction(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transactions")
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(default=timezone.now)
    category = models.CharField(max_length=100, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    receipt_image = models.ImageField(upload_to='receipts/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-date", "-id"]
        
    def __str__(self):
        return f"{self.title} - ${self.amount}"


class IncomeSource(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="income_sources")
    name = models.CharField(max_length=120)
    monthly_amount = models.DecimalField(max_digits=12, decimal_places=2)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.name} - {self.monthly_amount}/mo"


class AssistantConversation(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assistant_conversations")
    title = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return self.title or f"Conversation {self.id}"


class AssistantMessage(models.Model):
    ROLE_USER = "user"
    ROLE_ASSISTANT = "assistant"
    ROLE_SYSTEM = "system"

    ROLE_CHOICES = (
        (ROLE_USER, "User"),
        (ROLE_ASSISTANT, "Assistant"),
        (ROLE_SYSTEM, "System"),
    )

    conversation = models.ForeignKey(AssistantConversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.role}: {self.content[:40]}"


class Budget(models.Model):
    """Monthly budget limits per category"""
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    category = models.CharField(max_length=100)
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    month = models.DateField(help_text="First day of the budget month")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Alert tracking — reset when limit_amount changes
    alert_90_sent = models.BooleanField(default=False)
    alert_100_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ["-month", "category"]
        unique_together = ["owner", "category", "month"]

    def __str__(self):
        return f"{self.category} - ${self.limit_amount} ({self.month.strftime('%b %Y')})"


class Reminder(models.Model):
    """Bill payment reminders with email notifications"""
    FREQUENCY_ONCE = "once"
    FREQUENCY_WEEKLY = "weekly"
    FREQUENCY_MONTHLY = "monthly"
    FREQUENCY_YEARLY = "yearly"
    
    FREQUENCY_CHOICES = [
        (FREQUENCY_ONCE, "One-time"),
        (FREQUENCY_WEEKLY, "Weekly"),
        (FREQUENCY_MONTHLY, "Monthly"),
        (FREQUENCY_YEARLY, "Yearly"),
    ]
    
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reminders")
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default=FREQUENCY_ONCE)
    is_paid = models.BooleanField(default=False)
    email_reminder = models.BooleanField(default=True, help_text="Send email reminder before due date")
    reminder_days_before = models.PositiveIntegerField(default=1, help_text="Days before due date to send reminder")
    last_email_sent = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "-id"]

    def __str__(self):
        return f"{self.title} - ${self.amount} (Due: {self.due_date})"
    
    @property
    def is_overdue(self):
        from datetime import date
        return not self.is_paid and self.due_date < date.today()


class PasswordResetOTP(models.Model):
    """One-time password for account recovery (expires in 10 minutes)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="password_reset_otps")
    otp_code = models.CharField(max_length=6)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and timezone.now() <= self.expires_at

    def __str__(self):
        return f"OTP for {self.user.username} ({'used' if self.is_used else 'active'})"


class Group(models.Model):
    """A shared expense group."""
    name = models.CharField(max_length=200)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_groups")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class GroupMembership(models.Model):
    """A user's membership in a group."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["group", "user"]

    def __str__(self):
        return f"{self.user.username} in {self.group.name}"


class GroupExpense(models.Model):
    """An expense within a group, split equally among all members."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="expenses")
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_expenses_paid")
    date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.title} - ${self.amount} (paid by {self.paid_by.username})"


class GroupPayment(models.Model):
    """Records a manual payment between two group members to settle shared debt."""
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name="payments")
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_payments_made")
    paid_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_payments_received")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_confirmed = models.BooleanField(default=False)
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "confirmed" if self.is_confirmed else "pending"
        return f"{self.paid_by.username} → {self.paid_to.username} ${self.amount} ({status})"


class RecurringTransaction(models.Model):
    """A rule that automatically materializes Transaction rows on access."""

    FREQ_DAILY = "daily"
    FREQ_WEEKLY = "weekly"
    FREQ_BIWEEKLY = "biweekly"
    FREQ_MONTHLY = "monthly"
    FREQ_YEARLY = "yearly"

    FREQUENCY_CHOICES = [
        (FREQ_DAILY, "Daily"),
        (FREQ_WEEKLY, "Weekly"),
        (FREQ_BIWEEKLY, "Bi-weekly"),
        (FREQ_MONTHLY, "Monthly"),
        (FREQ_YEARLY, "Yearly"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recurring_transactions",
    )
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, default="")
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default=FREQ_MONTHLY)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Leave blank to repeat indefinitely")
    next_due_date = models.DateField(db_index=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["next_due_date", "-id"]

    def __str__(self):
        return f"{self.title} - ${self.amount} ({self.get_frequency_display()})"

    # ── Internal helpers ──────────────────────────────────────────────

    def _advance_date(self, dt):
        """Return the next occurrence after *dt* according to frequency."""
        deltas = {
            self.FREQ_DAILY: relativedelta(days=1),
            self.FREQ_WEEKLY: relativedelta(weeks=1),
            self.FREQ_BIWEEKLY: relativedelta(weeks=2),
            self.FREQ_MONTHLY: relativedelta(months=1),
            self.FREQ_YEARLY: relativedelta(years=1),
        }
        return dt + deltas[self.frequency]

    # ── Lazy materialisation ──────────────────────────────────────────

    @staticmethod
    def materialize_due(user):
        """
        Create Transaction rows for every recurring rule whose next_due_date
        is in the past (or today).  Safe to call on every request — it only
        writes when something is actually due.
        """
        from datetime import date

        today = date.today()

        rules = RecurringTransaction.objects.filter(
            owner=user,
            is_active=True,
            next_due_date__lte=today,
        ).select_for_update()

        created = []

        for rule in rules:
            while rule.next_due_date <= today:
                # Respect optional end-date
                if rule.end_date and rule.next_due_date > rule.end_date:
                    rule.is_active = False
                    break

                txn = Transaction.objects.create(
                    owner=user,
                    title=rule.title,
                    amount=rule.amount,
                    date=rule.next_due_date,
                    category=rule.category,
                    notes=f"Auto-generated from recurring: {rule.title}",
                )
                created.append(txn)

                rule.next_due_date = rule._advance_date(rule.next_due_date)

            rule.save()

        return created
