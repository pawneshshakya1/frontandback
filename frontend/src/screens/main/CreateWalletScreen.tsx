import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PopupModal } from '../../components/PopupModal';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export const CreateWalletScreen = ({ navigation, onWalletCreated }: any) => {
  const { updateAuthData, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttons?: any[];
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const COLORS = {
    primary: '#f47b25',
    bgDark: '#0d0d0d',
    cardDark: '#1a1a1a',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  };

  const handleCreateWallet = async () => {
    if (!pin || !confirmPin) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Please fill all fields',
      });
      return;
    }

    if (pin.length !== 6) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'PIN must be exactly 6 digits',
      });
      return;
    }

    if (pin !== confirmPin) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'PINs do not match',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/wallet/initialize', {
        pin,
        confirmPin,
      });

      if (response.data.success) {
        // Update auth context to reflect wallet initialization
        await updateAuthData({ is_wallet_initialized: true });

        setPopup({
          visible: true,
          type: 'success',
          title: 'Success!',
          message: `Wallet created successfully!\n\nYour Wallet Account Number:\n${response.data.data.wallet_account_no}`,
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setPopup((prev) => ({ ...prev, visible: false }));
                if (onWalletCreated) {
                  onWalletCreated();
                }
              },
            },
          ],
        });
      }
    } catch (error: any) {
      console.error('Wallet creation error:', error);
      console.error('Error response:', error.response?.data);

      if (error.response?.status === 401) {
        setPopup({
          visible: true,
          type: 'error',
          title: 'Session Expired',
          message: 'Your session is invalid or expired. Please login again.',
          buttons: [
            {
              text: 'OK',
              onPress: () => {
                setPopup((prev) => ({ ...prev, visible: false }));
                signOut();
              },
            },
          ],
        });
        return;
      }

      setPopup({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || error.message || 'Failed to create wallet',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Decorative Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top Status Bar Blur */}
      <BlurView
        intensity={250}
        tint="dark"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          zIndex: 100,
        }}
      />

      {/* Content */}
      <View
        style={[
          styles.contentContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name="account-balance-wallet"
              size={60}
              color={COLORS.primary}
              style={{
                textShadowColor: 'rgba(244,123,37,0.6)',
                textShadowRadius: 20,
              }}
            />
          </View>
          <Text style={styles.titleText}>CREATE YOUR WALLET</Text>
          <Text style={styles.subtitleText}>
            Set up your secure 6-digit PIN
          </Text>
        </View>

        {/* Glassmorphism Card */}
        <BlurView
          intensity={30}
          tint="dark"
          style={[styles.card, { borderColor: COLORS.glassBorder }]}
        >
          <View style={styles.formGap}>
            {/* Info Box */}
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                Your wallet account number will be auto-generated (10 digits)
              </Text>
            </View>

            {/* PIN Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CREATE PIN (6 DIGITS)</Text>
              <TextInput
                placeholder="••••••"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={pin}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericText = text.replace(/[^0-9]/g, '');
                  if (numericText.length <= 6) {
                    setPin(numericText);
                  }
                }}
                style={styles.input}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
              />
              {pin.length > 0 && pin.length < 6 && (
                <Text style={styles.errorText}>
                  PIN must be 6 digits ({pin.length}/6)
                </Text>
              )}
              {pin.length === 6 && (
                <View style={styles.successRow}>
                  <MaterialIcons name="check-circle" size={14} color="#f47b25" />
                  <Text style={styles.successText}>PIN format valid</Text>
                </View>
              )}
            </View>

            {/* Confirm PIN Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PIN</Text>
              <TextInput
                placeholder="••••••"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={confirmPin}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, '');
                  if (numericText.length <= 6) {
                    setConfirmPin(numericText);
                  }
                }}
                style={styles.input}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
              />
              {confirmPin.length === 6 && pin !== confirmPin && (
                <View style={styles.errorRow}>
                  <MaterialIcons name="error" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>PINs do not match</Text>
                </View>
              )}
              {confirmPin.length === 6 && pin === confirmPin && (
                <View style={styles.successRow}>
                  <MaterialIcons name="check-circle" size={14} color="#f47b25" />
                  <Text style={styles.successText}>PINs match!</Text>
                </View>
              )}
            </View>

            {/* Create Button */}
            <TouchableOpacity
              style={[
                styles.createButton,
                { backgroundColor: COLORS.primary },
                (loading || pin.length !== 6 || confirmPin.length !== 6) && {
                  opacity: 0.5,
                },
              ]}
              onPress={handleCreateWallet}
              disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.createButtonText}>CREATE WALLET</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <MaterialIcons name="lock" size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.securityText}>
                Your PIN is encrypted and secure. Never share it with anyone.
              </Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Decorative Corners */}
      <View
        style={[
          styles.corner,
          {
            top: insets.top + 16,
            left: 16,
            borderTopWidth: 1,
            borderLeftWidth: 1,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            top: insets.top + 16,
            right: 16,
            borderTopWidth: 1,
            borderRightWidth: 1,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: insets.bottom + 16,
            left: 16,
            borderBottomWidth: 1,
            borderLeftWidth: 1,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: insets.bottom + 16,
            right: 16,
            borderBottomWidth: 1,
            borderRightWidth: 1,
          },
        ]}
      />
      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        buttons={popup.buttons}
        onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  bgGlowTop: {
    position: 'absolute',
    top: '-10%',
    right: '-20%',
    width: 300,
    height: 300,
    backgroundColor: 'rgba(244,123,37,0.15)',
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: '-10%',
    left: '-20%',
    width: 300,
    height: 300,
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderRadius: 150,
    opacity: 0.5,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  titleText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 24,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
  },
  formGap: {
    gap: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244,123,37,0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,123,37,0.2)',
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '500',
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  successText: {
    color: '#f47b25',
    fontSize: 11,
    fontWeight: '500',
  },
  createButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f47b25',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  securityText: {
    flex: 1,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    lineHeight: 14,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: 'rgba(244,123,37,0.3)',
    pointerEvents: 'none',
  },
});
