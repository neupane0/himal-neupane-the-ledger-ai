from rest_framework import viewsets, permissions, status
from django.db import models
import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from .models import Transaction, IncomeSource, AssistantConversation, AssistantMessage, Budget, Reminder, RecurringTransaction
from .serializers import TransactionSerializer, UserSerializer, IncomeSourceSerializer, BudgetSerializer, ReminderSerializer, RecurringTransactionSerializer

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    return Response({
        'user': UserSerializer(request.user).data
    })

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Lazy-materialise any due recurring transactions before listing
        RecurringTransaction.materialize_due(self.request.user)
        return Transaction.objects.filter(owner=self.request.user).order_by('-date', '-id')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class IncomeSourceViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return IncomeSource.objects.filter(owner=self.request.user).order_by('-id')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from datetime import date
        queryset = Budget.objects.filter(owner=self.request.user)
        
        # Filter by month if provided (format: YYYY-MM-DD)
        month_param = self.request.query_params.get('month')
        if month_param:
            try:
                month_date = date.fromisoformat(month_param)
                queryset = queryset.filter(month=month_date.replace(day=1))
            except ValueError:
                pass
        
        return queryset.order_by('-month', 'category')

    def perform_create(self, serializer):
        # Ensure month is set to first day of month
        month = serializer.validated_data.get('month')
        if month:
            serializer.validated_data['month'] = month.replace(day=1)
        serializer.save(owner=self.request.user)


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Reminder.objects.filter(owner=self.request.user)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter == 'pending':
            queryset = queryset.filter(is_paid=False)
        elif status_filter == 'paid':
            queryset = queryset.filter(is_paid=True)
        elif status_filter == 'overdue':
            from datetime import date
            queryset = queryset.filter(is_paid=False, due_date__lt=date.today())
        
        return queryset.order_by('due_date', '-id')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=['post'])
    def toggle_paid(self, request, pk=None):
        """Toggle the paid status of a reminder"""
        reminder = self.get_object()
        reminder.is_paid = not reminder.is_paid
        reminder.save()
        return Response(ReminderSerializer(reminder).data)
    
    @action(detail=False, methods=['post'])
    def send_test_email(self, request):
        """Send a test reminder email to the user"""
        from .email_service import send_reminder_email
        
        user = request.user
        success = send_reminder_email(
            to_email=user.email,
            reminder_title="Test Reminder",
            amount=100.00,
            due_date="Tomorrow",
            is_test=True
        )
        
        if success:
            return Response({'message': 'Test email sent successfully!'})
        else:
            return Response(
                {'error': 'Failed to send email. Check email configuration.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RecurringTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RecurringTransaction.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Pause or resume a recurring rule."""
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save()
        return Response(RecurringTransactionSerializer(rule).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def register(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )
    
    login(request, user)
    request.session.modified = True
    
    return Response({
        'message': 'User created successfully',
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def login_view(request):
    identifier = request.data.get('username') or request.data.get('email') or request.data.get('identifier')
    password = request.data.get('password')
    
    if not identifier or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    username = identifier
    if isinstance(identifier, str) and '@' in identifier:
        matched_user = User.objects.filter(email__iexact=identifier).only('username').first()
        if matched_user is not None:
            username = matched_user.username
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        request.session.modified = True
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def forecast_insights(request):
    """Return a short AI insight for spending trend data using local Ollama."""
    from .ai_service import _env_flag, _ollama_chat_json
    import json

    spending_data = request.data.get('spendingData')
    if spending_data is None:
        return Response({'error': 'spendingData is required'}, status=status.HTTP_400_BAD_REQUEST)

    if not _env_flag("LEDGER_AI_USE_OLLAMA", default=False):
        return Response(
            {
                'insight': 'Local AI is disabled. Set LEDGER_AI_USE_OLLAMA=true to enable insights.',
                'ollama_used': False,
            },
            status=status.HTTP_200_OK,
        )

    system = (
        "You are a personal finance assistant. "
        "Given daily expense totals for the current month, write ONE short insight in <= 2 sentences. "
        "Be specific but avoid assumptions about income. "
        "Return ONLY strict JSON with key: insight (string)."
    )
    user = {
        "spending_trend": spending_data,
        "output_schema": {"insight": "string"},
    }

    result = _ollama_chat_json(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
        ]
    )

    if not isinstance(result, dict) or not isinstance(result.get('insight'), str) or not result.get('insight').strip():
        return Response(
            {
                'insight': 'Unable to generate insights at this time.',
                'ollama_used': True,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            'insight': result['insight'].strip(),
            'ollama_used': True,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def financial_forecast(request):
    """
    Generate financial forecast using three ML/statistical algorithms:
      1. Linear Regression with seasonality adjustment
      2. Holt's Double Exponential Smoothing (level + trend)
      3. Monte Carlo Simulation (probabilistic with confidence bands)
    Returns an ensemble prediction (weighted average) plus per-algorithm detail.
    """
    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta
    from collections import defaultdict
    import statistics
    import random
    import math

    user = request.user
    transactions = Transaction.objects.filter(owner=user).order_by('date')
    income_sources = IncomeSource.objects.filter(owner=user, active=True)

    # ── Empty-data early returns ──────────────────────────────────────────
    if not transactions.exists():
        return Response({
            'monthly_data': [],
            'predictions': [],
            'category_breakdown': [],
            'algorithms': {},
            'insights': {
                'total_predicted_spending': 0,
                'predicted_savings': 0,
                'trend': 'neutral',
                'trend_percentage': 0,
                'top_growing_category': None,
                'recommendation': 'Start tracking your expenses to get personalized predictions.'
            }
        })

    today = date.today()

    # ── Aggregate spending by month ───────────────────────────────────────
    monthly_spending = defaultdict(lambda: {'total': 0, 'categories': defaultdict(float)})

    for txn in transactions:
        if txn.category and txn.category.lower() == 'income':
            continue
        month_key = txn.date.strftime('%Y-%m')
        amount = float(txn.amount)
        monthly_spending[month_key]['total'] += amount
        monthly_spending[month_key]['categories'][txn.category or 'Uncategorized'] += amount

    sorted_months = sorted(monthly_spending.keys())

    if len(sorted_months) < 2:
        current_month = today.strftime('%Y-%m')
        current_spending = monthly_spending.get(current_month, {'total': 0})['total']
        return Response({
            'monthly_data': [{
                'month': current_month,
                'actual': current_spending,
                'predicted': None,
                'predicted_lr': None,
                'predicted_ema': None,
                'predicted_mc': None,
                'label': today.strftime('%b %Y')
            }],
            'predictions': [],
            'category_breakdown': [],
            'algorithms': {},
            'insights': {
                'total_predicted_spending': current_spending,
                'predicted_savings': 0,
                'trend': 'neutral',
                'trend_percentage': 0,
                'top_growing_category': None,
                'recommendation': 'Keep tracking your expenses for at least 2 months to get accurate predictions.'
            }
        })

    x_values = list(range(len(sorted_months)))
    y_values = [monthly_spending[m]['total'] for m in sorted_months]

    # ══════════════════════════════════════════════════════════════════════
    # ALGORITHM 1 — Linear Regression + Seasonality
    # ══════════════════════════════════════════════════════════════════════

    def linear_regression(x_vals, y_vals):
        n = len(x_vals)
        if n < 2:
            return 0, y_vals[0] if y_vals else 0
        mean_x = sum(x_vals) / n
        mean_y = sum(y_vals) / n
        numerator = sum((x_vals[i] - mean_x) * (y_vals[i] - mean_y) for i in range(n))
        denominator = sum((x_vals[i] - mean_x) ** 2 for i in range(n))
        if denominator == 0:
            return 0, mean_y
        slope = numerator / denominator
        intercept = mean_y - slope * mean_x
        return slope, intercept

    slope, intercept = linear_regression(x_values, y_values)

    # Seasonality indices
    monthly_averages = defaultdict(list)
    for month_key in sorted_months:
        month_num = int(month_key.split('-')[1])
        monthly_averages[month_num].append(monthly_spending[month_key]['total'])
    overall_avg = sum(y_values) / len(y_values) if y_values else 0
    seasonality = {}
    for month_num, values in monthly_averages.items():
        avg = sum(values) / len(values)
        seasonality[month_num] = avg / overall_avg if overall_avg > 0 else 1.0

    # Fitted values (historical)
    lr_fitted = [round(slope * i + intercept, 2) for i in x_values]

    # Future values
    last_index = len(sorted_months) - 1
    lr_predictions = []
    for i in range(1, 7):
        future_index = last_index + i
        future_date = today + relativedelta(months=i)
        base = slope * future_index + intercept
        seasonal_factor = seasonality.get(future_date.month, 1.0)
        lr_predictions.append(round(max(0, base * seasonal_factor), 2))

    # ══════════════════════════════════════════════════════════════════════
    # ALGORITHM 2 — Holt's Double Exponential Smoothing
    # ══════════════════════════════════════════════════════════════════════

    def holts_double_exponential(y_vals, alpha=0.3, beta=0.1):
        """
        Holt's method captures level + trend.
        Returns (fitted_values, level, trend) so we can extrapolate.
        """
        n = len(y_vals)
        if n == 0:
            return [], 0, 0
        if n == 1:
            return [y_vals[0]], y_vals[0], 0

        # Initialise: level = first observation, trend = second − first
        level = y_vals[0]
        trend = y_vals[1] - y_vals[0]
        fitted = [level]  # first fitted value

        for t in range(1, n):
            prev_level = level
            level = alpha * y_vals[t] + (1 - alpha) * (prev_level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend
            fitted.append(round(level + trend, 2))

        return fitted, level, trend

    ema_fitted, ema_level, ema_trend = holts_double_exponential(y_values)
    ema_predictions = [round(max(0, ema_level + ema_trend * k), 2) for k in range(1, 7)]

    # ══════════════════════════════════════════════════════════════════════
    # ALGORITHM 3 — Monte Carlo Simulation
    # ══════════════════════════════════════════════════════════════════════

    def monte_carlo_forecast(y_vals, n_months=6, n_simulations=2000):
        """
        Simulate future paths based on the historical distribution of
        month-over-month *percentage* changes.  Returns median predictions
        plus P10/P90 confidence bands.
        """
        if len(y_vals) < 2:
            last = y_vals[-1] if y_vals else 0
            return [last] * n_months, [last] * n_months, [last] * n_months

        # Month-over-month percentage changes
        pct_changes = []
        for i in range(1, len(y_vals)):
            if y_vals[i - 1] > 0:
                pct_changes.append((y_vals[i] - y_vals[i - 1]) / y_vals[i - 1])
            else:
                pct_changes.append(0.0)

        mean_change = sum(pct_changes) / len(pct_changes)
        if len(pct_changes) > 1:
            std_change = (sum((c - mean_change) ** 2 for c in pct_changes) / (len(pct_changes) - 1)) ** 0.5
        else:
            std_change = abs(mean_change) * 0.2  # fallback

        random.seed(42)  # reproducible
        simulated_paths = []
        last_val = y_vals[-1]

        for _ in range(n_simulations):
            path = []
            val = last_val
            for _ in range(n_months):
                change = random.gauss(mean_change, std_change)
                val = max(0, val * (1 + change))
                path.append(val)
            simulated_paths.append(path)

        # Extract percentiles per month
        p10, p50, p90 = [], [], []
        for month_idx in range(n_months):
            month_vals = sorted(sp[month_idx] for sp in simulated_paths)
            p10.append(round(month_vals[int(n_simulations * 0.10)], 2))
            p50.append(round(month_vals[int(n_simulations * 0.50)], 2))
            p90.append(round(month_vals[int(n_simulations * 0.90)], 2))

        return p50, p10, p90

    mc_median, mc_lower, mc_upper = monte_carlo_forecast(y_values)

    # For fitted (historical), Monte Carlo doesn't have fitted values;
    # use the last actual as the starting point for each
    mc_fitted = [round(v, 2) for v in y_values]  # actuals (no fitted concept)

    # ══════════════════════════════════════════════════════════════════════
    # ENSEMBLE — weighted average of the three algorithms
    # ══════════════════════════════════════════════════════════════════════

    # Compute MAE for each algorithm on historical data to weight them
    def _mae(fitted, actuals):
        errors = [abs(f - a) for f, a in zip(fitted, actuals) if f is not None]
        return sum(errors) / len(errors) if errors else 1.0

    mae_lr = _mae(lr_fitted, y_values) or 1.0
    mae_ema = _mae(ema_fitted, y_values) or 1.0
    mae_mc = _mae(mc_fitted, y_values) or 1.0  # will be 0 (uses actuals), cap it

    # Inverse-MAE weighting (lower error = higher weight)
    # Add small epsilon to avoid div-by-zero when mc_fitted == actuals
    eps = 0.01
    inv_lr = 1.0 / (mae_lr + eps)
    inv_ema = 1.0 / (mae_ema + eps)
    inv_mc = 1.0 / (mae_mc + eps)
    total_inv = inv_lr + inv_ema + inv_mc
    w_lr = inv_lr / total_inv
    w_ema = inv_ema / total_inv
    w_mc = inv_mc / total_inv

    ensemble_predictions = []
    for i in range(6):
        val = w_lr * lr_predictions[i] + w_ema * ema_predictions[i] + w_mc * mc_median[i]
        ensemble_predictions.append(round(max(0, val), 2))

    # ══════════════════════════════════════════════════════════════════════
    # Build response
    # ══════════════════════════════════════════════════════════════════════

    # Historical monthly data
    monthly_data = []
    for i, month_key in enumerate(sorted_months):
        month_date = date.fromisoformat(f"{month_key}-01")
        monthly_data.append({
            'month': month_key,
            'actual': round(monthly_spending[month_key]['total'], 2),
            'predicted': lr_fitted[i],
            'predicted_lr': lr_fitted[i],
            'predicted_ema': ema_fitted[i] if i < len(ema_fitted) else None,
            'label': month_date.strftime('%b %Y')
        })

    # Future predictions
    predictions = []
    for i in range(6):
        future_date = today + relativedelta(months=i + 1)
        predictions.append({
            'month': future_date.strftime('%Y-%m'),
            'actual': None,
            'predicted': ensemble_predictions[i],
            'predicted_lr': lr_predictions[i],
            'predicted_ema': ema_predictions[i],
            'predicted_mc': mc_median[i],
            'confidence_lower': mc_lower[i],
            'confidence_upper': mc_upper[i],
            'label': future_date.strftime('%b %Y')
        })

    # Category breakdown (uses linear regression per-category as before)
    category_totals = defaultdict(list)
    for month_key in sorted_months:
        for category, amount in monthly_spending[month_key]['categories'].items():
            category_totals[category].append(amount)

    category_breakdown = []
    category_trends = {}

    for category, values in category_totals.items():
        avg_spending = sum(values) / len(values)
        if len(values) >= 2:
            cat_x = list(range(len(values)))
            cat_slope, _ = linear_regression(cat_x, values)
            trend_pct = (cat_slope / avg_spending * 100) if avg_spending > 0 else 0
        else:
            trend_pct = 0
        category_trends[category] = trend_pct
        next_month_prediction = avg_spending * (1 + trend_pct / 100) if trend_pct else avg_spending

        category_breakdown.append({
            'category': category,
            'average_monthly': round(avg_spending, 2),
            'last_month': round(values[-1], 2) if values else 0,
            'predicted_next': round(max(0, next_month_prediction), 2),
            'trend': 'up' if trend_pct > 5 else ('down' if trend_pct < -5 else 'stable'),
            'trend_percentage': round(trend_pct, 1)
        })
    category_breakdown.sort(key=lambda x: x['average_monthly'], reverse=True)

    # Insights
    total_predicted_6mo = sum(ensemble_predictions)
    avg_predicted_monthly = total_predicted_6mo / 6 if predictions else 0
    monthly_income = sum(float(src.monthly_amount) for src in income_sources)
    predicted_monthly_savings = monthly_income - avg_predicted_monthly if monthly_income > 0 else 0

    if len(y_values) >= 2:
        recent_avg = sum(y_values[-3:]) / min(3, len(y_values))
        older_avg = sum(y_values[:-3]) / max(1, len(y_values) - 3) if len(y_values) > 3 else y_values[0]
        trend_pct = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
    else:
        trend_pct = 0

    trend = 'up' if trend_pct > 5 else ('down' if trend_pct < -5 else 'stable')
    top_growing = max(category_trends.items(), key=lambda x: x[1]) if category_trends else (None, 0)

    if trend == 'up' and trend_pct > 15:
        recommendation = f"Your spending is increasing by {abs(trend_pct):.1f}% monthly. Consider reviewing your {category_breakdown[0]['category'] if category_breakdown else 'largest expense'} spending."
    elif trend == 'down':
        recommendation = f"Great job! Your spending is decreasing by {abs(trend_pct):.1f}%. Keep up the good financial habits."
    elif predicted_monthly_savings < 0:
        recommendation = f"You're projected to spend ${abs(predicted_monthly_savings):.0f} more than your income. Consider setting budgets for high-spending categories."
    elif top_growing[1] > 20:
        recommendation = f"Your {top_growing[0]} spending is growing rapidly ({top_growing[1]:.1f}%/month). Consider setting a budget limit."
    else:
        recommendation = "Your spending is stable. Consider automating savings transfers to build your emergency fund."

    # Algorithm summary
    algorithms = {
        'linear_regression': {
            'name': 'Linear Regression',
            'description': 'Fits a straight-line trend to your spending history with seasonal adjustment.',
            'mae': round(mae_lr, 2),
            'weight': round(w_lr * 100, 1),
            'next_month': lr_predictions[0],
        },
        'exponential_smoothing': {
            'name': 'Exponential Smoothing',
            'description': "Holt's method that adapts to recent level and trend changes faster than linear regression.",
            'mae': round(mae_ema, 2),
            'weight': round(w_ema * 100, 1),
            'next_month': ema_predictions[0],
        },
        'monte_carlo': {
            'name': 'Monte Carlo',
            'description': 'Runs 2,000 random simulations based on your historical spending volatility. Provides confidence bands.',
            'mae': round(mae_mc, 2),
            'weight': round(w_mc * 100, 1),
            'next_month': mc_median[0],
            'confidence_range': f"${mc_lower[0]} – ${mc_upper[0]}",
        },
    }

    return Response({
        'monthly_data': monthly_data,
        'predictions': predictions,
        'category_breakdown': category_breakdown[:8],
        'algorithms': algorithms,
        'insights': {
            'total_predicted_spending': round(total_predicted_6mo, 2),
            'avg_monthly_predicted': round(avg_predicted_monthly, 2),
            'monthly_income': round(monthly_income, 2),
            'predicted_savings': round(predicted_monthly_savings, 2),
            'trend': trend,
            'trend_percentage': round(trend_pct, 1),
            'top_growing_category': top_growing[0] if top_growing[1] > 5 else None,
            'top_growing_percentage': round(top_growing[1], 1) if top_growing[1] > 5 else 0,
            'recommendation': recommendation
        }
    })


def _get_default_conversation(user: User) -> AssistantConversation:
    convo = AssistantConversation.objects.filter(owner=user).order_by('-updated_at', '-id').first()
    if convo:
        return convo
    return AssistantConversation.objects.create(owner=user, title="")


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def assistant_history(request):
    convo = _get_default_conversation(request.user)
    messages = convo.messages.all().order_by('created_at', 'id')
    return Response(
        {
            'conversation_id': convo.id,
            'messages': [
                {
                    'id': m.id,
                    'role': m.role,
                    'content': m.content,
                    'created_at': m.created_at,
                }
                for m in messages
            ],
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def assistant_send(request):
    """Send a message to the assistant, store history, and return assistant reply."""
    from .ai_service import _env_flag, _ollama_chat_json
    import json

    text = request.data.get('message')
    if not isinstance(text, str) or not text.strip():
        return Response({'error': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)

    text = text.strip()
    if len(text) > 3000:
        return Response({'error': 'message is too long (max 3000 chars)'}, status=status.HTTP_400_BAD_REQUEST)

    convo = _get_default_conversation(request.user)

    # Store user message first
    AssistantMessage.objects.create(conversation=convo, role=AssistantMessage.ROLE_USER, content=text)

    if not _env_flag("LEDGER_AI_USE_OLLAMA", default=False):
        AssistantMessage.objects.create(
            conversation=convo,
            role=AssistantMessage.ROLE_ASSISTANT,
            content="Local AI is disabled. Set LEDGER_AI_USE_OLLAMA=true to enable the assistant.",
        )
        convo.save(update_fields=['updated_at'])
        return Response(
            {
                'reply': 'Local AI is disabled. Set LEDGER_AI_USE_OLLAMA=true to enable the assistant.',
                'ollama_used': False,
            },
            status=status.HTTP_200_OK,
        )

    # Build context from last N messages
    history = list(convo.messages.all().order_by('-created_at', '-id')[:20])
    history.reverse()
    chat_messages = [
        {
            'role': 'system',
            'content': (
                'You are Ledger AI Assistant. Help the user understand their finances and app usage. '
                'Be concise and practical. If you are unsure, ask a clarifying question. '
                'Return ONLY strict JSON: {"reply": "..."}.'
            ),
        }
    ]

    for m in history:
        # Only forward user/assistant roles to Ollama.
        if m.role == AssistantMessage.ROLE_USER:
            chat_messages.append({'role': 'user', 'content': m.content})
        elif m.role == AssistantMessage.ROLE_ASSISTANT:
            chat_messages.append({'role': 'assistant', 'content': m.content})

    result = _ollama_chat_json(chat_messages)
    reply = None
    if isinstance(result, dict) and isinstance(result.get('reply'), str):
        reply = result.get('reply').strip()

    if not reply:
        reply = 'Sorry — I could not generate a reply right now.'

    AssistantMessage.objects.create(conversation=convo, role=AssistantMessage.ROLE_ASSISTANT, content=reply)
    convo.save(update_fields=['updated_at'])

    return Response(
        {
            'reply': reply,
            'ollama_used': True,
        },
        status=status.HTTP_200_OK,
    )

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import re
from datetime import datetime
import os
import platform

# Set Tesseract path explicitly for Windows if not in PATH
if platform.system() == 'Windows':
    # Common default installation path
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

class ReceiptUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.data:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.data['file']
        
        try:
            image = Image.open(image_file)
            
            # Preprocess image for better OCR results
            image = self.preprocess_image(image)
            
            # Attempt to extract text with custom config
            custom_config = r'--oem 3 --psm 6'  # LSTM OCR Engine, Assume uniform block of text
            text = pytesseract.image_to_string(image, config=custom_config)
            
            # Log extracted text for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"OCR Extracted Text:\n{text}\n{'='*50}")
            
            parsed_data = self.parse_receipt_text(text)
            
            # Additional logging for debugging
            logger.info(f"Parsed Data: {parsed_data}")
            
            # Return both parsed data and raw text for debugging
            parsed_data['raw_text'] = text[:500]  # First 500 chars
            
            return Response(parsed_data, status=status.HTTP_200_OK)
        except Exception as e:
            # Log full traceback for debugging
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Receipt upload error: {str(e)}")
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            
            # Check if it's a Tesseract not found error
            if "tesseract is not installed" in str(e).lower() or "not found" in str(e).lower():
                 return Response(
                    {'error': 'Tesseract OCR is not installed or not in PATH. Please install it.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def preprocess_image(self, image):
        """Preprocess image to improve OCR accuracy"""
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too small (improves OCR)
        width, height = image.size
        if width < 800 or height < 800:
            scale = max(800 / width, 800 / height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to grayscale
        image = image.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Sharpen image
        image = image.filter(ImageFilter.SHARPEN)
        
        return image

    def parse_receipt_text(self, text):
        """Use AI service for intelligent receipt parsing"""
        from .ai_service import parse_receipt_text
        return parse_receipt_text(text)

class ExportTransactionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'

        writer = csv.writer(response)
        writer.writerow(['Title', 'Amount', 'Date', 'Category', 'Notes'])

        transactions = Transaction.objects.filter(owner=request.user).order_by('-date', '-id')
        for tx in transactions:
            writer.writerow([tx.title, tx.amount, tx.date, tx.category, tx.notes])

        return response

class ImportTransactionsView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.data:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        csv_file = request.data['file']
        
        if not csv_file.name.endswith('.csv'):
             return Response({'error': 'File is not a CSV'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = csv_file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded_file)
            
            transactions_to_create = []
            for row in reader:
                # Check for required fields
                if not all(k in row for k in ('Title', 'Amount', 'Date')):
                    continue 
                
                try:
                    amount = float(row['Amount'])
                    date = row['Date'] 
                    
                    transactions_to_create.append(Transaction(
                        owner=request.user,
                        title=row['Title'],
                        amount=amount,
                        date=date,
                        category=row.get('Category', ''),
                        notes=row.get('Notes', '')
                    ))
                except ValueError:
                    continue 
            
            if transactions_to_create:
                Transaction.objects.bulk_create(transactions_to_create)
                
            return Response({'message': f'Successfully imported {len(transactions_to_create)} transactions'}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Category Management Views
class CategoryListView(APIView):
    """Returns list of all available categories"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from .constants import TRANSACTION_CATEGORIES
        return Response({'categories': TRANSACTION_CATEGORIES}, status=status.HTTP_200_OK)

class CategoryStatsView(APIView):
    """Returns spending statistics by category for the authenticated user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from django.db.models import Sum, Count
        from decimal import Decimal
        
        # Get transactions grouped by category
        stats = Transaction.objects.filter(owner=request.user).exclude(
            category__iexact='Income'
        ).values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Calculate total spending
        total_spending = sum(item['total'] or Decimal(0) for item in stats)
        
        # Add percentage to each category
        result = []
        for item in stats:
            category = item['category'] or 'Uncategorized'
            total = float(item['total'] or 0)
            percentage = (total / float(total_spending) * 100) if total_spending > 0 else 0
            
            result.append({
                'category': category,
                'total': total,
                'count': item['count'],
                'percentage': round(percentage, 2)
            })
        
        return Response({
            'stats': result,
            'total_spending': float(total_spending)
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class BulkCategorizeView(APIView):
    """Re-categorize all or selected transactions using keyword matching"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        transaction_ids = request.data.get('transaction_ids', [])
        
        # Get transactions to categorize
        if transaction_ids:
            transactions_to_update = Transaction.objects.filter(
                owner=request.user,
                id__in=transaction_ids
            )
        else:
            # Re-categorize all transactions with empty or 'Other' category
            transactions_to_update = Transaction.objects.filter(
                owner=request.user
            ).filter(
                models.Q(category='') | models.Q(category='Other') | models.Q(category='Uncategorized') | models.Q(category__isnull=True)
            )
        
        from .constants import CATEGORY_KEYWORDS
        total_checked = transactions_to_update.count()
        updated_count = 0
        
        for transaction in transactions_to_update:
            # Use the same categorization logic from receipt parsing
            text = f"{transaction.title} {transaction.notes or ''}"
            text_lower = text.lower()
            
            categorized = False
            for category, keywords in CATEGORY_KEYWORDS.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        transaction.category = category
                        transaction.save()
                        updated_count += 1
                        categorized = True
                        break
                if categorized:
                    break
        
        return Response({
            'message': f'Successfully categorized {updated_count} out of {total_checked} transactions',
            'total_checked': total_checked,
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)


# AI-powered endpoints
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def categorize_with_ai(request):
    """
    Categorize transaction text using FinBERT + keyword matching
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .ai_service import categorize_transaction_ai
        category = categorize_transaction_ai(text)
        return Response({'category': category}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def parse_voice_input(request):
    """
    Parse voice transcript to extract transaction details
    """
    transcript = request.data.get('transcript', '')
    
    if not transcript:
        return Response({'error': 'Transcript is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .ai_service import parse_voice_input as parse_voice
        result = parse_voice(transcript)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # Allow for testing
def debug_ocr_text(request):
    """
    Debug endpoint to test OCR parsing with raw text
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .ai_service import parse_receipt_text, _extract_amount_regex, _extract_date_regex
        
        # Parse the text
        result = parse_receipt_text(text)
        
        # Also show individual extractions for debugging
        debug_info = {
            'parsed_result': result,
            'debug': {
                'amount_found': _extract_amount_regex(text),
                'date_found': _extract_date_regex(text),
                'text_length': len(text),
                'text_preview': text[:200]
            }
        }
        
        return Response(debug_info, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def ai_budget_suggestions(request):
    """
    AI-assisted budget suggestions based on spending history.
    Analyzes past 3-6 months of transactions to recommend budget limits
    per category using statistical analysis and trend detection.
    """
    from datetime import date, timedelta
    from dateutil.relativedelta import relativedelta
    from collections import defaultdict
    import statistics as stats_module

    user = request.user
    today = date.today()

    # Target month for suggestions (query param or current month)
    target_param = request.query_params.get('month')
    if target_param:
        try:
            target_month = date.fromisoformat(target_param).replace(day=1)
        except ValueError:
            target_month = today.replace(day=1)
    else:
        target_month = today.replace(day=1)

    # Look back 6 months for spending history
    lookback_start = target_month - relativedelta(months=6)

    transactions = Transaction.objects.filter(
        owner=user,
        date__gte=lookback_start,
        date__lt=target_month,
    ).exclude(category__iexact='Income').order_by('date')

    if not transactions.exists():
        return Response({
            'suggestions': [],
            'summary': {
                'total_suggested': 0,
                'months_analyzed': 0,
                'message': 'Not enough spending history to generate suggestions. Track expenses for at least 1 month.'
            }
        })

    # Aggregate spending by category and month
    category_monthly = defaultdict(lambda: defaultdict(float))
    all_months = set()

    for txn in transactions:
        cat = txn.category or 'Other'
        month_key = txn.date.strftime('%Y-%m')
        category_monthly[cat][month_key] += float(txn.amount)
        all_months.add(month_key)

    sorted_months = sorted(all_months)
    months_analyzed = len(sorted_months)

    # Get existing budgets for target month to exclude them
    existing_budgets = set(
        Budget.objects.filter(owner=user, month=target_month)
        .values_list('category', flat=True)
    )

    suggestions = []

    for category, monthly_data in category_monthly.items():
        # Skip if budget already exists for this category/month
        if category in existing_budgets:
            continue

        monthly_amounts = [monthly_data.get(m, 0) for m in sorted_months]
        # Only consider months with actual spending
        nonzero_amounts = [a for a in monthly_amounts if a > 0]

        if not nonzero_amounts:
            continue

        avg_spending = sum(nonzero_amounts) / len(nonzero_amounts)
        max_spending = max(nonzero_amounts)
        min_spending = min(nonzero_amounts)

        # Trend detection using simple linear regression on nonzero months
        trend = 'stable'
        trend_pct = 0.0
        if len(nonzero_amounts) >= 2:
            x_vals = list(range(len(monthly_amounts)))
            y_vals = monthly_amounts

            # Simple linear regression
            n = len(x_vals)
            mean_x = sum(x_vals) / n
            mean_y = sum(y_vals) / n
            num = sum((x_vals[i] - mean_x) * (y_vals[i] - mean_y) for i in range(n))
            den = sum((x_vals[i] - mean_x) ** 2 for i in range(n))
            slope = num / den if den != 0 else 0

            if avg_spending > 0:
                trend_pct = (slope / avg_spending) * 100
                if trend_pct > 10:
                    trend = 'increasing'
                elif trend_pct < -10:
                    trend = 'decreasing'

        # Calculate suggested limit with smart buffer
        if trend == 'increasing':
            # Growing category: use recent average + 15% buffer
            recent = nonzero_amounts[-min(3, len(nonzero_amounts)):]
            recent_avg = sum(recent) / len(recent)
            suggested = recent_avg * 1.15
            reasoning = f"Spending is trending up ({trend_pct:+.0f}%). Suggested limit is based on recent 3-month average (${recent_avg:.0f}) plus a 15% buffer."
        elif trend == 'decreasing':
            # Declining category: use average with smaller buffer
            suggested = avg_spending * 1.05
            reasoning = f"Spending is trending down ({trend_pct:+.0f}%). Suggested limit matches your average spending with a small 5% buffer to stay on track."
        else:
            # Stable: use average + 10% buffer
            suggested = avg_spending * 1.10
            reasoning = f"Spending is stable across months. Suggested limit is your average (${avg_spending:.0f}) plus a 10% buffer for flexibility."

        # Round to nearest $5 for cleanliness
        suggested = round(suggested / 5) * 5
        suggested = max(suggested, 10)  # Minimum $10

        # Volatility indicator
        if len(nonzero_amounts) >= 2:
            std_dev = stats_module.stdev(nonzero_amounts)
            volatility = std_dev / avg_spending if avg_spending > 0 else 0
            if volatility > 0.5:
                confidence = 'low'
                reasoning += " Note: spending in this category varies a lot month to month."
            elif volatility > 0.25:
                confidence = 'medium'
            else:
                confidence = 'high'
        else:
            confidence = 'low'
            reasoning += " Limited data available (only 1 month)."

        suggestions.append({
            'category': category,
            'suggested_limit': suggested,
            'avg_spending': round(avg_spending, 2),
            'max_spending': round(max_spending, 2),
            'min_spending': round(min_spending, 2),
            'trend': trend,
            'trend_percentage': round(trend_pct, 1),
            'confidence': confidence,
            'reasoning': reasoning,
            'months_with_data': len(nonzero_amounts),
        })

    # Sort by average spending descending (highest categories first)
    suggestions.sort(key=lambda s: s['avg_spending'], reverse=True)

    total_suggested = sum(s['suggested_limit'] for s in suggestions)

    # Overall recommendation
    income_sources = IncomeSource.objects.filter(owner=user, active=True)
    total_income = sum(float(inc.monthly_amount) for inc in income_sources)

    if total_income > 0:
        budget_ratio = total_suggested / total_income
        if budget_ratio > 0.9:
            overall_msg = f"Your suggested budgets total ${total_suggested:.0f}, which is {budget_ratio*100:.0f}% of your monthly income (${total_income:.0f}). Consider reducing some limits to build savings."
        elif budget_ratio > 0.7:
            overall_msg = f"Your suggested budgets total ${total_suggested:.0f} ({budget_ratio*100:.0f}% of income). This leaves room for savings and unexpected expenses."
        else:
            overall_msg = f"Your suggested budgets total ${total_suggested:.0f} ({budget_ratio*100:.0f}% of income). Great — you have healthy headroom for savings!"
    else:
        overall_msg = f"Total suggested budget: ${total_suggested:.0f}. Add your income sources for better budget-to-income analysis."

    return Response({
        'suggestions': suggestions,
        'summary': {
            'total_suggested': total_suggested,
            'months_analyzed': months_analyzed,
            'total_income': total_income if total_income > 0 else None,
            'message': overall_msg,
        }
    })
