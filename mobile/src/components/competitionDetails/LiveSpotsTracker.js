import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import useCompetitionSpots from '../../hooks/useCompetitionSpots';

/**
 * Isolated, React.memo'd LiveSpotsTracker Component
 * Connects directly to Socket.IO live spots updates so when a spot is booked
 * by another user, ONLY this widget re-renders without re-rendering the header
 * card or the entire screen tree.
 */
const LiveSpotsTracker = ({ competitionId, initialSpots }) => {
  const { t } = useLanguage();

  const spots = useCompetitionSpots(competitionId, initialSpots);

  const progressRatio = spots.totalSpots > 0
    ? Math.min(1, Math.max(0, spots.spotsBooked / spots.totalSpots))
    : 0;

  return (
    <View style={styles.spotsTracker}>
      <View style={styles.spotsHeader}>
        <Ionicons name="people" size={13} color={THEME.colors.brandTeal} />
        <Text style={styles.spotsCountText}>
          {t('onlySpotsLeft', { count: spots.spotsLeft })}
        </Text>
      </View>

      {/* Progress Track */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.max(5, progressRatio * 100)}%` },
          ]}
        />
      </View>

      <Text style={styles.bookedText}>
        {t('bookedRatio', { booked: spots.spotsBooked, total: spots.totalSpots })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default memo(LiveSpotsTracker);
