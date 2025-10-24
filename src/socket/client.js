import io from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SOCKET_URL } from '../utils/constants';
import store from '../redux/store';

// Import Redux actions
import { receiveMessage, setTyping } from '../redux/slices/messagesSlice';
import { receiveNotification, updateUnreadCount } from '../redux/slices/notificationsSlice';
import { updateLocalJob } from '../redux/slices/jobsSlice';
import {
  updateTradesPersonLocationRealtime,
  updateETARealtime,
} from '../redux/slices/locationSlice';

/**
 * Socket.io Client
 * Manages real-time bidirectional communication with the backend
 * FIXED: Uses SecureStore for tokens (hardware-backed encryption)
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Connect to Socket.io server
   */
  async connect() {
    try {
      // FIXED: Get auth token from SecureStore (hardware-backed encryption)
      const token = await SecureStore.getItemAsync('accessToken');

      if (!token) {
        console.log('[Socket] No auth token found, skipping connection');
        return;
      }

      // Create socket connection
      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      // Setup event listeners
      this.setupEventListeners();

      console.log('[Socket] Connecting to', SOCKET_URL);
    } catch (error) {
      console.error('[Socket] Connection error:', error);
    }
  }

  /**
   * Setup Socket.io event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.reconnectDelay = 1000; // Reset delay
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.isConnected = false;

      // Auto-reconnect unless manually disconnected
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect manually
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      this.connectionAttempts++;

      // Exponential backoff
      if (this.connectionAttempts < this.maxReconnectAttempts) {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt:', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after max attempts');
      this.isConnected = false;
    });

    // Custom events

    // 1. New Message
    this.socket.on('message:new', (data) => {
      console.log('[Socket] New message received:', data);
      store.dispatch(
        receiveMessage({
          jobId: data.jobId,
          message: data.message,
        })
      );
    });

    // 2. Typing Indicator
    this.socket.on('message:typing', (data) => {
      console.log('[Socket] User typing:', data);
      store.dispatch(
        setTyping({
          jobId: data.jobId,
          userId: data.userId,
          isTyping: data.isTyping,
        })
      );
    });

    // 3. New Notification
    this.socket.on('notification:new', (notification) => {
      console.log('[Socket] New notification received:', notification);
      store.dispatch(receiveNotification(notification));
    });

    // 4. Notification Count Update
    this.socket.on('notification:count', (data) => {
      console.log('[Socket] Notification count update:', data.count);
      store.dispatch(updateUnreadCount(data.count));
    });

    // 5. Job Status Update
    this.socket.on('job:update', (data) => {
      console.log('[Socket] Job update received:', data);
      store.dispatch(updateLocalJob(data.job));
    });

    // 6. Job Assigned (Tradesperson)
    this.socket.on('job:assigned', (data) => {
      console.log('[Socket] Job assigned:', data);
      store.dispatch(updateLocalJob(data.job));

      // Also trigger notification
      store.dispatch(
        receiveNotification({
          id: `job-assigned-${data.job.id}`,
          type: 'job_update',
          title: 'New Job Assigned',
          message: `You have been assigned to: ${data.job.title}`,
          data: { jobId: data.job.id },
          read: false,
          createdAt: new Date().toISOString(),
        })
      );
    });

    // 7. Location Update (Customer view)
    this.socket.on('location:update', (data) => {
      console.log('[Socket] Location update received:', data);
      store.dispatch(
        updateTradesPersonLocationRealtime({
          jobId: data.jobId,
          location: data.location,
        })
      );
    });

    // 8. ETA Update
    this.socket.on('location:eta', (data) => {
      console.log('[Socket] ETA update received:', data);
      store.dispatch(
        updateETARealtime({
          jobId: data.jobId,
          eta: data.eta,
        })
      );
    });

    // 9. Tradesperson Arrived
    this.socket.on('location:arrived', (data) => {
      console.log('[Socket] Tradesperson arrived:', data);
      store.dispatch(updateLocalJob({ id: data.jobId, status: 'in_progress' }));
      store.dispatch(
        receiveNotification({
          id: `tradesperson-arrived-${data.jobId}`,
          type: 'job_update',
          title: 'Tradesperson Arrived',
          message: 'Your tradesperson has arrived at the job location',
          data: { jobId: data.jobId },
          read: false,
          createdAt: new Date().toISOString(),
        })
      );
    });

    // 10. Payment Status Update
    this.socket.on('payment:update', (data) => {
      console.log('[Socket] Payment update received:', data);
      store.dispatch(updateLocalJob({ id: data.jobId, paymentStatus: data.status }));
    });

    // 11. Review Received
    this.socket.on('review:new', (data) => {
      console.log('[Socket] New review received:', data);
      store.dispatch(
        receiveNotification({
          id: `review-new-${data.reviewId}`,
          type: 'review',
          title: 'New Review',
          message: `You received a ${data.rating}-star review`,
          data: { reviewId: data.reviewId, jobId: data.jobId },
          read: false,
          createdAt: new Date().toISOString(),
        })
      );
    });

    // 12. Error events
    this.socket.on('error', (error) => {
      console.error('[Socket] Server error:', error);
    });
  }

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @param {Function} callback - Optional callback
   */
  emit(event, data, callback) {
    if (!this.socket || !this.isConnected) {
      console.warn('[Socket] Cannot emit, not connected:', event);
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Join a room (e.g., job room for messages and updates)
   * @param {string} roomId - Room ID to join
   */
  joinRoom(roomId) {
    this.emit('room:join', { roomId }, (response) => {
      console.log('[Socket] Joined room:', roomId, response);
    });
  }

  /**
   * Leave a room
   * @param {string} roomId - Room ID to leave
   */
  leaveRoom(roomId) {
    this.emit('room:leave', { roomId }, (response) => {
      console.log('[Socket] Left room:', roomId, response);
    });
  }

  /**
   * Send typing indicator
   * @param {string} jobId - Job ID
   * @param {boolean} isTyping - Is typing or not
   */
  sendTypingIndicator(jobId, isTyping) {
    this.emit('message:typing', { jobId, isTyping });
  }

  /**
   * Update location (for location tracking)
   * @param {string} jobId - Job ID
   * @param {Object} location - Location data
   */
  updateLocation(jobId, location) {
    this.emit('location:update', { jobId, ...location });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Reconnect to server (e.g., after login or token refresh)
   */
  async reconnect() {
    this.disconnect();
    await this.connect();
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected && this.socket?.connected;
  }
}

// Export singleton instance
const socketClient = new SocketClient();

export default socketClient;
