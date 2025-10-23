import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button, Input, Badge } from '../../components/ui';
import {
  registerTradesperson,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from '../../redux/slices/authSlice';
import { TRADE_CATEGORIES } from '../../utils/constants';
import Toast from 'react-native-toast-message';

/**
 * Register Tradesperson Screen
 * Multi-step registration for tradespeople
 */

const Step1Schema = Yup.object().shape({
  firstName: Yup.string().min(2).required('First name is required'),
  lastName: Yup.string().min(2).required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phoneNumber: Yup.string()
    .matches(/^[0-9+\-\s()]+$/, 'Invalid phone number')
    .min(10)
    .required('Phone number is required'),
  password: Yup.string()
    .min(8)
    .matches(/[a-z]/, 'Must contain lowercase')
    .matches(/[A-Z]/, 'Must contain uppercase')
    .matches(/[0-9]/, 'Must contain number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password'),
});

const Step2Schema = Yup.object().shape({
  category: Yup.string().required('Trade category is required'),
  businessName: Yup.string().min(2).required('Business name is required'),
  businessAddress: Yup.string().min(5).required('Business address is required'),
  licenseNumber: Yup.string().required('License number is required'),
  insuranceNumber: Yup.string().required('Insurance number is required'),
  bio: Yup.string().min(50, 'Bio must be at least 50 characters'),
});

const RegisterTradespersonScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: error,
      });
    }
  }, [error]);

  const handleStep1Submit = (values) => {
    setFormData({ ...formData, ...values });
    setCurrentStep(2);
  };

  const handleStep2Submit = async (values) => {
    try {
      const { confirmPassword, ...registerData } = { ...formData, ...values };
      await dispatch(registerTradesperson(registerData)).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Welcome!',
        text2: 'Your tradesperson account has been created',
      });
    } catch (err) {
      // Error handled by useEffect
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tradesperson Registration</Text>
            <Text style={styles.subtitle}>
              Step {currentStep} of 2
            </Text>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]} />
            </View>
          </View>

          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <Formik
              initialValues={{
                firstName: formData.firstName || '',
                lastName: formData.lastName || '',
                email: formData.email || '',
                phoneNumber: formData.phoneNumber || '',
                password: formData.password || '',
                confirmPassword: '',
              }}
              validationSchema={Step1Schema}
              onSubmit={handleStep1Submit}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.form}>
                  <Text style={styles.stepTitle}>Personal Information</Text>

                  <View style={styles.row}>
                    <Input
                      label="First Name"
                      placeholder="John"
                      value={values.firstName}
                      onChangeText={handleChange('firstName')}
                      onBlur={handleBlur('firstName')}
                      error={touched.firstName && errors.firstName}
                      containerStyle={styles.halfInput}
                      leftIcon="person-outline"
                    />
                    <Input
                      label="Last Name"
                      placeholder="Doe"
                      value={values.lastName}
                      onChangeText={handleChange('lastName')}
                      onBlur={handleBlur('lastName')}
                      error={touched.lastName && errors.lastName}
                      containerStyle={styles.halfInput}
                    />
                  </View>

                  <Input
                    label="Email"
                    placeholder="john.doe@example.com"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={touched.email && errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="mail-outline"
                  />

                  <Input
                    label="Phone Number"
                    placeholder="+44 7700 900000"
                    value={values.phoneNumber}
                    onChangeText={handleChange('phoneNumber')}
                    onBlur={handleBlur('phoneNumber')}
                    error={touched.phoneNumber && errors.phoneNumber}
                    keyboardType="phone-pad"
                    leftIcon="call-outline"
                  />

                  <Input
                    label="Password"
                    placeholder="Create a strong password"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    error={touched.password && errors.password}
                    secureTextEntry
                    leftIcon="lock-closed-outline"
                  />

                  <Input
                    label="Confirm Password"
                    placeholder="Re-enter your password"
                    value={values.confirmPassword}
                    onChangeText={handleChange('confirmPassword')}
                    onBlur={handleBlur('confirmPassword')}
                    error={touched.confirmPassword && errors.confirmPassword}
                    secureTextEntry
                    leftIcon="lock-closed-outline"
                  />

                  <Button
                    title="Next"
                    onPress={handleSubmit}
                    variant="primary"
                    size="large"
                    fullWidth
                    icon="arrow-forward"
                    iconPosition="right"
                  />
                </View>
              )}
            </Formik>
          )}

          {/* Step 2: Business Info */}
          {currentStep === 2 && (
            <Formik
              initialValues={{
                category: formData.category || '',
                businessName: formData.businessName || '',
                businessAddress: formData.businessAddress || '',
                licenseNumber: formData.licenseNumber || '',
                insuranceNumber: formData.insuranceNumber || '',
                bio: formData.bio || '',
              }}
              validationSchema={Step2Schema}
              onSubmit={handleStep2Submit}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                <View style={styles.form}>
                  <Text style={styles.stepTitle}>Business Information</Text>

                  <View style={styles.categorySection}>
                    <Text style={styles.label}>Trade Category *</Text>
                    <View style={styles.categories}>
                      {TRADE_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setFieldValue('category', cat.id)}
                          style={[
                            styles.categoryChip,
                            values.category === cat.id && styles.categoryChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryText,
                              values.category === cat.id && styles.categoryTextSelected,
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

                  <Input
                    label="Business Name"
                    placeholder="ABC Electrical Ltd"
                    value={values.businessName}
                    onChangeText={handleChange('businessName')}
                    onBlur={handleBlur('businessName')}
                    error={touched.businessName && errors.businessName}
                    leftIcon="business-outline"
                  />

                  <Input
                    label="Business Address"
                    placeholder="123 Main Street, London"
                    value={values.businessAddress}
                    onChangeText={handleChange('businessAddress')}
                    onBlur={handleBlur('businessAddress')}
                    error={touched.businessAddress && errors.businessAddress}
                    leftIcon="location-outline"
                  />

                  <Input
                    label="License Number"
                    placeholder="Your professional license number"
                    value={values.licenseNumber}
                    onChangeText={handleChange('licenseNumber')}
                    onBlur={handleBlur('licenseNumber')}
                    error={touched.licenseNumber && errors.licenseNumber}
                    leftIcon="card-outline"
                  />

                  <Input
                    label="Insurance Number"
                    placeholder="Your insurance policy number"
                    value={values.insuranceNumber}
                    onChangeText={handleChange('insuranceNumber')}
                    onBlur={handleBlur('insuranceNumber')}
                    error={touched.insuranceNumber && errors.insuranceNumber}
                    leftIcon="shield-checkmark-outline"
                  />

                  <Input
                    label="Bio (Optional)"
                    placeholder="Tell us about your experience and services..."
                    value={values.bio}
                    onChangeText={handleChange('bio')}
                    onBlur={handleBlur('bio')}
                    error={touched.bio && errors.bio}
                    multiline
                    numberOfLines={4}
                  />

                  <View style={styles.buttonRow}>
                    <Button
                      title="Back"
                      onPress={() => {
                        setFormData({ ...formData, ...values });
                        setCurrentStep(1);
                      }}
                      variant="outline"
                      size="large"
                      style={styles.backButton}
                      icon="arrow-back"
                    />

                    <Button
                      title="Create Account"
                      onPress={handleSubmit}
                      loading={isLoading}
                      disabled={isLoading}
                      variant="primary"
                      size="large"
                      style={styles.submitButton}
                    />
                  </View>
                </View>
              )}
            </Formik>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  stepDotActive: {
    backgroundColor: '#0080FF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#0080FF',
  },
  form: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  categorySection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    margin: 4,
  },
  categoryChipSelected: {
    backgroundColor: '#0080FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#333333',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
  },
  footerLink: {
    fontSize: 14,
    color: '#0080FF',
    fontWeight: '600',
  },
});

export default RegisterTradespersonScreen;
