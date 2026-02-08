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

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface UserProfile {
  username: string;
  email: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  members: number;
  owe: number;
  owed: number;
}

export interface GroupMember {
  name: string;
  email: string;
  avatar?: string;
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

// ──────────────────────────────────────────────
// API Response Payloads
// ──────────────────────────────────────────────

export interface AuthResponse {
  message: string;
  user: User;
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
    label: string;
  }>;
  predictions: Array<{
    month: string;
    actual: null;
    predicted: number;
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
    suggested_amount: number;
    reason: string;
  }>;
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
  PROFILE = '/profile',
  CATEGORY_ANALYTICS = '/categories',
}