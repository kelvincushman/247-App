import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { selectUser } from '../../redux/slices/authSlice';
import { Card, Badge, Button, LoadingSpinner, Avatar } from '../../components/ui';
import { jobService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import { JOB_STATUS, PAYMENT_STATUS } from '../../utils/constants';

/**
 * Tradesperson Job Details Screen
 * Shows job details with actions: accept, start, track GPS, mark complete
 * CRITICAL: Mark complete triggers customer payment confirmation
 */

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [acceptingJob, setAcceptingJob] = useState(false);
  const [startingJob, setStartingJob] = useState(false);
  const [completingJob, setCompletingJob] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  // Store location subscription in ref for proper cleanup
  const locationSubscriptionRef = useRef(null);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  useEffect(() => {
    // Start GPS tracking if job is in progress
    if (job?.status === JOB_STATUS.IN_PROGRESS && !tracking) {
      startGPSTracking();
    }

    return () => {
      // Properly cleanup location subscription on unmount
      stopGPSTracking();
    };
  }, [job?.status]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const response = await jobService.getJobById(jobId);
      setJob(response.job);
    } catch (err) {
      console.error('Failed to load job:', err);
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Failed to load job details',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const startGPSTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'info',
          text1: 'Location Required',
          text2: 'Enable location to track job progress',
        });
        return;
      }

      setTracking(true);

      // Watch position for continuous tracking
      // FIXED: Changed from High to Balanced accuracy (10x less battery drain)
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Changed from High to save battery
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Or every 50 meters
        },
        async (location) => {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          // Send location update to backend
          try {
            await jobService.updateJobLocation(jobId, {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Failed to update location:', err);
          }
        }
      );

    } catch (err) {
      console.error('Failed to start GPS tracking:', err);
      Toast.show({
        type: 'error',
        text1: 'Tracking Error',
        text2: 'Failed to start location tracking',
      });
    }
  };

  const stopGPSTracking = () => {
    // FIXED: Actually remove the location subscription to prevent memory leak
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    setTracking(false);
    setCurrentLocation(null);
  };

  const handleAcceptJob = () => {
    setShowQuoteForm(true);
  };

  const handleSubmitQuote = async () => {
    if (!quoteAmount || parseFloat(quoteAmount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Quote',
        text2: 'Please enter a valid quote amount',
      });
      return;
    }

    Alert.alert(
      'Confirm Job Acceptance',
      `Submit quote of £${parseFloat(quoteAmount).toFixed(2)} for this job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Job',
          onPress: async () => {
            try {
              setAcceptingJob(true);

              await jobService.acceptJob(jobId, {
                quoteAmount: parseFloat(quoteAmount),
                notes: quoteNotes,
                estimatedDuration: '2-4 hours', // Could be user input
              });

              Toast.show({
                type: 'success',
                text1: 'Job Accepted!',
                text2: 'Customer has been notified',
              });

              setShowQuoteForm(false);
              loadJob();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Acceptance Failed',
                text2: err.message || 'Failed to accept job',
              });
            } finally {
              setAcceptingJob(false);
            }
          },
        },
      ]
    );
  };

  const handleStartJob = () => {
    Alert.alert(
      'Start Job',
      'Mark this job as in progress? GPS tracking will be enabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Job',
          onPress: async () => {
            try {
              setStartingJob(true);

              await jobService.startJob(jobId);

              Toast.show({
                type: 'success',
                text1: 'Job Started',
                text2: 'GPS tracking is now active',
              });

              loadJob();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Start Failed',
                text2: err.message || 'Failed to start job',
              });
            } finally {
              setStartingJob(false);
            }
          },
        },
      ]
    );
  };

  const handleMarkComplete = () => {
    Alert.alert(
      'Mark Job Complete',
      'Have you finished all work for this job? The customer will be notified to confirm completion and release payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            try {
              setCompletingJob(true);

              // FIXED: Verify payment was held before showing success
              const response = await jobService.markJobComplete(jobId, {
                finalPrice: job.estimatedPrice, // Could allow tradesperson to adjust
                completionNotes: 'Job completed successfully',
                completedAt: new Date().toISOString(),
              });

              stopGPSTracking();

              // FIXED: Verify payment status from response before showing success
              if (response.job?.paymentStatus === PAYMENT_STATUS.HELD) {
                Toast.show({
                  type: 'success',
                  text1: 'Job Marked Complete!',
                  text2: 'Payment secured. Customer will confirm to release.',
                });
              } else if (response.job) {
                // Job updated but payment status unclear - show warning
                Toast.show({
                  type: 'warning',
                  text1: 'Job Updated',
                  text2: 'Please check payment status with support',
                });
              } else {
                // No job in response - something went wrong
                throw new Error('Job completion response missing job data');
              }

              loadJob();
            } catch (err) {
              console.error('Failed to mark job complete:', err);
              Toast.show({
                type: 'error',
                text1: 'Failed to Complete',
                text2: err.message || 'Failed to mark job complete. Please try again.',
              });
            } finally {
              setCompletingJob(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading job details..." />;
  }

  if (!job) {
    return null;
  }

  const getStatusText = (status) => {
    switch (status) {
      case JOB_STATUS.REQUESTED:
        return 'Available';
      case JOB_STATUS.ASSIGNED:
      case JOB_STATUS.ACCEPTED:
        return 'Accepted';
      case JOB_STATUS.IN_PROGRESS:
        return 'In Progress';
      case JOB_STATUS.COMPLETED:
        return 'Completed';
      case JOB_STATUS.CANCELLED:
        return 'Cancelled';
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
        return 'danger';
      default:
        return 'default';
    }
  };

  // Determine what actions are available
  const canAccept = job.status === JOB_STATUS.REQUESTED;
  const canStart = job.status === JOB_STATUS.ACCEPTED || job.status === JOB_STATUS.ASSIGNED;
  const canComplete = job.status === JOB_STATUS.IN_PROGRESS;
  const isCompleted = job.status === JOB_STATUS.COMPLETED;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Badge
              text={getStatusText(job.status)}
              variant={getStatusColor(job.status)}
              size="large"
            />
            {tracking && (
              <View style={styles.trackingIndicator}>
                <View style={styles.trackingDot} />
                <Text style={styles.trackingText}>GPS Active</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Job Title */}
        <Card style={styles.card}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.categoryRow}>
            <Ionicons name="pricetag" size={16} color="#FF9500" />
            <Text style={styles.categoryText}>{job.category}</Text>
          </View>
        </Card>

        {/* Customer Information */}
        {job.customer && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <View style={styles.customerRow}>
              <Avatar
                source={
                  job.customer.profilePicture
                    ? { uri: job.customer.profilePicture }
                    : null
                }
                name={`${job.customer.firstName} ${job.customer.lastName}`}
                size="medium"
              />
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {job.customer.firstName} {job.customer.lastName}
                </Text>
                <Text style={styles.customerPhone}>{job.customer.phone || 'No phone'}</Text>
              </View>
              <Button
                title="Message"
                onPress={() =>
                  navigation.navigate('Messages', {
                    conversationId: job.conversationId,
                  })
                }
                variant="outline"
                size="small"
                icon="chatbubble-outline"
              />
            </View>
          </Card>
        )}

        {/* Price Information */}
        <Card style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <Ionicons name="cash" size={24} color="#34C759" />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          <View style={styles.priceContent}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {job.finalPrice ? 'Final Price' : 'Est. Budget'}
              </Text>
              <Text style={styles.priceValue}>
                £{(job.finalPrice || job.estimatedPrice)?.toFixed(2)}
              </Text>
            </View>
            {job.paymentStatus && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Status</Text>
                <Badge
                  text={job.paymentStatus.toUpperCase()}
                  variant={
                    job.paymentStatus === PAYMENT_STATUS.RELEASED
                      ? 'success'
                      : job.paymentStatus === PAYMENT_STATUS.HELD
                      ? 'warning'
                      : 'default'
                  }
                  size="small"
                />
              </View>
            )}
          </View>
        </Card>

        {/* Job Details */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Job Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Urgency</Text>
            <Badge
              text={job.urgency?.toUpperCase() || 'NORMAL'}
              variant={job.urgency === 'emergency' ? 'danger' : 'warning'}
              size="small"
            />
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Posted</Text>
            <Text style={styles.detailValue}>
              {format(new Date(job.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
        </Card>

        {/* Description */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </Card>

        {/* Photos */}
        {job.images && job.images.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Photos ({job.images.length})</Text>
            <View style={styles.imagesGrid}>
              {job.images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image.url || image.uri }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))}
            </View>
          </Card>
        )}

        {/* Location */}
        {job.location && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={20} color="#FF9500" />
              <Text style={styles.locationText}>{job.location.address}</Text>
            </View>
            {currentLocation && (
              <View style={styles.distanceInfo}>
                <Ionicons name="navigate" size={16} color="#0080FF" />
                <Text style={styles.distanceText}>Your location is being tracked</Text>
              </View>
            )}
          </Card>
        )}

        {/* Quote Form (for accepting job) */}
        {showQuoteForm && canAccept && (
          <Card style={styles.quoteCard}>
            <Text style={styles.sectionTitle}>Submit Your Quote</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quote Amount (£) *</Text>
              <TextInput
                style={styles.input}
                value={quoteAmount}
                onChangeText={setQuoteAmount}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={quoteNotes}
                onChangeText={setQuoteNotes}
                placeholder="Any additional details about your quote..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.quoteActions}>
              <Button
                title="Cancel"
                onPress={() => setShowQuoteForm(false)}
                variant="ghost"
                size="medium"
                style={{ flex: 1 }}
              />
              <Button
                title="Submit Quote"
                onPress={handleSubmitQuote}
                loading={acceptingJob}
                disabled={acceptingJob}
                variant="success"
                size="medium"
                icon="checkmark"
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canAccept && !showQuoteForm && (
            <Button
              title="Accept Job & Quote"
              onPress={handleAcceptJob}
              variant="success"
              size="large"
              fullWidth
              icon="checkmark-circle"
            />
          )}

          {canStart && (
            <Button
              title="Start Job"
              onPress={handleStartJob}
              loading={startingJob}
              disabled={startingJob}
              variant="primary"
              size="large"
              fullWidth
              icon="play-circle"
            />
          )}

          {canComplete && (
            <Card style={styles.completeCard}>
              <View style={styles.completeHeader}>
                <Ionicons name="checkmark-done-circle" size={32} color="#34C759" />
                <Text style={styles.completeTitle}>Ready to Complete?</Text>
              </View>
              <Text style={styles.completeMessage}>
                Mark this job as complete when all work is finished. The customer will be
                asked to confirm and release your payment.
              </Text>
              <Button
                title="Mark Job Complete"
                onPress={handleMarkComplete}
                loading={completingJob}
                disabled={completingJob}
                variant="success"
                size="large"
                fullWidth
                icon="checkmark-done"
              />
            </Card>
          )}

          {isCompleted && job.paymentStatus === PAYMENT_STATUS.HELD && (
            <Card style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Ionicons name="hourglass" size={28} color="#FF9500" />
                <Text style={styles.pendingTitle}>Awaiting Customer Confirmation</Text>
              </View>
              <Text style={styles.pendingMessage}>
                Your payment of £{job.finalPrice?.toFixed(2)} will be released once the
                customer confirms the work is satisfactory.
              </Text>
            </Card>
          )}

          {isCompleted && job.paymentStatus === PAYMENT_STATUS.RELEASED && (
            <Card style={styles.paidCard}>
              <View style={styles.paidHeader}>
                <Ionicons name="checkmark-circle" size={32} color="#34C759" />
                <Text style={styles.paidTitle}>Payment Released!</Text>
              </View>
              <Text style={styles.paidMessage}>
                £{job.finalPrice?.toFixed(2)} has been released to your account.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  card: {
    marginBottom: 16,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666666',
  },
  priceCard: {
    marginBottom: 16,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContent: {
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666666',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 22,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  image: {
    width: '48%',
    height: 150,
    borderRadius: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    lineHeight: 20,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  distanceText: {
    fontSize: 12,
    color: '#0080FF',
    marginLeft: 6,
  },
  quoteCard: {
    marginBottom: 16,
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actions: {
    gap: 16,
  },
  completeCard: {
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  completeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginLeft: 8,
  },
  completeMessage: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 16,
  },
  pendingCard: {
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9500',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
    marginLeft: 8,
  },
  pendingMessage: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  paidCard: {
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  paidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paidTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
    marginLeft: 8,
  },
  paidMessage: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
  },
});

export default JobDetailsScreen;
