import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from 'react-native-webview';
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { usePopup } from "../../components/PopupModal";

const { width, height } = Dimensions.get("window");

export const AddCashScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("500");
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const { showError, showSuccess, PopupElement } = usePopup();

  const COLORS = {
    primary: "#f47b25",
    bgDark: "#0d0d0d",
    cardDark: "#1a1a1a",
    accentBlue: "#2563eb",
    glassBorder: "rgba(255, 255, 255, 0.1)",
  };

  const quickAmounts = [100, 500, 1000, 2000];

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet/my");
      setWallet(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleQuickAdd = (value: number) => {
    setAmount(value.toString());
  };

  const handleProceed = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showError("Invalid Amount", "Please enter a valid amount to add.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/wallet/add-cash/initiate', { amount: Number(amount) });

      if (res.data.success && res.data.data.payment_session_id) {
        setPaymentSessionId(res.data.data.payment_session_id);
        setCurrentOrderId(res.data.data.order_id);
        setShowPaymentModal(true);
      } else {
        showError("Error", "Failed to initiate payment session");
      }
    } catch (error: any) {
      showError("Error", error.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentStateChange = (navState: any) => {
    // Check for return URL
    if (navState.url.includes('google.com')) { // Our stub return URL
      setShowPaymentModal(false);
      verifyPayment();
    }
  };

  const verifyPayment = async () => {
    if (!currentOrderId) return;
    try {
      setLoading(true);
      const res = await api.post('/wallet/add-cash/verify', { orderId: currentOrderId });
      if (res.data.success) {
        setWallet(res.data.data); // Update wallet with new balance
        showSuccess('Success', `Successfully added ₹${amount} to your wallet!`);
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showError('Payment Failed', 'Transaction could not be verified.');
      }
    } catch (error: any) {
      showError('Error', error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
      setPaymentSessionId(null);
      setCurrentOrderId(null);
    }
  };

  // HTML content to render Cashfree Checkout
  const paymentHtml = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
        <style>
          body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; color: #fff; margin: 0; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #f47b25; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loader"></div>
        <script>
          const cashfree = Cashfree({ mode: "sandbox" });
          window.onload = function() {
              cashfree.checkout({
                  paymentSessionId: "${paymentSessionId}",
                  redirectTarget: "_self"
              });
          }
        </script>
      </body>
      </html>
  `;


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Layer */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top Status Bar Blur */}
      <BlurView
        intensity={250}
        tint="dark"
        style={{
          position: "absolute",
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
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Cash</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Balance Card */}
        <View style={styles.section}>
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Current Wallet Balance</Text>
              <Text style={styles.balanceValue}>₹{wallet?.available_balance || "0"}</Text>
              <Text style={styles.balanceSubtext}>Available to use for contests</Text>
            </View>
            <View style={styles.balanceIconContainer}>
              <MaterialIcons name="account-balance-wallet" size={32} color={COLORS.primary} />
            </View>
          </View>
        </View>

        {/* Amount Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enter Amount</Text>
          <View style={styles.inputContainer}>
            <View style={styles.currencyPrefix}>
              <Text style={styles.currencyText}>₹</Text>
            </View>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor="rgba(255, 255, 255, 0.2)"
            />
            <View style={styles.inputSuffix}>
              <MaterialIcons name="payments" size={24} color="rgba(255, 255, 255, 0.4)" />
            </View>
          </View>

          {/* Quick Add Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipContainer}
          >
            {quickAmounts.map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.chip,
                  amount === val.toString() && styles.activeChip,
                ]}
                onPress={() => handleQuickAdd(val)}
              >
                <Text style={styles.chipText}>+ ₹{val}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Security Info */}
        <View style={styles.section}>
          <View style={styles.securityCard}>
            <MaterialIcons name="verified-user" size={24} color={COLORS.primary} />
            <Text style={styles.securityText}>
              100% Safe & Secure Payments. We use 256-bit encryption to protect
              your transaction details.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={[styles.bottomBtnContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.proceedBtn, loading && { opacity: 0.7 }]}
          onPress={handleProceed}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.proceedBtnText}>
                PROCEED TO PAY ₹{amount || "0"}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Complete Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {paymentSessionId && (
            <WebView
              source={{ html: paymentHtml }}
              onNavigationStateChange={handlePaymentStateChange}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url.includes('battlecore.app/payment-return') || request.url.includes('google.com') || !request.url.includes('cashfree')) {
                  setShowPaymentModal(false);
                  verifyPayment();
                  return false;
                }
                return true;
              }}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>

      <PopupElement />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(244,123,37,0.15)",
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  balanceInfo: {
    gap: 4,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  balanceValue: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  balanceSubtext: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 10,
  },
  balanceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(244, 123, 37, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    height: 46,
    overflow: "hidden",
  },
  currencyPrefix: {
    paddingLeft: 20,
    justifyContent: "center",
  },
  currencyText: {
    color: "#f47b25",
    fontSize: 22,
    fontWeight: "bold",
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    paddingHorizontal: 12,
  },
  inputSuffix: {
    paddingRight: 20,
    justifyContent: "center",
  },
  chipScroll: {
    marginTop: 16,
  },
  chipContainer: {
    gap: 10,
  },
  chip: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeChip: {
    backgroundColor: "#f47b25",
    borderColor: "#f47b25",
  },
  chipText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  securityCard: {
    backgroundColor: "rgba(244, 123, 37, 0.05)",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(244, 123, 37, 0.1)",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  securityText: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBtnContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(13, 13, 13, 0.9)",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  proceedBtn: {
    backgroundColor: "#f47b25",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  proceedBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
