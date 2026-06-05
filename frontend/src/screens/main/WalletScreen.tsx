import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import api, { walletAPI } from '../../services/api';
import { sseService } from '../../services/sse';

const { width } = Dimensions.get('window');
const fmt = (n: number) => `₹ ${Number(n || 0).toLocaleString('en-IN')}`;

export const WalletScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  // Reset PIN modal state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 1: otp, 2: new pin
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletAPI.getMyWallet();
      setWallet(res.data?.data || null);
    } catch (err) {
      console.log('wallet fetch error', err);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await api.get('/wallet/transactions');
      if (res.data.success) {
        setTransactions(res.data.data || []);
      }
    } catch (err) {
      console.log('transactions fetch error', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([fetchWallet(), fetchTransactions()]);
  }, [fetchWallet, fetchTransactions]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  // SSE real-time updates
  useEffect(() => {
    const handleWalletUpdate = (event: any) => {
      console.log('[UserWallet] SSE WALLET_UPDATE:', event);
      if (event.balance) {
        setWallet((prev: any) =>
          prev
            ? {
                ...prev,
                available_balance: event.balance.available ?? prev.available_balance,
                locked_balance: event.balance.locked ?? prev.locked_balance,
                withdrawable_balance: event.balance.withdrawable ?? prev.withdrawable_balance,
              }
            : prev
        );
      }
      fetchWallet();
    };

    const handleTransactionUpdate = (event: any) => {
      console.log('[UserWallet] SSE TRANSACTION_UPDATE:', event);
      fetchWallet();
      fetchTransactions();
    };

    sseService.on('WALLET_UPDATE', handleWalletUpdate);
    sseService.on('TRANSACTION_UPDATE', handleTransactionUpdate);

    return () => {
      sseService.off('WALLET_UPDATE', handleWalletUpdate);
      sseService.off('TRANSACTION_UPDATE', handleTransactionUpdate);
    };
  }, [fetchWallet, fetchTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAction = (action: string) => {
    const routes: Record<string, string> = {
      'Add Cash': 'AddCash',
      'Withdraw': 'Withdraw',
      'Send Gift': 'SendGift',
      'Redeem': 'Redeem',
    };
    if (routes[action]) {
      navigation.navigate(routes[action]);
    } else {
      Alert.alert(action, `${action} feature is coming soon!`);
    }
  };

  const handleForgotPin = async () => {
    try {
      setIsResetting(true);
      await api.post('/wallet/request-pin-reset');
      setResetStep(1);
      setResetModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to request PIN reset');
    } finally {
      setIsResetting(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }
    try {
      await api.post('/wallet/verify-pin-otp', { otp: otp.trim() });
      setResetStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Invalid OTP');
    }
  };

  const finalizeReset = async () => {
    if (newPin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }
    try {
      await api.post('/wallet/reset-pin', { otp, newPin });
      Alert.alert('Success', 'Wallet PIN updated successfully');
      setResetModalVisible(false);
      setResetStep(0);
      setOtp('');
      setNewPin('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset PIN');
    }
  };

  const balance = wallet?.available_balance ?? 0;
  const locked = wallet?.locked_balance ?? 0;
  const withdrawable = wallet?.withdrawable_balance ?? balance;

  const TransactionItem = ({ type, date, amount, description }: any) => {
    const isCredit = ['DEPOSIT', 'GIFT_RECEIVED', 'UNLOCK', 'PRIZE', 'WIN', 'REFUND'].includes(type);
    const getIcon = () => {
      switch (type) {
        case 'DEPOSIT': return 'add-circle';
        case 'WITHDRAW': return 'remove-circle';
        case 'GIFT_SENT': return 'card-giftcard';
        case 'GIFT_RECEIVED': return 'card-giftcard';
        case 'REDEEM': return 'redeem';
        case 'LOCK': return 'lock';
        case 'UNLOCK': return 'lock-open';
        case 'ENTRY_FEE':
        case 'MATCH_FEE':
        case 'ENTRY': return 'sports-esports';
        case 'PRIZE_WON':
        case 'PRIZE':
        case 'WIN': return 'emoji-events';
        case 'REFUND': return 'undo';
        default: return 'payment';
      }
    };

    const getLabel = () => {
      switch (type) {
        case 'DEPOSIT': return 'Added Cash';
        case 'WITHDRAW': return 'Withdrawal';
        case 'GIFT_SENT': return 'Sent Gift';
        case 'GIFT_RECEIVED': return 'Received Gift';
        case 'REDEEM': return 'Redeemed';
        case 'LOCK': return 'Locked Funds';
        case 'UNLOCK': return 'Unlocked Funds';
        case 'ENTRY_FEE': return 'Match Entry Fee';
        case 'MATCH_FEE':
        case 'ENTRY': return 'Match Entry';
        case 'PRIZE_WON': return 'Match Prize';
        case 'PRIZE': return 'Prize Won';
        case 'WIN': return 'Match Won';
        case 'REFUND': return 'Refund';
        default: return type;
      }
    };

    return (
      <View style={styles.earningCard}>
        <View
          style={[
            styles.transactionIconContainer,
            { backgroundColor: isCredit ? 'rgba(34, 197, 94, 0.1)' : 'rgba(244, 123, 37, 0.1)' },
          ]}
        >
          <MaterialIcons name={getIcon()} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.earningInfo}>
          <Text style={styles.earningTitle} numberOfLines={1}>{getLabel()}</Text>
          <View style={styles.earningMeta}>
            <Text style={styles.earningDate}>
              {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </Text>
            <View style={styles.dot} />
            <Text style={styles.earningReason} numberOfLines={1}>
              {description || type}
            </Text>
          </View>
        </View>
        <View style={styles.earningRight}>
          <Text
            style={[
              styles.earningAmount,
              { color: isCredit ? COLORS.success : COLORS.error },
            ]}
          >
            {isCredit ? '+' : '-'}₹{Number(amount || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.bgGlowTop} />
        <View style={styles.bgGlowBottom} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading wallet…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.circleBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.navigate('ReceiveQR')}
        >
          <MaterialCommunityIcons name="qrcode" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Holographic Balance Card */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#1a1a1a', '#0d0d0d']}
            style={styles.holographicCard}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceValue}>
                    {showBalance ? `₹${Number(balance).toLocaleString('en-IN')}` : '₹••••••'}
                  </Text>
                  {showBalance && <Text style={styles.balanceDecimal}>.00</Text>}
                  <TouchableOpacity
                    style={styles.visibilityBtn}
                    onPress={() => setShowBalance(!showBalance)}
                  >
                    <MaterialIcons
                      name={showBalance ? 'visibility' : 'visibility-off'}
                      size={18}
                      color="rgba(255,255,255,0.4)"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.nfcIcon}>
                <MaterialCommunityIcons
                  name="contactless-payment"
                  size={24}
                  color={COLORS.primary}
                />
              </View>
            </View>

            <View style={styles.cardMiddle}>
              <View>
                <Text style={styles.smallLabel}>WITHDRAWABLE</Text>
                <Text style={styles.smallValue}>₹{Number(withdrawable).toLocaleString('en-IN')}</Text>
              </View>
              <View>
                <Text style={[styles.smallLabel, { textAlign: 'right' }]}>LOCKED</Text>
                <Text style={[styles.smallValue, { textAlign: 'right' }]}>₹{Number(locked).toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.accLabel}>ACCOUNT NUMBER</Text>
                <View style={styles.accRow}>
                  <Text style={styles.accValue}>
                    {showAccount
                      ? (wallet?.wallet_account_no || '----------')
                      : `**** **** ${wallet?.wallet_account_no ? wallet.wallet_account_no.slice(-2) : '--'}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.accVisibilityBtn}
                    onPress={() => setShowAccount(!showAccount)}
                  >
                    <MaterialIcons
                      name={showAccount ? 'visibility' : 'visibility-off'}
                      size={14}
                      color="rgba(255,255,255,0.4)"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.cardCircles}>
                <View
                  style={[
                    styles.cardCircle,
                    { backgroundColor: 'rgba(244,123,37,0.8)', zIndex: 2 },
                  ]}
                />
                <View
                  style={[
                    styles.cardCircle,
                    { backgroundColor: 'rgba(251,146,60,0.8)', marginLeft: -12 },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsHeader}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickActionsScroll}
          contentContainerStyle={styles.quickActionsContent}
        >
          <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('Add Cash')}>
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
              <MaterialIcons name="add-circle" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.actionText}>ADD CASH</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('Withdraw')}>
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
              <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.actionText}>WITHDRAW</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('Redeem')}>
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(234,179,8,0.1)' }]}>
              <MaterialIcons name="redeem" size={20} color="#eab308" />
            </View>
            <Text style={styles.actionText}>REDEEM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleForgotPin}
            disabled={isResetting}
          >
            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(37,99,235,0.1)' }]}>
              {isResetting ? (
                <ActivityIndicator size="small" color={COLORS.info} />
              ) : (
                <MaterialIcons name="lock-reset" size={20} color={COLORS.info} />
              )}
            </View>
            <Text style={styles.actionText}>RESET PIN</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Reset PIN Modal */}
        <Modal
          visible={resetModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setResetModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {resetStep === 1 ? 'Verify Email' : 'Set New PIN'}
                </Text>
                <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {resetStep === 1 ? (
                <View style={styles.modalBody}>
                  <Text style={styles.modalSub}>
                    Enter the OTP sent to your registered email
                  </Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter OTP"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <TouchableOpacity style={styles.modalActionBtn} onPress={verifyOtp}>
                    <Text style={styles.modalActionText}>VERIFY OTP</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <Text style={styles.modalSub}>
                    Create a new secure 4–6 digit PIN
                  </Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="Enter New PIN"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={6}
                    value={newPin}
                    onChangeText={setNewPin}
                  />
                  <TouchableOpacity style={styles.modalActionBtn} onPress={finalizeReset}>
                    <Text style={styles.modalActionText}>UPDATE PIN</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TRANSACTION HISTORY</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={styles.dateRange}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            transactions.slice(0, 10).map((tx) => (
              <TransactionItem
                key={tx._id}
                type={tx.type}
                date={tx.createdAt}
                amount={tx.amount}
                description={tx.description}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={48} color="rgba(255,255,255,0.05)" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    zIndex: 10,
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
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  heroSection: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  holographicCard: {
    height: 200,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 24,
    overflow: 'hidden',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  balanceValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  balanceDecimal: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  visibilityBtn: {
    marginLeft: 8,
  },
  nfcIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  smallLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  smallValue: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  accLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    marginBottom: 2,
  },
  accValue: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accVisibilityBtn: {
    padding: 2,
  },
  cardCircles: {
    flexDirection: 'row',
  },
  cardCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  quickActionsHeader: { paddingHorizontal: 16, marginBottom: 12 },
  quickActionsScroll: { marginBottom: 24 },
  quickActionsContent: { paddingHorizontal: 16, gap: 12 },
  actionCard: {
    width: 100,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  dateRange: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  forgotPinCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bonusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  forgotIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  forgotValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetBtn: {
    backgroundColor: 'rgba(244,123,37,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,123,37,0.2)',
  },
  resetBtnText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    alignItems: 'center',
  },
  modalSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  otpInput: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 20,
  },
  modalActionBtn: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  earningCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningInfo: {
    flex: 1,
  },
  earningTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  earningMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earningDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  earningRight: {
    alignItems: 'flex-end',
  },
  earningAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  earningReason: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    marginTop: 12,
    fontWeight: 'bold',
  },
});

export default WalletScreen;
