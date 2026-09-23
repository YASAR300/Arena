import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';

/**
 * TabsSection Component
 * Three-tab switcher (About Competition / Judging Parameters / Rules & Eligibility)
 * with collapsible "View more / View less" accordion functionality
 */
const TabsSection = ({ competition }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('about');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabs = [
    { key: 'about', label: t('tabAbout') },
    { key: 'judging', label: t('tabJudging') },
    { key: 'rules', label: t('tabRules') },
  ];

  const getContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          competition?.about ||
          'This is an online classical dance competition open for all age groups.\nParticipate from anywhere and showcase your talent.\nExpress your passion through traditional dance.'
        );
      case 'judging':
        return (
          competition?.judgingCriteria ||
          '1. Technique & Rhythm (Taal & Laya) - 30%\n2. Expressions & Storytelling (Bhava & Abhinaya) - 30%\n3. Stage Presence, Costumes & Overall Impression - 20%\n4. Video Clarity & Audio Quality - 20%'
        );
      case 'rules':
        return (
          competition?.rules ||
          '• Video duration must be between 2 to 5 minutes.\n• Continuous single-take recording preferred; minimal editing allowed.\n• Participant must be clearly visible throughout the performance.\n• Pre-recorded performances must not be older than 3 months.'
        );
      default:
        return '';
    }
  };

  return (
    <View style={styles.card}>
      {/* Tabs Header */}
      <View style={styles.tabHeadersContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabHeader, isActive && styles.activeTabHeader]}
              onPress={() => {
                setActiveTab(tab.key);
                setIsExpanded(false); // Reset expansion when changing tab
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabHeaderText, isActive && styles.activeTabHeaderText]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content Body */}
      <View style={styles.contentBody}>
        <Text
          style={styles.contentText}
          numberOfLines={isExpanded ? undefined : 3}
        >
          {getContent()}
        </Text>

        {/* View More / View Less Toggle */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleText}>
            {isExpanded ? t('viewLess') : t('viewMore')}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={THEME.colors.brandTeal}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    ...THEME.shadows.card,
  },
  tabHeadersContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    justifyContent: 'space-between',
  },
  tabHeader: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    position: 'relative',
    alignItems: 'center',
  },
  activeTabHeader: {},
  tabHeaderText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.medium,
    color: THEME.colors.textMuted,
  },
  activeTabHeaderText: {
    color: THEME.colors.brandDarkTeal,
    fontWeight: THEME.fonts.weights.bold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 1,
  },
  contentBody: {
    paddingVertical: THEME.spacing.md,
  },
  contentText: {
    fontSize: THEME.fonts.sizes.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: THEME.fonts.sizes.xs,
    fontWeight: THEME.fonts.weights.bold,
    color: THEME.colors.brandTeal,
  },
});

export default TabsSection;
