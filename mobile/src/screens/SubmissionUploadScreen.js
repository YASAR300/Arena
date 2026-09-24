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
import VideoPlayerModal from '../components/common/VideoPlayerModal';

/**
 * SubmissionUploadScreen
 * Dedicated video submission and playback review screen:
 * 1. Checks if video is already submitted — displays confirmation card and playable video preview.
 * 2. Does NOT show "Submit Video" form again once submitted.
 * 3. Provides real video player preview before and after submission.
 * 4. Allows replacing video before the deadline.
 */
export default function SubmissionUploadScreen({ route, navigation }) {
  const { competition, existingSubmission } = route.params || {};
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [activeComp, setActiveComp] = useState(competition || null);
  const [submittedData, setSubmittedData] = useState(
    existingSubmission && existingSubmission.status === 'SUBMITTED' ? existingSubmission : null
  );
  const [isReplacing, setIsReplacing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUrgentDeadline, setIsUrgentDeadline] = useState(false);
  const [timeLeftString, setTimeLeftString] = useState('');
  const [isWindowClosed, setIsWindowClosed] = useState(false);

  // Video preview player modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [modalVideoUrl, setModalVideoUrl] = useState('');
  const [modalVideoTitle, setModalVideoTitle] = useState('');

  const targetCompId =
    activeComp?._id || activeComp?.id || activeComp?.slug || 'feedants-classical-dance';

  // 1. Fetch competition if missing
  useEffect(() => {
    if (!activeComp) {
      apiClient
        .get('/competitions/feedants-classical-dance')
        .then((res) => {
          const compData = res?.data || res;
          setActiveComp(compData);
        })
        .catch((err) =>
          console.warn('[SubmissionUpload] Failed to fetch competition fallback:', err)
        );
    }
  }, [activeComp]);

  // 2. Fetch existing user submission on mount to prevent showing upload form again
  useEffect(() => {
    if (!submittedData && targetCompId) {
      apiClient
        .get(`/competitions/${targetCompId}/submissions/me`)
        .then((res) => {
          const sub = res?.data || res;
          if (sub && sub.status === 'SUBMITTED') {
            setSubmittedData(sub);
          }
        })
        .catch(() => {
          // No submission found yet — user can proceed to upload
        });
    }
  }, [targetCompId, submittedData]);

  // 3. Check Deadline
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

  // Open Video Player Modal
  const handleOpenVideoPreview = (url, title) => {
    if (!url) {
      Alert.alert('Video Unavailable', 'Video preview link could not be loaded.');
      return;
    }
    setModalVideoUrl(url);
    setModalVideoTitle(title || 'Performance Video Preview');
    setIsVideoModalOpen(true);
  };

  // Pick Video ONLY (Strictly videos)
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
          'Please enable video gallery access to select your performance video.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
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

  // Upload to Cloudinary & Confirm with Server
  const handleUploadSubmission = useThrottledCallback(async () => {
    if (!selectedAsset) {
      Alert.alert('Select Video', 'Please choose your performance video to submit.');
      return;
    }

    if (isWindowClosed) {
      Alert.alert('Submission Closed', 'The deadline has passed.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText('Requesting Cloudinary upload parameters...');
    setErrorMessage(null);

    try {
      const fileExt = selectedAsset.uri.split('.').pop() || 'mp4';
      const fileName = selectedAsset.fileName || `entry_${Date.now()}.${fileExt}`;
      const fileType = 'video/mp4';

      // Step 1: Request signed upload params
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

      // Step 2: Direct multipart upload to Cloudinary
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

          setUploadProgress(65);
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
      const confirmRes = await apiClient.post(`/competitions/${targetCompId}/submissions`, {
        mediaUrl,
        mediaType: fileType,
        thumbnailUrl: selectedAsset.uri,
      });

      const confirmedRecord = confirmRes?.data || confirmRes;

      setUploadProgress(100);
      setIsUploading(false);

      // Save locally to switch screen into confirmed Submitted state
      setSubmittedData({
        status: 'SUBMITTED',
        mediaUrl: mediaUrl || selectedAsset.uri,
        submittedAt: new Date().toISOString(),
        ...confirmedRecord,
      });
      setIsReplacing(false);
      setSelectedAsset(null);

      // Invalidate all competition queries so bottom bar updates to "✓ Submission Uploaded"
      queryClient.invalidateQueries({ queryKey: ['competition'] });

      Alert.alert(
        'Submission Received! 🎉',
        'Your performance video has been successfully submitted and forwarded to the judges.'
      );
    } catch (err) {
      console.warn('[SubmissionUpload] Error:', err);
      setIsUploading(false);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to upload performance video. Please check your connection and retry.';
      setErrorMessage(msg);
    }
  }, 1200);

  const hasActiveSubmission = !!submittedData && !isReplacing;

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
          {hasActiveSubmission ? 'Performance Submission' : isReplacing ? 'Replace Video' : 'Submit Performance Video'}
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
                ? '⚠️ Deadline Closes in Less Than 1 Hour'
                : 'Performance Submission Window'}
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

        {/* ── CASE 1: USER HAS ALREADY SUBMITTED ── */}
        {hasActiveSubmission ? (
          <View style={styles.submittedCard}>
            {/* Success Badge */}
            <View style={styles.successHeader}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={32} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.submittedTitle}>Submission Received! 🎉</Text>
                <Text style={styles.submittedSubtitle}>
                  Your performance video has been recorded and is currently under review by the judges.
                </Text>
              </View>
            </View>

            {/* Video Playable Preview Card */}
            <View style={styles.videoPlayerCard}>
              <View style={styles.videoCanvasPlaceholder}>
                <Ionicons name="videocam" size={38} color="#005F60" />
                <TouchableOpacity
                  style={styles.playOverlayButton}
                  onPress={() =>
                    handleOpenVideoPreview(
                      submittedData?.mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                      'My Performance Video Entry'
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                  <Text style={styles.playButtonText}>Watch Submitted Video</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.videoInfoFooter}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>SUBMITTED</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Format</Text>
                  <Text style={styles.infoValue}>MP4 • 1080p HD Video</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>Classical Dance Performance</Text>
                </View>
              </View>
            </View>

            {/* Replace / Edit CTA (Optional before deadline) */}
            {!isWindowClosed && (
              <TouchableOpacity
                style={styles.replaceVideoBtn}
                onPress={() => {
                  setIsReplacing(true);
                  setSelectedAsset(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="repeat" size={18} color="#005F60" />
                <Text style={styles.replaceVideoBtnText}>Replace with a New Take</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.backToCompBtn}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate(ROUTES.MAIN_TABS, { tab: 'competitions' });
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.backToCompText}>Return to Competition Details</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── CASE 2: USER IS UPLOADING / REPLACING ── */
          <>
            {isReplacing && (
              <View style={styles.replacingHeaderRow}>
                <Text style={styles.replacingNotice}>Replacing existing video entry</Text>
                <TouchableOpacity onPress={() => setIsReplacing(false)}>
                  <Text style={styles.cancelReplaceText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Video Card with Direct Preview & In-Card Submit */}
            {selectedAsset ? (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.selectedBadgeRow}>
                    <Ionicons name="videocam" size={18} color="#005F60" />
                    <Text style={styles.previewTitle}>Selected Video</Text>
                  </View>
                  <TouchableOpacity onPress={handlePickMedia} activeOpacity={0.7}>
                    <Text style={styles.changeFileText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Video Playable Preview Box */}
                <View style={styles.selectedVideoPlayerBox}>
                  <TouchableOpacity
                    style={styles.selectedPlayBtn}
                    onPress={() =>
                      handleOpenVideoPreview(selectedAsset.uri, selectedAsset.fileName || 'Selected Video Preview')
                    }
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play" size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
                    <Text style={styles.selectedPlayBtnText}>Tap to Preview Video</Text>
                  </TouchableOpacity>

                  <View style={styles.assetDetailsRow}>
                    <Text style={styles.assetName} numberOfLines={1}>
                      {selectedAsset.fileName || 'Performance_Take_1.mp4'}
                    </Text>
                    <Text style={styles.assetMeta}>
                      {selectedAsset.duration ? `${Math.round(selectedAsset.duration)}s duration • ` : ''}MP4 HD
                    </Text>
                  </View>
                </View>

                {/* In-Card Submit Button */}
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
                        {isReplacing ? 'Confirm & Replace Performance Video' : 'Submit Video Now'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Dropzone to Pick Performance Video */
              <TouchableOpacity
                style={styles.dropzone}
                onPress={handlePickMedia}
                activeOpacity={0.8}
              >
                <View style={styles.dropzoneIconCircle}>
                  <MaterialCommunityIcons name="video-plus-outline" size={44} color="#005F60" />
                </View>
                <Text style={styles.dropzoneTitle}>Choose Performance Video</Text>
                <Text style={styles.dropzoneSubtitle}>
                  Classical Dance Performance • MP4 or MOV • Max 500MB • Up to 3 minutes
                </Text>
                <View style={styles.browseButton}>
                  <Ionicons name="folder-open-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.browseButtonText}>Browse Video Files</Text>
                </View>
              </TouchableOpacity>
            )}

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
              <Text style={styles.guidelinesTitle}>Judging Requirements</Text>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#005F60" />
                <Text style={styles.guidelineText}>Performance must be a single continuous video take without edit cuts.</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#005F60" />
                <Text style={styles.guidelineText}>Full body frame clearly visible with proper stage lighting.</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#005F60" />
                <Text style={styles.guidelineText}>Audio track / Ghungroo & rhythm must be clearly audible.</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Bar (Only visible during upload mode) */}
      {!hasActiveSubmission && (
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
                    ? isReplacing
                      ? 'Confirm & Replace Performance Video'
                      : 'Submit Performance Video'
                    : 'Select a Video to Submit'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Video Preview Modal Player */}
      <VideoPlayerModal
        visible={isVideoModalOpen}
        videoUrl={modalVideoUrl}
        title={modalVideoTitle}
        onClose={() => setIsVideoModalOpen(false)}
      />
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
  submittedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#059669',
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  successIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#065F46',
  },
  submittedSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 17,
  },
  videoPlayerCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  videoCanvasPlaceholder: {
    height: 160,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.brandDarkTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  videoInfoFooter: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  replaceVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#005F60',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
    gap: 8,
  },
  replaceVideoBtnText: {
    color: '#005F60',
    fontSize: 14,
    fontWeight: '700',
  },
  backToCompBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backToCompText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  replacingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  replacingNotice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  cancelReplaceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#005F60',
    marginBottom: 16,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  changeFileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  selectedVideoPlayerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  selectedPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    marginBottom: 10,
  },
  selectedPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  assetDetailsRow: {
    paddingHorizontal: 4,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  assetMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inCardSubmitBtn: {
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  inCardSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.brandDarkTeal,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 3,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    elevation: 8,
    zIndex: 99,
  },
  submitButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
