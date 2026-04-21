import axios, { AxiosResponse } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Transaction,
  TransactionCreateRequest,
  TransactionUpdateRequest,
  IncomeSource,
  IncomeSourceCreateRequest,
  IncomeSourceUpdateRequest,
  Budget,
  BudgetCreateRequest,
  BudgetUpdateRequest,
  BudgetSuggestionsResponse,
  RecurringSuggestionsResponse,
  Reminder,
  ReminderCreateRequest,
  ReminderUpdateRequest,
  RecurringTransaction,
  RecurringTransactionCreateRequest,
  RecurringTransactionUpdateRequest,
  ReceiptParseResponse,
  ForecastResponse,
  ForecastInsightResponse,
  AssistantHistoryResponse,
  AssistantSendResponse,
  SpendingDataPoint,
  User,
  UserProfile,
  TwoFASetupResponse,
  TwoFAVerifyResponse,
  ChangePasswordRequest,
  ProfileUpdateRequest,
  Group,
  GroupExpense,
  GroupExpenseCreateRequest,
} from '../types';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://ledger-ai-backend-58g0.onrender.com/api');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // required for cookies (CSRF, session)
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// CSRF helpers
// ---------------------------------------------------------------------------

const readCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return (parts.length === 2 ? parts.pop()?.split(';').shift() : '') || '';
};

// In cross-origin deployments (Vercel → Render), JavaScript cannot read
// cookies set for a different domain. We store the CSRF token returned in
// the response body so the interceptor can always attach it.
let _csrfToken = '';

