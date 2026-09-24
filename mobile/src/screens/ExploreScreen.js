import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import BottomTabBar from '../components/competitionDetails/BottomTabBar';

export default function ExploreScreen({ navigation, hideBottomBar = false, onNavigateTab }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Dance', 'Singing', 'Acting', 'Music', 'Art'];

  const competitions = [
    {
      id: 'feedants-classical-dance',
      title: 'Feedants Classical Dance',
      judge: 'Manju Dubey',
      category: 'Dance',
      entryFee: '₹99',
      prizePool: '₹1,500',
      spotsLeft: 19,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    },
    {
      id: 'vocal-symphony-2026',
      title: 'Vocal Symphony Indian Idol',
      judge: 'Pt. Hari Prasad',
      category: 'Singing',
      entryFee: '₹149',
      prizePool: '₹5,000',
      spotsLeft: 8,
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    },
    {
      id: 'kathak-rhythms-championship',
      title: 'Kathak Rhythms Season 2',
      judge: 'Ustad Zakir Hussain',
      category: 'Dance',
      entryFee: '₹199',
      prizePool: '₹10,000',
      spotsLeft: 5,
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    },
  ];

  const filteredCompetitions = competitions.filter((c) => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesQuery = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleTabPress = (tab) => {
    if (onNavigateTab) {
      if (tab === 'create') {
        navigation.navigate(ROUTES.SUBMISSION_UPLOAD);
      } else {
        onNavigateTab(tab);
      }
      return;
    }
    if (tab === 'create') {
      navigation.navigate(ROUTES.SUBMISSION_UPLOAD);
    } else {
      navigation.navigate(ROUTES.MAIN_TABS, { tab });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (onNavigateTab) {
              onNavigateTab('competitions');
            } else if (navigation?.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else if (navigation) {
              navigation.navigate(ROUTES.COMPETITION_DETAILS);
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explore Arena</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search competitions, art forms..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Arena Banner */}
        <TouchableOpacity
          style={styles.featuredBanner}
          onPress={() => (onNavigateTab ? onNavigateTab('competitions') : navigation.navigate(ROUTES.COMPETITION_DETAILS))}
          activeOpacity={0.9}
        >
          <View style={styles.featuredBadge}>
            <Ionicons name="flame" size={14} color="#D97706" />
            <Text style={styles.featuredBadgeText}>FEATURED CHALLENGE</Text>
          </View>
          <Text style={styles.featuredTitle}>Feedants Classical Dance 💃</Text>
          <Text style={styles.featuredSubtitle}>
            Judge: Manju Dubey • Prize Pool: ₹1,500 • Cash & Certificates
          </Text>
          <View style={styles.featuredAction}>
            <Text style={styles.featuredActionText}>View & Register Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Competitions List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Competitions</Text>
          <Text style={styles.sectionCount}>{filteredCompetitions.length} Available</Text>
        </View>

        {filteredCompetitions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.compCard}
            onPress={() => (onNavigateTab ? onNavigateTab('competitions') : navigation.navigate(ROUTES.COMPETITION_DETAILS))}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.image }} style={styles.compImage} />
            <View style={styles.compInfo}>
              <View style={styles.compCategoryPill}>
                <Text style={styles.compCategoryText}>{item.category}</Text>
              </View>
              <Text style={styles.compTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.compJudge}>Judge: {item.judge}</Text>

              <View style={styles.compFooter}>
                <View>
                  <Text style={styles.compFeeLabel}>Entry Fee</Text>
                  <Text style={styles.compFeeValue}>{item.entryFee}</Text>
                </View>

                <View style={styles.spotsBadge}>
                  <Ionicons name="people" size={14} color="#059669" />
                  <Text style={styles.spotsText}>{item.spotsLeft} spots left</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Persistent Bottom Tab Bar */}
      {!hideBottomBar && <BottomTabBar activeTab="explore" onTabPress={handleTabPress} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  categoryScroll: {
    marginVertical: 14,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  categoryPillActive: {
    backgroundColor: '#005F60',
    borderColor: '#005F60',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  featuredBanner: {
    backgroundColor: '#0C2340',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  featuredSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  featuredAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  featuredActionText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  compCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  compImage: {
    width: 100,
    height: 110,
    backgroundColor: '#E2E8F0',
  },
  compInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  compCategoryPill: {
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  compCategoryText: {
    color: '#005F60',
    fontSize: 10,
    fontWeight: '700',
  },
  compTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  compJudge: {
    fontSize: 11,
    color: '#64748B',
  },
  compFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  compFeeLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  compFeeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#005F60',
  },
  spotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  spotsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
});
