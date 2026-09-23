import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

/**
 * CompetitionDetailsScreen Placeholder
 * Foundation placeholder for the full pixel-perfect competition details screen.
 * Will be populated with data-driven components in subsequent prompts.
 */
export default function CompetitionDetailsScreen({ route, navigation }) {
  const { competitionSlug = 'feedants-classical-dance' } = route.params || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Go back</Text>
        </TouchableOpacity>
        <View style={styles.langToggle}>
          <Text style={[styles.langText, styles.langActive]}>ENG</Text>
          <Text style={styles.langText}>हिंदी</Text>
        </View>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Competition Details</Text>
        <Text style={styles.slug}>Slug: {competitionSlug}</Text>
        <Text style={styles.notice}>
          Architecture foundation initialized. Full dynamic UI and sections will be attached in
          subsequent prompts.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A3B3C',
  },
  langToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    borderRadius: 16,
    padding: 3,
  },
  langText: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 13,
    color: '#6C757D',
    fontWeight: '600',
  },
  langActive: {
    backgroundColor: '#005F60',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A3B3C',
    marginBottom: 8,
  },
  slug: {
    fontSize: 14,
    color: '#008080',
    marginBottom: 16,
    fontWeight: '600',
  },
  notice: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
});
