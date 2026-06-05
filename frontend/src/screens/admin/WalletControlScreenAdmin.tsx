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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { adminAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { InfoCard } from "../../components/InfoCard";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ScreenHeader } from "../../components/ScreenHeader";

export const WalletControlScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminAPI.getWallets({ page: 1, limit: 50 });
      if (res.data.success) {
        setWallets(res.data.data?.wallets || res.data.data || []);
      }
    } catch (e) {
      console.error("wallet load error", e);
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

  const openAdjust = (wallet: any, type: "CREDIT" | "DEBIT") => {
    setSelectedWallet(wallet);
    setAdjustType(type);
    setAdjustAmount("");
    setAdjustReason("");
    setShowAdjustModal(true);
  };

  const submitAdjust = async () => {
    if (!selectedWallet) return;
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid positive number.");
      return;
    }
    if (!adjustReason.trim()) {
      Alert.alert(
        "Reason required",
        "Please provide a reason for the adjustment.",
      );
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.adjustWalletBalance(selectedWallet._id, {
        amount: amt,
        type: adjustType,
        reason: adjustReason.trim(),
      });
      Alert.alert(
        "Success",
        `Wallet ${adjustType === "CREDIT" ? "credited" : "debited"} by ₹${amt}.`,
      );
      setShowAdjustModal(false);
      load();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Failed to adjust wallet.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWallets = wallets.filter((w) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const user =
      typeof w.user_id === "object"
        ? w.user_id
        : { username: w.user_id, email: w.user_id };
    return (
      (user.username || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q) ||
      (w._id || "").toLowerCase().includes(q)
    );
  });

  const totalBalance = wallets.reduce(
    (sum, w) => sum + (w.available_balance || 0),
    0,
  );
  const totalLocked = wallets.reduce(
    (sum, w) => sum + (w.locked_balance || 0),
    0,
  );

  if (loading) {
    return (
      <SafeScreen role="ADMIN">
        <ScreenHeader
          title="Wallet Control"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading wallets...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen role="ADMIN" disableBottomSafeArea>
      <ScreenHeader
        title="Wallet Control"
        subtitle={`${wallets.length} wallets · ₹${(totalBalance / 1000).toFixed(1)}K total`}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
            colors={["#ef4444"]}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username, email, or ID"
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Summary */}
        <SectionHeader
          title="Summary"
          accentColor="#ef4444"
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="account-balance-wallet"
            iconColor={COLORS.success}
            title="Total Available Balance"
            subtitle="Sum of all user wallet balances"
            rightValue={`₹ ${totalBalance.toLocaleString()}`}
            variant="success"
          />
          <InfoCard
            icon="lock"
            iconColor="#3b82f6"
            title="Total Locked Balance"
            subtitle="Locked in active matches / pending"
            rightValue={`₹ ${totalLocked.toLocaleString()}`}
            variant="highlight"
          />
        </View>

        {/* Wallets List */}
        <SectionHeader
          title={`Wallets (${filteredWallets.length})`}
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />

        {filteredWallets.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="search-off"
              title="No wallets found"
              description={
                searchQuery
                  ? "Try a different search query."
                  : "No user wallets available yet."
              }
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {filteredWallets.map((wallet) => {
              const user =
                typeof wallet.user_id === "object"
                  ? wallet.user_id
                  : { username: wallet.user_id || "Unknown", email: "" };
              return (
                <View key={wallet._id} style={styles.walletCard}>
                  <View style={styles.walletHeader}>
                    <View style={styles.walletUserInfo}>
                      <View style={styles.walletAvatar}>
                        <Text style={styles.walletAvatarText}>
                          {(user.username || "U").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.walletName} numberOfLines={1}>
                          {user.username || "Unknown"}
                        </Text>
                        {user.email ? (
                          <Text style={styles.walletEmail} numberOfLines={1}>
                            {user.email}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.walletBalance}>
                        ₹ {(wallet.available_balance || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.walletBalanceLabel}>AVAILABLE</Text>
                    </View>
                  </View>

                  {wallet.locked_balance > 0 && (
                    <View style={styles.lockedRow}>
                      <MaterialIcons name="lock" size={12} color="#3b82f6" />
                      <Text style={styles.lockedText}>
                        ₹ {(wallet.locked_balance || 0).toLocaleString()} locked
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: "rgba(34,197,94,0.1)" },
                      ]}
                      onPress={() => openAdjust(wallet, "CREDIT")}
                    >
                      <MaterialIcons
                        name="add"
                        size={14}
                        color={COLORS.success}
                      />
                      <Text
                        style={[styles.actionText, { color: COLORS.success }]}
                      >
                        CREDIT
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: "rgba(239,68,68,0.1)" },
                      ]}
                      onPress={() => openAdjust(wallet, "DEBIT")}
                    >
                      <MaterialIcons
                        name="remove"
                        size={14}
                        color={COLORS.error}
                      />
                      <Text
                        style={[styles.actionText, { color: COLORS.error }]}
                      >
                        DEBIT
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: "rgba(59,130,246,0.1)" },
                      ]}
                      onPress={() =>
                        navigation.navigate("UserDetail", {
                          userId: user._id || wallet.user_id,
                        })
                      }
                    >
                      <MaterialIcons
                        name="visibility"
                        size={14}
                        color="#3b82f6"
                      />
                      <Text style={[styles.actionText, { color: "#3b82f6" }]}>
                        VIEW
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Adjust Modal */}
      <Modal
        visible={showAdjustModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdjustModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowAdjustModal(false)}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {adjustType === "CREDIT" ? "Credit Wallet" : "Debit Wallet"}
              </Text>
              {selectedWallet && (
                <Text style={styles.modalSubtitle}>
                  {typeof selectedWallet.user_id === "object"
                    ? selectedWallet.user_id?.username
                    : selectedWallet.user_id}
                  {" · "}
                  Balance: ₹{" "}
                  {(selectedWallet.available_balance || 0).toLocaleString()}
                </Text>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AMOUNT (₹)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={adjustAmount}
                  onChangeText={setAdjustAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>REASON</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { minHeight: 80, textAlignVertical: "top" },
                  ]}
                  placeholder="Provide a reason for this adjustment"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={adjustReason}
                  onChangeText={setAdjustReason}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowAdjustModal(false)}
                  style={{
                    flex: 1,
                    borderColor: COLORS.border,
                    backgroundColor: "transparent",
                  }}
                />
                <Button
                  title={submitting ? "Processing..." : `Confirm ${adjustType}`}
                  variant={adjustType === "CREDIT" ? "primary" : "danger"}
                  loading={submitting}
                  onPress={submitAdjust}
                  style={{ flex: 1 }}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  walletCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  walletAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletAvatarText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
  },
  walletName: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  walletEmail: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  walletBalance: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
  },
  walletBalanceLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59,130,246,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  lockedText: {
    color: "#3b82f6",
    fontSize: 11,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
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

export default WalletControlScreenAdmin;
