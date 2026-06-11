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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from '@react-native-community/slider';

import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const WithdrawScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showInfo, PopupElement } = usePopup();
  const [amount, setAmount] = useState(0);
  const [wallet, setWallet] = useState<any>(null);
  const [method, setMethod] = useState<"UPI" | "BANK" | "SOURCE">("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [lastSource, setLastSource] = useState<any>(null);

  const maxWithdrawable = wallet?.withdrawable_balance || 0;

  const COLORS = {
    primary: "#f47b25",
    bgDark: "#0d0d0d",
    cardDark: "#1a1a1a",
    accentBlue: "#2563eb",
    glassBorder: "rgba(255, 255, 255, 0.1)",
  };

  useEffect(() => {
    fetchWallet();
    fetchLastSource();
  }, []);

  const fetchLastSource = async () => {
    try {
      const res = await api.get('/wallet/last-deposit-source');
      if (res.data.success && res.data.data) {
        setLastSource(res.data.data);
      }
    } catch (err) {
      console.log("No last source found");
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet/my");
      setWallet(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handlePercentage = (percent: number) => {
    setAmount(Math.round((maxWithdrawable * percent) / 100));
  };

  const handleConfirm = async () => {
    if (amount <= 0) {
      showError("Invalid Amount", "Please select a valid amount to withdraw.");
      return;
    }

    let details = {};
    if (method === "UPI") {
      if (!upiId.trim()) {
        showError("UPI ID Required", "Please enter a valid UPI ID.");
        return;
      }
      details = { upiId };
    } else if (method === "BANK") {
      if (!accountName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        showError("Incomplete Details", "Please fill in all bank details.");
        return;
      }
      details = { accountName, accountNumber, ifscCode };
    } else if (method === "SOURCE") {
      if (!lastSource) {
        showError("Error", "No source account found.");
        return;
      }
      details = { source: lastSource };
    }

    try {
      const res = await api.post('/wallet/withdraw', {
        amount,
        method,
        details
      });
      if (res.data.success) {
        showSuccess("Success", "Withdrawal initiated successfully!");
        fetchWallet(); // Refresh wallet
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (err: any) {
      showError("Withdrawal Failed", err.response?.data?.message || err.message);
    }
  };

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
          <MaterialIcons name="arrow-back-ios" size={18} color="white" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() =>
            showInfo("Help", "Contact support for withdrawal help")
          }
          accessibilityRole="button"
          accessibilityLabel="Help"
        >
          <MaterialIcons name="help-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Balance Display */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Withdrawable Winnings</Text>
          <Text style={styles.balanceValue}>₹{maxWithdrawable.toLocaleString()}</Text>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>Ready to Cashout</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>

          {/* UPI Option */}
          <View style={[
            styles.methodCard,
            method === "UPI" && styles.activeMethodCard
          ]}>
            <TouchableOpacity
              style={styles.methodHeader}
              onPress={() => setMethod("UPI")}
            >
              <View style={styles.methodIconInfo}>
                <View style={[styles.methodIconBg, method === "UPI" && { backgroundColor: COLORS.primary }]}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={24}
                    color={method === "UPI" ? "white" : "#cba990"}
                  />
                </View>
                <View>
                  <Text style={styles.methodTitle}>UPI Transfer</Text>
                  <Text style={styles.methodSub}>Instant & Seamless</Text>
                </View>
              </View>
              <View style={[styles.radio, method === "UPI" && styles.radioActive]}>
                {method === "UPI" && <MaterialIcons name="check" size={12} color="white" />}
              </View>
            </TouchableOpacity>

            {method === "UPI" && (
              <View style={styles.upiInputArea}>
                <TextInput
                  style={styles.upiInput}
                  placeholder="Enter UPI ID (e.g. user@bank)"
                  placeholderTextColor="rgba(255, 255, 255, 0.2)"
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.verifyBtn}>
                  <Text style={styles.verifyBtnText}>VERIFY</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bank Option */}
          <View
            style={[
              styles.methodCard,
              method === "BANK" && styles.activeMethodCard,
              { marginTop: 12 }
            ]}
          >
            <TouchableOpacity
              style={styles.methodHeader}
              onPress={() => setMethod("BANK")}
            >
              <View style={styles.methodIconInfo}>
                <View style={[styles.methodIconBg, method === "BANK" && { backgroundColor: COLORS.primary }, { backgroundColor: "#1a1a1a" }]}>
                  <MaterialIcons
                    name="account-balance"
                    size={24}
                    color={method === "BANK" ? "white" : "#cba990"}
                  />
                </View>
                <View>
                  <Text style={styles.methodTitle}>Direct Bank Transfer</Text>
                  <Text style={styles.methodSub}>Standard IMPS Processing</Text>
                </View>
              </View>
              <View style={[styles.radio, method === "BANK" && styles.radioActive]}>
                {method === "BANK" && <MaterialIcons name="check" size={12} color="white" />}
              </View>
            </TouchableOpacity>

            {method === "BANK" && (
              <View style={styles.upiInputArea}>
                <TextInput
                  style={[styles.upiInput, { marginBottom: 12 }]}
                  placeholder="Account Holder Name"
                  placeholderTextColor="rgba(255, 255, 255, 0.2)"
                  value={accountName}
                  onChangeText={setAccountName}
                />
                <TextInput
                  style={[styles.upiInput, { marginBottom: 12 }]}
                  placeholder="Account Number"
                  placeholderTextColor="rgba(255, 255, 255, 0.2)"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.upiInput}
                  placeholder="IFSC Code"
                  placeholderTextColor="rgba(255, 255, 255, 0.2)"
                  value={ifscCode}
                  onChangeText={setIfscCode}
                  autoCapitalize="characters"
                />
              </View>
            )}
          </View>
        </View>

        {/* Amount Selection */}
        <View style={styles.section}>
          <View style={styles.amountHeader}>
            <Text style={styles.sectionTitle}>Select Amount</Text>
            <Text style={styles.amountDisplay}>₹{amount}</Text>
          </View>

          {/* Interactive Slider */}
          <View style={[styles.sliderContainer, maxWithdrawable === 0 && { opacity: 0.5 }]}>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={maxWithdrawable > 0 ? maxWithdrawable : 1}
              minimumTrackTintColor={maxWithdrawable === 0 ? "#555" : "#f47b25"}
              maximumTrackTintColor="#333333"
              thumbTintColor={maxWithdrawable === 0 ? "#555" : "#f47b25"}
              step={1}
              value={amount}
              onValueChange={(val) => setAmount(Math.round(val))}
              disabled={maxWithdrawable === 0}
            />
          </View>

          <View style={styles.percentBtnRow}>
            {[25, 50, 100].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.percentBtn,
                  amount === Math.round((maxWithdrawable * p) / 100) && styles.activePercentBtn,
                  maxWithdrawable === 0 && { opacity: 0.5, borderColor: "transparent" }
                ]}
                onPress={() => handlePercentage(p)}
                disabled={maxWithdrawable === 0}
              >
                <Text style={[
                  styles.percentText,
                  amount === Math.round((maxWithdrawable * p) / 100) && styles.activePercentText
                ]}>{p}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notice Area */}
        <View style={styles.noticeCard}>
          <MaterialIcons name="info-outline" size={20} color="#cba990" />
          <Text style={styles.noticeText}>
            UPI transfers are usually instant. IMPS transfers might take up to 24-48 hours depending on your bank's processing time.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={[styles.bottomBtnContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Text style={styles.confirmBtnText}>CONFIRM WITHDRAWAL</Text>
          <MaterialIcons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  helpButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  balanceValue: {
    color: "white",
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
  },
  readyBadge: {
    marginTop: 12,
    backgroundColor: "rgba(244, 123, 37, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(244, 123, 37, 0.2)",
  },
  readyBadgeText: {
    color: "#f47b25",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeMethodCard: {
    borderColor: "#f47b25",
    backgroundColor: "rgba(244, 123, 37, 0.05)",
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodIconInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  methodIconBg: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#f47b25",
    alignItems: "center",
    justifyContent: "center",
  },
  methodTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  methodSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    backgroundColor: "#f47b25",
    borderColor: "#f47b25",
  },
  upiInputArea: {
    marginTop: 16,
    position: "relative",
  },
  upiInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    height: 46,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingRight: 80,
    color: "white",
    fontSize: 14,
  },
  verifyBtn: {
    position: "absolute",
    right: 5,
    top: 5,
    bottom: 5,
    backgroundColor: "#f47b25",
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
  },
  amountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  amountDisplay: {
    color: "#f47b25",
    fontSize: 20,
    fontWeight: "bold",
  },
  sliderContainer: {
    height: 40,
    justifyContent: "center",
    width: '100%',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    position: "relative",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#f47b25",
    borderRadius: 4,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f47b25",
    borderWidth: 4,
    borderColor: "#0d0d0d",
    position: "absolute",
    top: -8,
    marginLeft: -12,
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  percentBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  percentBtn: {
    flex: 1,
    height: 46,
    backgroundColor: "#1a1a1a",
    marginHorizontal: 4,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  activePercentBtn: {
    backgroundColor: "rgba(244, 123, 37, 0.2)",
    borderColor: "rgba(244, 123, 37, 0.4)",
  },
  percentText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "bold",
  },
  activePercentText: {
    color: "#f47b25",
  },
  noticeCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  noticeText: {
    flex: 1,
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBtnContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(13, 13, 13, 0.9)",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  confirmBtn: {
    backgroundColor: "#f47b25",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
