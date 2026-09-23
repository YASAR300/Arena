import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * ReviewsEntryRow Component
 * Navigable teaser row for participant reviews and testimonials
 */
const ReviewsEntryRow = ({ onPress }) => {
  const { t } = useLanguage();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Alert.alert(t('hearFromUsers'), t('seeWhatUsersSay'), [{ text: 'OK' }]);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.leftContainer}>
        <View style={styles.iconBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={THEME.colors.textPrimary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('hearFromUsers')}</Text>
          <Text style={styles.subtitle}>{t('seeWhatUsersSay')}</Text>
        </View>
      </View>

      <Feather name="chevron-right" size={20} color={THEME.colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    ...THEME.shadows.card,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: THEME.fonts.sizes.sm,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});

export default ReviewsEntryRow;
