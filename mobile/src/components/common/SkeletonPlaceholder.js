import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { THEME } from '../../constants/theme';

/**
 * SkeletonBox
 * Animated pulsing placeholder box for content loading
 */
export const SkeletonBox = ({ width = '100%', height = 20, borderRadius = 6, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonBox,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * CompetitionDetailsSkeleton
 * Full-screen skeleton matching the layout of CompetitionDetailsScreen
 */
export const CompetitionDetailsSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Header Card Skeleton */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <SkeletonBox width="60%" height={24} />
          <SkeletonBox width={80} height={24} borderRadius={12} />
        </View>
        <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
          <SkeletonBox width={60} height={20} />
          <SkeletonBox width={70} height={20} />
          <SkeletonBox width={120} height={20} />
        </View>
        <View style={[styles.rowBetween, { marginTop: 20 }]}>
          <SkeletonBox width="28%" height={36} />
          <SkeletonBox width="28%" height={36} />
          <SkeletonBox width="35%" height={36} />
        </View>
      </View>

      {/* Judge Card Skeleton */}
      <View style={[styles.card, styles.row, { alignItems: 'center', gap: 12 }]}>
        <SkeletonBox width={60} height={60} borderRadius={30} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="30%" height={12} />
          <SkeletonBox width="70%" height={18} />
          <SkeletonBox width="50%" height={14} />
        </View>
        <SkeletonBox width={44} height={44} borderRadius={22} />
      </View>

      {/* Countdown Banner Skeleton */}
      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <SkeletonBox width="100%" height={40} borderRadius={10} />
      </View>

      {/* Important Dates Skeleton */}
      <View style={styles.card}>
        <SkeletonBox width="40%" height={20} style={{ marginBottom: 12 }} />
        <View style={styles.rowBetween}>
          <SkeletonBox width="45%" height={50} />
          <SkeletonBox width="45%" height={50} />
        </View>
        <View style={[styles.rowBetween, { marginTop: 12 }]}>
          <SkeletonBox width="45%" height={50} />
          <SkeletonBox width="45%" height={50} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  skeletonBox: {
    backgroundColor: '#E2E8F0',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#EBF0F2',
  },
  row: {
    flexDirection: 'row',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default CompetitionDetailsSkeleton;
