import React, { useEffect } from 'react';
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
import { Button, Input } from '../../components/ui';
import {
  login,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from '../../redux/slices/authSlice';
import Toast from 'react-native-toast-message';

/**
 * Login Screen
 * Allows users to login with email and password
 */

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  useEffect(() => {
    // Clear any previous errors when screen mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Show error toast if login fails
    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: error,
      });
    }
  }, [error]);

  const handleLogin = async (values) => {
    try {
      await dispatch(login(values)).unwrap();
      // Navigation handled by RootNavigator based on auth state
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: 'You have successfully logged in',
      });
    } catch (err) {
      // Error already handled by useEffect above
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Login Form */}
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
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
                  label="Email"
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

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={touched.password && errors.password}
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                  editable={!isLoading}
                />

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <Button
                  title="Sign In"
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

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              <Text style={styles.footerLink}>Sign Up</Text>
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
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0080FF',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
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

export default LoginScreen;
