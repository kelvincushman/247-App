import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Avatar,
  Button,
  Badge,
  LoadingSpinner,
} from '../../components/ui';
import {
  logout,
  selectUser,
  selectAuthLoading,
} from '../../redux/slices/authSlice';
import {
  getProfile,
  selectUserProfile,
  selectUserLoading,
} from '../../redux/slices/userSlice';
import { paymentService } from '../../api/services';
import Toast from 'react-native-toast-message';

/**
 * Profile Screen
 * View/edit profile, manage payment methods, settings, logout
 */
const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const profile = useSelector(selectUserProfile);
  const isLoading = useSelector(selectUserLoading);
  const authLoading = useSelector(selectAuthLoading);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    loadProfile();
    loadPaymentMethods();
  }, []);

  const loadProfile = async () => {
    try {
      await dispatch(getProfile()).unwrap();
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingPayments(true);
      const response = await paymentService.getPaymentMethods();
      setPaymentMethods(response.paymentMethods || []);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(logout()).unwrap();
              Toast.show({
                type: 'success',
                text1: 'Logged Out',
                text2: 'You have been successfully logged out',
              });
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Logout Failed',
                text2: err || 'Something went wrong',
              });
            }
          },
        },
      ]
    );
  };

  const handleAddPaymentMethod = () => {
    // Navigate to Stripe payment method setup
    Alert.alert(
      'Add Payment Method',
      'This will open Stripe payment setup. Would you like to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // TODO: Integrate Stripe payment setup
            Toast.show({
              type: 'info',
              text1: 'Coming Soon',
              text2: 'Stripe payment setup will be integrated',
            });
          },
        },
      ]
    );
  };

  const handleRemovePaymentMethod = (methodId) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.removePaymentMethod(methodId);
              Toast.show({
                type: 'success',
                text1: 'Removed',
                text2: 'Payment method has been removed',
              });
              loadPaymentMethods();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Failed',
                text2: 'Could not remove payment method',
              });
            }
          },
        },
      ]
    );
  };

  if (isLoading && !profile) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  const displayProfile = profile || user;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              source={
                displayProfile?.profilePicture
                  ? { uri: displayProfile.profilePicture }
                  : null
              }
              name={`${displayProfile?.firstName} ${displayProfile?.lastName}`}
              size="xlarge"
              showBadge
              badgeColor="#34C759"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {displayProfile?.firstName} {displayProfile?.lastName}
              </Text>
              <Text style={styles.profileEmail}>{displayProfile?.email}</Text>
              <Text style={styles.profilePhone}>{displayProfile?.phoneNumber}</Text>
            </View>
          </View>

          <Button
            title="Edit Profile"
            onPress={() => {
              Toast.show({
                type: 'info',
                text1: 'Coming Soon',
                text2: 'Profile editing will be available',
              });
            }}
            variant="outline"
            size="medium"
            icon="create-outline"
            fullWidth
          />
        </Card>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity onPress={handleAddPaymentMethod}>
              <Ionicons name="add-circle" size={28} color="#0080FF" />
            </TouchableOpacity>
          </View>

          {loadingPayments ? (
            <Card>
              <LoadingSpinner text="Loading payment methods..." />
            </Card>
          ) : paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <Card key={method.id} style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodRow}>
                  <View style={styles.paymentMethodInfo}>
                    <Ionicons
                      name={
                        method.type === 'card'
                          ? 'card'
                          : 'wallet'
                      }
                      size={24}
                      color="#0080FF"
                    />
                    <View style={styles.paymentMethodDetails}>
                      <Text style={styles.paymentMethodBrand}>
                        {method.brand?.toUpperCase() || 'CARD'}
                      </Text>
                      <Text style={styles.paymentMethodLast4}>
                        •••• {method.last4}
                      </Text>
                      {method.isDefault && (
                        <Badge text="Default" variant="success" size="small" />
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemovePaymentMethod(method.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="card-outline" size={48} color="#999999" />
              <Text style={styles.emptyText}>No payment methods added</Text>
              <Button
                title="Add Payment Method"
                onPress={handleAddPaymentMethod}
                variant="primary"
                size="small"
                icon="add"
                style={styles.emptyButton}
              />
            </Card>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <Card style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'Notification settings',
                });
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={24} color="#0080FF" />
                <Text style={styles.settingText}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'Privacy settings',
                });
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#0080FF" />
                <Text style={styles.settingText}>Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'Help & support',
                });
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle-outline" size={24} color="#0080FF" />
                <Text style={styles.settingText}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'Terms & privacy policy',
                });
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="document-text-outline" size={24} color="#0080FF" />
                <Text style={styles.settingText}>Terms & Privacy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999999" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Logout Button */}
        <Button
          title="Logout"
          onPress={handleLogout}
          loading={authLoading}
          disabled={authLoading}
          variant="danger"
          size="large"
          icon="log-out-outline"
          fullWidth
          style={styles.logoutButton}
        />

        {/* App Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
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
  profileCard: {
    marginBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  paymentMethodCard: {
    marginBottom: 12,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  paymentMethodLast4: {
    fontSize: 14,
    color: '#666666',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 8,
  },
  settingsCard: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 52,
  },
  logoutButton: {
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});

export default ProfileScreen;
