import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../i18n/LanguageContext';
import { THEME } from '../../constants/theme';
import { useThrottledCallback } from '../../utils/debounce';

/**
 * BottomActionBar Component
 * The primary dynamic CTA state machine driven by backend computed currentUserState.
 * Supports all states: REGISTER, SPOTS_FULL, REGISTRATION_CLOSED,
 * REGISTERED_WAITING_SUBMISSION, UPLOAD_SUBMISSION, SUBMISSION_UPLOADED,
 * RESULTS_PENDING, VIEW_RESULTS.
 */
const BottomActionBar = ({
  currentUserState = {},
  entryFee = 99,
  loading = false,
  onPressAction,
}) => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const isRegistered = Boolean(currentUserState?.isRegistered);
  const ctaAction = currentUserState?.ctaAction;
  const ctaLabel = currentUserState?.ctaLabel;

  // Determine button presentation based on registration status & ctaAction
  const getButtonConfig = () => {
    // 1. If user is NOT registered: they must see Register Now (or spots full / registration closed)
    if (!isRegistered) {
      if (ctaAction === 'SPOTS_FULL') {
        return {
          title: t('spotsFull'),
          subtitle: null,
          disabled: true,
          bgColor: '#94A3B8',
          textColor: '#FFFFFF',
          action: 'SPOTS_FULL',
        };
      }
      if (ctaAction === 'REGISTRATION_CLOSED') {
        return {
          title: t('registrationClosed'),
          subtitle: null,
          disabled: true,
          bgColor: '#94A3B8',
          textColor: '#FFFFFF',
          action: 'REGISTRATION_CLOSED',
        };
      }
      if (ctaAction === 'VIEW_RESULTS' || ctaAction === 'RESULTS_DECLARED') {
        return {
          title: t('viewResults'),
          subtitle: null,
          disabled: false,
          bgColor: THEME.colors.brandDarkTeal,
          textColor: '#FFFFFF',
          action: 'VIEW_RESULTS',
        };
      }
      if (ctaAction === 'UPCOMING') {
        return {
          title: 'Coming Soon',
          subtitle: null,
          disabled: true,
          bgColor: '#94A3B8',
          textColor: '#FFFFFF',
          action: 'UPCOMING',
        };
      }

      // Default for non-registered user: Always Register Now!
      return {
        title: t('registerNow'),
        subtitle: `₹ ${entryFee} ${t('entryFee')}`,
        disabled: false,
        bgColor: THEME.colors.brandDarkTeal,
        textColor: '#FFFFFF',
        action: 'REGISTER',
      };
    }

    // 2. If user IS confirmed registered:
    switch (ctaAction) {
      case 'VIEW_SUBMISSION':
      case 'SUBMISSION_UPLOADED':
        return {
          title: '✓ ' + (t('submissionUploaded') || 'Submission Uploaded'),
          subtitle: 'Video received • Tap to watch or replace',
          disabled: false,
          bgColor: '#059669',
          textColor: '#FFFFFF',
          action: 'VIEW_SUBMISSION',
        };

      case 'REGISTERED_WAITING_SUBMISSION':
      case 'REGISTERED':
        return {
          title: t('registered'),
          subtitle: 'Submissions opening soon',
          disabled: true,
          bgColor: '#005F60',
          textColor: '#FFFFFF',
          action: 'REGISTERED_WAITING_SUBMISSION',
        };

      case 'RESULTS_PENDING':
        return {
          title: t('resultsComingSoon'),
          subtitle: null,
          disabled: true,
          bgColor: '#64748B',
          textColor: '#FFFFFF',
          action: 'RESULTS_PENDING',
        };

      case 'VIEW_RESULTS':
        return {
          title: t('viewResults'),
          subtitle: null,
          disabled: false,
          bgColor: THEME.colors.brandDarkTeal,
          textColor: '#FFFFFF',
          action: 'VIEW_RESULTS',
        };

      case 'UPLOAD_SUBMISSION':
      default:
        return {
          title: t('uploadSubmission'),
          subtitle: t('registered'),
          disabled: false,
          bgColor: THEME.colors.brandDarkTeal,
          textColor: '#FFFFFF',
          action: 'UPLOAD_SUBMISSION',
        };
    }
  };

  const config = getButtonConfig();

  // Debounce/Throttle button taps to prevent rapid double-tap requests (defense-in-depth)
  const handleThrottledPress = useThrottledCallback(() => {
    if (!config.disabled && !loading && onPressAction) {
      onPressAction(config.action);
    }
  }, 1000);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: config.bgColor },
          config.disabled && styles.disabledButton,
        ]}
        onPress={handleThrottledPress}
        activeOpacity={config.disabled ? 1 : 0.85}
        disabled={config.disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.buttonContent}>
            <Text style={[styles.buttonTitle, { color: config.textColor }]}>
              {config.title}
            </Text>
            {config.subtitle ? (
              <Text style={styles.buttonSubtitle}>{config.subtitle}</Text>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.85,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#D1EAEB',
    marginTop: 2,
  },
});

export default memo(BottomActionBar);
