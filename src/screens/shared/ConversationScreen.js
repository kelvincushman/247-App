import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { selectUser } from '../../redux/slices/authSlice';
import { Avatar, LoadingSpinner } from '../../components/ui';
import { messageService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { format, isToday, isYesterday } from 'date-fns';

/**
 * Conversation Screen (Shared)
 * Real-time chat interface for customer-tradesperson communication
 * Works for both customer and tradesperson apps
 */

const ConversationScreen = ({ route, navigation }) => {
  const { conversationId, otherUser, jobId } = route.params;
  const user = useSelector(selectUser);

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Set header with other user's name
    navigation.setOptions({
      title: `${otherUser?.firstName} ${otherUser?.lastName}`,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('JobDetails', { jobId })}
          style={styles.headerButton}
        >
          <Ionicons name="information-circle-outline" size={24} color="#333333" />
        </TouchableOpacity>
      ),
    });

    loadMessages();

    // Set up real-time listener for new messages
    const messageListener = messageService.onMessage(conversationId, (newMessage) => {
      setMessages((prevMessages) => {
        // Check if message already exists
        const exists = prevMessages.some((m) => m.id === newMessage.id);
        if (exists) return prevMessages;

        // Add new message and sort by timestamp
        return [...prevMessages, newMessage].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Mark as read if not from current user
      if (newMessage.senderId !== user.id) {
        messageService.markAsRead(conversationId, newMessage.id);
      }
    });

    // Set up typing indicator listener
    const typingListener = messageService.onTyping(conversationId, (isTyping, userId) => {
      if (userId !== user.id) {
        setTyping(isTyping);
      }
    });

    return () => {
      // Cleanup listeners
      if (messageListener) messageListener.remove();
      if (typingListener) typingListener.remove();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await messageService.getMessages(conversationId);
      setMessages(response.messages || []);

      // Scroll to bottom after loading
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);

      // Mark all messages as read
      const unreadIds = response.messages
        .filter((m) => !m.read && m.senderId !== user.id)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        messageService.markMessagesAsRead(conversationId, unreadIds);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load messages',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      await messageService.sendMessage(conversationId, {
        text,
        type: 'text',
        jobId,
      });

      // Stop typing indicator
      messageService.sendTyping(conversationId, false);

      // Message will be added via real-time listener
    } catch (err) {
      console.error('Failed to send message:', err);
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: 'Failed to send message',
      });
      // Restore message text on error
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text) => {
    setMessageText(text);

    // Send typing indicator
    messageService.sendTyping(conversationId, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      messageService.sendTyping(conversationId, false);
    }, 2000);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to send images'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await sendImageMessage(result.assets[0]);
    }
  };

  const sendImageMessage = async (asset) => {
    setSending(true);

    try {
      await messageService.sendMessage(conversationId, {
        type: 'image',
        image: asset,
        jobId,
      });

      Toast.show({
        type: 'success',
        text1: 'Image Sent',
      });
    } catch (err) {
      console.error('Failed to send image:', err);
      Toast.show({
        type: 'error',
        text1: 'Send Failed',
        text2: 'Failed to send image',
      });
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);

    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const renderMessage = ({ item: message, index }) => {
    const isOwnMessage = message.senderId === user.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar =
      !previousMessage || previousMessage.senderId !== message.senderId;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        {/* Avatar for other user's messages */}
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              <Avatar
                source={
                  otherUser?.profilePicture ? { uri: otherUser.profilePicture } : null
                }
                name={`${otherUser?.firstName} ${otherUser?.lastName}`}
                size="small"
              />
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}

        {/* Message Bubble */}
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {message.type === 'image' && message.imageUrl && (
            <Image source={{ uri: message.imageUrl }} style={styles.messageImage} />
          )}

          {message.type === 'text' && (
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {message.text}
            </Text>
          )}

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {formatMessageTime(message.createdAt)}
            </Text>

            {/* Read receipt for own messages */}
            {isOwnMessage && (
              <Ionicons
                name={message.read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={message.read ? '#0080FF' : 'rgba(255,255,255,0.7)'}
                style={styles.readIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!typing) return null;

    return (
      <View style={styles.typingContainer}>
        <Avatar
          source={otherUser?.profilePicture ? { uri: otherUser.profilePicture } : null}
          name={`${otherUser?.firstName} ${otherUser?.lastName}`}
          size="small"
        />
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading conversation..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={renderTypingIndicator}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.attachButton}
            disabled={sending}
          >
            <Ionicons name="image-outline" size={24} color="#666666" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={handleTextChange}
            placeholder="Type a message..."
            placeholderTextColor="#999999"
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            onPress={handleSendMessage}
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            disabled={!messageText.trim() || sending}
          >
            <Ionicons
              name="send"
              size={20}
              color={messageText.trim() && !sending ? '#FFFFFF' : '#CCCCCC'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  headerButton: {
    marginRight: 12,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarSpacer: {
    width: 32,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ownMessageBubble: {
    backgroundColor: '#0080FF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#333333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999999',
  },
  readIcon: {
    marginLeft: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999999',
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    color: '#333333',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0080FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
});

export default ConversationScreen;
