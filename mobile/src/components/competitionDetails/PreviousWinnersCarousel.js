import React, { useState, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import VideoPlayerModal from '../common/VideoPlayerModal';

/**
 * PreviousWinnersCarousel Component
 * Displays a horizontal carousel of past competition winners with video play overlays
 */
const PreviousWinnersCarousel = ({ winners = [] }) => {
  const { t } = useLanguage();
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Default mock fallback winners if empty from API
  const displayWinners = winners.length > 0 ? winners : [
    {
      _id: 'w1',
      userName: 'Riya Shah',
      rank: 1,
      rankLabel: '1st Winner',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    },
    {
      _id: 'w2',
      userName: 'Aarav Mehta',
      rank: 1,
      rankLabel: '1st Winner',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    },
    {
      _id: 'w3',
      userName: 'Neha Verma',
      rank: 2,
      rankLabel: '2nd Winner',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    },
    {
      _id: 'w4',
      userName: 'Ishita Chokshi',
      rank: 3,
      rankLabel: '3rd Winner',
      thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.winnerCard}>
      {/* Thumbnail with Play Button Overlay */}
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() =>
          setSelectedVideo({
            url: item.videoUrl,
            title: `${item.userName} - ${item.rankLabel || 'Winner Performance'}`,
          })
        }
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={14} color={THEME.colors.brandTeal} style={{ marginLeft: 2 }} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Winner Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.winnerName} numberOfLines={1}>
          {item.userName}
        </Text>
        <Text style={styles.winnerRank}>
          {item.rankLabel || `${item.rank}${item.rank === 1 ? 'st' : item.rank === 2 ? 'nd' : 'rd'} Winner`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('previousWinners')}</Text>

      <FlatList
        data={displayWinners}
        keyExtractor={(item) => item._id || item.userName}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <VideoPlayerModal
        visible={!!selectedVideo}
        videoUrl={selectedVideo?.url}
        title={selectedVideo?.title}
        onClose={() => setSelectedVideo(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fonts.sizes.base,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 12,
  },
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    padding: 6,
    paddingRight: 12,
    ...THEME.shadows.card,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 3,
  },
  playCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  winnerName: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.textPrimary,
    maxWidth: 80,
  },
  winnerRank: {
    fontSize: 10,
    fontWeight: THEME.fonts.weights.semibold,
    color: THEME.colors.brandTeal,
    marginTop: 2,
  },
});

export default memo(PreviousWinnersCarousel);
