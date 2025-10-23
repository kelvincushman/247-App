import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Socket.io Service
 * Manages real-time communication for messaging, notifications, and live updates
 */

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.messageListeners = new Map();
    this.typingListeners = new Map();
    this.isConnected = false;
  }

  /**
   * Connect to Socket.io server
   */
  async connect() {
    if (this.socket && this.isConnected) {
      console.log('Socket already connected');
      return;
    }

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.error('No auth token found for socket connection');
        return;
      }

      // Get API URL from config (defaults to localhost for development)
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

      // Create socket connection
      this.socket = io(API_URL, {
        auth: {
          token,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isConnected = true;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Set up message listeners
      this.setupMessageListeners();
      this.setupNotificationListeners();
      this.setupJobListeners();
    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      this.messageListeners.clear();
      this.typingListeners.clear();
    }
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * Set up message event listeners
   */
  setupMessageListeners() {
    if (!this.socket) return;

    // New message received
    this.socket.on('message:new', (message) => {
      console.log('New message received:', message);

      // Notify conversation-specific listeners
      const conversationListeners = this.messageListeners.get(message.conversationId);
      if (conversationListeners) {
        conversationListeners.forEach((callback) => callback(message));
      }

      // Notify global message listeners
      const globalListeners = this.listeners.get('message:new');
      if (globalListeners) {
        globalListeners.forEach((callback) => callback(message));
      }
    });

    // Message read receipt
    this.socket.on('message:read', (data) => {
      console.log('Message read:', data);

      const listeners = this.listeners.get('message:read');
      if (listeners) {
        listeners.forEach((callback) => callback(data));
      }
    });

    // Typing indicator
    this.socket.on('typing:status', (data) => {
      const { conversationId, userId, isTyping } = data;

      const typingListeners = this.typingListeners.get(conversationId);
      if (typingListeners) {
        typingListeners.forEach((callback) => callback(isTyping, userId));
      }
    });
  }

  /**
   * Set up notification event listeners
   */
  setupNotificationListeners() {
    if (!this.socket) return;

    // New notification
    this.socket.on('notification:new', (notification) => {
      console.log('New notification:', notification);

      const listeners = this.listeners.get('notification:new');
      if (listeners) {
        listeners.forEach((callback) => callback(notification));
      }
    });
  }

  /**
   * Set up job event listeners
   */
  setupJobListeners() {
    if (!this.socket) return;

    // Job status updated
    this.socket.on('job:updated', (job) => {
      console.log('Job updated:', job);

      const listeners = this.listeners.get('job:updated');
      if (listeners) {
        listeners.forEach((callback) => callback(job));
      }
    });

    // Job assigned to tradesperson
    this.socket.on('job:assigned', (job) => {
      console.log('Job assigned:', job);

      const listeners = this.listeners.get('job:assigned');
      if (listeners) {
        listeners.forEach((callback) => callback(job));
      }
    });

    // Job completed
    this.socket.on('job:completed', (job) => {
      console.log('Job completed:', job);

      const listeners = this.listeners.get('job:completed');
      if (listeners) {
        listeners.forEach((callback) => callback(job));
      }
    });
  }

  /**
   * Send a message
   */
  sendMessage(conversationId, message) {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('message:send', { conversationId, ...message }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.message);
        }
      });
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId, isTyping) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('typing:update', { conversationId, isTyping });
  }

  /**
   * Mark message as read
   */
  markMessageRead(conversationId, messageId) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('message:mark-read', { conversationId, messageId });
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('conversation:join', { conversationId });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId) {
    if (!this.isSocketConnected()) return;

    this.socket.emit('conversation:leave', { conversationId });
  }

  /**
   * Subscribe to messages in a specific conversation
   */
  onMessage(conversationId, callback) {
    if (!this.messageListeners.has(conversationId)) {
      this.messageListeners.set(conversationId, new Set());
    }

    this.messageListeners.get(conversationId).add(callback);

    // Join the conversation room
    this.joinConversation(conversationId);

    // Return unsubscribe function
    return {
      remove: () => {
        const listeners = this.messageListeners.get(conversationId);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0) {
            this.messageListeners.delete(conversationId);
            this.leaveConversation(conversationId);
          }
        }
      },
    };
  }

  /**
   * Subscribe to typing status in a conversation
   */
  onTyping(conversationId, callback) {
    if (!this.typingListeners.has(conversationId)) {
      this.typingListeners.set(conversationId, new Set());
    }

    this.typingListeners.get(conversationId).add(callback);

    // Return unsubscribe function
    return {
      remove: () => {
        const listeners = this.typingListeners.get(conversationId);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0) {
            this.typingListeners.delete(conversationId);
          }
        }
      },
    };
  }

  /**
   * Subscribe to new messages (global)
   */
  onNewMessage(callback) {
    return this.on('message:new', callback);
  }

  /**
   * Subscribe to new notifications
   */
  onNewNotification(callback) {
    return this.on('notification:new', callback);
  }

  /**
   * Subscribe to job updates
   */
  onJobUpdated(callback) {
    return this.on('job:updated', callback);
  }

  /**
   * Generic event subscription
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return {
      remove: () => {
        const listeners = this.listeners.get(event);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0) {
            this.listeners.delete(event);
          }
        }
      },
    };
  }

  /**
   * Emit custom event
   */
  emit(event, data) {
    if (!this.isSocketConnected()) {
      console.warn('Socket not connected, cannot emit event:', event);
      return;
    }

    this.socket.emit(event, data);
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
