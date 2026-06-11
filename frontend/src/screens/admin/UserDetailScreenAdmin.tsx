import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { adminAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const UserDetailScreenAdmin = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm, PopupElement } = usePopup();
  const { userId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [financial, setFinancial] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "wallet" | "matches" | "financial">("profile");

  // Wallet adjust modal
  const [adjustModal, setAdjustModal] = useState({ visible: false, walletId: "", type: "CREDIT" as "CREDIT" | "DEBIT", amount: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (userId) loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userRes, finRes] = await Promise.allSettled([
        adminAPI.getUser(userId),
        adminAPI.getUserFinancialProfile(userId),
      ]);
      if (userRes.status === "fulfilled" && userRes.value.data.success) {
        setUser(userRes.value.data.data);
      }
      if (finRes.status === "fulfilled" && finRes.value.data.success) {
        setFinancial(finRes.value.data.data);
      }
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!user) return;
    const newBlocked = !user.is_blocked;
    showConfirm(
      newBlocked ? "Block User" : "Unblock User",
      `Are you sure you want to ${newBlocked ? "block" : "unblock"} ${user.username}?`,
      async () => {
        try {
          await adminAPI.blockUser(userId, { blocked: newBlocked, reason: "Admin action" });
          setUser({ ...user, is_blocked: newBlocked });
        } catch (err: any) {
          showError("Error", err.response?.data?.message || "Failed");
        }
      },
      newBlocked ? "Block" : "Unblock",
    );
  };

  const handleAdjustWallet = async () => {
    if (!adjustModal.amount || parseFloat(adjustModal.amount) <= 0) {
      showError("Invalid", "Enter a valid amount");
      return;
    }
    setAdjusting(true);
    try {
      await adminAPI.adjustWalletBalance(adjustModal.walletId, {
        amount: parseFloat(adjustModal.amount),
        type: adjustModal.type,
        reason: adjustModal.reason || "Admin adjustment",
      });
      setAdjustModal({ visible: false, walletId: "", type: "CREDIT", amount: "", reason: "" });
      showSuccess("Success", "Wallet balance adjusted");
      loadUserData();
    } catch (err: any) {
      showError("Error", err.response?.data?.message || "Failed");
    } finally {
      setAdjusting(false);
    }
  };

  const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Detail</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="error-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={{ color: "white", marginTop: 12 }}>User not found</Text>
        </View>
      </View>
    );
  }

  const roleColors: Record<string, string> = { ADMIN: "#ef4444", PARTNER: "#fbbf24", MEDIATOR: "#3b82f6", USER: COLORS.primary };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: (roleColors[user.role] || COLORS.primary) + "15", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Detail</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBlockToggle}>
          <MaterialIcons name={user.is_blocked ? "lock-open" : "block"} size={20} color={user.is_blocked ? COLORS.success : COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* User Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrap}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialIcons name="person" size={40} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            {user.is_verified && (
              <View style={styles.verifiedBadge}><MaterialIcons name="verified" size={14} color={COLORS.primary} /></View>
            )}
          </View>
          <Text style={styles.userName}>{user.username}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: (roleColors[user.role] || COLORS.primary) + "20" }]}>
              <Text style={[styles.roleBadgeText, { color: roleColors[user.role] || COLORS.primary }]}>{user.role}</Text>
            </View>
            {user.is_blocked && (
              <View style={[styles.roleBadge, { backgroundColor: "rgba(239,68,68,0.2)" }]}>
                <Text style={[styles.roleBadgeText, { color: "#ef4444" }]}>BLOCKED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          {(["profile", "wallet", "financial", "matches"] as const).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{tab.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ACCOUNT INFO</Text>
              <InfoRow label="Username" value={user.username} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone || "Not set"} />
              <InfoRow label="Role" value={user.role} color={roleColors[user.role]} />
              <InfoRow label="Verified" value={user.is_verified ? "Yes" : "No"} />
              <InfoRow label="Joined" value={new Date(user.created_at || user.createdAt).toLocaleDateString("en-IN")} />
              <InfoRow label="Last Login" value={user.last_login ? new Date(user.last_login).toLocaleString("en-IN") : "N/A"} />
            </View>

            {user.bio && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>BIO</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}
          </View>
        )}

        {/* WALLET TAB */}
        {activeTab === "wallet" && financial?.wallet && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>WALLET BALANCE</Text>
              <View style={styles.balanceGrid}>
                <View style={styles.balanceBox}>
                  <Text style={[styles.balanceVal, { color: COLORS.success }]}>{formatCurrency(financial.wallet.available_balance)}</Text>
                  <Text style={styles.balanceLbl}>Available</Text>
                </View>
                <View style={styles.balanceBox}>
                  <Text style={[styles.balanceVal, { color: COLORS.primary }]}>{formatCurrency(financial.wallet.withdrawable_balance)}</Text>
                  <Text style={styles.balanceLbl}>Withdrawable</Text>
                </View>
                <View style={styles.balanceBox}>
                  <Text style={[styles.balanceVal, { color: "#fbbf24" }]}>{formatCurrency(financial.wallet.locked_balance)}</Text>
                  <Text style={styles.balanceLbl}>Locked</Text>
                </View>
              </View>
              <InfoRow label="Account No" value={financial.wallet.wallet_account_no || "N/A"} />
            </View>

            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => setAdjustModal({ visible: true, walletId: financial.wallet._id, type: "CREDIT", amount: "", reason: "" })}
            >
              <MaterialIcons name="edit" size={18} color="white" />
              <Text style={styles.adjustBtnText}>ADJUST BALANCE</Text>
            </TouchableOpacity>

            {/* Recent Transactions */}
            {financial.recentTransactions?.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>RECENT TRANSACTIONS</Text>
                {financial.recentTransactions.slice(0, 5).map((tx: any, idx: number) => (
                  <View key={idx} style={[styles.txnRow, idx < 4 && styles.txnDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnType}>{tx.type}</Text>
                      <Text style={styles.txnDate}>{new Date(tx.createdAt).toLocaleDateString("en-IN")}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: ["DEPOSIT", "GIFT_RECEIVED", "PRIZE_WON", "UNLOCK"].includes(tx.type) ? COLORS.success : COLORS.error }]}>
                      {["DEPOSIT", "GIFT_RECEIVED", "PRIZE_WON", "UNLOCK"].includes(tx.type) ? "+" : "-"}{formatCurrency(tx.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* FINANCIAL TAB */}
        {activeTab === "financial" && financial && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SPENDING SUMMARY</Text>
              <InfoRow label="Total Deposited" value={formatCurrency(financial.total_deposited)} color={COLORS.success} />
              <InfoRow label="Total Withdrawn" value={formatCurrency(financial.total_withdrawn)} color={COLORS.error} />
              <InfoRow label="Total Entry Fees" value={formatCurrency(financial.total_entry_fees)} color={COLORS.primary} />
              <InfoRow label="Total Won" value={formatCurrency(financial.total_won)} color={COLORS.success} />
              <InfoRow label="Total Sent (Gifts)" value={formatCurrency(financial.total_sent)} color="#a855f7" />
              <InfoRow label="Total Received" value={formatCurrency(financial.total_received)} color={COLORS.success} />
              <InfoRow label="Total Pass Spent" value={formatCurrency(financial.total_spent_on_passes)} color="#fbbf24" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>MATCH STATS</Text>
              <InfoRow label="Matches Created" value={`${financial.matches_created || 0}`} />
              <InfoRow label="Matches Joined" value={`${financial.matches_joined || 0}`} />
              <InfoRow label="Matches Won" value={`${financial.matches_won || 0}`} />
              <InfoRow label="Win Rate" value={`${financial.win_rate || 0}%`} />
            </View>
          </View>
        )}

        {/* MATCHES TAB */}
        {activeTab === "matches" && financial?.recentMatches?.length > 0 && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>RECENT MATCHES</Text>
              {financial.recentMatches.map((match: any, idx: number) => (
                <View key={idx} style={[styles.txnRow, idx < financial.recentMatches.length - 1 && styles.txnDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnType}>{match.title || "Untitled"}</Text>
                    <Text style={styles.txnDate}>{match.status} • {match.game_type}</Text>
                  </View>
                  <Text style={[styles.txnAmount, { color: match.status === "COMPLETED" ? COLORS.success : COLORS.primary }]}>
                    ₹{match.prize_pool}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Adjust Balance Modal */}
      <Modal visible={adjustModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Balance</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, adjustModal.type === "CREDIT" && styles.typeBtnActive]}
                onPress={() => setAdjustModal({ ...adjustModal, type: "CREDIT" })}
              >
                <Text style={[styles.typeBtnText, adjustModal.type === "CREDIT" && { color: "white" }]}>CREDIT (+)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, adjustModal.type === "DEBIT" && styles.typeBtnActiveDebit]}
                onPress={() => setAdjustModal({ ...adjustModal, type: "DEBIT" })}
              >
                <Text style={[styles.typeBtnText, adjustModal.type === "DEBIT" && { color: "white" }]}>DEBIT (-)</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              value={adjustModal.amount}
              onChangeText={(t) => setAdjustModal({ ...adjustModal, amount: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="Reason (optional)"
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={adjustModal.reason}
              onChangeText={(t) => setAdjustModal({ ...adjustModal, reason: t })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAdjustModal({ ...adjustModal, visible: false })}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: adjustModal.type === "CREDIT" ? COLORS.success : COLORS.error }]}
                onPress={handleAdjustWallet}
                disabled={adjusting}
              >
                {adjusting ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalConfirmText}>CONFIRM</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <PopupElement />
    </View>
  );
};

const InfoRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  // Hero
  heroSection: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16 },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: "rgba(255,255,255,0.1)" },
  avatarPlaceholder: { backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  verifiedBadge: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.backgroundDark, alignItems: "center", justifyContent: "center" },
  userName: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  userEmail: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 12 },
  badgeRow: { flexDirection: "row", gap: 8 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: "bold", letterSpacing: 1 },

  // Tabs
  tabBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 },
  tabBtnTextActive: { color: "white" },
  tabContent: { paddingHorizontal: 16 },

  // Cards
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 16 },
  bioText: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 22 },

  // Info Row
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  infoLabel: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  infoValue: { color: "white", fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" },

  // Balance
  balanceGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  balanceBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.025)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  balanceVal: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  balanceLbl: { fontSize: 9, color: "rgba(255,255,255,0.4)", textAlign: "center" },

  // Adjust Button
  adjustBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, marginBottom: 16 },
  adjustBtnText: { color: "white", fontSize: 13, fontWeight: "bold", letterSpacing: 1 },

  // Transactions
  txnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  txnDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  txnType: { color: "white", fontSize: 13, fontWeight: "600" },
  txnDate: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: "bold" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  typeBtnActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  typeBtnActiveDebit: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  typeBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "bold" },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 16, paddingVertical: 14, color: "white", fontSize: 16, marginBottom: 12 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalCancelText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "bold" },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalConfirmText: { color: "white", fontSize: 13, fontWeight: "bold" },
});
