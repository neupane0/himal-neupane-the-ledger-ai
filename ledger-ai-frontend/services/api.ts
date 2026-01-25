import axios from 'axios';

// Use the same hostname as the frontend to keep cookies same-site.
// This prevents "random" 403/unauthorized behavior when opening the frontend on
// 127.0.0.1 but calling the backend on localhost (or vice versa).
const API_HOST = (typeof window !== 'undefined' && window.location?.hostname) ? window.location.hostname : 'localhost';
const API_URL = `http://${API_HOST}:8000/api`;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies (CSRF, Session)
    headers: {
        'Content-Type': 'application/json',
    },
});

const readCookie = (name: string): string => {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return (parts.length === 2 ? parts.pop()?.split(';').shift() : '') || '';
};

// CSRF Token handling for Django
const getCsrfToken = async () => {
    try {
        const response = await api.get('/auth/csrf/');
        api.defaults.headers.common['X-CSRFToken'] = response.data.csrfToken;
    } catch (error) {
        console.error("Failed to fetch CSRF token", error);
    }
};

// Initialize CSRF token
getCsrfToken();

// Add a request interceptor to ensure CSRF token is present if needed
api.interceptors.request.use(async (config) => {
    // Ensure CSRF token is sent for unsafe methods.
    const method = (config.method || 'get').toLowerCase();
    const needsCsrf = !['get', 'head', 'options', 'trace'].includes(method);

    if (needsCsrf) {
        const token = readCookie('csrftoken');
        if (token) {
            // Axios v1 uses AxiosHeaders in many cases; support both shapes.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const headers: any = config.headers ?? {};
            if (typeof headers.set === 'function') {
                headers.set('X-CSRFToken', token);
            } else {
                headers['X-CSRFToken'] = token;
            }
            config.headers = headers;
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;

// API Functions
export const auth = {
    login: (data: any) => api.post('/auth/login/', data),
    register: (data: any) => api.post('/auth/register/', data),
    logout: () => api.post('/auth/logout/'),
    getCurrentUser: () => api.get('/auth/user/'),
};

export const transactions = {
    getAll: () => api.get('/transactions/'),
    create: (data: any) => {
        // Let Axios set the multipart boundary automatically for FormData.
        const config = data instanceof FormData ? {} : {};
        return api.post('/transactions/', data, config);
    },
    update: (id: number, data: any) => api.put(`/transactions/${id}/`, data),
    delete: (id: number) => api.delete(`/transactions/${id}/`),
    export: () => api.get('/transactions/export/', { responseType: 'blob' }),
    import: (formData: FormData) => api.post('/transactions/import/', formData, {
        // Let Axios set the multipart boundary automatically.
    }),
};

export const receipts = {
    upload: (formData: FormData) => api.post('/upload-receipt/', formData, {
        // Let Axios set the multipart boundary automatically.
    }),
};

export const incomeSources = {
    getAll: () => api.get('/income-sources/'),
    create: (data: { name: string; monthly_amount: number; active?: boolean }) => api.post('/income-sources/', data),
    update: (id: number, data: Partial<{ name: string; monthly_amount: number; active: boolean }>) => api.put(`/income-sources/${id}/`, data),
    delete: (id: number) => api.delete(`/income-sources/${id}/`),
};

export const ai = {
    forecastInsights: (spendingData: any) => api.post('/ai/forecast-insights/', { spendingData }),
    assistantHistory: () => api.get('/ai/assistant/history/'),
    assistantSend: (message: string) => api.post('/ai/assistant/send/', { message }),
};
