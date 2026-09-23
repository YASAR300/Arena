import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * RewardsTable Component
 * Dynamically displays reward positions, specialized rank icons (trophy, medal, star),
 * and cash prizes.
 */
const RewardsTable = ({ rewards = [] }) => {
  const { t } = useLanguage();

  // Fallback rewards matching Objective_Page.png if array is empty
  const defaultRewards = [
    { rank: 1, label: '1st Winner', prizeAmount: 550, iconType: 'trophy' },
    { rank: 2, label: '2nd Winner', prizeAmount: 300, iconType: 'medal' },
    { rank: 3, label: '3rd Winner', prizeAmount: 240, iconType: 'medal' },
    { rank: 4, label: '4th Winner', prizeAmount: 200, iconType: 'star' },
    { rank: 5, label: '5th Winner', prizeAmount: 130, iconType: 'star' },
    { rank: 6, label: '6th Winner', prizeAmount: 80, iconType: 'star' },
  ];

  const items = rewards.length > 0 ? rewards : defaultRewards;

  const renderRankIcon = (rank, iconType) => {
    switch (rank) {
      case 1:
        return <FontAwesome5 name="trophy" size={16} color={THEME.colors.rewardGold} />;
      case 2:
        return <MaterialCommunityIcons name="medal" size={18} color={THEME.colors.rewardSilver} />;
      case 3:
        return <MaterialCommunityIcons name="medal" size={18} color={THEME.colors.rewardBronze} />;
      default:
        return <Ionicons name="star-outline" size={16} color={THEME.colors.rewardStar} />;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{t('rewards')}</Text>
        <Text style={styles.headerSubtitle}>{t('allPositions')}</Text>
      </View>

      {/* Rewards List */}
      <View style={styles.listContainer}>
        {items.map((item, index) => (
          <View key={item._id || index} style={styles.rewardRow}>
            {/* Left: Icon & Label */}
            <View style={styles.leftCol}>
              <View style={styles.iconBox}>
                {renderRankIcon(item.rank, item.iconType)}
              </View>
              <Text style={styles.rankLabel}>
                {item.label || `${item.rank}${item.rank === 1 ? 'st' : item.rank === 2 ? 'nd' : item.rank === 3 ? 'rd' : 'th'} Winner`}
              </Text>
            </View>

            {/* Right: Amount */}
            <Text style={styles.amountText}>
              ₹ {item.prizeAmount?.toLocaleString('en-IN')}
            </Text>
          </View>
        ))}
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
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    ...THEME.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: THEME.spacing.sm,
  },
  headerTitle: {
    fontSize: THEME.fonts.sizes.base,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fonts.weights.medium,
  },
  listContainer: {
    marginTop: 4,
    gap: 10,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankLabel: {
    fontSize: THEME.fonts.sizes.sm,
    fontWeight: THEME.fonts.weights.medium,
    color: THEME.colors.textPrimary,
  },
  amountText: {
    fontSize: THEME.fonts.sizes.base,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.brandDarkTeal,
  },
});

export default RewardsTable;
