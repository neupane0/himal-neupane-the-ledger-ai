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
} from '../types';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

// Use the same hostname as the frontend to keep cookies same-site.
// This prevents "random" 403/unauthorized behaviour when the frontend is
// opened on 127.0.0.1 but calls the backend on localhost (or vice-versa).
const API_HOST =
  typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : 'localhost';

const API_URL = `http://${API_HOST}:8000/api`;

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

// Fetch the CSRF cookie from Django on startup so the very first unsafe
// request already has a token available.
const initCsrf = async (): Promise<void> => {
  try {
    await api.get('/auth/csrf/');
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

    // Attach the CSRF token from the cookie for every unsafe request.
    if (needsCsrf) {
      const token = readCookie('csrftoken');
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
  register:       (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> => api.post('/auth/register/', data),
  logout:         ():                      Promise<AxiosResponse<{ message: string }>> => api.post('/auth/logout/'),
  getCurrentUser: ():                      Promise<AxiosResponse<User>> => api.get('/auth/user/'),
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
  forecastInsights: (spendingData: SpendingDataPoint[]): Promise<AxiosResponse<ForecastInsightResponse>>   => api.post('/ai/forecast-insights/', { spendingData }),
  forecast:         ():                                  Promise<AxiosResponse<ForecastResponse>>           => api.get('/ai/forecast/'),
  assistantHistory: ():                                  Promise<AxiosResponse<AssistantHistoryResponse>>   => api.get('/ai/assistant/history/'),
  assistantSend:    (message: string):                   Promise<AxiosResponse<AssistantSendResponse>>      => api.post('/ai/assistant/send/', { message }),
};

export const reminders = {
  getAll:        (status?: 'pending' | 'paid' | 'overdue'): Promise<AxiosResponse<Reminder[]>>            => api.get('/reminders/', { params: status ? { status } : {} }),
  create:        (data: ReminderCreateRequest):              Promise<AxiosResponse<Reminder>>              => api.post('/reminders/', data),
  update:        (id: number, data: ReminderUpdateRequest):  Promise<AxiosResponse<Reminder>>              => api.put(`/reminders/${id}/`, data),
  delete:        (id: number):                               Promise<AxiosResponse<void>>                  => api.delete(`/reminders/${id}/`),
  togglePaid:    (id: number):                               Promise<AxiosResponse<Reminder>>              => api.post(`/reminders/${id}/toggle_paid/`),
  sendTestEmail: ():                                         Promise<AxiosResponse<{ message: string }>>   => api.post('/reminders/send_test_email/'),
};

export const recurringTransactions = {
  getAll:       ():                                                                  Promise<AxiosResponse<RecurringTransaction[]>> => api.get('/recurring-transactions/'),
  create:       (data: RecurringTransactionCreateRequest):                            Promise<AxiosResponse<RecurringTransaction>>   => api.post('/recurring-transactions/', data),
  update:       (id: number, data: RecurringTransactionUpdateRequest):                Promise<AxiosResponse<RecurringTransaction>>   => api.put(`/recurring-transactions/${id}/`, data),
  delete:       (id: number):                                                        Promise<AxiosResponse<void>>                   => api.delete(`/recurring-transactions/${id}/`),
  toggleActive: (id: number):                                                        Promise<AxiosResponse<RecurringTransaction>>   => api.post(`/recurring-transactions/${id}/toggle_active/`),
};
