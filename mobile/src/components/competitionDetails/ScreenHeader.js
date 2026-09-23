import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * ScreenHeader Component
 * Navigation header with back button and active language toggle pill (ENG / हिंदी)
 */
const ScreenHeader = ({ onBack }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
        accessibilityLabel={t('goBack')}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
        <Text style={styles.backText}>{t('goBack')}</Text>
      </TouchableOpacity>

      <View style={styles.languagePillContainer}>
        <TouchableOpacity
          style={[
            styles.langOption,
            language === 'en' && styles.langOptionActive,
          ]}
          onPress={() => setLanguage('en')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.langText,
              language === 'en' && styles.langTextActive,
            ]}
          >
            ENG
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.langOption,
            language === 'hi' && styles.langOptionActive,
          ]}
          onPress={() => setLanguage('hi')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.langText,
              language === 'hi' && styles.langTextActive,
            ]}
          >
            हिंदी
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  backText: {
    fontSize: THEME.fonts.sizes.base,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
  },
  languagePillContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F4',
    borderRadius: THEME.radius.pill,
    padding: 3,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
  },
  langOptionActive: {
    backgroundColor: THEME.colors.brandDarkTeal,
  },
  langText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.semibold,
    color: THEME.colors.pillInactiveText,
  },
  langTextActive: {
    color: THEME.colors.textInverse,
    fontWeight: THEME.fonts.weights.bold,
  },
});

export default ScreenHeader;
