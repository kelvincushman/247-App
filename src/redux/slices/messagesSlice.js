import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { messageService } from '../../api/services';

/**
 * Initial State
 */
const initialState = {
  conversations: [],
  messages: {},
  currentConversation: null,
  isLoading: false,
  error: null,
  unreadCount: 0,
  typing: {}, // { jobId: { userId: true } }
};

/**
 * Async Thunks
 */

// Get Conversations
export const getConversations = createAsyncThunk(
  'messages/getConversations',
  async (params, { rejectWithValue }) => {
    try {
      const response = await messageService.getConversations(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

// Get Messages for a Job
export const getMessages = createAsyncThunk(
  'messages/getMessages',
  async ({ jobId, params }, { rejectWithValue }) => {
    try {
      const response = await messageService.getMessages(jobId, params);
      return { jobId, messages: response.messages };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

// Send Message
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ jobId, content }, { rejectWithValue }) => {
    try {
      const response = await messageService.sendMessage(jobId, content);
      return { jobId, message: response.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

// Send Image
export const sendImage = createAsyncThunk(
  'messages/sendImage',
  async ({ jobId, image, caption }, { rejectWithValue }) => {
    try {
      const response = await messageService.sendImage(jobId, image, caption);
      return { jobId, message: response.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send image');
    }
  }
);

// Send Location
export const sendLocation = createAsyncThunk(
  'messages/sendLocation',
  async ({ jobId, location }, { rejectWithValue }) => {
    try {
      const response = await messageService.sendLocation(jobId, location);
      return { jobId, message: response.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send location');
    }
  }
);

// Mark as Read
export const markAsRead = createAsyncThunk(
  'messages/markAsRead',
  async ({ jobId, messageIds }, { rejectWithValue }) => {
    try {
      await messageService.markAsRead(jobId, messageIds);
      return { jobId, messageIds };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
    }
  }
);

// Mark Conversation as Read
export const markConversationAsRead = createAsyncThunk(
  'messages/markConversationAsRead',
  async (jobId, { rejectWithValue }) => {
    try {
      await messageService.markConversationAsRead(jobId);
      return jobId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
    }
  }
);

// Get Unread Count
export const getUnreadCount = createAsyncThunk(
  'messages/getUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messageService.getUnreadCount();
      return response.count;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }
);

/**
 * Messages Slice
 */
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConversation: (state, action) => {
      state.currentConversation = action.payload;
    },
    clearCurrentConversation: (state) => {
      state.currentConversation = null;
    },
    // Real-time message received (from Socket.io)
    receiveMessage: (state, action) => {
      const { jobId, message } = action.payload;

      // Add to messages for this job
      if (!state.messages[jobId]) {
        state.messages[jobId] = [];
      }
      state.messages[jobId].push(message);

      // Update conversation in list
      const conversationIndex = state.conversations.findIndex(
        (conv) => conv.jobId === jobId
      );
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].lastMessage = message;
        state.conversations[conversationIndex].updatedAt = message.createdAt;

        // Increment unread count if not current conversation
        if (state.currentConversation !== jobId) {
          state.conversations[conversationIndex].unreadCount += 1;
          state.unreadCount += 1;
        }

        // Move conversation to top
        const conversation = state.conversations.splice(conversationIndex, 1)[0];
        state.conversations.unshift(conversation);
      }
    },
    // Mark message as read locally
    markMessageAsReadLocally: (state, action) => {
      const { jobId, messageId } = action.payload;

      if (state.messages[jobId]) {
        const message = state.messages[jobId].find((msg) => msg.id === messageId);
        if (message) {
          message.read = true;
        }
      }
    },
    // User is typing (from Socket.io)
    setTyping: (state, action) => {
      const { jobId, userId, isTyping } = action.payload;

      if (!state.typing[jobId]) {
        state.typing[jobId] = {};
      }

      if (isTyping) {
        state.typing[jobId][userId] = true;
      } else {
        delete state.typing[jobId][userId];
      }
    },
    // Update unread count
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    // Add optimistic message (before API response)
    addOptimisticMessage: (state, action) => {
      const { jobId, message } = action.payload;

      if (!state.messages[jobId]) {
        state.messages[jobId] = [];
      }
      state.messages[jobId].push({ ...message, optimistic: true });
    },
    // Update optimistic message with actual message from server
    updateOptimisticMessage: (state, action) => {
      const { jobId, tempId, message } = action.payload;

      if (state.messages[jobId]) {
        const index = state.messages[jobId].findIndex(
          (msg) => msg.tempId === tempId
        );
        if (index !== -1) {
          state.messages[jobId][index] = message;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Conversations
      .addCase(getConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload.conversations;
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Get Messages
      .addCase(getMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        const { jobId, messages } = action.payload;
        state.messages[jobId] = messages;
      })
      .addCase(getMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Send Message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { jobId, message } = action.payload;

        // Remove optimistic message if exists
        if (state.messages[jobId]) {
          state.messages[jobId] = state.messages[jobId].filter(
            (msg) => !msg.optimistic
          );
        }

        // Add actual message
        if (!state.messages[jobId]) {
          state.messages[jobId] = [];
        }
        state.messages[jobId].push(message);

        // Update conversation
        const conversationIndex = state.conversations.findIndex(
          (conv) => conv.jobId === jobId
        );
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex].lastMessage = message;
          state.conversations[conversationIndex].updatedAt = message.createdAt;
        }
      })

      // Send Image
      .addCase(sendImage.fulfilled, (state, action) => {
        const { jobId, message } = action.payload;

        if (!state.messages[jobId]) {
          state.messages[jobId] = [];
        }
        state.messages[jobId].push(message);
      })

      // Send Location
      .addCase(sendLocation.fulfilled, (state, action) => {
        const { jobId, message } = action.payload;

        if (!state.messages[jobId]) {
          state.messages[jobId] = [];
        }
        state.messages[jobId].push(message);
      })

      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const { jobId, messageIds } = action.payload;

        if (state.messages[jobId]) {
          state.messages[jobId].forEach((message) => {
            if (messageIds.includes(message.id)) {
              message.read = true;
            }
          });
        }

        // Update conversation unread count
        const conversationIndex = state.conversations.findIndex(
          (conv) => conv.jobId === jobId
        );
        if (conversationIndex !== -1) {
          const prevUnread = state.conversations[conversationIndex].unreadCount || 0;
          state.conversations[conversationIndex].unreadCount = 0;
          state.unreadCount = Math.max(0, state.unreadCount - prevUnread);
        }
      })

      // Mark Conversation as Read
      .addCase(markConversationAsRead.fulfilled, (state, action) => {
        const jobId = action.payload;

        // Mark all messages as read
        if (state.messages[jobId]) {
          state.messages[jobId].forEach((message) => {
            message.read = true;
          });
        }

        // Update conversation unread count
        const conversationIndex = state.conversations.findIndex(
          (conv) => conv.jobId === jobId
        );
        if (conversationIndex !== -1) {
          const prevUnread = state.conversations[conversationIndex].unreadCount || 0;
          state.conversations[conversationIndex].unreadCount = 0;
          state.unreadCount = Math.max(0, state.unreadCount - prevUnread);
        }
      })

      // Get Unread Count
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentConversation,
  clearCurrentConversation,
  receiveMessage,
  markMessageAsReadLocally,
  setTyping,
  updateUnreadCount,
  addOptimisticMessage,
  updateOptimisticMessage,
} = messagesSlice.actions;

// Selectors
export const selectConversations = (state) => state.messages.conversations;
export const selectMessages = (state) => state.messages.messages;
export const selectCurrentConversation = (state) => state.messages.currentConversation;
export const selectMessagesLoading = (state) => state.messages.isLoading;
export const selectMessagesError = (state) => state.messages.error;
export const selectUnreadCount = (state) => state.messages.unreadCount;
export const selectTyping = (state) => state.messages.typing;
export const selectConversationMessages = (jobId) => (state) =>
  state.messages.messages[jobId] || [];

export default messagesSlice.reducer;
