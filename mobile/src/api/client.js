import axios from 'axios';
import { Platform } from 'react-native';

/**
 * Default API host based on execution platform
 * Android Emulator uses 10.0.2.2, iOS Simulator / Web uses localhost
 */
const getDefaultBaseURL = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }
  return 'http://localhost:5000/api/v1';
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

// In-memory token storage stub (will integrate with SecureStore/AsyncStorage in auth flow)
let authToken = null;
let refreshToken = null;

export const setAuthTokens = (access, refresh) => {
  authToken = access;
  refreshToken = refresh;
};

export const clearAuthTokens = () => {
  authToken = null;
  refreshToken = null;
};

// Request Interceptor: Attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Refresh Handling Stub
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
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
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
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Token refresh endpoint stub
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const newAccessToken = refreshResponse.data.data.accessToken;
        setAuthTokens(newAccessToken, refreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthTokens();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default apiClient;
