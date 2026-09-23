import { io } from 'socket.io-client';
import { API_BASE_URL } from './client';

// Extract base URL without the path (e.g. http://localhost:5000)
const getSocketUrl = () => {
  try {
    const url = new URL(API_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return 'http://localhost:5000';
  }
};

export const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling'],
});

export default socket;
