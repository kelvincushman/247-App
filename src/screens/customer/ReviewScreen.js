import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button, Input, Card } from '../../components/ui';
import { reviewService } from '../../api/services';
import Toast from 'react-native-toast-message';

/**
 * Review Screen
 * Submit rating and review for completed job
 */

const ReviewSchema = Yup.object().shape({
  comment: Yup.string()
    .min(20, 'Review must be at least 20 characters')
    .max(500, 'Review must be less than 500 characters')
    .required('Please write a review'),
});

const ReviewScreen = ({ route, navigation }) => {
  const { jobId, tradesperson } = route.params;
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewTags = [
    'Professional',
    'On Time',
    'Quality Work',
    'Good Communication',
    'Fair Price',
    'Clean & Tidy',
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (values) => {
    if (rating === 0) {
      Toast.show({
        type: 'error',
        text1: 'Rating Required',
        text2: 'Please select a star rating',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      await reviewService.submitReview(jobId, {
        rating,
        comment: values.comment,
        tags: selectedTags,
      });

      Toast.show({
        type: 'success',
        text1: 'Review Submitted!',
        text2: 'Thank you for your feedback',
      });

      navigation.goBack();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: err.response?.data?.message || 'Failed to submit review',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <Text style={styles.headerTitle}>Rate Your Experience</Text>
          <Text style={styles.headerSubtitle}>
            How was your experience with {tradesperson?.firstName}?
          </Text>
        </Card>

        {/* Star Rating */}
        <Card style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Rating *</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={48}
                  color={star <= rating ? '#FFB800' : '#E0E0E0'}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          )}
        </Card>

        {/* Review Form */}
        <Formik
          initialValues={{ comment: '' }}
          validationSchema={ReviewSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <>
              <Card style={styles.card}>
                <Input
                  label="Your Review *"
                  placeholder="Tell us about your experience..."
                  value={values.comment}
                  onChangeText={handleChange('comment')}
                  onBlur={handleBlur('comment')}
                  error={touched.comment && errors.comment}
                  multiline
                  numberOfLines={6}
                  editable={!isSubmitting}
                />
              </Card>

              {/* Tags */}
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Tags (Optional)</Text>
                <View style={styles.tagsContainer}>
                  {reviewTags.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[
                        styles.tagChip,
                        selectedTags.includes(tag) && styles.tagChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          selectedTags.includes(tag) && styles.tagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>

              {/* Submit Button */}
              <Button
                title="Submit Review"
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting || rating === 0}
                variant="primary"
                size="large"
                fullWidth
                icon="checkmark-circle"
                style={styles.submitButton}
              />
            </>
          )}
        </Formik>
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
  headerCard: {
    marginBottom: 16,
    backgroundColor: '#E5F3FF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  ratingCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0080FF',
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tagChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    margin: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagChipSelected: {
    backgroundColor: '#0080FF',
    borderColor: '#0080FF',
  },
  tagText: {
    fontSize: 14,
    color: '#666666',
  },
  tagTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default ReviewScreen;
