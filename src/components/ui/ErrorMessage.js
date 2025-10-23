import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';

/**
 * Custom Error Message Component
 * Displays error messages with optional retry action
 */
const ErrorMessage = ({
  message = 'Something went wrong',
  title = 'Error',
  icon = 'alert-circle',
  onRetry,
  retryText = 'Try Again',
  variant = 'default',
  style,
}) => {
  const containerStyles = [
    styles.container,
    styles[variant],
    style,
  ];

  return (
    <View style={containerStyles}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color="#FF3B30" />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <Button
          title={retryText}
          onPress={onRetry}
          variant="primary"
          size="medium"
          icon="refresh"
          style={styles.retryButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  default: {
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
  },
});

export default ErrorMessage;
