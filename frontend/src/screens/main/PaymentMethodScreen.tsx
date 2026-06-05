import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";

interface PaymentMethodScreenProps {
  navigation: any;
  route: {
    params: {
      matchId: string;
      entryFee: number;
      matchTitle: string;
    };
  };
}

export const PaymentMethodScreen = ({ navigation, route }: PaymentMethodScreenProps) => {
  const { matchId, entryFee, matchTitle } = route.params;
  const insets = useSafeAreaInsets();

  const [selectedMethod, setSelectedMethod] = useState<"WALLET" | "CASHFREE">("WALLET");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentPreference, setPaymentPreference] = useState<string>("ASK_ALWAYS");

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const [walletRes, userRes] = await Promise.all([
        api.get("/wallet/my"),
        api.get("/auth/me"),
      ]);
      setWalletBalance(walletRes.data.data?.available_balance || 0);
      setPaymentPreference(userRes.data.data?.payment_preference || "ASK_ALWAYS");

      if (userRes.data.data?.payment_preference === "WALLET") {
        setSelectedMethod("WALLET");
      } else if (userRes.data.data?.payment_preference === "CASHFREE") {
        setSelectedMethod("CASHFREE");
      }
    } catch (error) {
      console.error("Failed to load wallet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      if (selectedMethod === "WALLET") {
        if (walletBalance < entryFee) {
          Alert.alert(
            "Insufficient Balance",
            `Your wallet balance (₹${walletBalance}) is less than the entry fee (₹${entryFee}). Please add cash or choose Cashfree.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Add Cash", onPress: () => navigation.navigate("AddCash") },
            ]
          );
          setIsProcessing(false);
          return;
        }

        const response = await api.post("/matches/join", {
          roomId: matchId,
          paymentMethod: "WALLET",
        });

        if (response.data.success) {
          Alert.alert("Success", "You have successfully joined the match!", [
            {
              text: "OK",
              onPress: () => navigation.navigate("MatchDetail", { matchId }),
            },
          ]);
        }
      } else {
        const response = await api.post("/matches/initiate-payment", {
          matchId,
          paymentMethod: "CASHFREE",
        });

        if (response.data.success) {
          const { payment_session_url, order_id } = response.data.data;

          navigation.navigate("CashfreePayment", {
            paymentUrl: payment_session_url,
            orderId: order_id,
            matchId,
            amount: entryFee,
          });
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const canPayWithWallet = walletBalance >= entryFee;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading payment options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <BlurView
        intensity={250}
        tint="dark"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.matchInfoCard}>
          <Text style={styles.matchTitle}>{matchTitle}</Text>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Entry Fee</Text>
            <Text style={styles.feeAmount}>₹{entryFee}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose Payment Method</Text>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedMethod === "WALLET" && styles.paymentOptionSelected,
          ]}
          onPress={() => setSelectedMethod("WALLET")}
        >
          <View style={styles.paymentOptionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(244,123,37,0.1)" }]}>
              <FontAwesome5 name="wallet" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.paymentTextContainer}>
              <Text style={styles.paymentMethodTitle}>Wallet Balance</Text>
              <Text style={styles.walletBalanceText}>₹{walletBalance}</Text>
              {!canPayWithWallet && (
                <Text style={styles.insufficientText}>Insufficient Balance</Text>
              )}
            </View>
          </View>
          <View style={[styles.radioButton, selectedMethod === "WALLET" && styles.radioButtonSelected]}>
            {selectedMethod === "WALLET" && <View style={styles.radioButtonInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.paymentOption,
            selectedMethod === "CASHFREE" && styles.paymentOptionSelected,
          ]}
          onPress={() => setSelectedMethod("CASHFREE")}
        >
          <View style={styles.paymentOptionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: "rgba(37,99,235,0.1)" }]}>
              <MaterialIcons name="payment" size={24} color={COLORS.accentBlue} />
            </View>
            <View style={styles.paymentTextContainer}>
              <Text style={styles.paymentMethodTitle}>Cashfree</Text>
              <Text style={styles.cashfreeSubtext}>UPI, Card, NetBanking</Text>
            </View>
          </View>
          <View style={[styles.radioButton, selectedMethod === "CASHFREE" && styles.radioButtonSelected]}>
            {selectedMethod === "CASHFREE" && <View style={styles.radioButtonInner} />}
          </View>
        </TouchableOpacity>

        {selectedMethod === "WALLET" && !canPayWithWallet && (
          <TouchableOpacity
            style={styles.addCashButton}
            onPress={() => navigation.navigate("AddCash")}
          >
            <LinearGradient
              colors={["#f47b25", "#ff8c3a"]}
              style={styles.addCashGradient}
            >
              <MaterialIcons name="add-circle" size={20} color="white" />
              <Text style={styles.addCashText}>Add Cash to Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Match Entry Fee</Text>
            <Text style={styles.summaryValue}>₹{entryFee}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Method</Text>
            <Text style={styles.summaryValue}>
              {selectedMethod === "WALLET" ? "Wallet" : "Cashfree"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{entryFee}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!canPayWithWallet && selectedMethod === "WALLET") && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={isProcessing || (!canPayWithWallet && selectedMethod === "WALLET")}
        >
          <LinearGradient
            colors={
              isProcessing || (!canPayWithWallet && selectedMethod === "WALLET")
                ? ["#555", "#444"]
                : ["#f47b25", "#ff8c3a"]
            }
            style={styles.payGradient}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay ₹{entryFee} & Join
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 16 },
  bgGlowTop: { position: "absolute", top: "-10%", right: "-20%", width: 300, height: 300, backgroundColor: "rgba(244,123,37,0.15)", borderRadius: 150, opacity: 0.5 },
  bgGlowBottom: { position: "absolute", bottom: "-10%", left: "-20%", width: 300, height: 300, backgroundColor: "rgba(37,99,235,0.1)", borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  matchInfoCard: { margin: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  matchTitle: { color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  feeLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  feeAmount: { color: COLORS.primary, fontSize: 24, fontWeight: "bold" },
  sectionTitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "bold", paddingHorizontal: 16, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  paymentOption: { marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  paymentOptionSelected: { borderColor: COLORS.primary, backgroundColor: "rgba(244,123,37,0.05)" },
  paymentOptionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 12 },
  paymentTextContainer: { flex: 1 },
  paymentMethodTitle: { color: "white", fontSize: 16, fontWeight: "bold" },
  walletBalanceText: { color: COLORS.primary, fontSize: 18, fontWeight: "bold", marginTop: 2 },
  insufficientText: { color: "#ef4444", fontSize: 12, marginTop: 2 },
  cashfreeSubtext: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  radioButton: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", justifyContent: "center", alignItems: "center" },
  radioButtonSelected: { borderColor: COLORS.primary },
  radioButtonInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  addCashButton: { marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: "hidden" },
  addCashGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, gap: 8 },
  addCashText: { color: "white", fontSize: 14, fontWeight: "bold" },
  summaryCard: { margin: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  summaryTitle: { color: "white", fontSize: 16, fontWeight: "bold", marginBottom: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  summaryValue: { color: "white", fontSize: 14, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 12 },
  totalLabel: { color: "white", fontSize: 16, fontWeight: "bold" },
  totalValue: { color: COLORS.primary, fontSize: 20, fontWeight: "bold" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "rgba(13,13,13,0.95)" },
  payButton: { borderRadius: 16, overflow: "hidden" },
  payButtonDisabled: { opacity: 0.5 },
  payGradient: { padding: 16, alignItems: "center" },
  payButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
