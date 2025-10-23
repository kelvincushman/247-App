import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../../components/ui';
import { authService } from '../../api/services';
import Toast from 'react-native-toast-message';

/**
 * Forgot Password Screen
 * Request password reset email
 */

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
});

const ForgotPasswordScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setIsLoading(true);
      await authService.forgotPassword(values.email);

      setEmailSent(true);
      Toast.show({
        type: 'success',
        text1: 'Email Sent',
        text2: 'Check your inbox for password reset instructions',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: error.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-outline" size={80} color="#34C759" />
          </View>

          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent password reset instructions to your email address.
            Please check your inbox and follow the link to reset your password.
          </Text>

          <Button
            title="Back to Login"
            onPress={() => navigation.navigate('Login')}
            variant="primary"
            size="large"
            fullWidth
            style={styles.backButton}
          />

          <Button
            title="Resend Email"
            onPress={() => setEmailSent(false)}
            variant="ghost"
            size="medium"
            fullWidth
            style={styles.resendButton}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={60} color="#0080FF" />
            </View>

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to
              reset your password
            </Text>
          </View>

          {/* Form */}
          <Formik
            initialValues={{ email: '' }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
            }) => (
              <View style={styles.form}>
                <Input
                  label="Email Address"
                  placeholder="Enter your email"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  error={touched.email && errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon="mail-outline"
                  editable={!isLoading}
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                  variant="primary"
                  size="large"
                  fullWidth
                  style={styles.submitButton}
                />

                <Button
                  title="Back to Login"
                  onPress={() => navigation.goBack()}
                  variant="ghost"
                  size="medium"
                  fullWidth
                  disabled={isLoading}
                  style={styles.cancelButton}
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
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 12,
  },
  resendButton: {
    marginTop: 4,
  },
});

export default ForgotPasswordScreen;
