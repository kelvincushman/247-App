import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';

/**
 * Register Choice Screen
 * Lets users choose between Customer or Tradesperson registration
 */
const RegisterChoiceScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join 247 Trades</Text>
          <Text style={styles.subtitle}>Choose your account type</Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          <Card
            onPress={() => navigation.navigate('RegisterCustomer')}
            style={styles.optionCard}
          >
            <View style={styles.optionContent}>
              <View style={[styles.iconContainer, styles.customerIcon]}>
                <Ionicons name="person" size={40} color="#0080FF" />
              </View>
              <Text style={styles.optionTitle}>I need a tradesperson</Text>
              <Text style={styles.optionDescription}>
                Find and hire verified tradespeople for your jobs
              </Text>
              <View style={styles.features}>
                <FeatureItem text="Post jobs instantly" />
                <FeatureItem text="Get multiple quotes" />
                <FeatureItem text="Track job progress" />
                <FeatureItem text="Secure payments" />
              </View>
            </View>
          </Card>

          <Card
            onPress={() => navigation.navigate('RegisterTradesperson')}
            style={styles.optionCard}
          >
            <View style={styles.optionContent}>
              <View style={[styles.iconContainer, styles.tradespersonIcon]}>
                <Ionicons name="construct" size={40} color="#FF9500" />
              </View>
              <Text style={styles.optionTitle}>I'm a tradesperson</Text>
              <Text style={styles.optionDescription}>
                Get hired for jobs and grow your business
              </Text>
              <View style={styles.features}>
                <FeatureItem text="Find nearby jobs" />
                <FeatureItem text="Set your own rates" />
                <FeatureItem text="Build your reputation" />
                <FeatureItem text="Fast payments" />
              </View>
            </View>
          </Card>
        </View>

        {/* Back to Login */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const FeatureItem = ({ text }) => (
  <View style={styles.featureItem}>
    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
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
  options: {
    flex: 1,
  },
  optionCard: {
    marginBottom: 20,
  },
  optionContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerIcon: {
    backgroundColor: '#E5F3FF',
  },
  tradespersonIcon: {
    backgroundColor: '#FFF3E5',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  features: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
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

export default RegisterChoiceScreen;
