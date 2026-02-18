import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cookie helper — sync token to both localStorage and cookie (for middleware)
function setToken(key: string, value: string) {
  localStorage.setItem(key, value);
  if (key === 'access_token') {
    document.cookie = `access_token=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  }
}

function removeToken(key: string) {
  localStorage.removeItem(key);
  if (key === 'access_token') {
    document.cookie = 'access_token=; path=/; max-age=0';
  }
}

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — auto-refresh token on 401
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        // No refresh token — force logout
        forceLogout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { access_token, refresh_token: newRefreshToken } = response.data;
        setToken('access_token', access_token);
        setToken('refresh_token', newRefreshToken);

        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

function forceLogout() {
  if (typeof window !== 'undefined') {
    removeToken('access_token');
    removeToken('refresh_token');
    localStorage.removeItem('user_email');
    window.location.href = '/login';
  }
}

// Login helper — stores tokens + email + syncs cookie
export const handleLoginSuccess = (data: { access_token: string; refresh_token: string }, email: string) => {
  setToken('access_token', data.access_token);
  setToken('refresh_token', data.refresh_token);
  localStorage.setItem('user_email', email);
};

// Logout
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout failed', error);
  } finally {
    removeToken('access_token');
    removeToken('refresh_token');
    localStorage.removeItem('user_email');
  }
};

export const expenseApi = {
  getExpenses: (params?: any) => api.get('/expenses/', { params }),
  createExpense: (data: any) => api.post('/expenses/', data),
  updateExpense: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
  getCategories: (params?: any) => api.get('/expenses/categories', { params }),
  createCategory: (name: string, type: 'income' | 'expense' = 'expense') => api.post('/expenses/categories', { name, type }),
  getMonthlySummary: () => api.get('/expenses/summary/monthly'),

  // Incomes
  getIncomes: (params?: any) => api.get('/incomes/', { params }),
  createIncome: (data: any) => api.post('/incomes/', data),
  updateIncome: (id: string, data: any) => api.put(`/incomes/${id}`, data),
  deleteIncome: (id: string) => api.delete(`/incomes/${id}`),
  getIncome: (id: string) => api.get(`/incomes/${id}`),
  exportIncomesCSV: (params?: any) => api.get('/incomes/export/csv', { params, responseType: 'blob' }),

  // Budgets
  getBudgets: (params?: any) => api.get('/budgets/', { params }),
  createBudget: (data: any) => api.post('/budgets/', data),
  getBudgetProgress: (params?: any) => api.get('/budgets/progress', { params }),
  getAnalytics: () => api.get('/expenses/analytics'),
};

export default api;
