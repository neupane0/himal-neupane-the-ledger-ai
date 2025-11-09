from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'owner', 'title', 'amount', 'date', 'category']
    list_filter = ['date', 'category']
    search_fields = ['title', 'notes', 'category']
    readonly_fields = ['date']
