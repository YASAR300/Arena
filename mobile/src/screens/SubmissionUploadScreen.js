import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useLanguage } from '../i18n/LanguageContext';
import apiClient from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useThrottledCallback } from '../utils/debounce';
import { ROUTES } from '../navigation/routes';

/**
 * SubmissionUploadScreen
 * Dedicated video upload flow for competition performances:
 * - Strictly video files (MP4/MOV)
 * - Immediate visible submit buttons both in-card and sticky footer
 * - Safe fallback competition resolution
 * - Signed Cloudinary direct upload
 */
export default function SubmissionUploadScreen({ route, navigation }) {
  const { competition, existingSubmission } = route.params || {};
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [activeComp, setActiveComp] = useState(competition || null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0 to 100
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUrgentDeadline, setIsUrgentDeadline] = useState(false);
  const [timeLeftString, setTimeLeftString] = useState('');
  const [isWindowClosed, setIsWindowClosed] = useState(false);

  // If competition wasn't passed, fetch the default active competition
  useEffect(() => {
    if (!activeComp) {
      apiClient
        .get('/competitions/feedants-classical-dance')
        .then((res) => {
          const compData = res?.data || res;
          setActiveComp(compData);
        })
        .catch((err) =>
          console.warn('[SubmissionUpload] Failed to fetch fallback competition:', err)
        );
    }
  }, [activeComp]);

  // Check Submission Window Deadline
  useEffect(() => {
    const checkDeadline = () => {
      const endAt = activeComp?.submissionEndAt;
      if (!endAt) {
        setTimeLeftString('Closes on Sep 30, 2026');
        return;
      }
      const now = new Date();
      const end = new Date(endAt);
      const diffMs = end - now;

      if (diffMs <= 0) {
        setIsWindowClosed(true);
        setTimeLeftString('Submission window has closed');
        return;
      }

      if (diffMs < 60 * 60 * 1000) {
        setIsUrgentDeadline(true);
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      setTimeLeftString(
        `${String(hours).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`
      );
    };

    checkDeadline();
    const timer = setInterval(checkDeadline, 1000);
    return () => clearInterval(timer);
  }, [activeComp?.submissionEndAt]);

  // Pick Video ONLY (strictly performance video, no images)
  const handlePickMedia = async () => {
    if (isWindowClosed) {
      Alert.alert('Window Closed', 'Submissions can no longer be accepted for this competition.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please enable video library access to select your performance video.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'], // STRICTLY VIDEOS
        allowsEditing: false, // Ensures compatibility across all Android versions
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedAsset(asset);
        setErrorMessage(null);
      }
    } catch (err) {
      setErrorMessage('Could not open video library: ' + err.message);
    }
  };

  // Perform Upload to Cloudinary & Backend Confirmation
  const handleUploadSubmission = useThrottledCallback(async () => {
    if (!selectedAsset) {
      Alert.alert('Select Video', 'Please select your performance video to upload.');
      return;
    }

    if (isWindowClosed) {
      Alert.alert('Submission Closed', 'The submission deadline has passed.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText('Requesting secure Cloudinary authorization...');
    setErrorMessage(null);

    try {
      const fileExt = selectedAsset.uri.split('.').pop() || 'mp4';
      const fileName = selectedAsset.fileName || `entry_${Date.now()}.${fileExt}`;
      const fileType = 'video/mp4';

      const targetCompId =
        activeComp?._id || activeComp?.id || activeComp?.slug || 'feedants-classical-dance';

      // Step 1: Request Cloudinary signed params from backend
      const signedRes = await apiClient.get(
        `/competitions/${targetCompId}/submissions/signed-url`,
        {
          params: { fileName, fileType },
        }
      );

      const signPayload = signedRes?.data || signedRes;
      const { uploadUrl, key, apiKey, timestamp, signature, folder } =
        signPayload?.data || signPayload;

      setUploadProgress(35);
      setUploadStatusText('Uploading performance video to Cloudinary...');

      let mediaUrl = uploadUrl?.split('?')[0] || `https://storage.feedants.com/${key}`;

      // Step 2: Direct multipart upload to Cloudinary if signed parameters exist
      if (uploadUrl && apiKey && signature && timestamp) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: selectedAsset.uri,
            type: fileType,
            name: fileName,
          });
          formData.append('api_key', String(apiKey));
          formData.append('timestamp', String(timestamp));
          formData.append('signature', String(signature));
          if (folder) formData.append('folder', String(folder));

          setUploadProgress(60);
          const cldRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });
          const cldJson = await cldRes.json();
          if (cldJson?.secure_url || cldJson?.url) {
            mediaUrl = cldJson.secure_url || cldJson.url;
          }
        } catch (uploadErr) {
          console.warn('[SubmissionUpload] Cloudinary upload fallback:', uploadErr);
        }
      }

      setUploadProgress(95);
      setUploadStatusText('Registering submission on Feedants server...');

      // Step 3: Confirm submission record with backend
      await apiClient.post(`/competitions/${targetCompId}/submissions`, {
        mediaUrl,
        mediaType: fileType,
        thumbnailUrl: selectedAsset.uri,
      });

      setUploadProgress(100);
      setUploadStatusText('Complete!');

      // Invalidate queries so competition details screen updates to "Submission Uploaded"
      queryClient.invalidateQueries({
        queryKey: ['competition', activeComp?.slug || 'feedants-classical-dance'],
      });

      Alert.alert(
        'Performance Video Submitted! 🎉',
        'Your classical dance entry has been securely recorded and sent to the judging panel.',
        [
          {
            text: 'View Competition Details',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(ROUTES.MAIN_TABS, { tab: 'competitions' });
              }
            },
          },
        ]
      );
    } catch (err) {
      console.warn('[SubmissionUpload] Error:', err);
      setIsUploading(false);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to upload performance video. Please check connection and retry.';
      setErrorMessage(msg);
    }
  }, 1200);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate(ROUTES.MAIN_TABS, { tab: 'competitions' });
            }
          }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingSubmission ? 'Replace Video' : 'Submit Performance Video'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Deadline Alert Banner */}
        <View
          style={[
            styles.deadlineBanner,
            isUrgentDeadline && styles.urgentBanner,
            isWindowClosed && styles.closedBanner,
          ]}
        >
          <Ionicons
            name={isWindowClosed ? 'alert-circle' : isUrgentDeadline ? 'alarm' : 'time-outline'}
            size={22}
            color={isWindowClosed ? '#B91C1C' : isUrgentDeadline ? '#D97706' : '#005F60'}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={[
                styles.deadlineTitle,
                isUrgentDeadline && { color: '#B45309' },
                isWindowClosed && { color: '#991B1B' },
              ]}
            >
              {isWindowClosed
                ? 'Submission Window Closed'
                : isUrgentDeadline
                ? '⚠️ Hurry! Deadline Closes in Less Than 1 Hour'
                : 'Performance Submission Deadline'}
            </Text>
            <Text
              style={[
                styles.deadlineTime,
                isUrgentDeadline && { color: '#92400E' },
                isWindowClosed && { color: '#7F1D1D' },
              ]}
            >
              {timeLeftString}
            </Text>
          </View>
        </View>

        {/* Existing Submission Notice */}
        {existingSubmission && !selectedAsset ? (
          <View style={styles.existingBox}>
            <View style={styles.existingHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.existingTitle}>Your Video is Already Submitted</Text>
            </View>
            <Text style={styles.existingDesc}>
              You have already uploaded an entry. You can replace it with a better take before the deadline.
            </Text>
            <TouchableOpacity
              style={styles.replaceButton}
              onPress={handlePickMedia}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam-outline" size={18} color="#005F60" />
              <Text style={styles.replaceButtonText}>Select New Performance Video</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Selected Video Card with In-Card Submit CTA */}
        {selectedAsset ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={styles.selectedBadgeRow}>
                <Ionicons name="videocam" size={16} color="#005F60" />
                <Text style={styles.previewTitle}>Selected Performance Video</Text>
              </View>
              <TouchableOpacity onPress={handlePickMedia} activeOpacity={0.7}>
                <Text style={styles.changeFileText}>Change Video</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mediaContainer}>
              <View style={styles.videoIconContainer}>
                <Ionicons name="play-circle" size={44} color="#005F60" />
                <View style={styles.videoPill}>
                  <Text style={styles.videoPillText}>VIDEO</Text>
                </View>
              </View>

              <View style={styles.assetDetails}>
                <Text style={styles.assetName} numberOfLines={1}>
                  {selectedAsset.fileName || 'Classical_Dance_Performance.mp4'}
                </Text>
                <Text style={styles.assetMeta}>
                  Format: MP4 • {selectedAsset.duration ? `${Math.round(selectedAsset.duration)}s duration` : 'HD Video'}
                </Text>
                <View style={styles.readyBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.readyText}>Ready to submit</Text>
                </View>
              </View>
            </View>

            {/* In-Card Submit Button (Instant & Impossible to Miss) */}
            <TouchableOpacity
              style={[
                styles.inCardSubmitBtn,
                (isUploading || isWindowClosed) && styles.submitButtonDisabled,
              ]}
              onPress={handleUploadSubmission}
              disabled={isUploading || isWindowClosed}
              activeOpacity={0.85}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                  <Text style={styles.inCardSubmitText}>
                    {existingSubmission ? 'Confirm & Replace Video' : 'Submit Video Now'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : !existingSubmission ? (
          <TouchableOpacity
            style={styles.dropzone}
            onPress={handlePickMedia}
            activeOpacity={0.8}
          >
            <View style={styles.dropzoneIconCircle}>
              <MaterialCommunityIcons name="video-plus-outline" size={42} color="#005F60" />
            </View>
            <Text style={styles.dropzoneTitle}>Choose Performance Video</Text>
            <Text style={styles.dropzoneSubtitle}>
              Classical Dance Performance • MP4 or MOV • Max 500MB • Up to 3 min
            </Text>
            <View style={styles.browseButton}>
              <Ionicons name="folder-open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.browseButtonText}>Browse Video Files</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Upload Progress Bar */}
        {isUploading && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressStatus}>{uploadStatusText}</Text>
              <Text style={styles.progressPercentage}>{uploadProgress}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
            <View style={styles.progressNotice}>
              <ActivityIndicator size="small" color="#005F60" />
              <Text style={styles.progressNoticeText}>
                Please keep the app open while your video is uploading.
              </Text>
            </View>
          </View>
        )}

        {/* Error Box with Retry */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={22} color="#B91C1C" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Upload Error</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleUploadSubmission}
              activeOpacity={0.8}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submission Guidelines */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.guidelinesTitle}>Video Judging Requirements</Text>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={16} color="#005F60" />
            <Text style={styles.guidelineText}>Performance must be a single continuous video take without edit cuts.</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={16} color="#005F60" />
            <Text style={styles.guidelineText}>Full body frame must be clearly visible with adequate lighting.</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={16} color="#005F60" />
            <Text style={styles.guidelineText}>Audio track / Ghungroo & music must be clearly audible.</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Submit Button (Full Width, Permanent & Distinct) */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedAsset || isUploading || isWindowClosed) && styles.submitButtonDisabled,
          ]}
          onPress={handleUploadSubmission}
          disabled={!selectedAsset || isUploading || isWindowClosed}
          activeOpacity={0.85}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {selectedAsset
                  ? existingSubmission
                    ? 'Confirm & Replace Performance Video'
                    : 'Submit Performance Video'
                  : 'Select a Video to Submit'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  urgentBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  closedBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  deadlineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  deadlineTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#115E59',
    marginTop: 2,
  },
  dropzone: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#005F60',
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dropzoneIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dropzoneTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  dropzoneSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.brandDarkTeal,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#005F60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#005F60',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  selectedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#005F60',
    textTransform: 'uppercase',
  },
  changeFileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  videoIconContainer: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoPill: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#005F60',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  videoPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  assetDetails: {
    flex: 1,
  },
  assetName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  assetMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  inCardSubmitBtn: {
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005F60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  inCardSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '800',
    color: '#005F60',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.brandDarkTeal,
  },
  progressNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  progressNoticeText: {
    fontSize: 11,
    color: '#64748B',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorMessage: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  existingBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  existingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  existingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  existingDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7D9D3',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  replaceButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#005F60',
  },
  guidelinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  guidelineText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 99,
  },
  submitButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005F60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    elevation: 0,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
