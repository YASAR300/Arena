import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { ROUTES } from '../navigation/routes';

/**
 * HomeScreen Placeholder
 * Provides navigation entry point to test the Competition Details screen.
 */
export default function HomeScreen({ navigation }) {
  const handleOpenCompetition = () => {
    navigation.navigate(ROUTES.COMPETITION_DETAILS, {
      competitionSlug: 'feedants-classical-dance',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Text style={styles.title}>Feedants Arena</Text>
      <Text style={styles.subtitle}>Competition Platform Technical Assignment</Text>

      <TouchableOpacity
        style={styles.cardButton}
        onPress={handleOpenCompetition}
        activeOpacity={0.8}
      >
        <Text style={styles.cardTag}>DANCE • MULTI-WIN</Text>
        <Text style={styles.cardTitle}>Feedants Classical Dance</Text>
        <Text style={styles.cardSub}>Prize Pool: ₹ 1,500 • Entry: ₹ 99</Text>
        <Text style={styles.cardAction}>View Details →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0A3B3C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 32,
    textAlign: 'center',
  },
  cardButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#008080',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 16,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#008080',
  },
});
