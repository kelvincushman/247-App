import { useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import socketClient from '../socket/client';
import { selectIsAuthenticated } from '../redux/slices/authSlice';

/**
 * Custom hook for Socket.io functionality
 * Automatically connects/disconnects based on authentication state
 */
export const useSocket = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Connect when authenticated, disconnect when logged out
  useEffect(() => {
    if (isAuthenticated) {
      socketClient.connect();
    } else {
      socketClient.disconnect();
    }

    return () => {
      // Cleanup on unmount (but socket will reconnect if still authenticated)
    };
  }, [isAuthenticated]);

  // Helper functions wrapped in useCallback
  const joinRoom = useCallback((roomId) => {
    socketClient.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId) => {
    socketClient.leaveRoom(roomId);
  }, []);

  const sendTypingIndicator = useCallback((jobId, isTyping) => {
    socketClient.sendTypingIndicator(jobId, isTyping);
  }, []);

  const updateLocation = useCallback((jobId, location) => {
    socketClient.updateLocation(jobId, location);
  }, []);

  const emit = useCallback((event, data, callback) => {
    socketClient.emit(event, data, callback);
  }, []);

  const isConnected = socketClient.getConnectionStatus();

  return {
    joinRoom,
    leaveRoom,
    sendTypingIndicator,
    updateLocation,
    emit,
    isConnected,
  };
};

/**
 * Hook for joining/leaving a room automatically
 * @param {string} roomId - Room ID to join (e.g., job ID)
 * @param {boolean} enabled - Whether to join the room
 */
export const useSocketRoom = (roomId, enabled = true) => {
  const { joinRoom, leaveRoom } = useSocket();

  useEffect(() => {
    if (roomId && enabled) {
      joinRoom(roomId);

      return () => {
        leaveRoom(roomId);
      };
    }
  }, [roomId, enabled, joinRoom, leaveRoom]);
};

/**
 * Hook for typing indicator in chat
 * @param {string} jobId - Job ID
 */
export const useTypingIndicator = (jobId) => {
  const { sendTypingIndicator } = useSocket();
  let typingTimeout = null;

  const startTyping = useCallback(() => {
    sendTypingIndicator(jobId, true);

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeout = setTimeout(() => {
      sendTypingIndicator(jobId, false);
    }, 3000);
  }, [jobId, sendTypingIndicator]);

  const stopTyping = useCallback(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    sendTypingIndicator(jobId, false);
  }, [jobId, sendTypingIndicator]);

  return { startTyping, stopTyping };
};

export default useSocket;
