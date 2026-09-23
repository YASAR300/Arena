import React, { useState, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import VideoPlayerModal from '../common/VideoPlayerModal';

/**
 * JudgeCard Component
 * Displays judge information, avatar, credentials, and video playback action
 */
const JudgeCard = ({ judge }) => {
  const { t } = useLanguage();
  const [isVideoModalVisible, setVideoModalVisible] = useState(false);

  const fallbackPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300';
  const photoUrl = judge?.photoUrl || fallbackPhoto;

  return (
    <>
      <View style={styles.card}>
        {/* Judge Avatar — Cached via expo-image */}
        <Image
          source={{ uri: photoUrl }}
          style={styles.avatar}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />

        {/* Judge Bio & Details */}
        <View style={styles.bioContainer}>
          <Text style={styles.judgeLabel}>{t('judge')}</Text>
          <Text style={styles.judgeName}>{judge?.name || 'Manju Dubey'}</Text>
          <Text style={styles.designation}>
            {judge?.designation || 'Professional Kathak Dancer'}
          </Text>
          <Text style={styles.experience}>
            {t('yearsExperience', { years: judge?.experienceYears || 12 })}
          </Text>
        </View>

        {/* Intro Video Action Button */}
        <TouchableOpacity
          style={styles.videoActionContainer}
          onPress={() => setVideoModalVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('introVideo')}
          accessibilityRole="button"
        >
          <View style={styles.playButtonCircle}>
            <Ionicons name="play" size={18} color={THEME.colors.brandTeal} style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.introVideoText}>{t('introVideo')}</Text>
        </TouchableOpacity>
      </View>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={isVideoModalVisible}
        videoUrl={judge?.introVideoUrl}
        title={`${judge?.name || 'Judge'} - Intro Video`}
        onClose={() => setVideoModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    ...THEME.shadows.card,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  bioContainer: {
    flex: 1,
    marginLeft: THEME.spacing.md,
    justifyContent: 'center',
  },
  judgeLabel: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: THEME.fonts.weights.medium,
  },
  judgeName: {
    fontSize: THEME.fonts.sizes.lg,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
    marginTop: 1,
  },
  designation: {
    fontSize: THEME.fonts.sizes.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  experience: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  videoActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: THEME.spacing.sm,
    padding: 4,
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.brandMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introVideoText: {
    fontSize: THEME.fonts.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fonts.weights.medium,
    marginTop: 4,
  },
});

export default memo(JudgeCard);
