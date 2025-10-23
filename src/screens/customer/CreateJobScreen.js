import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, Card, LoadingSpinner } from '../../components/ui';
import { TRADE_CATEGORIES, JOB_URGENCY, MAX_IMAGES_PER_JOB } from '../../utils/constants';
import { createJob, selectJobsLoading, selectJobsError } from '../../redux/slices/jobsSlice';
import Toast from 'react-native-toast-message';

/**
 * Create Job Screen
 * Allows customers to create new job requests with photos
 */

const CreateJobSchema = Yup.object().shape({
  category: Yup.string().required('Please select a trade category'),
  title: Yup.string()
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must be less than 100 characters')
    .required('Job title is required'),
  description: Yup.string()
    .min(50, 'Description must be at least 50 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .required('Job description is required'),
  urgency: Yup.string().required('Please select urgency level'),
});

const CreateJobScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectJobsLoading);
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Request location permissions and get current location
  const requestLocation = async () => {
    try {
      setLoadingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Location permission is required to create a job',
        });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const address = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.trim();

        setLocation({
          address,
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        Toast.show({
          type: 'success',
          text1: 'Location Added',
          text2: address,
        });
      }
    } catch (error) {
      console.error('Location error:', error);
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: 'Failed to get your location',
      });
    } finally {
      setLoadingLocation(false);
    }
  };

  // Pick images from library
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Photo library permission is required',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_IMAGES_PER_JOB - images.length,
      });

      if (!result.canceled && result.assets) {
        setImages([...images, ...result.assets]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'Image Error',
        text2: 'Failed to pick images',
      });
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Camera permission is required',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setImages([...images, ...result.assets]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to take photo',
      });
    }
  };

  // Remove image
  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Handle job submission
  const handleSubmit = async (values) => {
    if (!location) {
      Toast.show({
        type: 'error',
        text1: 'Location Required',
        text2: 'Please add your job location',
      });
      return;
    }

    try {
      const jobData = {
        ...values,
        location,
        images,
      };

      await dispatch(createJob(jobData)).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Job Created!',
        text2: 'Your job request has been posted',
      });

      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to Create Job',
        text2: error || 'Something went wrong',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Formik
            initialValues={{
              category: '',
              title: '',
              description: '',
              urgency: 'medium',
            }}
            validationSchema={CreateJobSchema}
            onSubmit={handleSubmit}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
              <View style={styles.form}>
                {/* Category Selection */}
                <View style={styles.section}>
                  <Text style={styles.label}>Trade Category *</Text>
                  <View style={styles.categories}>
                    {TRADE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setFieldValue('category', cat.id)}
                        style={[
                          styles.categoryCard,
                          values.category === cat.id && styles.categoryCardSelected,
                        ]}
                      >
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                        <Text
                          style={[
                            styles.categoryName,
                            values.category === cat.id && styles.categoryNameSelected,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {touched.category && errors.category && (
                    <Text style={styles.errorText}>{errors.category}</Text>
                  )}
                </View>

                {/* Job Title */}
                <Input
                  label="Job Title *"
                  placeholder="e.g., Fix broken light switch in kitchen"
                  value={values.title}
                  onChangeText={handleChange('title')}
                  onBlur={handleBlur('title')}
                  error={touched.title && errors.title}
                  editable={!isLoading}
                />

                {/* Job Description */}
                <Input
                  label="Description *"
                  placeholder="Please provide details about the job, what needs to be done, any specific requirements..."
                  value={values.description}
                  onChangeText={handleChange('description')}
                  onBlur={handleBlur('description')}
                  error={touched.description && errors.description}
                  multiline
                  numberOfLines={6}
                  editable={!isLoading}
                />

                {/* Urgency Level */}
                <View style={styles.section}>
                  <Text style={styles.label}>Urgency Level *</Text>
                  <View style={styles.urgencyButtons}>
                    {Object.entries(JOB_URGENCY).map(([key, value]) => (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setFieldValue('urgency', value)}
                        style={[
                          styles.urgencyButton,
                          values.urgency === value && styles.urgencyButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            values.urgency === value && styles.urgencyTextSelected,
                          ]}
                        >
                          {key.charAt(0) + key.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Location */}
                <View style={styles.section}>
                  <Text style={styles.label}>Job Location *</Text>
                  {location ? (
                    <Card style={styles.locationCard}>
                      <View style={styles.locationContent}>
                        <Ionicons name="location" size={24} color="#0080FF" />
                        <View style={styles.locationText}>
                          <Text style={styles.locationAddress}>{location.address}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setLocation(null)}>
                          <Ionicons name="close-circle" size={24} color="#999999" />
                        </TouchableOpacity>
                      </View>
                    </Card>
                  ) : (
                    <Button
                      title="Add Location"
                      onPress={requestLocation}
                      loading={loadingLocation}
                      disabled={loadingLocation || isLoading}
                      variant="outline"
                      icon="location-outline"
                      fullWidth
                    />
                  )}
                </View>

                {/* Photos */}
                <View style={styles.section}>
                  <Text style={styles.label}>
                    Photos (Optional - Up to {MAX_IMAGES_PER_JOB})
                  </Text>

                  {images.length > 0 && (
                    <View style={styles.imagesGrid}>
                      {images.map((image, index) => (
                        <View key={index} style={styles.imageContainer}>
                          <Image source={{ uri: image.uri }} style={styles.image} />
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={24} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {images.length < MAX_IMAGES_PER_JOB && (
                    <View style={styles.photoButtons}>
                      <Button
                        title="Take Photo"
                        onPress={takePhoto}
                        disabled={isLoading}
                        variant="outline"
                        icon="camera-outline"
                        style={styles.photoButton}
                      />
                      <Button
                        title="Choose from Library"
                        onPress={pickImages}
                        disabled={isLoading}
                        variant="outline"
                        icon="images-outline"
                        style={styles.photoButton}
                      />
                    </View>
                  )}
                </View>

                {/* Submit Button */}
                <Button
                  title="Create Job Request"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                  variant="primary"
                  size="large"
                  fullWidth
                  style={styles.submitButton}
                />
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryCard: {
    width: '30%',
    margin: 6,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  categoryCardSelected: {
    borderColor: '#0080FF',
    backgroundColor: '#E5F3FF',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  categoryNameSelected: {
    fontWeight: '600',
    color: '#0080FF',
  },
  urgencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  urgencyButton: {
    flex: 1,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  urgencyButtonSelected: {
    backgroundColor: '#0080FF',
    borderColor: '#0080FF',
  },
  urgencyText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  urgencyTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  locationCard: {
    padding: 12,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    marginLeft: 12,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333333',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  imageContainer: {
    width: '31%',
    margin: 4,
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  photoButton: {
    flex: 1,
    margin: 4,
  },
  submitButton: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});

export default CreateJobScreen;