// Fetch the CSRF cookie from Django on startup so the very first unsafe
// request already has a token available.
const initCsrf = async (): Promise<void> => {
  try {
    const res = await api.get('/auth/csrf/');
    if (res.data?.csrfToken) {
      _csrfToken = res.data.csrfToken;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF cookie', error);
  }
};

initCsrf();

// ---------------------------------------------------------------------------
// Request interceptor
// ---------------------------------------------------------------------------

api.interceptors.request.use(
  (config) => {
    const method = (config.method ?? 'get').toLowerCase();
    const needsCsrf = !['get', 'head', 'options', 'trace'].includes(method);

    // Attach the CSRF token for every unsafe request.
    // Try reading from cookie first (works same-origin / dev),
    // then fall back to the token stored from the /auth/csrf/ response body.
    if (needsCsrf) {
      const token = readCookie('csrftoken') || _csrfToken;
      if (token) {
        config.headers.set('X-CSRFToken', token);
      }
    }

    // When sending FormData, let the browser set the multipart boundary.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.delete('Content-Type');
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Typed API modules
// ---------------------------------------------------------------------------

export default api;

export const auth = {
  login:          (data: LoginRequest):    Promise<AxiosResponse<AuthResponse>> => api.post('/auth/login/', data),
  verify2fa:      (code: string):          Promise<AxiosResponse<AuthResponse>> => api.post('/auth/verify-2fa/', { code }),
  register:       (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> => api.post('/auth/register/', data),
  logout:         ():                      Promise<AxiosResponse<{ message: string }>> => api.post('/auth/logout/'),
  getCurrentUser: ():                      Promise<AxiosResponse<{ user: UserProfile }>> => api.get('/auth/user/'),
};

export const profile = {
  get:             ():                                  Promise<AxiosResponse<UserProfile>>           => api.get('/auth/profile/'),
  update:          (data: ProfileUpdateRequest):         Promise<AxiosResponse<UserProfile>>           => api.put('/auth/profile/', data),
  changePassword:  (data: ChangePasswordRequest):        Promise<AxiosResponse<{ message: string }>>   => api.post('/auth/change-password/', data),
  setup2fa:        ():                                  Promise<AxiosResponse<TwoFASetupResponse>>     => api.post('/auth/2fa/setup/'),
  verify2fa:       (code: string):                      Promise<AxiosResponse<TwoFAVerifyResponse>>    => api.post('/auth/2fa/verify/', { code }),
  disable2fa:      (code: string):                      Promise<AxiosResponse<TwoFAVerifyResponse>>    => api.post('/auth/2fa/disable/', { code }),
};

export const transactions = {
  getAll:  ():                                              Promise<AxiosResponse<Transaction[]>> => api.get('/transactions/'),
  create:  (data: TransactionCreateRequest | FormData):     Promise<AxiosResponse<Transaction>>   => api.post('/transactions/', data),
  update:  (id: number, data: TransactionUpdateRequest):    Promise<AxiosResponse<Transaction>>   => api.put(`/transactions/${id}/`, data),
  delete:  (id: number):                                    Promise<AxiosResponse<void>>           => api.delete(`/transactions/${id}/`),
  export:  ():                                              Promise<AxiosResponse<Blob>>           => api.get('/transactions/export/', { responseType: 'blob' }),
  import:  (formData: FormData):                            Promise<AxiosResponse<{ imported: number }>> => api.post('/transactions/import/', formData),
};

export const receipts = {
  upload: (formData: FormData): Promise<AxiosResponse<ReceiptParseResponse>> => api.post('/upload-receipt/', formData),
};

export const incomeSources = {
  getAll:  ():                                                  Promise<AxiosResponse<IncomeSource[]>> => api.get('/income-sources/'),
  create:  (data: IncomeSourceCreateRequest):                   Promise<AxiosResponse<IncomeSource>>   => api.post('/income-sources/', data),
  update:  (id: number, data: IncomeSourceUpdateRequest):       Promise<AxiosResponse<IncomeSource>>   => api.put(`/income-sources/${id}/`, data),
  delete:  (id: number):                                        Promise<AxiosResponse<void>>           => api.delete(`/income-sources/${id}/`),
};

export const budgets = {
  getAll:           (month?: string): Promise<AxiosResponse<Budget[]>>                => api.get('/budgets/', { params: month ? { month } : {} }),
  create:           (data: BudgetCreateRequest):  Promise<AxiosResponse<Budget>>      => api.post('/budgets/', data),
  update:           (id: number, data: BudgetUpdateRequest): Promise<AxiosResponse<Budget>> => api.put(`/budgets/${id}/`, data),
  delete:           (id: number):   Promise<AxiosResponse<void>>                      => api.delete(`/budgets/${id}/`),
  getAISuggestions: (month?: string): Promise<AxiosResponse<BudgetSuggestionsResponse>> => api.get('/ai/budget-suggestions/', { params: month ? { month } : {} }),
};

export const ai = {
  forecastInsights:     (spendingData: SpendingDataPoint[]): Promise<AxiosResponse<ForecastInsightResponse>>     => api.post('/ai/forecast-insights/', { spendingData }),
  forecast:             ():                                  Promise<AxiosResponse<ForecastResponse>>             => api.get('/ai/forecast/'),
  assistantHistory:     ():                                  Promise<AxiosResponse<AssistantHistoryResponse>>     => api.get('/ai/assistant/history/'),
  assistantSend:        (message: string):                   Promise<AxiosResponse<AssistantSendResponse>>        => api.post('/ai/assistant/send/', { message }),
  recurringSuggestions: ():                                  Promise<AxiosResponse<RecurringSuggestionsResponse>> => api.get('/ai/recurring-suggestions/'),
};

export const reminders = {
  getAll:        (status?: 'pending' | 'paid' | 'overdue'): Promise<AxiosResponse<Reminder[]>>            => api.get('/reminders/', { params: status ? { status } : {} }),
  create:        (data: ReminderCreateRequest):              Promise<AxiosResponse<Reminder>>              => api.post('/reminders/', data),
  update:        (id: number, data: ReminderUpdateRequest):  Promise<AxiosResponse<Reminder>>              => api.put(`/reminders/${id}/`, data),
  delete:        (id: number):                               Promise<AxiosResponse<void>>                  => api.delete(`/reminders/${id}/`),
  togglePaid:    (id: number):                               Promise<AxiosResponse<Reminder>>              => api.post(`/reminders/${id}/toggle_paid/`),
  sendTestEmail: ():                                         Promise<AxiosResponse<{ message: string }>>   => api.post('/reminders/send_test_email/'),
};

export const passwordReset = {
  forgotPassword:   (email: string):                               Promise<AxiosResponse<{ message: string }>> => api.post('/auth/forgot-password/', { email }),
  verifyOtp:        (email: string, otp: string):                  Promise<AxiosResponse<{ message: string }>> => api.post('/auth/verify-reset-otp/', { email, otp }),
  resetPassword:    (email: string, otp: string, new_password: string): Promise<AxiosResponse<{ message: string }>> => api.post('/auth/reset-password/', { email, otp, new_password }),
};

export const groups = {
  getAll:              ():                                                    Promise<AxiosResponse<Group[]>>           => api.get('/groups/'),
  get:                 (id: number):                                          Promise<AxiosResponse<Group>>             => api.get(`/groups/${id}/`),
  create:              (name: string):                                        Promise<AxiosResponse<Group>>             => api.post('/groups/', { name }),
  delete:              (id: number):                                          Promise<AxiosResponse<void>>              => api.delete(`/groups/${id}/`),
  inviteMember:        (id: number, email: string):                           Promise<AxiosResponse<{ message: string }>> => api.post(`/groups/${id}/invite/`, { email }),
  addExpense:          (id: number, data: GroupExpenseCreateRequest):          Promise<AxiosResponse<GroupExpense>>      => api.post(`/groups/${id}/add-expense/`, data),
  deleteExpense:       (groupId: number, expenseId: number):                  Promise<AxiosResponse<void>>              => api.delete(`/groups/${groupId}/expenses/${expenseId}/delete/`),
  recordPayment:       (id: number, to: string, amount: number, note?: string): Promise<AxiosResponse<{ message: string; payment_id: number }>> => api.post(`/groups/${id}/record-payment/`, { to, amount, note }),
  confirmPayment:      (id: number, payment_id: number):                      Promise<AxiosResponse<{ message: string }>> => api.post(`/groups/${id}/confirm-payment/`, { payment_id }),
  requestPaymentInfo:  (id: number, username: string):                        Promise<AxiosResponse<{ message: string }>> => api.post(`/groups/${id}/request-payment-info/`, { username }),
};

export const paymentInfo = {
  update: (data: { esewa_id?: string; bank_name?: string; bank_account_number?: string }): Promise<AxiosResponse<{ message: string }>> => api.patch('/auth/payment-info/', data),
};

export const recurringTransactions = {
  getAll:       ():                                                                  Promise<AxiosResponse<RecurringTransaction[]>> => api.get('/recurring-transactions/'),
  create:       (data: RecurringTransactionCreateRequest):                            Promise<AxiosResponse<RecurringTransaction>>   => api.post('/recurring-transactions/', data),
  update:       (id: number, data: RecurringTransactionUpdateRequest):                Promise<AxiosResponse<RecurringTransaction>>   => api.put(`/recurring-transactions/${id}/`, data),
  delete:       (id: number):                                                        Promise<AxiosResponse<void>>                   => api.delete(`/recurring-transactions/${id}/`),
  toggleActive: (id: number):                                                        Promise<AxiosResponse<RecurringTransaction>>   => api.post(`/recurring-transactions/${id}/toggle_active/`),
};
