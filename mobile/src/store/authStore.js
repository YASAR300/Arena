import { create } from 'zustand';
import apiClient, { setAuthTokens, clearAuthTokens } from '../api/client';
import { queryClient } from '../api/queryClient';
import secureStorage from './secureStorage';

export { secureStorage };

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,

  // Load persisted session on app launch
  initAuth: async () => {
    try {
      const [token, refresh, user] = await Promise.all([
        secureStorage.getAccessToken(),
        secureStorage.getRefreshToken(),
        secureStorage.getUser(),
      ]);

      if (token) {
        setAuthTokens(token);
        set({
          accessToken: token,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        clearAuthTokens();
        set({ isInitialized: true, isAuthenticated: false });
      }
    } catch (err) {
      clearAuthTokens();
      set({ isInitialized: true, isAuthenticated: false });
    }
  },

  // Login
  login: async (identifier, password) => {
    const isEmail = identifier.includes('@');
    const payload = isEmail
      ? { email: identifier.trim().toLowerCase(), password }
      : { phone: identifier.trim(), password };

    const res = await apiClient.post('/auth/login', payload);
    const authData = res?.data || res;
    const token = authData?.accessToken || authData?.token;
    const refreshToken = authData?.refreshToken;
    const user = authData?.user;

    setAuthTokens(token);
    await secureStorage.saveTokens(token, refreshToken);
    await secureStorage.saveUser(user);

    set({
      accessToken: token,
      refreshToken,
      user,
      isAuthenticated: true,
    });

    // Invalidate cached competition and profile data so fresh state is fetched
    queryClient.clear();

    return user;
  },

  // Signup
  signup: async ({ name, email, phone, password }) => {
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      password,
    };

    const res = await apiClient.post('/auth/signup', payload);
    const authData = res?.data || res;
    const token = authData?.accessToken || authData?.token;
    const refreshToken = authData?.refreshToken;
    const user = authData?.user;

    setAuthTokens(token);
    await secureStorage.saveTokens(token, refreshToken);
    await secureStorage.saveUser(user);

    set({
      accessToken: token,
      refreshToken,
      user,
      isAuthenticated: true,
    });

    // Clear all previous queries to ensure no stale registered status lingers
    queryClient.clear();

    return user;
  },

  // Logout
  logout: async () => {
    try {
      const refresh = get().refreshToken;
      if (refresh) {
        await apiClient.post('/auth/logout', { refreshToken: refresh }).catch(() => {});
      }
    } finally {
      clearAuthTokens();
      await secureStorage.clearAll();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      // Invalidate queries so anonymous state is restored cleanly
      queryClient.clear();
    }
  },
}));

export default useAuthStore;
