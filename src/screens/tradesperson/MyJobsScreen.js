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
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { selectUser } from '../../redux/slices/authSlice';
import { Card, Badge, LoadingSpinner } from '../../components/ui';
import { jobService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import { JOB_STATUS } from '../../utils/constants';

/**
 * My Jobs Screen
 * Shows tradesperson's accepted/active/completed jobs
 */

const MyJobsScreen = ({ navigation }) => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('active'); // all, active, completed

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const loadJobs = async () => {
    try {
      setLoading(true);

      const params = {
        tradespersonId: user.id,
      };

      // Add filter params
      if (filter === 'active') {
        params.status = [JOB_STATUS.ACCEPTED, JOB_STATUS.ASSIGNED, JOB_STATUS.IN_PROGRESS];
      } else if (filter === 'completed') {
        params.status = [JOB_STATUS.COMPLETED, JOB_STATUS.CANCELLED];
      }

      const response = await jobService.getTradespersonJobs(params);
      setJobs(response.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load your jobs',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleJobPress = (job) => {
    navigation.navigate('JobDetails', { jobId: job.id });
  };

  const filterJobs = () => {
    if (filter === 'active') {
      return jobs.filter(
        (job) =>
          job.status !== JOB_STATUS.COMPLETED &&
          job.status !== JOB_STATUS.CANCELLED
      );
    }
    if (filter === 'completed') {
      return jobs.filter(
        (job) =>
          job.status === JOB_STATUS.COMPLETED ||
          job.status === JOB_STATUS.CANCELLED
      );
    }
    return jobs;
  };

  const getStatusText = (status) => {
    switch (status) {
      case JOB_STATUS.REQUESTED:
        return 'Requested';
      case JOB_STATUS.ASSIGNED:
      case JOB_STATUS.ACCEPTED:
        return 'Accepted';
      case JOB_STATUS.IN_PROGRESS:
        return 'In Progress';
      case JOB_STATUS.COMPLETED:
        return 'Completed';
      case JOB_STATUS.CANCELLED:
        return 'Cancelled';
      case JOB_STATUS.DISPUTED:
        return 'Disputed';
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case JOB_STATUS.REQUESTED:
        return 'default';
      case JOB_STATUS.ASSIGNED:
      case JOB_STATUS.ACCEPTED:
        return 'info';
      case JOB_STATUS.IN_PROGRESS:
        return 'warning';
      case JOB_STATUS.COMPLETED:
        return 'success';
      case JOB_STATUS.CANCELLED:
      case JOB_STATUS.DISPUTED:
        return 'danger';
      default:
        return 'default';
    }
  };

  const renderJobCard = ({ item: job }) => (
    <TouchableOpacity onPress={() => handleJobPress(job)}>
      <Card style={styles.jobCard}>
        {/* Job Header */}
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleContainer}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Badge
              text={getStatusText(job.status)}
              variant={getStatusColor(job.status)}
              size="small"
            />
          </View>
        </View>

        {/* Customer Info */}
        {job.customer && (
          <View style={styles.customerRow}>
            <Ionicons name="person" size={16} color="#666666" />
            <Text style={styles.customerName}>
              {job.customer.firstName} {job.customer.lastName}
            </Text>
          </View>
        )}

        {/* Job Description */}
        <Text style={styles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>

        {/* Job Details */}
        <View style={styles.jobDetails}>
          {/* Location */}
          {job.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color="#666666" />
              <Text style={styles.detailText} numberOfLines={1}>
                {job.location.address}
              </Text>
            </View>
          )}

          {/* Date */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#666666" />
            <Text style={styles.detailText}>
              {format(new Date(job.createdAt), 'MMM d, yyyy')}
            </Text>
          </View>
        </View>

        {/* Job Footer */}
        <View style={styles.jobFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              {job.finalPrice ? 'Final Price' : 'Est. Budget'}
            </Text>
            <Text style={styles.priceValue}>
              £{(job.finalPrice || job.estimatedPrice)?.toFixed(2) || 'TBD'}
            </Text>
          </View>

          {/* Action Indicator */}
          {job.status === JOB_STATUS.IN_PROGRESS && (
            <View style={styles.actionIndicator}>
              <Ionicons name="timer" size={16} color="#FF9500" />
              <Text style={styles.actionText}>In Progress</Text>
            </View>
          )}

          {job.status === JOB_STATUS.ACCEPTED && (
            <View style={styles.actionIndicator}>
              <Ionicons name="play-circle" size={16} color="#0080FF" />
              <Text style={styles.actionText}>Ready to Start</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>
        {filter === 'active' ? 'No Active Jobs' : 'No Jobs Yet'}
      </Text>
      <Text style={styles.emptyText}>
        {filter === 'active'
          ? 'Browse available jobs to get started'
          : 'Your job history will appear here'}
      </Text>
      {filter === 'active' && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('AvailableJobs')}
        >
          <Text style={styles.browseButtonText}>Browse Jobs</Text>
          <Ionicons name="arrow-forward" size={16} color="#FF9500" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && jobs.length === 0) {
    return <LoadingSpinner text="Loading your jobs..." />;
  }

  const filteredJobs = filterJobs();

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}
          >
            All ({jobs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}
          >
            Active (
            {
              jobs.filter(
                (j) =>
                  j.status !== JOB_STATUS.COMPLETED &&
                  j.status !== JOB_STATUS.CANCELLED
              ).length
            }
            )
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text
            style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}
          >
            Completed (
            {
              jobs.filter(
                (j) =>
                  j.status === JOB_STATUS.COMPLETED ||
                  j.status === JOB_STATUS.CANCELLED
              ).length
            }
            )
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9500" />
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
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#FF9500',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999999',
  },
  filterTabTextActive: {
    color: '#FF9500',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  jobCard: {
    marginBottom: 16,
  },
  jobHeader: {
    marginBottom: 12,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    marginRight: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
  jobDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 6,
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 4,
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
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 24,
    gap: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
  },
});

export default MyJobsScreen;
