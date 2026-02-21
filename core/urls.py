from rest_framework import routers
from django.urls import path
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from .views import (
    TransactionViewSet,
    IncomeSourceViewSet,
    BudgetViewSet,
    ReminderViewSet,
    RecurringTransactionViewSet,
    register,
    login_view,
    logout_view,
    current_user,
    ReceiptUploadView,
    ExportTransactionsView,
    ImportTransactionsView,
    CategoryListView,
    CategoryStatsView,
    BulkCategorizeView,
    categorize_with_ai,
    parse_voice_input,
    forecast_insights,
    financial_forecast,
    assistant_history,
    assistant_send,
    debug_ocr_text,
    ai_budget_suggestions
)

router = routers.DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'income-sources', IncomeSourceViewSet, basename='income-source')
router.register(r'budgets', BudgetViewSet, basename='budget')
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'recurring-transactions', RecurringTransactionViewSet, basename='recurring-transaction')

@require_http_methods(['GET'])
@ensure_csrf_cookie
def get_csrf_token(request):
    from django.middleware.csrf import get_token
    token = get_token(request)
    return JsonResponse({'csrfToken': token})

urlpatterns = [
    path('auth/csrf/', get_csrf_token, name='csrf_token'),
    path('auth/register/', register, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/user/', current_user, name='current_user'),
    path('upload-receipt/', ReceiptUploadView.as_view(), name='upload_receipt'),
    path('transactions/export/', ExportTransactionsView.as_view(), name='export_transactions'),
    path('transactions/import/', ImportTransactionsView.as_view(), name='import_transactions'),
    path('categories/', CategoryListView.as_view(), name='category_list'),
    path('categories/stats/', CategoryStatsView.as_view(), name='category_stats'),
    path('transactions/bulk-categorize/', BulkCategorizeView.as_view(), name='bulk_categorize'),
    path('ai/categorize/', categorize_with_ai, name='categorize_ai'),
    path('ai/parse-voice/', parse_voice_input, name='parse_voice'),
    path('ai/forecast-insights/', forecast_insights, name='forecast_insights'),
    path('ai/forecast/', financial_forecast, name='financial_forecast'),
    path('ai/assistant/history/', assistant_history, name='assistant_history'),
    path('ai/assistant/send/', assistant_send, name='assistant_send'),
    path('debug/ocr/', debug_ocr_text, name='debug_ocr'),  # Debug endpoint
    path('ai/budget-suggestions/', ai_budget_suggestions, name='ai_budget_suggestions'),
] + router.urls
