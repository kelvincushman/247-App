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
  registerCustomer,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from '../../redux/slices/authSlice';
import Toast from 'react-native-toast-message';

/**
 * Register Customer Screen
 * Customer registration with email, password, and basic info
 */

const RegisterCustomerSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  phoneNumber: Yup.string()
    .matches(/^[0-9+\-\s()]+$/, 'Invalid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .required('Phone number is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

const RegisterCustomerScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

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

  const handleRegister = async (values) => {
    try {
      const { confirmPassword, ...registerData } = values;
      await dispatch(registerCustomer(registerData)).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Welcome!',
        text2: 'Your account has been created successfully',
      });
      // Navigation handled by RootNavigator
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up as a customer</Text>
          </View>

          {/* Registration Form */}
          <Formik
            initialValues={{
              firstName: '',
              lastName: '',
              email: '',
              phoneNumber: '',
              password: '',
              confirmPassword: '',
            }}
            validationSchema={RegisterCustomerSchema}
            onSubmit={handleRegister}
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
                <View style={styles.row}>
                  <Input
                    label="First Name"
                    placeholder="John"
                    value={values.firstName}
                    onChangeText={handleChange('firstName')}
                    onBlur={handleBlur('firstName')}
                    error={touched.firstName && errors.firstName}
                    containerStyle={styles.halfInput}
                    editable={!isLoading}
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
                    editable={!isLoading}
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
                  editable={!isLoading}
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
                  editable={!isLoading}
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
                  editable={!isLoading}
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
                  editable={!isLoading}
                />

                <Button
                  title="Create Account"
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

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
    marginBottom: 32,
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
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
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
  terms: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#0080FF',
    textDecorationLine: 'underline',
  },
});

export default RegisterCustomerScreen;
