import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { walletAPI, partnerAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { InfoCard } from "../../components/InfoCard";
import { Button } from "../../components/Button";
import { ScreenHeader } from "../../components/ScreenHeader";
import { EmptyState } from "../../components/EmptyState";

const PARTNER_GOLD = "#fbbf24";

const PARTNER_TIER_CONFIG: Record<string, { label: string; color: string }> = {
  STANDARD: { label: "Standard", color: "#9ca3af" },
  SPONSORED: { label: "Sponsored", color: "#3b82f6" },
  PREMIUM: { label: "Premium", color: PARTNER_GOLD },
};

export const WalletControlScreenPartner = ({ navigation }: any) => {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [tier, setTier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"UPI" | "BANK">("UPI");
  const [withdrawDetails, setWithdrawDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [walletRes, txnRes, commissionRes, tierRes] =
        await Promise.allSettled([
          walletAPI.getMyWallet(),
          walletAPI.getTransactions({ page: 1, limit: 30 }),
          partnerAPI.getCommissionHistory(),
          partnerAPI.getTierInfo(),
        ]);

      if (walletRes.status === "fulfilled" && walletRes.value.data?.success) {
        setWallet(walletRes.value.data.data);
      }
      if (txnRes.status === "fulfilled" && txnRes.value.data?.success) {
        setTransactions(
          txnRes.value.data.data?.transactions || txnRes.value.data.data || [],
        );
      }
      if (
        commissionRes.status === "fulfilled" &&
        commissionRes.value.data?.success
      ) {
        setCommissions(
          commissionRes.value.data.data?.commissions ||
            commissionRes.value.data.data ||
            [],
        );
      }
      if (tierRes.status === "fulfilled" && tierRes.value.data?.success) {
        setTier(tierRes.value.data.data);
      }
    } catch (e) {
      console.error("partner wallet load error", e);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const submitWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid positive number.");
      return;
    }
    if (!withdrawDetails.trim()) {
      Alert.alert(
        "Details required",
        `Please provide your ${withdrawMethod === "UPI" ? "UPI ID" : "bank account details"}.`,
      );
      return;
    }
    const available = parseFloat(
      wallet?.available_balance || wallet?.withdrawable_balance || 0,
    );
    if (amt > available) {
      Alert.alert(
        "Insufficient balance",
        `Maximum withdrawable: ₹${available.toLocaleString()}`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await walletAPI.withdraw({
        amount: amt,
        method: withdrawMethod,
        details: withdrawDetails.trim(),
      });
      Alert.alert(
        "Request Submitted",
        `Withdrawal of ₹${amt.toLocaleString()} is being processed.`,
      );
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWithdrawDetails("");
      load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Failed to submit withdrawal request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const tierKey = (tier?.tier || tier?.current_tier || "STANDARD")
    .toString()
    .toUpperCase();
  const tierConfig =
    PARTNER_TIER_CONFIG[tierKey] || PARTNER_TIER_CONFIG.STANDARD;
  const commissionRate =
    tier?.stats?.commission_rate ??
    tier?.commission_rate ??
    tier?.tier_config?.commission_rate ??
    1;
  const commissionRateLabel = `${commissionRate}%`;

  const availableBalance = parseFloat(wallet?.available_balance || 0);
  const lockedBalance = parseFloat(wallet?.locked_balance || 0);
  const withdrawableBalance = parseFloat(
    wallet?.withdrawable_balance || availableBalance,
  );

  const totalCommission = commissions.reduce(
    (sum, c) => sum + parseFloat(c.amount || c.commission_amount || 0),
    0,
  );

  if (loading) {
    return (
      <SafeScreen role="PARTNER">
        <ScreenHeader
          title="My Wallet"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PARTNER_GOLD} />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen role="PARTNER" disableBottomSafeArea>
      <ScreenHeader
        title="Partner Wallet"
        subtitle={`${tierConfig.label} tier · ${commissionRateLabel} Platform Fee`}
        showBack
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={[styles.tierBadge, { borderColor: tierConfig.color }]}>
            <MaterialIcons
              name="military-tech"
              size={12}
              color={tierConfig.color}
            />
            <Text style={[styles.tierBadgeText, { color: tierConfig.color }]}>
              {tierConfig.label.toUpperCase()}
            </Text>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PARTNER_GOLD}
            colors={[PARTNER_GOLD]}
          />
        }
      >
        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <MaterialIcons
              name="account-balance-wallet"
              size={18}
              color={PARTNER_GOLD}
            />
          </View>
          <Text style={styles.balanceValue}>
            ₹ {availableBalance.toLocaleString()}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceSubItem}>
              <Text style={styles.balanceSubLabel}>LOCKED</Text>
              <Text style={styles.balanceSubValue}>
                ₹ {lockedBalance.toLocaleString()}
              </Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceSubItem}>
              <Text style={styles.balanceSubLabel}>WITHDRAWABLE</Text>
              <Text style={[styles.balanceSubValue, { color: PARTNER_GOLD }]}>
                ₹ {withdrawableBalance.toLocaleString()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="south-west" size={16} color="#020617" />
            <Text style={styles.withdrawBtnText}>WITHDRAW FUNDS</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Summary */}
        <SectionHeader
          title="Earnings"
          accentColor={PARTNER_GOLD}
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="emoji-events"
            iconColor={PARTNER_GOLD}
            title="Total Platform Fee Earned"
            subtitle={`From ${commissions.length} events`}
            rightValue={`₹ ${totalCommission.toLocaleString()}`}
            variant="highlight"
          />
          <InfoCard
            icon="schedule"
            iconColor="#3b82f6"
            title="Pending Settlement"
            subtitle="In-progress match Platform Fees"
            rightValue={`₹ ${lockedBalance.toLocaleString()}`}
          />
        </View>

        {/* Commission History */}
        <SectionHeader
          title={`Platform Fee History (${commissions.length})`}
          accentColor={PARTNER_GOLD}
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />
        {commissions.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="emoji-events"
              title="No Platform Fees yet"
              description="Host events to start earning Platform Fees."
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {commissions.slice(0, 10).map((c: any, idx: number) => (
              <View key={c._id || idx} style={styles.commissionCard}>
                <View style={styles.commissionIcon}>
                  <MaterialIcons
                    name="emoji-events"
                    size={16}
                    color={PARTNER_GOLD}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commissionTitle} numberOfLines={1}>
                    {c.event_title ||
                      c.match_title ||
                      c.title ||
                      `Event #${idx + 1}`}
                  </Text>
                  <Text style={styles.commissionMeta}>
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString()
                      : "Recent"}
                    {c.status ? ` · ${c.status}` : ""}
                  </Text>
                </View>
                <Text style={styles.commissionAmount}>
                  +₹{" "}
                  {parseFloat(
                    c.amount || c.commission_amount || 0,
                  ).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Transactions */}
        <SectionHeader
          title={`Recent Transactions (${transactions.length})`}
          accentColor={PARTNER_GOLD}
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />
        {transactions.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="receipt-long"
              title="No transactions yet"
              description="Your wallet activity will appear here."
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {transactions.slice(0, 10).map((txn: any, idx: number) => {
              const isCredit =
                (txn.type || "").toUpperCase() === "CREDIT" ||
                (txn.direction || "").toUpperCase() === "IN";
              return (
                <View key={txn._id || idx} style={styles.txnCard}>
                  <View
                    style={[
                      styles.txnIcon,
                      {
                        backgroundColor: isCredit
                          ? "rgba(34,197,94,0.12)"
                          : "rgba(239,68,68,0.12)",
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={isCredit ? "south-west" : "north-east"}
                      size={16}
                      color={isCredit ? COLORS.success : COLORS.error}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnTitle} numberOfLines={1}>
                      {txn.description || txn.note || txn.type || "Transaction"}
                    </Text>
                    <Text style={styles.txnMeta}>
                      {txn.created_at
                        ? new Date(txn.created_at).toLocaleDateString()
                        : "Recent"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txnAmount,
                      { color: isCredit ? COLORS.success : COLORS.error },
                    ]}
                  >
                    {isCredit ? "+" : "-"}₹{" "}
                    {parseFloat(txn.amount || 0).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowWithdrawModal(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <Text style={styles.modalSubtitle}>
                Withdrawable balance: ₹ {withdrawableBalance.toLocaleString()}
              </Text>

              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    withdrawMethod === "UPI" && {
                      borderColor: PARTNER_GOLD,
                      backgroundColor: "rgba(251,191,36,0.08)",
                    },
                  ]}
                  onPress={() => setWithdrawMethod("UPI")}
                >
                  <MaterialIcons
                    name="smartphone"
                    size={18}
                    color={
                      withdrawMethod === "UPI" ? PARTNER_GOLD : COLORS.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.methodText,
                      withdrawMethod === "UPI" && { color: PARTNER_GOLD },
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    withdrawMethod === "BANK" && {
                      borderColor: PARTNER_GOLD,
                      backgroundColor: "rgba(251,191,36,0.08)",
                    },
                  ]}
                  onPress={() => setWithdrawMethod("BANK")}
                >
                  <MaterialIcons
                    name="account-balance"
                    size={18}
                    color={
                      withdrawMethod === "BANK"
                        ? PARTNER_GOLD
                        : COLORS.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.methodText,
                      withdrawMethod === "BANK" && { color: PARTNER_GOLD },
                    ]}
                  >
                    BANK
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AMOUNT (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {withdrawMethod === "UPI" ? "UPI ID" : "BANK ACCOUNT DETAILS"}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={
                    withdrawMethod === "UPI"
                      ? "yourname@upi"
                      : "Account number, IFSC, name"
                  }
                  placeholderTextColor={COLORS.textMuted}
                  value={withdrawDetails}
                  onChangeText={setWithdrawDetails}
                  multiline={withdrawMethod === "BANK"}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowWithdrawModal(false)}
                  style={{
                    flex: 1,
                    borderColor: COLORS.border,
                    backgroundColor: "transparent",
                  }}
                />
                <Button
                  title={submitting ? "Processing..." : "Withdraw"}
                  loading={submitting}
                  onPress={submitWithdraw}
                  style={{ flex: 1, backgroundColor: PARTNER_GOLD }}
                  textStyle={{ color: "#020617" }}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    gap: 12,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  balanceValue: {
    color: "white",
    fontSize: 36,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -1,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
  },
  balanceSubItem: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 12,
  },
  balanceSubLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  balanceSubValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PARTNER_GOLD,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  withdrawBtnText: {
    color: "#020617",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  commissionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  commissionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(251,191,36,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  commissionTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  commissionMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  commissionAmount: {
    color: PARTNER_GOLD,
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
  },
  txnCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txnTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  txnMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    textTransform: "uppercase",
    letterSpacing: -0.4,
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 16,
    fontWeight: "600",
  },
  methodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  methodBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "rgba(2,6,23,0.4)",
  },
  methodText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  modalInput: {
    backgroundColor: "rgba(2,6,23,0.4)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
});

export default WalletControlScreenPartner;
