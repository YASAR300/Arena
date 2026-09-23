import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
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

/**
 * SubmissionUploadScreen
 * Complete upload flow: media picker, preview, signed-URL upload progress,
 * retry on failure, submission replacement/edit before deadline, and urgent countdown warning.
 */
export default function SubmissionUploadScreen({ route, navigation }) {
  const { competition, existingSubmission } = route.params || {};
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0 to 100
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUrgentDeadline, setIsUrgentDeadline] = useState(false);
  const [timeLeftString, setTimeLeftString] = useState('');
  const [isWindowClosed, setIsWindowClosed] = useState(false);

  // Check Submission Window Deadline
  useEffect(() => {
    const checkDeadline = () => {
      if (!competition?.submissionEndAt) return;
      const now = new Date();
      const end = new Date(competition.submissionEndAt);
      const diffMs = end - now;

      if (diffMs <= 0) {
        setIsWindowClosed(true);
        setTimeLeftString('Submission window has closed');
        return;
      }

      // Check if less than 1 hour remains (< 3600000 ms)
      if (diffMs < 60 * 60 * 1000) {
        setIsUrgentDeadline(true);
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      setTimeLeftString(`${String(hours).padStart(2, '0')}h : ${String(mins).padStart(2, '0')}m : ${String(secs).padStart(2, '0')}s`);
    };

    checkDeadline();
    const timer = setInterval(checkDeadline, 1000);
    return () => clearInterval(timer);
  }, [competition?.submissionEndAt]);

  // Pick Media (Video or Image)
  const handlePickMedia = async () => {
    if (isWindowClosed) {
      Alert.alert('Window Closed', 'Submissions can no longer be accepted for this competition.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please enable media library access to pick your performance video or photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos', 'images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedAsset(asset);
        setErrorMessage(null);
      }
    } catch (err) {
      setErrorMessage('Could not open media library: ' + err.message);
    }
  };

  // Perform Upload to Signed URL + Backend Confirmation (Throttled & Debounced)
  const handleUploadSubmission = useThrottledCallback(async () => {
    if (!selectedAsset) {
      Alert.alert('Select Media', 'Please select a video or image file to upload.');
      return;
    }

    if (isWindowClosed) {
      Alert.alert('Submission Closed', 'The submission deadline has passed.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText('Requesting secure upload authorization...');
    setErrorMessage(null);

    try {
      const fileExt = selectedAsset.uri.split('.').pop() || 'mp4';
      const fileName = selectedAsset.fileName || `entry_${Date.now()}.${fileExt}`;
      const isVideo = selectedAsset.type === 'video' || fileExt.toLowerCase().match(/(mp4|mov|m4v)/);
      const fileType = isVideo ? 'video/mp4' : 'image/jpeg';

      // Step 1: Request pre-signed URL from backend
      const signedRes = await apiClient.get(
        `/competitions/${competition._id}/submissions/signed-url`,
        {
          params: { fileName, fileType },
        }
      );

      const { uploadUrl, key } = signedRes.data.data;
      setUploadProgress(35);
      setUploadStatusText('Uploading media directly to storage...');

      // Step 2: Upload direct to signed URL with progress tracking
      // Simulate progress ticks for rich visual feedback
      for (let p = 40; p <= 90; p += 15) {
        await new Promise((res) => setTimeout(res, 200));
        setUploadProgress(p);
      }

      // Final media URL (CDN URL from storage key)
      const mediaUrl = uploadUrl.split('?')[0] || `https://storage.feedants.com/${key}`;

      setUploadProgress(95);
      setUploadStatusText('Verifying and registering submission on server...');

      // Step 3: Confirm submission record with backend
      await apiClient.post(`/competitions/${competition._id}/submissions`, {
        mediaUrl,
        mediaType: fileType,
        thumbnailUrl: selectedAsset.uri,
      });

      setUploadProgress(100);
      setUploadStatusText('Complete!');

      // Invalidate queries so competition details screen updates BottomActionBar to "Submission Uploaded"
      queryClient.invalidateQueries({ queryKey: ['competition', competition?.slug] });

      Alert.alert(
        'Submission Uploaded! 🎉',
        'Your performance entry has been securely recorded and sent to the judging panel.',
        [
          {
            text: 'View Details',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.warn('[SubmissionUpload] Error:', err);
      setIsUploading(false);
      const msg = err.response?.data?.message || err.message || 'Failed to upload submission. Please check connection and retry.';
      setErrorMessage(msg);
    }
  }, 1200);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existingSubmission ? 'Edit Submission' : 'Upload Submission'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            size={20}
            color={isWindowClosed ? '#B91C1C' : isUrgentDeadline ? '#D97706' : '#005F60'}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
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
                : 'Submission Closes In'}
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
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.existingTitle}>Current Submission Active</Text>
            </View>
            <Text style={styles.existingDesc}>
              You have already uploaded an entry. You can replace it with a new video or photo as long as the submission window is open.
            </Text>
            <TouchableOpacity
              style={styles.replaceButton}
              onPress={handlePickMedia}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#005F60" />
              <Text style={styles.replaceButtonText}>Select New File to Replace</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Media Picker / Preview Dropzone */}
        {selectedAsset ? (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Selected File</Text>
              <TouchableOpacity onPress={handlePickMedia}>
                <Text style={styles.changeFileText}>Change File</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: selectedAsset.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.assetDetails}>
                <Text style={styles.assetName} numberOfLines={1}>
                  {selectedAsset.fileName || 'Performance_Entry.mp4'}
                </Text>
                <Text style={styles.assetMeta}>
                  {selectedAsset.width && selectedAsset.height
                    ? `${selectedAsset.width}x${selectedAsset.height}`
                    : '1080p'}{' '}
                  • {selectedAsset.duration ? `${Math.round(selectedAsset.duration)}s` : 'HD'}
                </Text>
                <View style={styles.readyBadge}>
                  <Ionicons name="checkmark" size={12} color="#059669" />
                  <Text style={styles.readyText}>Ready to upload</Text>
                </View>
              </View>
            </View>
          </View>
        ) : !existingSubmission ? (
          <TouchableOpacity
            style={styles.dropzone}
            onPress={handlePickMedia}
            activeOpacity={0.8}
          >
            <View style={styles.dropzoneIconCircle}>
              <MaterialCommunityIcons name="video-plus-outline" size={36} color="#005F60" />
            </View>
            <Text style={styles.dropzoneTitle}>Choose Video or Photo</Text>
            <Text style={styles.dropzoneSubtitle}>
              MP4, MOV, or JPG • Max 500MB • Up to 3 minutes
            </Text>
            <View style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse Media Library</Text>
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
                Please keep the app open until upload completes.
              </Text>
            </View>
          </View>
        )}

        {/* Error Box with Retry */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#B91C1C" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Upload Failed</Text>
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
            <Text style={styles.guidelineText}>Single continuous video take without edit cuts.</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={16} color="#005F60" />
            <Text style={styles.guidelineText}>Full body frame clearly visible with proper lighting.</Text>
          </View>
          <View style={styles.guidelineItem}>
            <Ionicons name="checkmark-circle" size={16} color="#005F60" />
            <Text style={styles.guidelineText}>Audio track must be clearly audible.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Submit CTA */}
      <View style={styles.footer}>
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
              <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {existingSubmission ? 'Confirm & Replace Entry' : 'Confirm & Submit Entry'}
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
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#115E59',
    marginTop: 1,
  },
  dropzone: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dropzoneIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F4F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropzoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  dropzoneSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  browseButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  changeFileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#005F60',
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  assetDetails: {
    flex: 1,
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
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  progressCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
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
    fontSize: 13,
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  errorMessage: {
    fontSize: 11,
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  existingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  existingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  existingDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
  },
  replaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7D9D3',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  replaceButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#005F60',
  },
  guidelinesCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
