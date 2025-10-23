import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Custom Badge Component
 * Small status indicators or labels
 */
const Badge = ({
  text,
  count,
  variant = 'default',
  size = 'medium',
  dot = false,
  style,
  textStyle,
}) => {
  const containerStyles = [
    styles.container,
    styles[variant],
    styles[size],
    dot && styles.dot,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  const displayText = count !== undefined ? count.toString() : text;

  if (dot) {
    return <View style={containerStyles} />;
  }

  return (
    <View style={containerStyles}>
      <Text style={textStyles}>{displayText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    padding: 0,
  },

  // Variants
  default: {
    backgroundColor: '#E0E0E0',
  },
  primary: {
    backgroundColor: '#0080FF',
  },
  success: {
    backgroundColor: '#34C759',
  },
  warning: {
    backgroundColor: '#FF9500',
  },
  danger: {
    backgroundColor: '#FF3B30',
  },
  info: {
    backgroundColor: '#5AC8FA',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0080FF',
  },

  // Sizes
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  // Text styles
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  defaultText: {
    color: '#666666',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  successText: {
    color: '#FFFFFF',
  },
  warningText: {
    color: '#FFFFFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  infoText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: '#0080FF',
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
});

export default Badge;
