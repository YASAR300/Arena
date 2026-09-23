import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

/**
 * BottomTabBar Component
 * Replicates the fixed bottom application navigation bar from Objective_Page.png
 * Items: Home, Explore, + (Create), Competitions (Active), Profile
 */
const BottomTabBar = ({ activeTab = 'competitions', onTabPress }) => {
  return (
    <View style={styles.container}>
      {/* Home */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress && onTabPress('home')}
        activeOpacity={0.7}
      >
        <Feather
          name="home"
          size={20}
          color={activeTab === 'home' ? THEME.colors.brandTeal : THEME.colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'home' && styles.activeTabLabel,
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Explore */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress && onTabPress('explore')}
        activeOpacity={0.7}
      >
        <Feather
          name="search"
          size={20}
          color={activeTab === 'explore' ? THEME.colors.brandTeal : THEME.colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'explore' && styles.activeTabLabel,
          ]}
        >
          Explore
        </Text>
      </TouchableOpacity>

      {/* Center Create (+) Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={() => onTabPress && onTabPress('create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Competitions (Active) */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress && onTabPress('competitions')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trophy-outline"
          size={20}
          color={activeTab === 'competitions' ? THEME.colors.brandTeal : THEME.colors.textMuted}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'competitions' && styles.activeTabLabel,
          ]}
        >
          Competitions
        </Text>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onTabPress && onTabPress('profile')}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
          }}
          style={styles.profileAvatar}
        />
        <Text
          style={[
            styles.tabLabel,
            activeTab === 'profile' && styles.activeTabLabel,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  activeTabLabel: {
    color: THEME.colors.brandTeal,
    fontWeight: '700',
  },
  centerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.brandDarkTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#CBD5E1',
  },
});

export default BottomTabBar;
