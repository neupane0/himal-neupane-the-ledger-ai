// ──────────────────────────────────────────────
// Domain Models (as returned by the API)
// ──────────────────────────────────────────────

export interface Transaction {
  id: number;
  owner: string;
  title: string;
  amount: string; // Django DecimalField serialises as string
  date: string;   // "YYYY-MM-DD"
  category: string;
  notes: string;
  receipt_image: string | null;
  source?: 'Manual' | 'Voice' | 'Receipt'; // frontend-only convenience
  type?: 'expense' | 'income';             // frontend-only convenience
}

export interface IncomeSource {
  id: number;
  owner: string;
  name: string;
  monthly_amount: string; // DecimalField → string
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  owner: string;
  category: string;
  limit_amount: string; // DecimalField → string
  month: string;        // "YYYY-MM-DD"
  spent: number;        // computed by serialiser
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: number;
  owner: string;
  title: string;
  amount: string; // DecimalField → string
  due_date: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  is_paid: boolean;
  is_overdue: boolean;
  email_reminder: boolean;
  reminder_days_before: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransaction {
  id: number;
  owner: string;
  title: string;
  amount: string; // DecimalField → string
  category: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  date_joined?: string;
  is_2fa_enabled?: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  is_2fa_enabled: boolean;
  esewa_id: string;
  bank_name: string;
  bank_account_number: string;
}

export interface Group {
  id: number;
  name: string;
  member_count: number;
  expense_count?: number;
  /** Positive = you owe; negative = you are owed */
  your_balance: number;
  members?: GroupMember[];
  expenses?: GroupExpense[];
  settlements?: GroupSettlement[];
  confirmed_payments?: GroupConfirmedPayment[];
  created_at: string;
}

export interface GroupConfirmedPayment {
  id: number;
  from: string;
  to: string;
  amount: number;
  note: string;
  confirmed_at: string | null;
}

export interface GroupMember {
  id: number;
  username: string;
  email: string;
  joined_at: string;
}

export interface GroupSplitDetail {
  username: string;
  share: number;
  paid: boolean;
}

export interface GroupPaymentInfo {
  esewa_id: string;
  bank_name: string;
  bank_account_number: string;
  has_info: boolean;
}

export interface GroupSettlement {
  from: string;
  to: string;
  amount: number;
  to_payment_info: GroupPaymentInfo;
  pending_payment: { id: number; amount: number; note: string } | null;
}

export interface GroupExpense {
  id: number;
  group: number;
  title: string;
  amount: string;
  paid_by_username: string;
  date: string;
  notes: string;
  share_per_member: number;
  split_details: GroupSplitDetail[];
  created_at: string;
}

export interface GroupCreateRequest {
  name: string;
}

export interface GroupExpenseCreateRequest {
  title: string;
  amount: number;
  date: string;
  notes?: string;
}

// ──────────────────────────────────────────────
// API Request Payloads
// ──────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface TransactionCreateRequest {
  title: string;
  amount: number;
  date: string;
  category: string;
  source?: string;
}

export interface TransactionUpdateRequest {
  title?: string;
  amount?: number;
  date?: string;
  category?: string;
  notes?: string;
}

export interface IncomeSourceCreateRequest {
  name: string;
  monthly_amount: number;
  active?: boolean;
}

export interface IncomeSourceUpdateRequest {
  name?: string;
  monthly_amount?: number;
  active?: boolean;
}

export interface BudgetCreateRequest {
  category: string;
  limit_amount: number;
  month: string;
}

export interface BudgetUpdateRequest {
  category?: string;
  limit_amount?: number;
  month?: string;
}

export interface ReminderCreateRequest {
  title: string;
  amount: number;
  due_date: string;
  frequency?: string;
  email_reminder?: boolean;
  reminder_days_before?: number;
  notes?: string;
}

export interface ReminderUpdateRequest {
  title?: string;
  amount?: number;
  due_date?: string;
  frequency?: string;
  is_paid?: boolean;
  email_reminder?: boolean;
  reminder_days_before?: number;
  notes?: string;
}

