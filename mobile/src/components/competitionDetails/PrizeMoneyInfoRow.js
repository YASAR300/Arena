import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import VideoPlayerModal from '../common/VideoPlayerModal';

/**
 * PrizeMoneyInfoRow Component
 * Renders the two informational blocks side-by-side:
 * Left: "How will you receive prize money? Watch video to know more"
 * Right: "Refund policy" and "Secure payments powered by Razorpay"
 */
const PrizeMoneyInfoRow = ({ videoUrl, refundPolicyText }) => {
  const { t } = useLanguage();
  const [isVideoModalVisible, setVideoModalVisible] = useState(false);

  const handleRefundPress = () => {
    Alert.alert(
      t('refundPolicy'),
      refundPolicyText ||
        'Registrations can be cancelled with 100% refund up until the submission window opens. Once the submission phase begins, entry fees are non-refundable.',
      [{ text: 'OK' }]
    );
  };

  return (
    <>
      <View style={styles.container}>
        {/* Left Card: Video CTA */}
        <TouchableOpacity
          style={[styles.card, styles.leftCard]}
          onPress={() => setVideoModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.playIconBox}>
            <Ionicons name="play" size={16} color={THEME.colors.brandDarkTeal} style={{ marginLeft: 2 }} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{t('howReceivePrize')}</Text>
            <Text style={styles.cardSubtitle}>{t('watchVideoMore')}</Text>
          </View>
        </TouchableOpacity>

        {/* Right Card: Policies & Razorpay Badge */}
        <View style={[styles.card, styles.rightCard]}>
          {/* Refund Policy */}
          <TouchableOpacity
            style={styles.policyRow}
            onPress={handleRefundPress}
            activeOpacity={0.7}
          >
            <Feather name="shield" size={15} color={THEME.colors.textPrimary} />
            <Text style={styles.policyText}>{t('refundPolicy')}</Text>
          </TouchableOpacity>

          {/* Secure Payments Badge */}
          <View style={styles.policyRow}>
            <Feather name="shield" size={15} color={THEME.colors.textPrimary} />
            <Text style={styles.secureText}>{t('securePayments')}</Text>
            <Text style={styles.razorpayBrand}>Razorpay</Text>
          </View>
        </View>
      </View>

      <VideoPlayerModal
        visible={isVideoModalVisible}
        videoUrl={videoUrl}
        title={t('howReceivePrize')}
        onClose={() => setVideoModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 10,
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  leftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1EAEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    lineHeight: 14,
  },
  cardSubtitle: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  rightCard: {
    gap: 8,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  policyText: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME.colors.textPrimary,
  },
  secureText: {
    fontSize: 9,
    color: THEME.colors.textMuted,
  },
  razorpayBrand: {
    fontSize: 10,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#0C2340',
  },
});

export default PrizeMoneyInfoRow;
