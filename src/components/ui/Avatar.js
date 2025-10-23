import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Custom Avatar Component
 * Displays user profile pictures with fallback to initials or icon
 */
const Avatar = ({
  source,
  name,
  size = 'medium',
  variant = 'circle',
  showBadge = false,
  badgeColor = '#34C759',
  style,
}) => {
  const sizeValue = getSizeValue(size);

  const containerStyles = [
    styles.container,
    variant === 'circle' ? styles.circle : styles.rounded,
    { width: sizeValue, height: sizeValue },
    style,
  ];

  const textStyles = [
    styles.initials,
    { fontSize: sizeValue * 0.4 },
  ];

  const badgeStyles = [
    styles.badge,
    {
      backgroundColor: badgeColor,
      width: sizeValue * 0.3,
      height: sizeValue * 0.3,
      borderRadius: (sizeValue * 0.3) / 2,
      borderWidth: sizeValue * 0.05,
    },
  ];

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const renderContent = () => {
    if (source && source.uri) {
      return (
        <Image
          source={source}
          style={[
            styles.image,
            variant === 'circle' ? styles.circle : styles.rounded,
          ]}
          resizeMode="cover"
        />
      );
    }

    if (name) {
      return (
        <View style={[containerStyles, styles.initialsContainer]}>
          <Text style={textStyles}>{getInitials(name)}</Text>
        </View>
      );
    }

    // Default user icon
    return (
      <View style={[containerStyles, styles.iconContainer]}>
        <Ionicons name="person" size={sizeValue * 0.6} color="#FFFFFF" />
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      {renderContent()}
      {showBadge && <View style={badgeStyles} />}
    </View>
  );
};

const getSizeValue = (size) => {
  switch (size) {
    case 'tiny':
      return 24;
    case 'small':
      return 32;
    case 'medium':
      return 48;
    case 'large':
      return 64;
    case 'xlarge':
      return 96;
    default:
      return typeof size === 'number' ? size : 48;
  }
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle: {
    borderRadius: 999,
  },
  rounded: {
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    backgroundColor: '#0080FF',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  iconContainer: {
    backgroundColor: '#999999',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: '#FFFFFF',
  },
});

export default Avatar;
