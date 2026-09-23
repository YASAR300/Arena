import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * OfflineBanner Component
 * Real-time network detection banner powered by @react-native-community/netinfo.
 * Drops down smoothly when offline, and flashes a green "Back online" confirmation
 * before sliding back up when connection is restored.
 */
export const OfflineBanner = () => {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const slideAnim = useState(new Animated.Value(-60))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;

      if (offline) {
        setIsOffline(true);
        setWasOffline(true);
        setShowBackOnline(false);

        // Slide down
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (wasOffline) {
        // Reconnected after being offline
        setIsOffline(false);
        setShowBackOnline(true);

        const timer = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -60,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowBackOnline(false);
            setWasOffline(false);
          });
        }, 2500);

        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribe();
  }, [wasOffline, slideAnim]);

  if (!isOffline && !showBackOnline) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        showBackOnline ? styles.onlineBanner : styles.offlineBanner,
        {
          paddingTop: Math.max(insets.top, 8),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={showBackOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={18}
          color="#FFFFFF"
        />
        <Text style={styles.text}>
          {showBackOnline
            ? 'Back online — Changes synced'
            : 'No internet connection. Offline mode.'}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: 8,
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  offlineBanner: {
    backgroundColor: '#DC2626',
  },
  onlineBanner: {
    backgroundColor: '#059669',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default OfflineBanner;
