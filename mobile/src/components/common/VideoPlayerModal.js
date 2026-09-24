import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

/**
 * VideoPlayerModal
 * Reusable modal video player for judge intro videos and winner highlight reels
 */
const VideoPlayerModal = ({ visible, videoUrl, title, onClose }) => {
  const fallbackUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  // Sanitize video source: reject API upload endpoints and malformed strings
  const sanitizeUrl = (url) => {
    if (!url || typeof url !== 'string') return fallbackUrl;
    const trimmed = url.trim();
    if (
      trimmed.includes('/auto/upload') ||
      trimmed.includes('/undefined/') ||
      trimmed.includes('storage.feedants.com')
    ) {
      return fallbackUrl;
    }
    return trimmed;
  };

  const [activeUrl, setActiveUrl] = React.useState(() => sanitizeUrl(videoUrl));
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  // Synchronize when videoUrl prop changes
  React.useEffect(() => {
    const clean = sanitizeUrl(videoUrl);
    setActiveUrl(clean);
    setHasError(false);
    setIsLoading(true);
  }, [videoUrl]);

  // Initialize expo-video player
  const player = useVideoPlayer(activeUrl, (p) => {
    p.loop = true;
    if (visible) {
      p.play();
    }
  });

  // Dynamic source replacement & play/pause sync with modal visibility
  React.useEffect(() => {
    if (!player) return;

    if (visible) {
      try {
        if (activeUrl) {
          player.replace(activeUrl);
        }
        player.play();
      } catch (err) {
        console.warn('[VideoPlayerModal] Error setting video source:', err);
      }
    } else {
      try {
        player.pause();
      } catch (err) {}
    }
  }, [visible, activeUrl, player]);

  // Status and error listener
  React.useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (payload) => {
      const status = payload?.status || player.status;
      if (status === 'loading') {
        setIsLoading(true);
        setHasError(false);
      } else if (status === 'readyToPlay') {
        setIsLoading(false);
        setHasError(false);
      } else if (status === 'error') {
        setIsLoading(false);
        setHasError(true);
      }
    });

    return () => {
      statusSub?.remove?.();
    };
  }, [player]);

  const handlePlayFallback = () => {
    setHasError(false);
    setIsLoading(true);
    setActiveUrl(fallbackUrl);
    if (player) {
      try {
        player.replace(fallbackUrl);
        player.play();
      } catch (e) {}
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Performance Video'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Video Canvas */}
        <View style={styles.videoWrapper}>
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={true}
            allowsFullscreen={true}
            allowsPictureInPicture={true}
            contentFit="contain"
          />

          {/* Buffering Indicator */}
          {isLoading && !hasError && (
            <View style={styles.loaderOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#00E5FF" />
              <Text style={styles.loadingText}>Buffering performance...</Text>
            </View>
          )}

          {/* Error Notice */}
          {hasError && (
            <View style={styles.errorOverlay}>
              <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
              <Text style={styles.errorTitle}>Could not stream video</Text>
              <Text style={styles.errorSubtitle}>
                The video stream could not be loaded from this link.
              </Text>
              <TouchableOpacity
                style={styles.fallbackButton}
                onPress={handlePlayFallback}
                activeOpacity={0.8}
              >
                <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                <Text style={styles.fallbackButtonText}>Play Demonstration Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 20,
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    position: 'relative',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  loadingText: {
    marginTop: 12,
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 20,
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#005F60',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default VideoPlayerModal;
