import { io } from 'socket.io-client';
import { Platform } from 'react-native';

// Derive socket base URL from the EXPO_PUBLIC_API_URL env var (strip /api suffix)
const getRawBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
  if (apiUrl) {
    // Remove trailing /api or /api/v1 path component
    return apiUrl.replace(/\/api(\/v\d+)?$/, '');
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://localhost:5000';
};

const SOCKET_URL = getRawBaseUrl();

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
});

export default socket;
