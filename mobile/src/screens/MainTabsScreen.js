import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import CompetitionDetailsScreen from './CompetitionDetailsScreen';
import HomeScreen from './HomeScreen';
import ExploreScreen from './ExploreScreen';
import ProfileScreen from './ProfileScreen';
import BottomTabBar from '../components/competitionDetails/BottomTabBar';
import { ROUTES } from '../navigation/routes';

/**
 * MainTabsScreen
 * Unified tab shell that renders all tab panes simultaneously in-memory.
 *
 * Uses absoluteFill + opacity + pointerEvents for ZERO-ms, ZERO-flicker tab
 * switching on both Android and iOS.
 *
 * Why NOT display:'none'?
 *   On Android, toggling display:'none' removes the node from the layout tree
 *   entirely, causing a brief layout recalculation & flicker on each switch.
 *
 * Why opacity:0 + pointerEvents:'none'?
 *   The view stays in the layout tree (no remount / re-fetch), becomes invisible,
 *   and blocks touch events — a pure visual toggle with zero side-effects.
 */
export default function MainTabsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState(
    route.params?.initialTab || route.params?.tab || 'competitions'
  );

  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route.params?.tab]);

  const handleTabPress = (tab) => {
    if (tab === 'create') {
      navigation.navigate(ROUTES.SUBMISSION_UPLOAD);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <View style={styles.container}>

      {/* ── Competitions Tab Pane ── */}
      <View
        style={[styles.tabPane, activeTab !== 'competitions' && styles.paneHidden]}
        pointerEvents={activeTab === 'competitions' ? 'box-none' : 'none'}
      >
        <CompetitionDetailsScreen
          navigation={navigation}
          route={route}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Home Tab Pane ── */}
      <View
        style={[styles.tabPane, activeTab !== 'home' && styles.paneHidden]}
        pointerEvents={activeTab === 'home' ? 'box-none' : 'none'}
      >
        <HomeScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Explore Tab Pane ── */}
      <View
        style={[styles.tabPane, activeTab !== 'explore' && styles.paneHidden]}
        pointerEvents={activeTab === 'explore' ? 'box-none' : 'none'}
      >
        <ExploreScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Profile Tab Pane ── */}
      <View
        style={[styles.tabPane, activeTab !== 'profile' && styles.paneHidden]}
        pointerEvents={activeTab === 'profile' ? 'box-none' : 'none'}
      >
        <ProfileScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Bottom Tab Bar — always on top via absolute + zIndex ── */}
      <View style={styles.tabBarWrapper} pointerEvents="box-none">
        <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Every pane fills the full screen area ABOVE the tab bar
  tabPane: {
    ...StyleSheet.absoluteFillObject,
    bottom: 62, // tab bar height — keeps content from being hidden behind bar
  },
  // Hidden pane: invisible, non-interactive, below active pane in z-order
  paneHidden: {
    opacity: 0,
    zIndex: -1,
  },
  // Tab bar fixed at the very bottom, above all panes
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    // Subtle top shadow to visually separate from content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
});
