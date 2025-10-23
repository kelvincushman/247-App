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
import { logout, selectUser } from '../../redux/slices/authSlice';
import { Card, Avatar, LoadingSpinner, Badge } from '../../components/ui';
import { paymentService, userService } from '../../api/services';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';

/**
 * Tradesperson Profile Screen
 * Manages profile, earnings, payouts, and settings
 */

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Load earnings data
      const earningsResponse = await paymentService.getTradespersonEarnings();
      setEarnings(earningsResponse.data || {
        available: 0,
        pending: 0,
        total: 0,
        lastPayout: null,
      });

      // Load payout methods
      await loadPayoutMethods();
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutMethods = async () => {
    try {
      setLoadingPayouts(true);
      const response = await paymentService.getPayoutMethods();
      setPayoutMethods(response.payoutMethods || []);
    } catch (err) {
      console.error('Failed to load payout methods:', err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const handleAddPayoutMethod = () => {
    Alert.alert(
      'Add Payout Method',
      'Connect your bank account to receive payments via Stripe',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect Bank',
          onPress: async () => {
            try {
              // Launch Stripe Connect flow
              const response = await paymentService.createStripeConnectAccount();

              if (response.accountLink) {
                // Open Stripe Connect onboarding
                Toast.show({
                  type: 'info',
                  text1: 'Opening Stripe Connect',
                  text2: 'Complete your bank account setup',
                });
                // In production: Linking.openURL(response.accountLink.url);
              }
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Connection Failed',
                text2: err.message || 'Failed to connect bank account',
              });
            }
          },
        },
      ]
    );
  };

  const handleRequestPayout = () => {
    if (!earnings || earnings.available <= 0) {
      Toast.show({
        type: 'info',
        text1: 'No Funds Available',
        text2: 'You need to complete jobs to request a payout',
      });
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout of £${earnings.available.toFixed(2)}? Funds typically arrive within 2-3 business days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Payout',
          onPress: async () => {
            try {
              await paymentService.requestPayout({
                amount: earnings.available,
              });

              Toast.show({
                type: 'success',
                text1: 'Payout Requested',
                text2: 'Your payout has been initiated',
              });

              loadProfileData();
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: 'Payout Failed',
                text2: err.message || 'Failed to request payout',
              });
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  if (loading && !earnings) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <View style={styles.header}>
            <Avatar
              source={user?.profilePicture ? { uri: user.profilePicture } : null}
              name={`${user?.firstName} ${user?.lastName}`}
              size="xlarge"
            />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.email}>{user?.email}</Text>
              {user?.businessName && (
                <Text style={styles.businessName}>{user.businessName}</Text>
              )}
              {user?.rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {user.rating.toFixed(1)} ({user.reviewCount || 0} reviews)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Earnings Overview */}
        <Card style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet" size={24} color="#34C759" />
            <Text style={styles.sectionTitle}>Earnings</Text>
          </View>

          <View style={styles.earningsGrid}>
            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Available</Text>
              <Text style={styles.earningValue}>
                £{earnings?.available?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.earningHint}>Ready to withdraw</Text>
            </View>

            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Pending</Text>
              <Text style={[styles.earningValue, { color: '#FF9500' }]}>
                £{earnings?.pending?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.earningHint}>Awaiting confirmation</Text>
            </View>

            <View style={styles.earningItem}>
              <Text style={styles.earningLabel}>Total Earned</Text>
              <Text style={[styles.earningValue, { color: '#0080FF' }]}>
                £{earnings?.total?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.earningHint}>All time</Text>
            </View>
          </View>

          {earnings?.lastPayout && (
            <View style={styles.lastPayout}>
              <Text style={styles.lastPayoutText}>
                Last payout: £{earnings.lastPayout.amount.toFixed(2)} on{' '}
                {format(new Date(earnings.lastPayout.date), 'MMM d, yyyy')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.payoutButton}
            onPress={handleRequestPayout}
            disabled={!earnings || earnings.available <= 0}
          >
            <Ionicons name="arrow-down-circle" size={20} color="#FFFFFF" />
            <Text style={styles.payoutButtonText}>Request Payout</Text>
          </TouchableOpacity>
        </Card>

        {/* Payout Methods */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="card" size={20} color="#0080FF" />
              <Text style={styles.cardTitle}>Payout Methods</Text>
            </View>
            <TouchableOpacity onPress={handleAddPayoutMethod}>
              <Ionicons name="add-circle" size={24} color="#FF9500" />
            </TouchableOpacity>
          </View>

          {loadingPayouts ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : payoutMethods.length > 0 ? (
            payoutMethods.map((method) => (
              <View key={method.id} style={styles.payoutMethod}>
                <View style={styles.payoutMethodInfo}>
                  <Ionicons name="business" size={20} color="#666666" />
                  <View style={styles.payoutMethodText}>
                    <Text style={styles.payoutMethodName}>
                      {method.bankName || 'Bank Account'}
                    </Text>
                    <Text style={styles.payoutMethodDetails}>
                      ****{method.last4}
                    </Text>
                  </View>
                </View>
                {method.isDefault && (
                  <Badge text="DEFAULT" variant="success" size="small" />
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No payout methods added</Text>
              <Text style={styles.emptyHint}>
                Add a bank account to receive your earnings
              </Text>
            </View>
          )}
        </Card>

        {/* Settings Menu */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={20} color="#666666" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Categories')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="list-outline" size={20} color="#666666" />
              <Text style={styles.menuItemText}>My Categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={20} color="#666666" />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Help')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#666666" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Terms')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={20} color="#666666" />
              <Text style={styles.menuItemText}>Terms & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
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
  headerCard: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  earningsCard: {
    marginBottom: 16,
    backgroundColor: '#F0FFF4',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  earningsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  earningValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  earningHint: {
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
  },
  lastPayout: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  lastPayoutText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  payoutMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  payoutMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payoutMethodText: {
    marginLeft: 12,
  },
  payoutMethodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  payoutMethodDetails: {
    fontSize: 12,
    color: '#999999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 15,
    color: '#333333',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginBottom: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  version: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});

export default ProfileScreen;
