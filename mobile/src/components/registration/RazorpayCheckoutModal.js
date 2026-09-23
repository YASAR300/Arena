import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Authentic Razorpay Test Mode Checkout Modal
 * Provides an interactive UI in Expo Go for testing UPI, Cards, NetBanking,
 * simulated payment success, and failure handling.
 */
export default function RazorpayCheckoutModal({
  visible,
  options = {},
  onSuccess,
  onFailure,
  onClose,
}) {
  const [selectedMethod, setSelectedMethod] = useState('UPI'); // 'UPI' | 'CARD' | 'NETBANKING'
  const [selectedUpiApp, setSelectedUpiApp] = useState('Google Pay');
  const [upiId, setUpiId] = useState('');
  
  // Card state
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState(options.prefill?.name || 'Feedants Participant');

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  const amountInRupees = (options.amount ? options.amount / 100 : 90).toFixed(2);
  const orderId = options.orderId || `order_test_${Date.now()}`;

  // Simulate payment processing flow
  const handlePaySuccess = async () => {
    setIsProcessing(true);
    setProcessingStep('Connecting to Razorpay gateway...');
    
    await new Promise((r) => setTimeout(r, 600));
    setProcessingStep('Authorizing payment with bank...');

    await new Promise((r) => setTimeout(r, 700));
    setProcessingStep('Payment Authorized! Verifying signature...');

    await new Promise((r) => setTimeout(r, 500));
    setIsProcessing(false);

    const mockPaymentId = `pay_mock_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    onSuccess?.({
      razorpay_order_id: orderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: 'mock_signature_verified_by_backend',
    });
  };

  // Simulate user cancellation or failure
  const handlePayFailure = () => {
    onFailure?.({
      code: 'PAYMENT_FAILED',
      description: 'Payment was declined by bank or cancelled by user.',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={isProcessing ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Razorpay Brand Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.brandRow}>
                <View style={styles.rzpLogoBox}>
                  <Text style={styles.rzpLogoText}>R</Text>
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.merchantName}>{options.name || 'Feedants Arena'}</Text>
                  <Text style={styles.orderDescription} numberOfLines={1}>
                    {options.description || 'Competition Entry Fee'}
                  </Text>
                </View>
              </View>

              {!isProcessing && (
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Amount & Test Mode Pill */}
            <View style={styles.amountRow}>
              <View>
                <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
                <Text style={styles.amountValue}>₹ {amountInRupees}</Text>
              </View>
              <View style={styles.testModeBadge}>
                <Ionicons name="flash" size={12} color="#D97706" />
                <Text style={styles.testModeText}>TEST MODE</Text>
              </View>
            </View>

            <Text style={styles.orderIdText}>Order ID: {orderId}</Text>
          </View>

          {/* Processing Screen */}
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#005F60" />
              <Text style={styles.processingTitle}>Processing Payment</Text>
              <Text style={styles.processingSubtitle}>{processingStep}</Text>
              <View style={styles.securityNote}>
                <Ionicons name="lock-closed" size={14} color="#64748B" />
                <Text style={styles.securityText}>256-bit SSL Encrypted • Test Sandbox</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Payment Methods Tabs */}
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tabButton, selectedMethod === 'UPI' && styles.tabButtonActive]}
                  onPress={() => setSelectedMethod('UPI')}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={18}
                    color={selectedMethod === 'UPI' ? '#005F60' : '#64748B'}
                  />
                  <Text style={[styles.tabText, selectedMethod === 'UPI' && styles.tabTextActive]}>
                    UPI / Apps
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, selectedMethod === 'CARD' && styles.tabButtonActive]}
                  onPress={() => setSelectedMethod('CARD')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="card"
                    size={18}
                    color={selectedMethod === 'CARD' ? '#005F60' : '#64748B'}
                  />
                  <Text style={[styles.tabText, selectedMethod === 'CARD' && styles.tabTextActive]}>
                    Cards
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, selectedMethod === 'NETBANKING' && styles.tabButtonActive]}
                  onPress={() => setSelectedMethod('NETBANKING')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="business"
                    size={18}
                    color={selectedMethod === 'NETBANKING' ? '#005F60' : '#64748B'}
                  />
                  <Text style={[styles.tabText, selectedMethod === 'NETBANKING' && styles.tabTextActive]}>
                    NetBanking
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Method Content */}
              <ScrollView style={styles.methodContent} showsVerticalScrollIndicator={false}>
                {selectedMethod === 'UPI' && (
                  <View style={styles.sectionBody}>
                    <Text style={styles.fieldLabel}>Popular UPI Apps</Text>
                    <View style={styles.upiAppsGrid}>
                      {[
                        { name: 'Google Pay', icon: 'google', color: '#4285F4' },
                        { name: 'PhonePe', icon: 'wallet', color: '#5F259F' },
                        { name: 'Paytm', icon: 'shield-check', color: '#00BAF2' },
                        { name: 'BHIM UPI', icon: 'bank', color: '#F37021' },
                      ].map((app) => (
                        <TouchableOpacity
                          key={app.name}
                          style={[
                            styles.upiAppCard,
                            selectedUpiApp === app.name && styles.upiAppCardActive,
                          ]}
                          onPress={() => setSelectedUpiApp(app.name)}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name={app.icon} size={22} color={app.color} />
                          <Text style={styles.upiAppName}>{app.name}</Text>
                          {selectedUpiApp === app.name && (
                            <Ionicons name="checkmark-circle" size={16} color="#005F60" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Or Enter Any UPI ID</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. mobileNumber@upi or user@okhdfcbank"
                        placeholderTextColor="#94A3B8"
                        value={upiId}
                        onChangeText={setUpiId}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.autofillBtn}
                        onPress={() => setUpiId('test@razorpay')}
                      >
                        <Text style={styles.autofillBtnText}>Auto-fill</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {selectedMethod === 'CARD' && (
                  <View style={styles.sectionBody}>
                    <Text style={styles.fieldLabel}>Card Number (Test Visa Included)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="4111 1111 1111 1111"
                        placeholderTextColor="#94A3B8"
                        value={cardNumber}
                        onChangeText={setCardNumber}
                        keyboardType="numeric"
                      />
                      <FontAwesome5 name="cc-visa" size={20} color="#1A1F71" style={{ marginRight: 8 }} />
                    </View>

                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.fieldLabel}>Expiry Date</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="MM/YY"
                          placeholderTextColor="#94A3B8"
                          value={cardExpiry}
                          onChangeText={setCardExpiry}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.fieldLabel}>CVV</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="123"
                          placeholderTextColor="#94A3B8"
                          value={cardCvv}
                          onChangeText={setCardCvv}
                          keyboardType="numeric"
                          secureTextEntry={true}
                        />
                      </View>
                    </View>

                    <Text style={styles.fieldLabel}>Name on Card</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Participant Name"
                      placeholderTextColor="#94A3B8"
                      value={cardName}
                      onChangeText={setCardName}
                    />
                  </View>
                )}

                {selectedMethod === 'NETBANKING' && (
                  <View style={styles.sectionBody}>
                    <Text style={styles.fieldLabel}>Select Bank</Text>
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra'].map(
                      (bank) => (
                        <TouchableOpacity
                          key={bank}
                          style={[
                            styles.bankRow,
                            selectedBank === bank && styles.bankRowActive,
                          ]}
                          onPress={() => setSelectedBank(bank)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="business-outline" size={20} color="#005F60" />
                          <Text style={styles.bankName}>{bank}</Text>
                          {selectedBank === bank && (
                            <Ionicons name="checkmark-circle" size={18} color="#005F60" />
                          )}
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={handlePaySuccess}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.payButtonText}>Pay ₹{amountInRupees}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.failButton}
                  onPress={handlePayFailure}
                  activeOpacity={0.8}
                >
                  <Text style={styles.failButtonText}>Simulate Payment Failure / Decline</Text>
                </TouchableOpacity>

                <View style={styles.footerBrand}>
                  <Text style={styles.footerBrandText}>Powered by </Text>
                  <Text style={[styles.footerBrandText, { fontWeight: '700', color: '#0C2340' }]}>
                    Razorpay
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0C2340',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rzpLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rzpLogoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  merchantName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  orderDescription: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  amountLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  testModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  testModeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  orderIdText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#005F60',
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#005F60',
    fontWeight: '700',
  },
  methodContent: {
    maxHeight: 280,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionBody: {
    paddingBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  upiAppsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  upiAppCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  upiAppCardActive: {
    borderColor: '#005F60',
    backgroundColor: '#E6F4F1',
  },
  upiAppName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E293B',
  },
  autofillBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autofillBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 10,
  },
  bankRowActive: {
    borderColor: '#005F60',
    backgroundColor: '#E6F4F1',
  },
  bankName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  payButton: {
    backgroundColor: '#005F60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  failButton: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 6,
  },
  failButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  footerBrand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerBrandText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  processingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  processingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  securityText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
