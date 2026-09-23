import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * DisclaimerBanner Component
 * Renders the notice regarding judging and paid submissions
 */
const DisclaimerBanner = () => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Feather name="info" size={16} color={THEME.colors.brandTeal} style={styles.icon} />
      <Text style={styles.text}>{t('disclaimer')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF7F7',
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    gap: 8,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: '#005F60',
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default DisclaimerBanner;
