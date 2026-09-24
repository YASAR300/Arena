import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import useAuthStore, { secureStorage } from '../store/authStore';
import BottomTabBar from '../components/competitionDetails/BottomTabBar';

export default function ProfileScreen({ navigation, hideBottomBar = false, onNavigateTab }) {
  const { user, logout } = useAuthStore();

  const [name, setName] = useState(user?.name || 'Feedants Participant');
  const [email, setEmail] = useState(user?.email || 'participant@feedants.com');
  const [phone, setPhone] = useState(user?.phone || '9876543210');
  const [bio, setBio] = useState('Classical Dance enthusiast • Kathak & Bharatanatyam Performer');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const referralCode = user?.referralCode || 'ARENA2026';

  // Handle Profile Update
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      // Simulate/Persist profile update
      await new Promise((r) => setTimeout(r, 600));

      const updatedUser = {
        ...user,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      };

      await secureStorage.saveUser(updatedUser);
      useAuthStore.setState({ user: updatedUser });

      setIsSaving(false);
      setIsEditing(false);
      Alert.alert('Profile Updated! 🎉', 'Your details have been successfully saved.');
    } catch (err) {
      setIsSaving(false);
      Alert.alert('Update Failed', err.message || 'Could not update profile.');
    }
  };

  // Share Referral Link
  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join me on Feedants Arena! Use my referral code "${referralCode}" to get ₹10 off your competition entry fee: feedants://competitions/feedants-classical-dance?ref=${referralCode}`,
      });
    } catch (e) {}
  };

  // Handle Logout
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Feedants Arena?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

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

        <Text style={styles.headerTitle}>My Profile</Text>

        <TouchableOpacity
          onPress={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
          style={styles.editToggleBtn}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#005F60" />
          ) : (
            <Text style={styles.editToggleText}>{isEditing ? 'Save' : 'Edit'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {(name || 'U')[0].toUpperCase()}
            </Text>
            {isEditing && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>

          {/* Quick Stats Badges */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Registered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Submissions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>₹0</Text>
              <Text style={styles.statLabel}>Winnings</Text>
            </View>
          </View>
        </View>

        {/* Details Form Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={name}
              onChangeText={setName}
              editable={isEditing}
              placeholder="Your Name"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Your Email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholder="Mobile Number"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bio & Dance Specialization</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
              value={bio}
              onChangeText={setBio}
              editable={isEditing}
              multiline={true}
              numberOfLines={3}
              placeholder="Tell us about your art form..."
            />
          </View>

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Details</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Referral Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Referral Code</Text>
          <Text style={styles.referralDesc}>
            Invite other performers to register. They get ₹10 OFF, and you earn bonus entries!
          </Text>

          <View style={styles.referralRow}>
            <View style={styles.referralCodeBadge}>
              <Ionicons name="pricetag" size={16} color="#005F60" />
              <Text style={styles.referralCodeText}>{referralCode}</Text>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShareReferral} activeOpacity={0.8}>
              <Feather name="share-2" size={16} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => (onNavigateTab ? onNavigateTab('competitions') : navigation.navigate(ROUTES.COMPETITION_DETAILS))}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="trophy-outline" size={20} color="#005F60" />
            </View>
            <Text style={styles.actionText}>Active Competitions</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate(ROUTES.SUBMISSION_UPLOAD)}
          >
            <View style={styles.actionIconBox}>
              <Ionicons name="cloud-upload-outline" size={20} color="#005F60" />
            </View>
            <Text style={styles.actionText}>Upload / Edit Submission</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
            <View style={[styles.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.actionText, { color: '#DC2626' }]}>Log Out</Text>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Persistent Bottom Tab Bar */}
      {!hideBottomBar && <BottomTabBar activeTab="profile" onTabPress={handleTabPress} />}
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
  editToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#005F60',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#005F60',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0F172A',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#005F60',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#334155',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#005F60',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  referralDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  referralCodeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  referralCodeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#005F60',
    letterSpacing: 1,
  },
  shareBtn: {
    backgroundColor: '#005F60',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
});
