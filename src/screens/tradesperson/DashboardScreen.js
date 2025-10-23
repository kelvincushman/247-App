import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from '../../components/ui';
import { logout, selectUser } from '../../redux/slices/authSlice';

const DashboardScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Tradesperson Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.firstName} {user?.lastName}!
        </Text>
        <Text style={styles.info}>
          Find jobs, manage bookings, and grow your business.
        </Text>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 16,
  },
  info: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
  },
  logoutButton: {
    marginTop: 16,
  },
});

export default DashboardScreen;
