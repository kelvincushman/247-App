import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { Button } from '../../components/ui';

/**
 * Welcome Screen
 * First screen users see when opening the app
 */
const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <Text style={styles.title}>247 Trades</Text>
          <Text style={styles.subtitle}>
            Connect with verified tradespeople 24/7
          </Text>
        </View>

        {/* Illustration placeholder */}
        <View style={styles.illustration}>
          <Text style={styles.illustrationText}>🔧</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="⚡" text="Emergency services available" />
          <FeatureItem icon="✓" text="Verified professionals" />
          <FeatureItem icon="💳" text="Secure payments" />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            variant="primary"
            size="large"
            fullWidth
          />

          <Button
            title="I already have an account"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            size="medium"
            fullWidth
            style={styles.loginButton}
          />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
};

const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0080FF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  illustrationText: {
    fontSize: 120,
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333333',
  },
  actions: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 12,
  },
  footer: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default WelcomeScreen;
