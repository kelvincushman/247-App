import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  Card,
  Badge,
  LoadingSpinner,
  EmptyState,
  ErrorMessage,
} from '../../components/ui';
import {
  getJobs,
  selectJobs,
  selectJobsLoading,
  selectJobsError,
} from '../../redux/slices/jobsSlice';
import { JOB_STATUS } from '../../utils/constants';

/**
 * Jobs Screen
 * Lists all jobs created by the customer
 */
const JobsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const jobs = useSelector(selectJobs);
  const isLoading = useSelector(selectJobsLoading);
  const error = useSelector(selectJobsError);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      await dispatch(getJobs({})).unwrap();
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case JOB_STATUS.REQUESTED:
        return 'info';
      case JOB_STATUS.ASSIGNED:
        return 'primary';
      case JOB_STATUS.ACCEPTED:
        return 'success';
      case JOB_STATUS.IN_PROGRESS:
        return 'warning';
      case JOB_STATUS.COMPLETED:
        return 'success';
      case JOB_STATUS.CANCELLED:
        return 'danger';
      case JOB_STATUS.DISPUTED:
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    return status
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
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

  const renderJobCard = ({ item: job }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
    >
      <Card style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleContainer}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {job.title}
            </Text>
            <Badge
              text={getStatusText(job.status)}
              variant={getStatusColor(job.status)}
              size="small"
            />
          </View>
        </View>

        <Text style={styles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>

        <View style={styles.jobFooter}>
          <View style={styles.jobInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666666" />
            <Text style={styles.jobInfoText}>
              {format(new Date(job.createdAt), 'MMM d, yyyy')}
            </Text>
          </View>

          {job.urgency && (
            <View style={styles.jobInfo}>
              <Ionicons
                name={
                  job.urgency === 'emergency'
                    ? 'alert-circle'
                    : 'time-outline'
                }
                size={16}
                color={job.urgency === 'emergency' ? '#FF3B30' : '#666666'}
              />
              <Text
                style={[
                  styles.jobInfoText,
                  job.urgency === 'emergency' && styles.urgentText,
                ]}
              >
                {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {job.tradesperson && (
          <View style={styles.tradespersonInfo}>
            <Ionicons name="person" size={16} color="#0080FF" />
            <Text style={styles.tradespersonName}>
              {job.tradesperson.firstName} {job.tradesperson.lastName}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing && jobs.length === 0) {
    return <LoadingSpinner text="Loading your jobs..." />;
  }

  if (error && jobs.length === 0) {
    return (
      <ErrorMessage
        message={error}
        onRetry={loadJobs}
        variant="card"
      />
    );
  }

  const filteredJobs = filterJobs();

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'all' && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'active' && styles.filterTabActive,
          ]}
          onPress={() => setFilter('active')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'active' && styles.filterTabTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'completed' && styles.filterTabActive,
          ]}
          onPress={() => setFilter('completed')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'completed' && styles.filterTabTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderJobCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title="No Jobs Yet"
            message="You haven't created any job requests yet. Tap the button below to create your first job."
            actionText="Create Job"
            onAction={() => navigation.navigate('CreateJob')}
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: '#E5F3FF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  filterTabTextActive: {
    color: '#0080FF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  jobCard: {
    marginBottom: 12,
  },
  jobHeader: {
    marginBottom: 8,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginRight: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobInfoText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  urgentText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  tradespersonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tradespersonName: {
    fontSize: 14,
    color: '#0080FF',
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default JobsScreen;
