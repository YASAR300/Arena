import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ARCHITECTURAL DECISION — Token Storage & Keychain Trade-off:
 * ─────────────────────────────────────────────────────────────
 * In production banking / contest applications, `react-native-keychain` (or `expo-secure-store`)
 * is strictly preferred over AsyncStorage. Hardware-backed Keystores (Android TEE / iOS Secure Enclave)
 * encrypt tokens at rest with AES-256 and protect against device-level inspection, backup extraction,
 * and rooted malware attacks.
 * 
 * Trade-off made here:
 * For cross-platform Expo Go preview and developer agility without requiring bare native builds,
 * we implement an abstracted SecureStorage adapter backed by AsyncStorage.
 * The interface (`getTokens`, `setTokens`, `clearTokens`) matches Keychain so swapping to
 * `react-native-keychain` in a production bare build is a 1-line adapter replacement.
 */

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@feedants_access_token',
  REFRESH_TOKEN: '@feedants_refresh_token',
  USER_DATA: '@feedants_user_data',
};

export const secureStorage = {
  async saveTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken || ''],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken || ''],
      ]);
    } catch (e) {
      console.warn('[SecureStorage] Error saving tokens:', e);
    }
  },

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (e) {
      return null;
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (e) {
      return null;
    }
  },

  async saveUser(user) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (e) {
      console.warn('[SecureStorage] Error saving user data:', e);
    }
  },

  async getUser() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);
    } catch (e) {
      console.warn('[SecureStorage] Error clearing storage:', e);
    }
  },
};

export default secureStorage;
