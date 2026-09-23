import { create } from 'zustand';
import apiClient from '../api/client';
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
        set({
          accessToken: token,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true, isAuthenticated: false });
      }
    } catch (err) {
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
    const { token, refreshToken, user } = res.data.data;

    await secureStorage.saveTokens(token, refreshToken);
    await secureStorage.saveUser(user);

    set({
      accessToken: token,
      refreshToken,
      user,
      isAuthenticated: true,
    });

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
    const { token, refreshToken, user } = res.data.data;

    await secureStorage.saveTokens(token, refreshToken);
    await secureStorage.saveUser(user);

    set({
      accessToken: token,
      refreshToken,
      user,
      isAuthenticated: true,
    });

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
      await secureStorage.clearAll();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    }
  },
}));

export default useAuthStore;