export interface RecurringTransactionCreateRequest {
  title: string;
  amount: number;
  category?: string;
  frequency: string;
  start_date: string;
  end_date?: string | null;
  notes?: string;
}

export interface RecurringTransactionUpdateRequest {
  title?: string;
  amount?: number;
  category?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string;
}

// ──────────────────────────────────────────────
// API Response Payloads
// ──────────────────────────────────────────────

export interface AuthResponse {
  message: string;
  user?: User;
  requires_2fa?: boolean;
}

export interface TwoFASetupResponse {
  secret: string;
  qr_code: string;
  provisioning_uri: string;
}

export interface TwoFAVerifyResponse {
  message: string;
  is_2fa_enabled: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ProfileUpdateRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface ReceiptParseResponse {
  title: string;
  amount: number;
  date: string;
  category: string;
  date_detected: boolean;
  ollama_used?: boolean;
  ollama_date_confidence?: number;
  ollama_date_reason?: string;
}

export interface ForecastInsightResponse {
  insight: string;
  ollama_used: boolean;
}

export interface ForecastResponse {
  monthly_data: Array<{
    month: string;
    actual: number;
    predicted: number;
    predicted_lr: number;
    predicted_ema: number | null;
    label: string;
  }>;
  predictions: Array<{
    month: string;
    actual: null;
    predicted: number;
    predicted_lr: number;
    predicted_ema: number;
    predicted_mc: number;
    confidence_lower: number;
    confidence_upper: number;
    label: string;
  }>;
  category_breakdown: Array<{
    category: string;
    average_monthly: number;
    last_month: number;
    predicted_next: number;
    trend: 'up' | 'down' | 'stable';
    trend_percentage: number;
  }>;
  algorithms: {
    linear_regression: AlgorithmSummary;
    exponential_smoothing: AlgorithmSummary;
    monte_carlo: AlgorithmSummary & { confidence_range: string };
  };
  insights: {
    total_predicted_spending: number;
    avg_monthly_predicted: number;
    monthly_income: number;
    predicted_savings: number;
    trend: 'up' | 'down' | 'stable';
    trend_percentage: number;
    top_growing_category: string | null;
    top_growing_percentage: number;
    recommendation: string;
  };
}

export interface AlgorithmSummary {
  name: string;
  description: string;
  mae: number;
  weight: number;
  next_month: number;
}

export interface AssistantMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface AssistantHistoryResponse {
  conversation_id: number;
  messages: AssistantMessage[];
}

export interface AssistantSendResponse {
  reply: string;
  ollama_used: boolean;
}

export interface BudgetSuggestionsResponse {
  suggestions: Array<{
    category: string;
    suggested_limit: number;
    avg_spending: number;
    max_spending: number;
    min_spending: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trend_percentage: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    months_with_data: number;
  }>;
  summary: {
    total_suggested: number;
    months_analyzed: number;
    total_income: number | null;
    message: string;
  };
}

export interface RecurringSuggestion {
  title: string;
  amount: number;
  category: string;
  frequency: string;
  occurrences: number;
  reason: string;
}

export interface RecurringSuggestionsResponse {
  suggestions: RecurringSuggestion[];
  summary: string;
}

export interface SpendingDataPoint {
  name: string;
  amount: number;
}

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

export enum AppRoute {
  LANDING = '/',
  LOGIN = '/login',
  REGISTER = '/register',
  DASHBOARD = '/dashboard',
  ASSISTANT = '/assistant',
  TRANSACTIONS = '/transactions',
  ADD_EXPENSE = '/add-expense',
  RECEIPTS = '/receipts',
  GROUPS = '/groups',
  CREATE_GROUP = '/groups/new',
  GROUP_DETAILS = '/groups/:id',
  BUDGETS = '/budgets',
  FORECAST = '/forecast',
  REMINDERS = '/reminders',
  RECURRING = '/recurring',
  PROFILE = '/profile',
  CATEGORY_ANALYTICS = '/categories',
  FORGOT_PASSWORD = '/forgot-password',
}