import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

import { Alert } from 'react-native';
import useAuthStore from '../../store/authStore';
import { ROUTES } from '../../navigation/routes';

/**
 * ScreenHeader Component
 * Navigation header with back button, user auth status/login, and active language toggle pill (ENG / हिंदी)
 */
const ScreenHeader = ({ onBack, navigation }) => {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleAuthPress = () => {
    if (isAuthenticated) {
      Alert.alert(
        'Account',
        `Logged in as ${user?.name || user?.email || 'Participant'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log Out',
            style: 'destructive',
            onPress: () => logout(),
          },
        ]
      );
    } else if (navigation) {
      navigation.navigate(ROUTES.LOGIN, {
        returnTo: ROUTES.COMPETITION_DETAILS,
      });
    }
  };

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

      <View style={styles.headerRightActions}>
        {/* Auth Pill Button */}
        <TouchableOpacity
          style={[styles.authPill, isAuthenticated && styles.authPillLoggedIn]}
          onPress={handleAuthPress}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isAuthenticated ? 'person-circle' : 'log-in-outline'}
            size={16}
            color={isAuthenticated ? '#005F60' : '#475569'}
          />
          <Text style={[styles.authPillText, isAuthenticated && styles.authPillTextLoggedIn]}>
            {isAuthenticated ? (user?.name?.split(' ')[0] || 'Profile') : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Language Switcher */}
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  authPillLoggedIn: {
    backgroundColor: '#E6F4F1',
    borderColor: '#005F60',
  },
  authPillText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.semibold,
    color: '#475569',
  },
  authPillTextLoggedIn: {
    color: '#005F60',
    fontWeight: THEME.fonts.weights.bold,
  },
  langTextActive: {
    color: THEME.colors.textInverse,
    fontWeight: THEME.fonts.weights.bold,
  },
});

export default ScreenHeader;
