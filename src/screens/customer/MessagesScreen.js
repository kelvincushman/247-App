import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectUser } from '../../redux/slices/authSlice';
import { Card, Avatar, Badge, LoadingSpinner } from '../../components/ui';
import { messageService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { formatDistanceToNow } from 'date-fns';

/**
 * Customer Messages Screen
 * Lists all conversations with tradespeople
 * Shows unread badges and last message preview
 */

const MessagesScreen = ({ navigation }) => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadConversations();

    // Set up real-time listener for new messages
    const messageListener = messageService.onNewMessage((message) => {
      // Update conversation list when new message arrives
      loadConversations();
    });

    return () => {
      // Cleanup listener
      if (messageListener) {
        messageListener.remove();
      }
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messageService.getConversations();
      setConversations(response.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load conversations',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Conversation', {
      conversationId: conversation.id,
      otherUser: conversation.tradesperson,
      jobId: conversation.jobId,
    });
  };

  const renderConversationCard = ({ item: conversation }) => {
    const otherUser = conversation.tradesperson;
    const lastMessage = conversation.lastMessage;
    const unreadCount = conversation.unreadCount || 0;

    return (
      <TouchableOpacity onPress={() => handleConversationPress(conversation)}>
        <Card style={styles.conversationCard}>
          <View style={styles.conversationRow}>
            {/* Avatar */}
            <Avatar
              source={otherUser?.profilePicture ? { uri: otherUser.profilePicture } : null}
              name={`${otherUser?.firstName} ${otherUser?.lastName}`}
              size="large"
            />

            {/* Conversation Info */}
            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeader}>
                <Text style={styles.userName}>
                  {otherUser?.firstName} {otherUser?.lastName}
                </Text>
                {lastMessage && (
                  <Text style={styles.timestamp}>
                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                  </Text>
                )}
              </View>

              {/* Job Title */}
              {conversation.job && (
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {conversation.job.title}
                </Text>
              )}

              {/* Last Message */}
              {lastMessage && (
                <View style={styles.lastMessageRow}>
                  {lastMessage.senderId === user.id && (
                    <Ionicons
                      name={lastMessage.read ? 'checkmark-done' : 'checkmark'}
                      size={14}
                      color={lastMessage.read ? '#0080FF' : '#999999'}
                      style={styles.readIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.lastMessage,
                      unreadCount > 0 && styles.lastMessageUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessage.type === 'image' ? '📷 Photo' : lastMessage.text}
                  </Text>
                </View>
              )}

              {!lastMessage && (
                <Text style={styles.noMessages}>No messages yet</Text>
              )}
            </View>

            {/* Unread Badge */}
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Conversations</Text>
      <Text style={styles.emptyText}>
        Start a job to chat with tradespeople
      </Text>
    </View>
  );

  if (loading && conversations.length === 0) {
    return <LoadingSpinner text="Loading messages..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0080FF" />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  conversationCard: {
    marginBottom: 12,
    padding: 12,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  timestamp: {
    fontSize: 11,
    color: '#999999',
  },
  jobTitle: {
    fontSize: 12,
    color: '#0080FF',
    marginBottom: 4,
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readIcon: {
    marginRight: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#333333',
  },
  noMessages: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#0080FF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MessagesScreen;
