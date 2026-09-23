import axios from 'axios';
import { Platform } from 'react-native';
import secureStorage from '../store/secureStorage';
import { navigateToLoginWithReturn } from '../navigation/navigationRef';

/**
 * Default API host based on execution platform
 */
const getDefaultBaseURL = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultBaseURL();

// Axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let inMemoryAccessToken = null;

export const setAuthTokens = (access) => {
  inMemoryAccessToken = access;
};

export const clearAuthTokens = () => {
  inMemoryAccessToken = null;
};

// Request Interceptor: Attach Bearer token from memory or secure storage
apiClient.interceptors.request.use(
  async (config) => {
    let token = inMemoryAccessToken;
    if (!token) {
      token = await secureStorage.getAccessToken();
      if (token) {
        inMemoryAccessToken = token;
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh (401) with Return-to-Screen Pattern
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request has not already retried
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/signup') ||
      originalRequest?.url?.includes('/auth/refresh-token');

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await secureStorage.getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('No refresh token available');
        }

        // Silent refresh attempt with backend
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = refreshResponse.data?.data?.accessToken || refreshResponse.data?.data?.token;
        if (!newAccessToken) {
          throw new Error('Invalid refresh response from server');
        }

        inMemoryAccessToken = newAccessToken;
        await secureStorage.saveTokens(newAccessToken, storedRefreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        console.warn('[ApiClient] Silent token refresh failed. Redirecting to login:', refreshErr.message);
        processQueue(refreshErr, null);
        await secureStorage.clearAll();
        clearAuthTokens();

        // RETURN-TO-SCREEN PATTERN:
        // Automatically redirects to Login while preserving the user's current destination
        navigateToLoginWithReturn();

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default apiClient;
