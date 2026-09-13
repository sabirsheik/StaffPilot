import axios from 'axios';
import { TOKEN_KEY } from '../constants/roles';

const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.response = {
        data: {
          success: false,
          error: 'Unable to reach the server. Please check your connection.',
        },
      };
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('staffpilot_user');
        localStorage.removeItem('staffos_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.replace(`/login?redirect=${redirect}`);
        }
      } catch {
        // ignore storage and redirect failures
      }
    }

    return Promise.reject(error);
  }
);

export const extractErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const candidate = error as {
    response?: { data?: { error?: string; message?: string; errors?: Array<string | { msg?: string }> } | string };
    message?: string;
  };
  const data = candidate.response?.data;

  if (typeof data === 'string') return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data?.errors?.length) {
    const first = data.errors[0];
    return typeof first === 'string' ? first : first.msg || fallback;
  }

  return candidate.message || fallback;
};

export default api;