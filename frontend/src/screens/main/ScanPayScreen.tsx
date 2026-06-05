import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { walletAPI } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { useWalletStore } from '../../store/useWalletStore';

const { width, height } = Dimensions.get('window');

type ScanStep = 'camera' | 'receiver' | 'amount' | 'pin' | 'confirm' | 'success';

export const ScanPayScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { sendGift } = useWalletStore();
  const preScannedQR = route?.params?.preScannedQR;

  const [step, setStep] = useState<ScanStep>(preScannedQR ? 'receiver' : 'camera');
  const [permission, requestPermission] = useCameraPermissions();

  // Scanned data
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [receiverInfo, setReceiverInfo] = useState<{ username: string; accountNo: string } | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Transfer data
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Success data
  const [transferResult, setTransferResult] = useState<{ amount: number; newBalance: number } | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // If pre-scanned QR data was passed via route, auto-validate on mount
  useEffect(() => {
    if (preScannedQR) {
      setScannedQR(preScannedQR);
      validateQR(preScannedQR);
    }
  }, []);

  const handleQRScanned = async ({ data }: { data: string }) => {
    if (step !== 'camera' || scannedQR) return;

    // Sanitize scanned data: trim whitespace, remove control characters
    const cleanData = (data || '').trim().replace(/[\x00-\x1f\x7f]/g, '');
    console.log('[ScanPay] Raw scanned data length:', data?.length, 'Cleaned length:', cleanData?.length);

    if (!cleanData) {
      setValidationError('Empty QR code data');
      return;
    }

    setScannedQR(cleanData);
    await validateQR(cleanData);
  };

  const validateQR = async (qrData: string) => {
    try {
      setValidationLoading(true);
      setValidationError(null);

      console.log('[ScanPay] Sending QR data to backend, length:', qrData.length);
      const response = await walletAPI.validateQRCode({ qrData });

      console.log('[ScanPay] Response success:', response.data?.success);
      if (response.data?.success) {
        setReceiverInfo({
          username: response.data.data.username,
          accountNo: response.data.data.accountNo,
        });
        setStep('receiver');
      } else {
        console.error('[ScanPay] Validation error:', response.data?.message);
        setValidationError(response.data?.message || 'Invalid QR code');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to validate QR';
      console.error('[ScanPay] Validation exception:', message, error);
      setValidationError(message);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleConfirmReceiver = () => {
    setStep('amount');
  };

  const handleAmountContinue = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      Alert.alert('Invalid Amount', 'Please enter an amount of at least ₹1');
      return;
    }
    if (numAmount > 10000) {
      Alert.alert('Limit Exceeded', 'Maximum single transfer is ₹10,000');
      return;
    }
    setStep('pin');
  };

  const handlePinContinue = () => {
    if (pin.length !== 6) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 6 digits');
      return;
    }
    setStep('confirm');
  };

  const handleTransfer = async () => {
    try {
      setTransferLoading(true);

      const qrData = scannedQR;
      if (!qrData || !receiverInfo || !amount || !pin) {
        Alert.alert('Error', 'Missing transfer information');
        return;
      }

      // Decode QR to get full account number (safe for React Native)
      let accountNo = '';
      try {
        const decoded = atob(qrData);
        const payload = JSON.parse(decoded);
        accountNo = payload.a;
        if (!accountNo) {
          throw new Error('Account number not found in QR data');
        }
      } catch (e) {
        console.error('[ScanPay] QR decode error in handleTransfer:', e);
        Alert.alert('Error', 'Invalid QR data');
        return;
      }

      await sendGift(accountNo, parseFloat(amount), pin);

      setTransferResult({
        amount: parseFloat(amount),
        newBalance: 0, // Will be updated via SSE
      });
      setStep('success');

      // Refresh wallet
      // fetchWallet();
    } catch (error: any) {
      Alert.alert('Transfer Failed', error.message || 'Please try again');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleScanAgain = () => {
    setScannedQR(null);
    setReceiverInfo(null);
    setAmount('');
    setPin('');
    setValidationError(null);
    setStep('camera');
  };

  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={step === 'camera' ? handleQRScanned : undefined}
      />

      {/* Scan overlay */}
      <View style={styles.scanOverlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.cameraInstructions}>
        <Text style={styles.instructionText}>Position QR code within the frame</Text>
      </View>

      {/* Error message */}
      {validationError && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={20} color={COLORS.error} />
          <Text style={styles.errorText}>{validationError}</Text>
          <TouchableOpacity onPress={handleScanAgain}>
            <Text style={styles.retryText}>TAP TO RETRY</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading */}
      {validationLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Validating QR code...</Text>
        </View>
      )}
    </View>
  );

  const renderReceiverView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.successIconContainer}>
        <MaterialIcons name="check-circle" size={64} color={COLORS.success} />
      </View>
      <Text style={styles.receiverTitle}>Send to</Text>
      <Text style={styles.receiverUsername}>{receiverInfo?.username}</Text>
      <Text style={styles.receiverAccount}>{receiverInfo?.accountNo}</Text>

      <TouchableOpacity style={styles.continueBtn} onPress={handleConfirmReceiver}>
        <Text style={styles.continueBtnText}>CONTINUE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleScanAgain}>
        <Text style={styles.cancelBtnText}>SCAN DIFFERENT QR</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAmountView = () => (
    <View style={styles.contentContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setStep('receiver')}>
        <MaterialIcons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Enter Amount</Text>
      <Text style={styles.stepSubtitle}>How much do you want to send?</Text>

      <View style={styles.amountInputContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.2)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          maxLength={5}
          autoFocus
        />
      </View>

      <Text style={styles.limitText}>Maximum: ₹10,000 per transfer</Text>

      <TouchableOpacity
        style={[styles.continueBtn, !amount && styles.continueBtnDisabled]}
        onPress={handleAmountContinue}
        disabled={!amount}
      >
        <Text style={styles.continueBtnText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPinView = () => (
    <View style={styles.contentContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setStep('amount')}>
        <MaterialIcons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Enter PIN</Text>
      <Text style={styles.stepSubtitle}>Enter your 6-digit wallet PIN to confirm</Text>

      <View style={styles.pinInputContainer}>
        <TextInput
          style={styles.pinInput}
          placeholder="• • • • • •"
          placeholderTextColor="rgba(255,255,255,0.2)"
          keyboardType="numeric"
          secureTextEntry
          value={pin}
          onChangeText={(text) => setPin(text.slice(0, 6))}
          maxLength={6}
          autoFocus
          textAlign="center"
        />
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, pin.length !== 6 && styles.continueBtnDisabled]}
        onPress={handlePinContinue}
        disabled={pin.length !== 6}
      >
        <Text style={styles.continueBtnText}>CONFIRM</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmView = () => (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.confirmModal}>
          <View style={styles.confirmHeader}>
            <MaterialCommunityIcons name="shield-check" size={48} color={COLORS.primary} />
            <Text style={styles.confirmTitle}>Confirm Transfer</Text>
          </View>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Amount</Text>
              <Text style={styles.confirmValue}>₹{amount}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>To</Text>
              <Text style={styles.confirmValue}>{receiverInfo?.username}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Account</Text>
              <Text style={styles.confirmValue}>{receiverInfo?.accountNo}</Text>
            </View>
          </View>

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setStep('pin')}
            >
              <Text style={styles.cancelModalBtnText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmModalBtn, transferLoading && styles.confirmModalBtnDisabled]}
              onPress={handleTransfer}
              disabled={transferLoading}
            >
              {transferLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.confirmModalBtnText}>SEND ₹{amount}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSuccessView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.successIconContainer}>
        <MaterialIcons name="check-circle" size={80} color={COLORS.success} />
      </View>
      <Text style={styles.successTitle}>Transfer Successful!</Text>
      <Text style={styles.successAmount}>₹{transferResult?.amount}</Text>
      <Text style={styles.successSubtitle}>has been sent to</Text>
      <Text style={styles.receiverUsername}>{receiverInfo?.username}</Text>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.doneBtnText}>DONE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.scanAgainBtn} onPress={handleScanAgain}>
        <Text style={styles.scanAgainBtnText}>SEND ANOTHER</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'camera':
        return permission?.granted ? renderCameraView() : renderPermissionView();
      case 'receiver':
        return renderReceiverView();
      case 'amount':
        return renderAmountView();
      case 'pin':
        return renderPinView();
      case 'confirm':
        return renderConfirmView();
      case 'success':
        return renderSuccessView();
      default:
        return null;
    }
  };

  const renderPermissionView = () => (
    <View style={styles.permissionContainer}>
      <MaterialIcons name="camera-alt" size={64} color="rgba(255,255,255,0.3)" />
      <Text style={styles.permissionTitle}>Camera Access Required</Text>
      <Text style={styles.permissionText}>
        We need camera access to scan QR codes for receiving payments.
      </Text>
      <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
        <Text style={styles.permissionBtnText}>GRANT PERMISSION</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background decorative elements */}
      <View style={styles.bgGlowTop} />

      {/* Header - shown only for non-camera steps */}
      {step !== 'camera' && (
        <>
          <BlurView
            intensity={250}
            tint="dark"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 56,
              zIndex: 100,
            }}
          />
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => {
                if (step === 'success') {
                  navigation.goBack();
                } else {
                  handleScanAgain();
                }
              }}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan & Pay</Text>
            <View style={styles.circleBtnPlaceholder} />
          </View>
        </>
      )}

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  bgGlowTop: {
    position: 'absolute',
    top: '-20%',
    right: '-30%',
    width: 400,
    height: 400,
    backgroundColor: 'rgba(244,123,37,0.08)',
    borderRadius: 200,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 101,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Camera views
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  cameraInstructions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    backgroundColor: COLORS.errorBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 12,
  },
  retryText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
  },

  // Permission view
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Content views
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 70,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Receiver view
  successIconContainer: {
    marginTop: 40,
    marginBottom: 16,
  },
  receiverTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  receiverUsername: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  receiverAccount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 4,
  },

  // Amount view
  stepTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 40,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencySymbol: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  amountInput: {
    color: 'white',
    fontSize: 64,
    fontWeight: 'bold',
    minWidth: 150,
    textAlign: 'center',
  },
  limitText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 12,
  },

  // PIN view
  pinInputContainer: {
    marginVertical: 32,
  },
  pinInput: {
    width: 200,
    height: 60,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },

  // Buttons
  continueBtn: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  continueBtnDisabled: {
    backgroundColor: COLORS.primaryDisabled,
  },
  continueBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cancelBtn: {
    marginTop: 16,
    padding: 12,
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Confirm modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    width: width * 0.9,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  confirmDetails: {
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confirmLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  confirmValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalBtn: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelModalBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: 'bold',
  },
  confirmModalBtn: {
    flex: 2,
    height: 50,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalBtnDisabled: {
    backgroundColor: 'rgba(34,197,94,0.4)',
  },
  confirmModalBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Success view
  successTitle: {
    color: COLORS.success,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  successAmount: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginTop: 16,
  },
  successSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
  doneBtn: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.success,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  doneBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scanAgainBtn: {
    marginTop: 16,
    padding: 12,
  },
  scanAgainBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
});