import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import { formatCompetitionDate } from '../../utils/dateFormatter';

/**
 * ImportantDatesGrid Component
 * 2x2 grid displaying competition milestones with localized dates and icons
 */
const ImportantDatesGrid = ({ dates = {} }) => {
  const { t } = useLanguage();

  const registerBefore = formatCompetitionDate(dates.registrationEndAt);
  const submissionStarts = formatCompetitionDate(dates.submissionStartAt);
  const submissionEnds = formatCompetitionDate(dates.submissionEndAt);
  const resultDate = formatCompetitionDate(dates.resultDate);

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>{t('importantDates')}</Text>

      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          {/* Item 1: Register Before */}
          <View style={[styles.gridCell, styles.cellBorderRight]}>
            <View style={styles.iconWrapper}>
              <Feather name="calendar" size={20} color={THEME.colors.brandTeal} />
            </View>
            <View style={styles.dateContent}>
              <Text style={styles.label}>{t('registerBefore')}</Text>
              <Text style={styles.dateText}>{registerBefore.date}</Text>
              <Text style={styles.timeText}>{registerBefore.time}</Text>
            </View>
          </View>

          {/* Item 2: Submission Starts */}
          <View style={styles.gridCell}>
            <View style={styles.iconWrapper}>
              <Feather name="send" size={20} color={THEME.colors.brandTeal} />
            </View>
            <View style={styles.dateContent}>
              <Text style={styles.label}>{t('submissionStarts')}</Text>
              <Text style={styles.dateText}>{submissionStarts.date}</Text>
              <Text style={styles.timeText}>{submissionStarts.time}</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.horizontalDivider} />

        {/* Row 2 */}
        <View style={styles.gridRow}>
          {/* Item 3: Submission Ends */}
          <View style={[styles.gridCell, styles.cellBorderRight]}>
            <View style={styles.iconWrapper}>
              <Feather name="upload" size={20} color={THEME.colors.brandTeal} />
            </View>
            <View style={styles.dateContent}>
              <Text style={styles.label}>{t('submissionEnds')}</Text>
              <Text style={styles.dateText}>{submissionEnds.date}</Text>
              <Text style={styles.timeText}>{submissionEnds.time}</Text>
            </View>
          </View>

          {/* Item 4: Result Date */}
          <View style={styles.gridCell}>
            <View style={styles.iconWrapper}>
              <Ionicons name="trophy-outline" size={20} color={THEME.colors.brandTeal} />
            </View>
            <View style={styles.dateContent}>
              <Text style={styles.label}>{t('resultDate')}</Text>
              <Text style={styles.dateText}>{resultDate.date}</Text>
              <Text style={styles.timeText}>{resultDate.time}</Text>
            </View>
          </View>
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
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    ...THEME.shadows.card,
  },
  headerTitle: {
    fontSize: THEME.fonts.sizes.base,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  grid: {
    borderTopWidth: 1,
    borderColor: THEME.colors.dateGridBorder,
    paddingTop: THEME.spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: 4,
    gap: 8,
  },
  cellBorderRight: {
    borderRightWidth: 1,
    borderColor: THEME.colors.dateGridBorder,
    paddingRight: THEME.spacing.sm,
  },
  iconWrapper: {
    marginTop: 2,
  },
  dateContent: {
    flex: 1,
  },
  label: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  dateText: {
    fontSize: THEME.fonts.sizes.md,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.brandDarkTeal,
  },
  timeText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: THEME.colors.dateGridBorder,
    marginVertical: 4,
  },
});

export default ImportantDatesGrid;
