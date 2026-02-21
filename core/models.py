from django.conf import settings
from django.db import models
from django.utils import timezone
from dateutil.relativedelta import relativedelta

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
