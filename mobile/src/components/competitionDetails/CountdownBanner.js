import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import useServerCountdown from '../../hooks/useServerCountdown';

/**
 * CountdownBanner Component
 * Live countdown ticking every second until registration closes
 * Displays "Registration closes in 01d : 06h : 28m : 32s  Hurry up!"
 */
const CountdownBanner = ({ registrationEndAt, serverTimestamp, onExpire }) => {
  const { t } = useLanguage();

  const { formattedString, isExpired } = useServerCountdown(
    registrationEndAt,
    serverTimestamp,
    onExpire
  );

  return (
    <View style={styles.container}>
      {/* Left Icon: Hourglass */}
      <View style={styles.leftSection}>
        <Ionicons name="hourglass-outline" size={16} color={THEME.colors.brandTeal} />
        <Text style={styles.label}>{t('regClosesIn')}</Text>
      </View>

      {/* Middle: Monospace Countdown Digits */}
      <View style={styles.countdownSection}>
        <Text style={styles.countdownText}>
          {isExpired ? t('registrationClosed') : formattedString}
        </Text>
      </View>

      {/* Right: Hurry Up Callout */}
      {!isExpired && (
        <View style={styles.rightSection}>
          <Ionicons name="timer-outline" size={15} color={THEME.colors.hurryUpText} />
          <Text style={styles.hurryUpText}>{t('hurryUp')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.brandMint,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
  },
  countdownSection: {
    paddingHorizontal: 4,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.brandDarkTeal,
    letterSpacing: 0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hurryUpText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.hurryUpText,
  },
});

export default CountdownBanner;
