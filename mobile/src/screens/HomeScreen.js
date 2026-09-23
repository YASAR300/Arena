import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { ROUTES } from '../navigation/routes';
import { THEME } from '../constants/theme';
import useAuthStore from '../store/authStore';
import BottomTabBar from '../components/competitionDetails/BottomTabBar';

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();

  const handleTabPress = (tab) => {
    switch (tab) {
      case 'home':
        break;
      case 'explore':
        navigation.navigate(ROUTES.EXPLORE);
        break;
      case 'create':
        navigation.navigate(ROUTES.SUBMISSION_UPLOAD);
        break;
      case 'competitions':
        navigation.navigate(ROUTES.COMPETITION_DETAILS);
        break;
      case 'profile':
        navigation.navigate(ROUTES.PROFILE);
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Creator'} 👋</Text>
        </View>

        <TouchableOpacity
          style={styles.profileAvatarBtn}
          onPress={() => navigation.navigate(ROUTES.PROFILE)}
          activeOpacity={0.8}
        >
          <Text style={styles.profileAvatarText}>
            {(user?.name || user?.email || 'U')[0].toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Card: Feedants Classical Dance */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => navigation.navigate(ROUTES.COMPETITION_DETAILS)}
          activeOpacity={0.9}
        >
          <View style={styles.heroBadgeRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE COMPETITION</Text>
            </View>
            <Text style={styles.categoryBadge}>CLASSICAL DANCE</Text>
          </View>

          <Text style={styles.heroTitle}>Feedants Classical Dance Championship</Text>
          <Text style={styles.heroSubtitle}>
            Judge: Manju Dubey • Prize Pool: ₹1,500 • Cash & Verified Certificates
          </Text>

          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.feeLabel}>Entry Fee</Text>
              <Text style={styles.feeValue}>₹99</Text>
            </View>

            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>View Details & Register</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate(ROUTES.COMPETITION_DETAILS)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E6F4F1' }]}>
              <Ionicons name="trophy" size={22} color="#005F60" />
            </View>
            <Text style={styles.actionTitle}>Active Arena</Text>
            <Text style={styles.actionSub}>Check dates & status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate(ROUTES.SUBMISSION_UPLOAD)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cloud-upload" size={22} color="#D97706" />
            </View>
            <Text style={styles.actionTitle}>Submit Entry</Text>
            <Text style={styles.actionSub}>Upload performance video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate(ROUTES.EXPLORE)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="compass" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionTitle}>Explore</Text>
            <Text style={styles.actionSub}>Categories & Judges</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="person" size={22} color="#DB2777" />
            </View>
            <Text style={styles.actionTitle}>My Profile</Text>
            <Text style={styles.actionSub}>Edit details & referrals</Text>
          </TouchableOpacity>
        </View>

        {/* Previous Winners Highlight */}
        <View style={styles.winnersSection}>
          <Text style={styles.sectionTitle}>Hall of Fame 🏆</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.winnersScroll}>
            {[
              {
                name: 'Riya Shah',
                rank: '1st Winner',
                amount: '₹550',
                image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
              },
              {
                name: 'Aarav Mehta',
                rank: '1st Winner',
                amount: '₹550',
                image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
              },
              {
                name: 'Neha Verma',
                rank: '2nd Winner',
                amount: '₹300',
                image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
              },
            ].map((w, idx) => (
              <View key={idx} style={styles.winnerCard}>
                <Image source={{ uri: w.image }} style={styles.winnerAvatar} />
                <Text style={styles.winnerName}>{w.name}</Text>
                <Text style={styles.winnerRank}>{w.rank}</Text>
                <Text style={styles.winnerPrize}>{w.amount}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Persistent Bottom Tab Bar */}
      <BottomTabBar activeTab="home" onTabPress={handleTabPress} />
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
  greetingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#005F60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#005F60',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  categoryBadge: {
    color: '#CCFBF1',
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroSubtitle: {
    color: '#CCFBF1',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  feeLabel: {
    color: '#99F6E4',
    fontSize: 10,
  },
  feeValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  winnersSection: {
    marginBottom: 16,
  },
  winnersScroll: {
    flexDirection: 'row',
  },
  winnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    width: 110,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  winnerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  winnerRank: {
    fontSize: 10,
    color: '#005F60',
    fontWeight: '600',
    marginTop: 2,
  },
  winnerPrize: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    marginTop: 2,
  },
});
