import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';
import { useCompetitionDetails, useRegistrationMutation, useSubmissionMutation } from '../hooks/useCompetitionDetails';
import ScreenHeader from '../components/competitionDetails/ScreenHeader';
import CompetitionHeaderCard from '../components/competitionDetails/CompetitionHeaderCard';
import JudgeCard from '../components/competitionDetails/JudgeCard';
import CountdownBanner from '../components/competitionDetails/CountdownBanner';
import ImportantDatesGrid from '../components/competitionDetails/ImportantDatesGrid';
import PreviousWinnersCarousel from '../components/competitionDetails/PreviousWinnersCarousel';
import TabsSection from '../components/competitionDetails/TabsSection';
import RewardsTable from '../components/competitionDetails/RewardsTable';
import DisclaimerBanner from '../components/competitionDetails/DisclaimerBanner';
import PrizeMoneyInfoRow from '../components/competitionDetails/PrizeMoneyInfoRow';
import ReferAndEarnCard from '../components/competitionDetails/ReferAndEarnCard';
import ReviewsEntryRow from '../components/competitionDetails/ReviewsEntryRow';
import AdPlaceholder from '../components/competitionDetails/AdPlaceholder';
import BottomActionBar from '../components/competitionDetails/BottomActionBar';
import BottomTabBar from '../components/competitionDetails/BottomTabBar';
import CompetitionDetailsSkeleton from '../components/common/SkeletonPlaceholder';
import RegistrationSheet from '../components/registration/RegistrationSheet';

/**
 * CompetitionDetailsScreen Master Screen
 * Pixel-perfect implementation of Objective_Page.png powered by live backend APIs
 */
export default function CompetitionDetailsScreen({ route, navigation }) {
  const { competitionSlug = 'feedants-classical-dance' } = route.params || {};
  const { t } = useLanguage();

  const {
    data: competition,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useCompetitionDetails(competitionSlug);

  const registrationMutation = useRegistrationMutation(competition?._id);
  const [isRegistrationSheetVisible, setIsRegistrationSheetVisible] = useState(false);
  const referralCode = route.params?.ref || route.params?.referralCode || '';

  const [activeBottomNav, setActiveBottomNav] = useState('competitions');

  // Handle CTA Actions from BottomActionBar state machine
  const handleCtaAction = async (action) => {
    switch (action) {
      case 'REGISTER':
        setIsRegistrationSheetVisible(true);
        break;

      case 'UPLOAD_SUBMISSION':
        try {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Permission Denied', 'Camera roll access is required to upload your submission.');
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos', 'images'],
            allowsEditing: true,
            quality: 0.8,
          });

          if (!result.canceled && result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            Alert.alert(
              'Upload Submission',
              `Submit video file (${asset.fileName || 'dance_performance.mp4'}) for judging?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Submit Entry',
                  onPress: async () => {
                    try {
                      await submissionMutation.mutateAsync({
                        title: 'Feedants Classical Dance Submission',
                        mediaUrl: asset.uri,
                      });
                      Alert.alert('Submitted! 🎉', 'Your submission has been uploaded successfully and sent for judging.');
                    } catch (uploadErr) {
                      Alert.alert('Upload Error', uploadErr.message || 'Failed to record submission.');
                    }
                  },
                },
              ]
            );
          }
        } catch (e) {
          Alert.alert('Error', 'Unable to pick video: ' + e.message);
        }
        break;

      case 'SUBMISSION_UPLOADED':
        Alert.alert(
          t('submissionUploaded'),
          'Your entry has been received and verified. Good luck for the results!',
          [{ text: 'OK' }]
        );
        break;

      case 'VIEW_RESULTS':
        Alert.alert(
          t('viewResults'),
          'Winners will be announced on ' + (competition?.resultDate || 'Result Date'),
          [{ text: 'OK' }]
        );
        break;

      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. Screen Header with Back & Language Switcher */}
      <ScreenHeader onBack={() => navigation.canGoBack() ? navigation.goBack() : null} />

      {/* Loading Skeleton */}
      {isLoading ? (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <CompetitionDetailsSkeleton />
        </ScrollView>
      ) : isError ? (
        /* Error State with Retry */
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={THEME.colors.error} />
          <Text style={styles.errorTitle}>Could not load competition</Text>
          <Text style={styles.errorMessage}>{error?.message || 'Network request failed'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Dynamic Competition Content */
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[THEME.colors.brandDarkTeal]}
              tintColor={THEME.colors.brandDarkTeal}
            />
          }
        >
          {/* 2. Competition Header Card (Title, Tags, Certificate, Spots Progress) */}
          <CompetitionHeaderCard
            competition={competition}
            currentUserState={competition?.currentUserState}
          />

          {/* 3. Judge Card (Avatar, Credentials, Intro Video Player) */}
          <JudgeCard judge={competition?.judge} />

          {/* 4. Live Countdown Banner */}
          <CountdownBanner
            registrationEndAt={competition?.registrationEndAt}
            serverTimestamp={competition?.serverTimestamp}
            onExpire={() => refetch()}
          />

          {/* 5. Important Dates 2x2 Grid */}
          <ImportantDatesGrid dates={competition} />

          {/* 6. Previous Winners Carousel */}
          <PreviousWinnersCarousel winners={competition?.previousWinners} />

          {/* 7. Tabs Section (About / Judging / Rules + View more/less) */}
          <TabsSection competition={competition} />

          {/* 8. Rewards Table */}
          <RewardsTable rewards={competition?.rewards} />

          {/* 9. Disclaimer Banner */}
          <DisclaimerBanner />

          {/* 10. Prize Money Info & Refund/Razorpay Badges */}
          <PrizeMoneyInfoRow
            videoUrl={competition?.prizeMoneyVideoUrl}
            refundPolicyText={competition?.refundPolicy}
          />

          {/* 11. Refer & Earn Card with Working Copy & Native Share */}
          <ReferAndEarnCard
            referralCode={competition?.currentUserState?.referralCode}
            referralUrl={competition?.currentUserState?.referralUrl}
          />

          {/* 12. Hear From Our Users Row */}
          <ReviewsEntryRow />

          {/* 13. Ad Placeholder */}
          <AdPlaceholder />

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* 14. Bottom Action Bar State Machine */}
      {!isLoading && !isError && (
        <BottomActionBar
          currentUserState={competition?.currentUserState}
          entryFee={competition?.entryFee}
          loading={registrationMutation.isPending || submissionMutation.isPending}
          onPressAction={handleCtaAction}
        />
      )}

      {/* 15. Persistent App Bottom Navigation Bar */}
      <BottomTabBar
        activeTab={activeBottomNav}
        onTabPress={(tab) => setActiveBottomNav(tab)}
      />

      {/* 16. Registration & Razorpay Payment Bottom Sheet */}
      <RegistrationSheet
        visible={isRegistrationSheetVisible}
        onClose={() => setIsRegistrationSheetVisible(false)}
        competition={competition}
        initialReferralCode={referralCode}
        onRegistrationSuccess={(_data) => {
          refetch();
          Alert.alert(
            'Registration Confirmed! 🎉',
            'Your spot has been secured. You can now prepare your entry and upload it when submissions open!'
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: THEME.colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
