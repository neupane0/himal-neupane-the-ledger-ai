import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for cookies (CSRF, Session)
    headers: {
        'Content-Type': 'application/json',
    },
});

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
    if (!config.headers['X-CSRFToken']) {
        // Optionally retry fetching CSRF token here if it's missing
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
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
        return api.post('/transactions/', data, config);
    },
    update: (id: number, data: any) => api.put(`/transactions/${id}/`, data),
    delete: (id: number) => api.delete(`/transactions/${id}/`),
    export: () => api.get('/transactions/export/', { responseType: 'blob' }),
    import: (formData: FormData) => api.post('/transactions/import/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
};

export const receipts = {
    upload: (formData: FormData) => api.post('/upload-receipt/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
};
