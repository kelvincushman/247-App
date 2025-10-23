import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { selectUser } from '../../redux/slices/authSlice';
import { Card, Badge, Button, LoadingSpinner } from '../../components/ui';
import { jobService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { format, formatDistanceToNow } from 'date-fns';
import { TRADE_CATEGORIES } from '../../utils/constants';

/**
 * Available Jobs Screen
 * Shows available jobs that tradespeople can browse and accept
 * Filters by category, location, and urgency
 */

const AvailableJobsScreen = ({ navigation }) => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('distance'); // distance, date, price

  useEffect(() => {
    loadCurrentLocation();
    loadAvailableJobs();
  }, []);

  useEffect(() => {
    loadAvailableJobs();
  }, [selectedCategory, sortBy]);

  const loadCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'info',
          text1: 'Location Permission',
          text2: 'Enable location to see nearby jobs',
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      console.error('Failed to get location:', err);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      setLoading(true);

      const params = {
        status: 'requested',
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        sortBy,
        ...(currentLocation && {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 50, // 50km radius
        }),
      };

      const response = await jobService.getAvailableJobs(params);
      setJobs(response.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load available jobs',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAvailableJobs();
    setRefreshing(false);
  };

  const handleJobPress = (job) => {
    navigation.navigate('JobDetails', { jobId: job.id });
  };

  const getDistanceText = (job) => {
    if (!currentLocation || !job.location) return '';

    const distance = job.distance || calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      job.location.latitude,
      job.location.longitude
    );

    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'emergency':
        return 'danger';
      case 'urgent':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (categoryId) => {
    const category = TRADE_CATEGORIES.find((c) => c.id === categoryId);
    return category?.icon || '🔧';
  };

  const renderJobCard = ({ item: job }) => (
    <TouchableOpacity onPress={() => handleJobPress(job)}>
      <Card style={styles.jobCard}>
        {/* Job Header */}
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleContainer}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(job.category)}</Text>
            <View style={styles.jobTitleText}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCategory}>{job.category}</Text>
            </View>
          </View>
          {job.urgency && job.urgency !== 'normal' && (
            <Badge
              text={job.urgency.toUpperCase()}
              variant={getUrgencyColor(job.urgency)}
              size="small"
            />
          )}
        </View>

        {/* Job Description */}
        <Text style={styles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>

        {/* Job Details */}
        <View style={styles.jobDetails}>
          {/* Location */}
          {job.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color="#FF9500" />
              <Text style={styles.detailText} numberOfLines={1}>
                {job.location.address}
              </Text>
            </View>
          )}

          {/* Distance */}
          {currentLocation && (
            <View style={styles.detailRow}>
              <Ionicons name="navigate" size={16} color="#0080FF" />
              <Text style={styles.detailText}>{getDistanceText(job)}</Text>
            </View>
          )}

          {/* Time Posted */}
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#666666" />
            <Text style={styles.detailText}>
              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>

        {/* Job Footer */}
        <View style={styles.jobFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Est. Budget</Text>
            <Text style={styles.priceValue}>£{job.estimatedPrice?.toFixed(2) || 'TBD'}</Text>
          </View>
          <Button
            title="View Details"
            onPress={() => handleJobPress(job)}
            variant="primary"
            size="small"
            icon="arrow-forward"
          />
        </View>

        {/* Images Indicator */}
        {job.images && job.images.length > 0 && (
          <View style={styles.imagesIndicator}>
            <Ionicons name="images" size={14} color="#666666" />
            <Text style={styles.imagesCount}>{job.images.length} photo(s)</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Jobs Available</Text>
      <Text style={styles.emptyText}>
        {selectedCategory !== 'all'
          ? 'Try selecting a different category or check back later'
          : 'Check back later for new job opportunities'}
      </Text>
      {selectedCategory !== 'all' && (
        <Button
          title="View All Categories"
          onPress={() => setSelectedCategory('all')}
          variant="outline"
          size="medium"
          style={styles.emptyButton}
        />
      )}
    </View>
  );

  if (loading && jobs.length === 0) {
    return <LoadingSpinner text="Loading available jobs..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}
            >
              All Jobs
            </Text>
          </TouchableOpacity>

          {TRADE_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.filterChip,
                selectedCategory === category.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.filterChipIcon}>{category.icon}</Text>
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === category.id && styles.filterChipTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.sortButton} onPress={() => {
          Alert.alert('Sort By', 'Choose sorting option', [
            { text: 'Distance', onPress: () => setSortBy('distance') },
            { text: 'Date Posted', onPress: () => setSortBy('date') },
            { text: 'Price', onPress: () => setSortBy('price') },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }}>
          <Ionicons name="funnel" size={20} color="#FF9500" />
        </TouchableOpacity>
      </View>

      {/* Jobs List */}
      <FlatList
        data={jobs}
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
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryScroll: {
    flex: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterChipIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortButton: {
    padding: 12,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  jobCard: {
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  jobTitleText: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  jobCategory: {
    fontSize: 12,
    color: '#999999',
    textTransform: 'capitalize',
  },
  jobDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  jobDetails: {
    gap: 8,
    marginBottom: 16,
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
  imagesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  imagesCount: {
    fontSize: 12,
    color: '#666666',
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
  emptyButton: {
    marginTop: 24,
  },
});

export default AvailableJobsScreen;
