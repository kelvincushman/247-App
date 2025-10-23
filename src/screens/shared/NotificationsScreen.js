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
import { Card, LoadingSpinner, Badge } from '../../components/ui';
import { notificationService } from '../../api/services';
import socketService from '../../services/socketService';
import Toast from 'react-native-toast-message';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notifications Screen (Shared)
 * Shows all app notifications for both customer and tradesperson
 * Types: job updates, messages, payments, reviews, etc.
 */

const NotificationsScreen = ({ navigation }) => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    loadNotifications();

    // Set up real-time listener for new notifications
    const notificationListener = socketService.onNewNotification((notification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Show toast for new notification
      Toast.show({
        type: 'info',
        text1: notification.title,
        text2: notification.body,
        visibilityTime: 3000,
      });
    });

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications({
        read: filter === 'unread' ? false : undefined,
      });
      setNotifications(response.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load notifications',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigate based on notification type
    navigateToNotification(notification);
  };

  const navigateToNotification = (notification) => {
    switch (notification.type) {
      case 'job_assigned':
      case 'job_accepted':
      case 'job_started':
      case 'job_completed':
      case 'job_cancelled':
        if (notification.data?.jobId) {
          navigation.navigate('JobDetails', { jobId: notification.data.jobId });
        }
        break;

      case 'new_message':
        if (notification.data?.conversationId) {
          navigation.navigate('Conversation', {
            conversationId: notification.data.conversationId,
            otherUser: notification.data.sender,
            jobId: notification.data.jobId,
          });
        }
        break;

      case 'payment_received':
      case 'payment_released':
        if (user.role === 'tradesperson') {
          navigation.navigate('Profile');
        } else if (notification.data?.jobId) {
          navigation.navigate('JobDetails', { jobId: notification.data.jobId });
        }
        break;

      case 'review_received':
        if (notification.data?.jobId) {
          navigation.navigate('JobDetails', { jobId: notification.data.jobId });
        }
        break;

      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

      Toast.show({
        type: 'success',
        text1: 'All Marked as Read',
      });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: 'Could not mark notifications as read',
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationService.clearAll();
      setNotifications([]);

      Toast.show({
        type: 'success',
        text1: 'Notifications Cleared',
      });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: 'Could not clear notifications',
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_assigned':
      case 'job_accepted':
        return { name: 'checkmark-circle', color: '#34C759' };
      case 'job_started':
        return { name: 'play-circle', color: '#0080FF' };
      case 'job_completed':
        return { name: 'checkmark-done-circle', color: '#34C759' };
      case 'job_cancelled':
        return { name: 'close-circle', color: '#FF3B30' };
      case 'new_message':
        return { name: 'chatbubble', color: '#0080FF' };
      case 'payment_received':
      case 'payment_released':
        return { name: 'cash', color: '#34C759' };
      case 'review_received':
        return { name: 'star', color: '#FFB800' };
      default:
        return { name: 'notifications', color: '#999999' };
    }
  };

  const renderNotification = ({ item: notification }) => {
    const icon = getNotificationIcon(notification.type);

    return (
      <TouchableOpacity onPress={() => handleNotificationPress(notification)}>
        <Card style={[styles.notificationCard, !notification.read && styles.unreadCard]}>
          <View style={styles.notificationRow}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
              <Ionicons name={icon.name} size={24} color={icon.color} />
            </View>

            {/* Content */}
            <View style={styles.notificationContent}>
              <Text style={[styles.title, !notification.read && styles.unreadTitle]}>
                {notification.title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {notification.body}
              </Text>
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </Text>
            </View>

            {/* Unread Indicator */}
            {!notification.read && <View style={styles.unreadDot} />}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You're all caught up! Notifications will appear here.
      </Text>
    </View>
  );

  const renderHeader = () => {
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && notifications.length === 0) {
    return <LoadingSpinner text="Loading notifications..." />;
  }

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={user?.role === 'tradesperson' ? '#FF9500' : '#0080FF'}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 14,
    color: '#0080FF',
    fontWeight: '500',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#0080FF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999999',
  },
  filterTabTextActive: {
    color: '#0080FF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    marginBottom: 12,
    padding: 12,
  },
  unreadCard: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 3,
    borderLeftColor: '#0080FF',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0080FF',
    marginLeft: 8,
    marginTop: 6,
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

export default NotificationsScreen;
