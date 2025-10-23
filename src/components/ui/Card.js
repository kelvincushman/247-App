import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Custom Card Component
 * Container component with elevation/shadow and customizable styles
 */
const Card = ({
  children,
  onPress,
  variant = 'default',
  noPadding = false,
  noShadow = false,
  style,
  ...props
}) => {
  const cardStyles = [
    styles.card,
    styles[variant],
    !noShadow && styles.shadow,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.8}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyles} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noPadding: {
    padding: 0,
  },

  // Variants
  default: {
    backgroundColor: '#FFFFFF',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  elevated: {
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  flat: {
    backgroundColor: '#F8F8F8',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default Card;
