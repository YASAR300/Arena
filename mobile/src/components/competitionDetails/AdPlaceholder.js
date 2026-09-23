import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * AdPlaceholder Component
 * Static ad slot placeholder component matching the wireframe in Objective_Page.png
 */
const AdPlaceholder = () => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Feather name="volume-2" size={16} color={THEME.colors.brandDarkTeal} />
      <Text style={styles.text}>{t('adHere')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: THEME.radius.md,
    paddingVertical: 10,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    backgroundColor: '#FAFCFD',
  },
  text: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.brandDarkTeal,
  },
});

export default AdPlaceholder;
