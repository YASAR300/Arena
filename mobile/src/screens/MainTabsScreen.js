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
 * Unified tab shell — all panes stay mounted in memory.
 * Uses opacity (0/1) + pointerEvents prop for instant, zero-flicker tab switching.
 *
 * Key decisions:
 * - position:'absolute' fills the space above the tab bar for all panes
 * - Active pane: opacity 1, zIndex 2
 * - Hidden panes: opacity 0, zIndex 0 (NOT -1 — zIndex:-1 on Android hides behind parent bg)
 * - pointerEvents:'none' on the hidden pane View blocks touches through the transparent layer
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

  const isActive = (tab) => activeTab === tab;

  return (
    <View style={styles.container}>

      {/* ── Competitions Tab ── */}
      <View
        style={[styles.tabPane, isActive('competitions') ? styles.paneActive : styles.paneHidden]}
        pointerEvents={isActive('competitions') ? 'box-none' : 'none'}
      >
        <CompetitionDetailsScreen
          navigation={navigation}
          route={route}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Home Tab ── */}
      <View
        style={[styles.tabPane, isActive('home') ? styles.paneActive : styles.paneHidden]}
        pointerEvents={isActive('home') ? 'box-none' : 'none'}
      >
        <HomeScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Explore Tab ── */}
      <View
        style={[styles.tabPane, isActive('explore') ? styles.paneActive : styles.paneHidden]}
        pointerEvents={isActive('explore') ? 'box-none' : 'none'}
      >
        <ExploreScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Profile Tab ── */}
      <View
        style={[styles.tabPane, isActive('profile') ? styles.paneActive : styles.paneHidden]}
        pointerEvents={isActive('profile') ? 'box-none' : 'none'}
      >
        <ProfileScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* ── Bottom Tab Bar — always on top ── */}
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
  // All panes are absolutely positioned, filling from top to just above the tab bar
  tabPane: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Leave space for the tab bar (BottomTabBar is ~62px tall)
    bottom: 62,
  },
  // Active pane: fully visible, on top
  paneActive: {
    opacity: 1,
    zIndex: 2,
  },
  // Hidden pane: invisible but still mounted — NO re-render, NO re-fetch
  // zIndex:0 (not -1) is critical: zIndex:-1 on Android hides behind the parent background
  paneHidden: {
    opacity: 0,
    zIndex: 0,
  },
  // Tab bar fixed at bottom above all content panes
  tabBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
});
