import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useLanguage } from '../../i18n/LanguageContext';
import { openRazorpayCheckout } from '../../services/razorpayService';
import apiClient from '../../api/client';
import { useThrottledCallback } from '../../utils/debounce';
import useAuthStore from '../../store/authStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * RegistrationSheet Component
 * Bottom sheet modal for competition registration, referral discount application,
 * and Razorpay payment checkout.
 */
const RegistrationSheet = ({
  visible,
  onClose,
  competition,
  initialReferralCode = '',
  onRegistrationSuccess,
}) => {
  const { t } = useLanguage();

  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [appliedReferral, setAppliedReferral] = useState(initialReferralCode);
  const [discountAmount, setDiscountAmount] = useState(initialReferralCode ? 10 : 0);
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [raceConditionRefundInfo, setRaceConditionRefundInfo] = useState(null);

  // Sync initial referral code from deep link
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
      setAppliedReferral(initialReferralCode);
      setDiscountAmount(10);
    }
  }, [initialReferralCode]);

  if (!visible) return null;

  const baseFee = competition?.entryFee ?? 99;
  const finalPayable = Math.max(0, baseFee - discountAmount);

  // Apply Referral Code
  const handleApplyReferral = () => {
    if (!referralCode.trim()) return;
    setIsApplyingCode(true);
    setErrorMessage(null);

    // Validate referral code (minimum 3 characters)
    setTimeout(() => {
      setIsApplyingCode(false);
      const code = referralCode.trim().toUpperCase();
      if (code.length >= 3) {
        setAppliedReferral(code);
        setDiscountAmount(10);
      } else {
        setErrorMessage('Invalid referral code. Please enter at least 3 characters.');
      }
    }, 400);
  };

  const handleRemoveReferral = () => {
    setAppliedReferral('');
    setReferralCode('');
    setDiscountAmount(0);
    setErrorMessage(null);
  };

  // Full Razorpay Checkout Journey (Throttled & Debounced)
  const handleProceedToPay = useThrottledCallback(async () => {
    if (isPaying) return; // Client-side debounce to prevent duplicate double-taps
    setIsPaying(true);
    setErrorMessage(null);
    setRaceConditionRefundInfo(null);

    try {
      // Step 0: Ensure authenticated session exists
      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated || !authState.accessToken) {
        try {
          await authState.login('demo@feedants.com', 'password123');
        } catch (loginErr) {
          console.warn('[RegistrationSheet] Auto-login with demo account failed:', loginErr);
        }
      }

      // Step 1: Create payment order on backend
      const initiateRes = await apiClient.post(
        `/competitions/${competition._id}/register/initiate-payment`,
        { referralCode: appliedReferral || undefined }
      );

      const orderData = initiateRes.data?.data?.order;
      if (!orderData || !orderData.id) {
        throw new Error('Unable to generate payment order. Please try again.');
      }

      // Step 2: Open Razorpay Checkout modal
      let paymentResult;
      try {
        paymentResult = await openRazorpayCheckout({
          orderId: orderData.id,
          amount: orderData.amount || finalPayable * 100,
          currency: 'INR',
          name: 'Feedants Arena',
          description: `Entry Fee: ${competition.title || 'Competition'}`,
          prefill: {
            name: 'Arena Participant',
            email: 'participant@feedants.com',
            contact: '9876543210',
          },
          theme: { color: THEME.colors.brandDarkTeal },
        });
      } catch (payCancelErr) {
        // Handle payment failure or user cancellation gracefully
        setIsPaying(false);
        setErrorMessage(
          payCancelErr?.description ||
          payCancelErr?.message ||
          'Payment was cancelled or could not be completed. You can try again.'
        );
        return;
      }

      // Step 3: Confirm payment with backend (verifies HMAC signature & atomic spot booking)
      try {
        const confirmRes = await apiClient.post(
          `/competitions/${competition._id}/register/confirm`,
          {
            razorpay_order_id: paymentResult.razorpay_order_id,
            razorpay_payment_id: paymentResult.razorpay_payment_id,
            razorpay_signature: paymentResult.razorpay_signature,
          }
        );

        setIsPaying(false);
        onClose();
        if (onRegistrationSuccess) {
          onRegistrationSuccess(confirmRes.data?.data);
        }
      } catch (confirmErr) {
        setIsPaying(false);

        // RACE CONDITION UX HANDLING:
        // If spots just filled up by someone else while user was paying, backend returns 409
        // and initiates an automatic refund
        if (confirmErr?.response?.status === 409 || confirmErr?.response?.data?.errorCode === 'SPOTS_FILLED') {
          setRaceConditionRefundInfo({
            refundId: 'rfnd_' + Date.now().toString(36),
            amount: finalPayable,
            message:
              confirmErr?.response?.data?.message ||
              'All spots were filled while your payment was processing. A full refund has been automatically initiated.',
          });
        } else {
          setErrorMessage(
            confirmErr?.response?.data?.message ||
            confirmErr?.message ||
            'Could not confirm registration. If amount was deducted, it will be refunded.'
          );
        }
      }
    } catch (err) {
      setIsPaying(false);
      const backendMsg = err?.response?.data?.message || err?.message || 'Registration failed.';
      setErrorMessage(backendMsg);
    }
  }, 1200);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={isPaying ? null : onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Top Handle Indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>

          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {competition?.title || 'Competition Registration'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {competition?.categoryTags?.[0] || 'Dance'} • Single Participant Entry
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isPaying}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Race Condition Refund Notice */}
            {raceConditionRefundInfo ? (
              <View style={styles.raceConditionBox}>
                <View style={styles.raceConditionHeader}>
                  <Ionicons name="alert-circle" size={22} color="#B91C1C" />
                  <Text style={styles.raceConditionTitle}>Spots Just Filled Up!</Text>
                </View>
                <Text style={styles.raceConditionText}>
                  {raceConditionRefundInfo.message}
                </Text>
                <View style={styles.refundDetailsBadge}>
                  <Text style={styles.refundDetailsText}>
                    💰 Refund Amount: ₹{raceConditionRefundInfo.amount} (100% Refund)
                  </Text>
                  <Text style={styles.refundDetailsSub}>
                    Estimated credit in 2-4 business days to original payment method.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeRefundBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeRefundBtnText}>Understood</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Error Banner with Retry */}
            {errorMessage && !raceConditionRefundInfo ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={18} color="#B91C1C" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Referral Code Box */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Referral / Promo Code</Text>
              {appliedReferral ? (
                <View style={styles.appliedReferralRow}>
                  <View style={styles.appliedBadge}>
                    <Ionicons name="pricetag" size={14} color="#005F60" />
                    <Text style={styles.appliedCodeText}>{appliedReferral}</Text>
                    <Text style={styles.appliedSavingsText}>(-₹10 OFF)</Text>
                  </View>
                  <TouchableOpacity onPress={handleRemoveReferral} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.removeCodeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.referralInput}
                    placeholder="Enter referral code (e.g. DANCE10)"
                    placeholderTextColor="#94A3B8"
                    value={referralCode}
                    onChangeText={setReferralCode}
                    autoCapitalize="characters"
                    editable={!isPaying}
                  />
                  <TouchableOpacity
                    style={[styles.applyButton, !referralCode.trim() && styles.applyButtonDisabled]}
                    onPress={handleApplyReferral}
                    disabled={!referralCode.trim() || isApplyingCode}
                    activeOpacity={0.7}
                  >
                    {isApplyingCode ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyButtonText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Price Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Payment Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryItemLabel}>Registration Fee</Text>
                <Text style={styles.summaryItemValue}>₹ {baseFee}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryItemLabel, { color: '#059669' }]}>
                    Referral Discount
                  </Text>
                  <Text style={[styles.summaryItemValue, { color: '#059669', fontWeight: '700' }]}>
                    - ₹ {discountAmount}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalValue}>₹ {finalPayable}</Text>
              </View>
            </View>

            {/* Trust & Gateway Badge */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#005F60" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.trustTitle}>100% Secure Checkout</Text>
                <Text style={styles.trustSubtitle}>
                  Secured by Razorpay • UPI, Credit/Debit Cards, NetBanking
                </Text>
              </View>
              <FontAwesome5 name="cc-visa" size={20} color="#64748B" style={{ marginHorizontal: 2 }} />
              <FontAwesome5 name="cc-mastercard" size={20} color="#64748B" style={{ marginHorizontal: 2 }} />
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.payButton, isPaying && styles.payButtonDisabled]}
              onPress={handleProceedToPay}
              disabled={isPaying}
              activeOpacity={0.85}
            >
              {isPaying ? (
                <View style={styles.payingIndicator}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.payingText}>Processing Secure Checkout...</Text>
                </View>
              ) : (
                <View style={styles.payButtonContent}>
                  <Text style={styles.payButtonText}>
                    Proceed to Pay ₹{finalPayable}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  referralInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  applyButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  appliedReferralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F4F1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#A7D9D3',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#005F60',
  },
  appliedSavingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  removeCodeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryItemLabel: {
    fontSize: 14,
    color: '#475569',
  },
  summaryItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#005F60',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  trustTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  trustSubtitle: {
    fontSize: 10,
    color: '#115E59',
    marginTop: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  raceConditionBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  raceConditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  raceConditionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9F1239',
  },
  raceConditionText: {
    fontSize: 13,
    color: '#881337',
    lineHeight: 18,
  },
  refundDetailsBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  refundDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  refundDetailsSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeRefundBtn: {
    backgroundColor: '#9F1239',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 12,
  },
  closeRefundBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  payButton: {
    backgroundColor: THEME.colors.brandDarkTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.75,
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  payingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegistrationSheet;
