import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectUser } from '../../redux/slices/authSlice';
import { Card, Badge, LoadingSpinner, Avatar } from '../../components/ui';
import { jobService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';

/**
 * Tradesperson Dashboard Screen
 * Shows earnings, stats, active jobs, and quick actions
 */

const DashboardScreen = ({ navigation }) => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      // Fetch dashboard data from API
      const response = await jobService.getTradespersonDashboard();
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load dashboard data',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  if (loading && !dashboardData) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const earnings = dashboardData?.earnings || { today: 0, week: 0, month: 0 };
  const stats = dashboardData?.stats || {
    activeJobs: 0,
    completedJobs: 0,
    completionRate: 0,
    rating: 0,
    reviewCount: 0,
  };
  const recentJobs = dashboardData?.recentJobs || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9500" />
        }
      >
        {/* Welcome Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>{user?.firstName}!</Text>
            </View>
            <Avatar
              source={user?.profilePicture ? { uri: user.profilePicture } : null}
              name={`${user?.firstName} ${user?.lastName}`}
              size="large"
            />
          </View>
        </Card>

        {/* Earnings Summary */}
        <View style={styles.sectionHeader}>
          <Ionicons name="cash" size={24} color="#FF9500" />
          <Text style={styles.sectionTitle}>Earnings</Text>
        </View>

        <View style={styles.earningsGrid}>
          <Card style={styles.earningCard}>
            <Text style={styles.earningLabel}>Today</Text>
            <Text style={styles.earningValue}>£{earnings.today.toFixed(2)}</Text>
          </Card>
          <Card style={styles.earningCard}>
            <Text style={styles.earningLabel}>This Week</Text>
            <Text style={styles.earningValue}>£{earnings.week.toFixed(2)}</Text>
          </Card>
          <Card style={styles.earningCard}>
            <Text style={styles.earningLabel}>This Month</Text>
            <Text style={styles.earningValue}>£{earnings.month.toFixed(2)}</Text>
          </Card>
        </View>

        {/* Stats Summary */}
        <View style={styles.sectionHeader}>
          <Ionicons name="stats-chart" size={24} color="#FF9500" />
          <Text style={styles.sectionTitle}>Performance</Text>
        </View>

        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="briefcase" size={24} color="#0080FF" />
              </View>
              <Text style={styles.statValue}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              </View>
              <Text style={styles.statValue}>{stats.completedJobs}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={24} color="#FFB800" />
              </View>
              <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>
                {stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trending-up" size={24} color="#FF9500" />
              </View>
              <Text style={styles.statValue}>{stats.completionRate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash" size={24} color="#FF9500" />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AvailableJobs')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#E5F3FF' }]}>
              <Ionicons name="search" size={28} color="#0080FF" />
            </View>
            <Text style={styles.actionLabel}>Find Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyJobs')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="briefcase" size={28} color="#FF9500" />
            </View>
            <Text style={styles.actionLabel}>My Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile', { screen: 'Earnings' })}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="wallet" size={28} color="#34C759" />
            </View>
            <Text style={styles.actionLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="chatbubbles" size={28} color="#9C27B0" />
            </View>
            <Text style={styles.actionLabel}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Jobs */}
        {recentJobs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={24} color="#FF9500" />
              <Text style={styles.sectionTitle}>Recent Jobs</Text>
            </View>

            {recentJobs.slice(0, 3).map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
              >
                <Card style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <View style={styles.jobTitleContainer}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Badge
                        text={job.status.toUpperCase()}
                        variant={getJobStatusColor(job.status)}
                        size="small"
                      />
                    </View>
                    <Text style={styles.jobPrice}>£{job.estimatedPrice?.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description}
                  </Text>

                  <View style={styles.jobFooter}>
                    <View style={styles.jobLocation}>
                      <Ionicons name="location-outline" size={14} color="#666666" />
                      <Text style={styles.jobLocationText} numberOfLines={1}>
                        {job.location?.address || 'Location not specified'}
                      </Text>
                    </View>
                    <Text style={styles.jobTime}>
                      {format(new Date(job.createdAt), 'MMM d, h:mm a')}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('MyJobs')}
            >
              <Text style={styles.viewAllText}>View All Jobs</Text>
              <Ionicons name="arrow-forward" size={16} color="#FF9500" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const getJobStatusColor = (status) => {
  switch (status) {
    case 'assigned':
    case 'accepted':
      return 'info';
    case 'in_progress':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
    case 'disputed':
      return 'danger';
    default:
      return 'default';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 24,
    backgroundColor: '#FFF3E0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  earningCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  earningLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  earningValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
  },
  statsCard: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  jobCard: {
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  jobPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  jobLocationText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  jobTime: {
    fontSize: 12,
    color: '#999999',
  },
  viewAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
});

export default DashboardScreen;
