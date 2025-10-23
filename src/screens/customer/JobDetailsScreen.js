import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  Card,
  Badge,
  Button,
  Avatar,
  LoadingSpinner,
  ErrorMessage,
} from '../../components/ui';
import {
  getJob,
  confirmCompletion,
  cancelJob,
  disputeJob,
  selectCurrentJob,
  selectJobsLoading,
  selectJobsError,
} from '../../redux/slices/jobsSlice';
import { JOB_STATUS, PAYMENT_STATUS } from '../../utils/constants';
import Toast from 'react-native-toast-message';

/**
 * Job Details Screen
 * CRITICAL: Handles job completion confirmation which triggers payment release
 *
 * Payment Flow:
 * 1. Job created → No payment
 * 2. Tradesperson accepts with quote → Customer authorizes payment hold
 * 3. Payment held in escrow → Job can start
 * 4. Tradesperson marks complete → Waiting customer confirmation
 * 5. Customer confirms completion → PAYMENT RELEASED to tradesperson
 */
const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const dispatch = useDispatch();
  const job = useSelector(selectCurrentJob);
  const isLoading = useSelector(selectJobsLoading);
  const error = useSelector(selectJobsError);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      await dispatch(getJob(jobId)).unwrap();
    } catch (err) {
      console.error('Failed to load job:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case JOB_STATUS.REQUESTED:
        return '#5AC8FA';
      case JOB_STATUS.ASSIGNED:
      case JOB_STATUS.ACCEPTED:
        return '#0080FF';
      case JOB_STATUS.IN_PROGRESS:
        return '#FF9500';
      case JOB_STATUS.COMPLETED:
        return '#34C759';
      case JOB_STATUS.CANCELLED:
      case JOB_STATUS.DISPUTED:
        return '#FF3B30';
      default:
        return '#999999';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case PAYMENT_STATUS.PENDING:
        return 'info';
      case PAYMENT_STATUS.HELD:
        return 'warning';
      case PAYMENT_STATUS.COMPLETED:
        return 'success';
      case PAYMENT_STATUS.REFUNDED:
      case PAYMENT_STATUS.FAILED:
        return 'danger';
      default:
        return 'default';
    }
  };

  /**
   * CRITICAL: Confirm job completion
   * This triggers payment release to tradesperson
   */
  const handleConfirmCompletion = () => {
    Alert.alert(
      'Confirm Job Completion',
      `Are you satisfied with the work? This will release payment of £${job.finalPrice || job.estimatedPrice} to ${job.tradesperson?.firstName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          style: 'default',
          onPress: async () => {
            try {
              setConfirmingCompletion(true);
              await dispatch(confirmCompletion(jobId)).unwrap();

              Toast.show({
                type: 'success',
                text1: 'Job Completed!',
                text2: 'Payment has been released to the tradesperson',
              });

              loadJob(); // Reload to show updated status
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Confirmation Failed',
                text2: err || 'Failed to confirm completion',
              });
            } finally {
              setConfirmingCompletion(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelJob = () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const reason = 'Customer cancelled'; // Could show input dialog
              await dispatch(cancelJob({ jobId, reason })).unwrap();

              Toast.show({
                type: 'success',
                text1: 'Job Cancelled',
                text2: 'The job has been cancelled',
              });

              navigation.goBack();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Cancellation Failed',
                text2: err || 'Failed to cancel job',
              });
            }
          },
        },
      ]
    );
  };

  const handleDispute = () => {
    Alert.alert(
      'Dispute Job',
      'Are you having issues with this job? Our support team will review your case.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'File Dispute',
          style: 'destructive',
          onPress: async () => {
            try {
              const disputeData = {
                reason: 'Customer dispute',
                details: 'Customer is not satisfied with the work',
                evidence: [],
              };

              await dispatch(disputeJob({ jobId, data: disputeData })).unwrap();

              Toast.show({
                type: 'success',
                text1: 'Dispute Filed',
                text2: 'Our support team will contact you shortly',
              });

              loadJob();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Dispute Failed',
                text2: err || 'Failed to file dispute',
              });
            }
          },
        },
      ]
    );
  };

  if (isLoading && !job) {
    return <LoadingSpinner text="Loading job details..." />;
  }

  if (error && !job) {
    return <ErrorMessage message={error} onRetry={loadJob} />;
  }

  if (!job) {
    return <EmptyState title="Job Not Found" message="This job could not be loaded" />;
  }

  const canCancel =
    job.status === JOB_STATUS.REQUESTED || job.status === JOB_STATUS.ASSIGNED;

  const canConfirmCompletion = job.status === JOB_STATUS.COMPLETED;

  const canDispute =
    job.status === JOB_STATUS.IN_PROGRESS || job.status === JOB_STATUS.COMPLETED;

  // Show review button when job is completed and payment is released
  const canWriteReview =
    job.status === JOB_STATUS.COMPLETED &&
    job.paymentStatus === PAYMENT_STATUS.RELEASED;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <Card style={[styles.statusCard, { borderLeftColor: getStatusColor(job.status) }]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                {job.status.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
              </Text>
            </View>
            <Ionicons
              name={
                job.status === JOB_STATUS.COMPLETED
                  ? 'checkmark-circle'
                  : job.status === JOB_STATUS.IN_PROGRESS
                  ? 'time'
                  : 'information-circle'
              }
              size={40}
              color={getStatusColor(job.status)}
            />
          </View>
        </Card>

        {/* CRITICAL: Payment Status - Prominently Displayed */}
        {job.paymentStatus && (
          <Card style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Ionicons name="card" size={24} color="#0080FF" />
              <Text style={styles.paymentTitle}>Payment Status</Text>
            </View>

            <View style={styles.paymentContent}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Status:</Text>
                <Badge
                  text={job.paymentStatus.toUpperCase()}
                  variant={getPaymentStatusColor(job.paymentStatus)}
                />
              </View>

              {job.estimatedPrice && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Estimated Price:</Text>
                  <Text style={styles.paymentValue}>£{job.estimatedPrice.toFixed(2)}</Text>
                </View>
              )}

              {job.finalPrice && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Final Price:</Text>
                  <Text style={styles.paymentValueFinal}>£{job.finalPrice.toFixed(2)}</Text>
                </View>
              )}

              {/* Payment Status Explanation */}
              {job.paymentStatus === PAYMENT_STATUS.HELD && (
                <View style={styles.paymentInfo}>
                  <Ionicons name="shield-checkmark" size={16} color="#34C759" />
                  <Text style={styles.paymentInfoText}>
                    Payment securely held until job completion
                  </Text>
                </View>
              )}

              {job.paymentStatus === PAYMENT_STATUS.COMPLETED && (
                <View style={styles.paymentInfo}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.paymentInfoText}>
                    Payment released to tradesperson
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Job Information */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Job Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{job.category}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{job.title}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Urgency</Text>
            <Badge
              text={job.urgency?.toUpperCase() || 'MEDIUM'}
              variant={job.urgency === 'emergency' ? 'danger' : 'warning'}
              size="small"
            />
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
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
            <Text style={styles.sectionTitle}>Photos</Text>
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
              <Ionicons name="location" size={20} color="#0080FF" />
              <Text style={styles.locationText}>{job.location.address}</Text>
            </View>
          </Card>
        )}

        {/* Tradesperson Information */}
        {job.tradesperson && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Tradesperson</Text>
            <View style={styles.tradespersonRow}>
              <Avatar
                source={
                  job.tradesperson.profilePicture
                    ? { uri: job.tradesperson.profilePicture }
                    : null
                }
                name={`${job.tradesperson.firstName} ${job.tradesperson.lastName}`}
                size="large"
              />
              <View style={styles.tradespersonInfo}>
                <Text style={styles.tradespersonName}>
                  {job.tradesperson.firstName} {job.tradesperson.lastName}
                </Text>
                {job.tradesperson.rating && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={16} color="#FFB800" />
                    <Text style={styles.ratingText}>
                      {job.tradesperson.rating.toFixed(1)} ({job.tradesperson.reviewCount || 0} reviews)
                    </Text>
                  </View>
                )}
                {job.tradesperson.businessName && (
                  <Text style={styles.businessName}>{job.tradesperson.businessName}</Text>
                )}
              </View>
            </View>

            <Button
              title="Message"
              onPress={() => navigation.navigate('Messages', { jobId: job.id })}
              variant="outline"
              icon="chatbubble-outline"
              fullWidth
              style={styles.messageButton}
            />
          </Card>
        )}

        {/* CRITICAL: Job Completion Actions */}
        {canConfirmCompletion && (
          <Card style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#34C759" />
              <Text style={styles.completionTitle}>Job Marked Complete</Text>
            </View>

            <Text style={styles.completionMessage}>
              The tradesperson has marked this job as complete. Please review the work and
              confirm completion to release payment.
            </Text>

            <View style={styles.completionPrice}>
              <Text style={styles.completionPriceLabel}>Final Amount:</Text>
              <Text style={styles.completionPriceValue}>
                £{(job.finalPrice || job.estimatedPrice).toFixed(2)}
              </Text>
            </View>

            <Button
              title="Confirm Completion & Release Payment"
              onPress={handleConfirmCompletion}
              loading={confirmingCompletion}
              disabled={confirmingCompletion}
              variant="success"
              size="large"
              fullWidth
              icon="checkmark-done"
            />

            <Button
              title="Report an Issue"
              onPress={handleDispute}
              variant="ghost"
              size="medium"
              fullWidth
              style={styles.disputeButton}
            />
          </Card>
        )}

        {/* Review Section - After Payment Released */}
        {canWriteReview && (
          <Card style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Ionicons name="star" size={28} color="#FFB800" />
              <Text style={styles.reviewTitle}>Rate Your Experience</Text>
            </View>
            <Text style={styles.reviewMessage}>
              How was your experience with {job.tradesperson?.firstName}? Your feedback helps
              others make informed decisions.
            </Text>
            <Button
              title="Write a Review"
              onPress={() =>
                navigation.navigate('Review', {
                  jobId: job.id,
                  tradesperson: job.tradesperson,
                })
              }
              variant="primary"
              size="large"
              fullWidth
              icon="create-outline"
            />
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canCancel && (
            <Button
              title="Cancel Job"
              onPress={handleCancelJob}
              variant="danger"
              size="large"
              fullWidth
              icon="close-circle"
            />
          )}

          {canDispute && !canConfirmCompletion && (
            <Button
              title="File Dispute"
              onPress={handleDispute}
              variant="outline"
              size="medium"
              fullWidth
              icon="alert-circle-outline"
            />
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
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentCard: {
    marginBottom: 16,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#0080FF',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  paymentContent: {
    gap: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  paymentValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0080FF',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  paymentInfoText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 6,
    flex: 1,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
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
    fontWeight: '500',
    color: '#333333',
  },
  description: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  image: {
    width: '31%',
    aspectRatio: 1,
    margin: 4,
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
  tradespersonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tradespersonInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  tradespersonName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  businessName: {
    fontSize: 12,
    color: '#999999',
  },
  messageButton: {
    marginTop: 8,
  },
  completionCard: {
    marginBottom: 16,
    backgroundColor: '#F0FFF4',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginLeft: 8,
  },
  completionMessage: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 16,
  },
  completionPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  completionPriceLabel: {
    fontSize: 16,
    color: '#666666',
  },
  completionPriceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  disputeButton: {
    marginTop: 8,
  },
  reviewCard: {
    marginBottom: 16,
    backgroundColor: '#FFFBEA',
    borderWidth: 2,
    borderColor: '#FFB800',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 8,
  },
  reviewMessage: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    gap: 12,
  },
});

export default JobDetailsScreen;
