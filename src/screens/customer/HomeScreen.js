import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from '../../components/ui';
import { selectUser } from '../../redux/slices/authSlice';
import { TRADE_CATEGORIES } from '../../utils/constants';

/**
 * Customer Home Screen
 * Main screen - browse trade categories and create jobs
 */
const HomeScreen = ({ navigation }) => {
  const user = useSelector(selectUser);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName}!</Text>
            <Text style={styles.subtitle}>What do you need help with?</Text>
          </View>
        </View>

        {/* Quick Action */}
        <Card style={styles.quickActionCard}>
          <View style={styles.quickActionContent}>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>Need urgent help?</Text>
              <Text style={styles.quickActionSubtitle}>
                Get a tradesperson now
              </Text>
            </View>
            <Button
              title="Create Job"
              onPress={() => navigation.navigate('CreateJob')}
              variant="primary"
              size="medium"
              icon="add-circle"
            />
          </View>
        </Card>

        {/* Trade Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Services</Text>

          <View style={styles.categoriesGrid}>
            {TRADE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() =>
                  navigation.navigate('CreateJob', {
                    preselectedCategory: category.id,
                  })
                }
              >
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: `${category.color}20` },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Ionicons name="chevron-forward" size={16} color="#999999" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose 247 Trades?</Text>

          <Card style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="shield-checkmark" size={24} color="#34C759" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Verified Professionals</Text>
                <Text style={styles.featureDescription}>
                  All tradespeople are licensed and insured
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="card" size={24} color="#0080FF" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Secure Payments</Text>
                <Text style={styles.featureDescription}>
                  Payment held securely until job completion
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="time" size={24} color="#FF9500" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>24/7 Availability</Text>
                <Text style={styles.featureDescription}>
                  Emergency services available anytime
                </Text>
              </View>
            </View>
          </Card>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  quickActionCard: {
    marginBottom: 24,
    backgroundColor: '#E5F3FF',
  },
  quickActionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  categoriesGrid: {
    marginHorizontal: -8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  featureCard: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
});

export default HomeScreen;
