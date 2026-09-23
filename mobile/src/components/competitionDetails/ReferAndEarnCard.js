import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * ReferAndEarnCard Component
 * Displays user's referral link with real clipboard copy action and native Share.share
 */
const ReferAndEarnCard = ({ referralCode, referralUrl }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const displayUrl =
    referralUrl ||
    (referralCode
      ? `https://feedants.com/r/${referralCode}`
      : 'https://feedants.com/r/referral123');

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(displayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy to clipboard', e);
    }
  };

  const handleReferNow = async () => {
    try {
      await Share.share({
        message: `Join me on Feedants Dance Arena! Register using my referral link to get instant discount: ${displayUrl}`,
        url: displayUrl,
        title: 'Feedants Competition Referral',
      });
    } catch (error) {
      console.warn('Error sharing referral link:', error.message);
    }
  };

  return (
    <View style={styles.card}>
      {/* Top / Left: Icon & Heading */}
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="bullhorn-outline" size={26} color={THEME.colors.brandTeal} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{t('referAndEarn')}</Text>

          {/* URL Bar & Copy Button */}
          <View style={styles.urlContainer}>
            <Text style={styles.urlText} numberOfLines={1}>
              {displayUrl}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyLink}
              activeOpacity={0.7}
            >
              <Text style={styles.copyButtonText}>
                {copied ? t('copied') : t('copyLink')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Action: Refer Now Button & Reward Caption */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.referButton}
            onPress={handleReferNow}
            activeOpacity={0.8}
          >
            <Text style={styles.referButtonText}>{t('referNow')}</Text>
          </TouchableOpacity>
          <Text style={styles.rewardText}>{t('referEarningText')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.referralBg,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.referralBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D6F2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C2EAE0',
    paddingLeft: 8,
    overflow: 'hidden',
  },
  urlText: {
    flex: 1,
    fontSize: 10,
    color: '#005F60',
    fontWeight: '500',
  },
  copyButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  copyButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  referButton: {
    backgroundColor: THEME.colors.referralBtn,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  referButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardText: {
    fontSize: 9,
    color: '#006D6B',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ReferAndEarnCard;
