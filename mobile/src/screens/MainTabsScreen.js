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
 * Unified tab shell that renders Home, Explore, Competitions, and Profile
 * views simultaneously in-memory. Switches tabs in 0ms without re-rendering,
 * re-mounting, re-fetching, or stack page reloading.
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
      {/* 1. Competitions Tab Pane (Active / Details) */}
      <View
        style={[
          styles.tabPane,
          activeTab === 'competitions' ? styles.paneVisible : styles.paneHidden,
        ]}
      >
        <CompetitionDetailsScreen
          navigation={navigation}
          route={route}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* 2. Home Tab Pane */}
      <View
        style={[
          styles.tabPane,
          activeTab === 'home' ? styles.paneVisible : styles.paneHidden,
        ]}
      >
        <HomeScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* 3. Explore Tab Pane */}
      <View
        style={[
          styles.tabPane,
          activeTab === 'explore' ? styles.paneVisible : styles.paneHidden,
        ]}
      >
        <ExploreScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* 4. Profile Tab Pane */}
      <View
        style={[
          styles.tabPane,
          activeTab === 'profile' ? styles.paneVisible : styles.paneHidden,
        ]}
      >
        <ProfileScreen
          navigation={navigation}
          hideBottomBar={true}
          onNavigateTab={setActiveTab}
        />
      </View>

      {/* Single Fixed Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabPane: {
    flex: 1,
  },
  paneVisible: {
    display: 'flex',
  },
  paneHidden: {
    display: 'none',
  },
});
