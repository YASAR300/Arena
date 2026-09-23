import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import useCompetitionSpots from '../../hooks/useCompetitionSpots';

/**
 * CompetitionHeaderCard Component
 * Displays title, tags, prize pool, entry fee, registered badge, and live spots progress bar
 */
const CompetitionHeaderCard = ({ competition, currentUserState }) => {
  const { t } = useLanguage();

  const spots = useCompetitionSpots(competition?._id, {
    totalSpots: competition?.totalSpots || 20,
    spotsBooked: competition?.spotsBooked || 0,
    spotsLeft: competition?.spotsLeft ?? (competition?.totalSpots ? competition.totalSpots - competition.spotsBooked : 19),
  });

  const isRegistered = currentUserState?.isRegistered;
  const progressRatio = spots.totalSpots > 0 
    ? Math.min(1, Math.max(0, spots.spotsBooked / spots.totalSpots))
    : 0;

  return (
    <View style={styles.card}>
      {/* Top Row: Title & Registration Status Pill */}
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={2}>
          {competition?.title || 'Feedants Classical Dance'}
        </Text>

        {isRegistered ? (
          <View style={styles.registeredPill}>
            <Ionicons name="checkmark-circle" size={14} color={THEME.colors.registeredPillText} />
            <Text style={styles.registeredText}>{t('registered')}</Text>
          </View>
        ) : (
          <View style={styles.notRegisteredPill}>
            <Text style={styles.notRegisteredText}>{t('notRegistered')}</Text>
          </View>
        )}
      </View>

      {/* Category Tags & Certificate Banner */}
      <View style={styles.tagsRow}>
        {(competition?.categoryTags || ['Dance', 'Multi-Win']).map((tag, index) => (
          <View key={index} style={styles.tagChip}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}

        <View style={styles.certificateRow}>
          <FontAwesome5 name="trophy" size={12} color={THEME.colors.brandTeal} />
          <Text style={styles.certificateText}>{t('winnersCertificate')}</Text>
        </View>
      </View>

      {/* Financial Metrics & Spots Tracker */}
      <View style={styles.metricsContainer}>
        {/* Prize Pool */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('prizePool')}</Text>
          <Text style={styles.prizeValue}>₹ {competition?.prizePool?.toLocaleString('en-IN') || '1,500'}</Text>
        </View>

        {/* Entry Fee */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('entryFee')}</Text>
          <Text style={styles.entryFeeValue}>₹ {competition?.entryFee ?? '99'}</Text>
        </View>

        {/* Spots Left Progress */}
        <View style={styles.spotsTracker}>
          <View style={styles.spotsHeader}>
            <Ionicons name="people" size={13} color={THEME.colors.brandTeal} />
            <Text style={styles.spotsCountText}>
              {t('onlySpotsLeft', { count: spots.spotsLeft })}
            </Text>
          </View>

          {/* Progress Track */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(5, progressRatio * 100)}%` }]} />
          </View>

          <Text style={styles.bookedText}>
            {t('bookedRatio', { booked: spots.spotsBooked, total: spots.totalSpots })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    ...THEME.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: THEME.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: THEME.fonts.sizes.xl,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
    lineHeight: 24,
  },
  registeredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.registeredPillBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    gap: 4,
  },
  registeredText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.registeredPillText,
  },
  notRegisteredPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.pill,
  },
  notRegisteredText: {
    fontSize: 10,
    fontWeight: THEME.fonts.weights.medium,
    color: THEME.colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    gap: 6,
  },
  tagChip: {
    backgroundColor: THEME.colors.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.chipText,
    fontWeight: THEME.fonts.weights.medium,
  },
  certificateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  certificateText: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.brandTeal,
    fontWeight: THEME.fonts.weights.semibold,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fonts.weights.medium,
    marginBottom: 2,
  },
  prizeValue: {
    fontSize: 22,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.brandDarkTeal,
  },
  entryFeeValue: {
    fontSize: 22,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
  },
  spotsTracker: {
    flex: 1.2,
    alignItems: 'flex-start',
  },
  spotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  spotsCountText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.brandTeal,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: THEME.colors.progressTrack,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.brandTeal,
    borderRadius: 2,
  },
  bookedText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
});

export default CompetitionHeaderCard;
