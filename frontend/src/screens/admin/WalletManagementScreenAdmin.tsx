import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import { adminAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const WalletManagementScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showWarning, showSuccess, showError, PopupElement } = usePopup();
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState({ visible: false, walletId: "", username: "", type: "CREDIT" as "CREDIT" | "DEBIT", amount: "", reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  useFocusEffect(useCallback(() => { loadWallets(1, false); }, []));

  const loadWallets = async (pageNum: number, append: boolean) => {
    try {
      if (!append) setLoading(true);
      const params: any = { page: pageNum, limit: 20 };
      if (search) params.q = search;
      const res = await adminAPI.getWallets(params);
      if (res.data.success) {
        const data = res.data.data || [];
        setWallets(append ? [...wallets, ...data] : data);
        setHasMore(data.length === 20);
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Error loading wallets:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadWallets(1, false); };
  const loadMore = () => { if (hasMore && !loading) loadWallets(page + 1, true); };
  const onSearch = () => { loadWallets(1, false); };

  const handleAdjust = async () => {
    if (!adjustModal.amount || parseFloat(adjustModal.amount) <= 0) {
      showWarning("Invalid", "Enter a valid amount");
      return;
    }
    setAdjusting(true);
    try {
      await adminAPI.adjustWalletBalance(adjustModal.walletId, {
        amount: parseFloat(adjustModal.amount),
        type: adjustModal.type,
        reason: adjustModal.reason || "Admin adjustment",
      });
      setAdjustModal({ visible: false, walletId: "", username: "", type: "CREDIT", amount: "", reason: "" });
      showSuccess("Success", "Wallet balance adjusted");
      loadWallets(1, false);
    } catch (err: any) {
      showError("Error", err.response?.data?.message || "Failed");
    } finally {
      setAdjusting(false);
    }
  };

  const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(59,130,246,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <MaterialIcons name="search" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onMomentumScrollEnd={(e) => {
            if (e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height >= e.nativeEvent.contentSize.height - 200) loadMore();
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultCount}>{wallets.length} wallets found</Text>

          {wallets.map((w, idx) => (
            <View key={w._id || idx} style={styles.walletCard}>
              <View style={styles.walletTop}>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletUser}>{w.user?.username || "Unknown"}</Text>
                  <Text style={styles.walletEmail}>{w.user?.email || ""}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: (w.user?.role === "ADMIN" ? "#ef4444" : w.user?.role === "PARTNER" ? "#fbbf24" : COLORS.primary) + "20" }]}>
                  <Text style={[styles.roleBadgeText, { color: w.user?.role === "ADMIN" ? "#ef4444" : w.user?.role === "PARTNER" ? "#fbbf24" : COLORS.primary }]}>
                    {w.user?.role || "USER"}
                  </Text>
                </View>
              </View>

              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceVal, { color: COLORS.success }]}>{formatCurrency(w.available_balance)}</Text>
                  <Text style={styles.balanceLbl}>Available</Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceVal, { color: COLORS.primary }]}>{formatCurrency(w.withdrawable_balance)}</Text>
                  <Text style={styles.balanceLbl}>Withdrawable</Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceVal, { color: "#fbbf24" }]}>{formatCurrency(w.locked_balance)}</Text>
                  <Text style={styles.balanceLbl}>Locked</Text>
                </View>
              </View>

              <View style={styles.walletActions}>
                <TouchableOpacity
                  style={styles.adjustBtn}
                  onPress={() => setAdjustModal({ visible: true, walletId: w._id, username: w.user?.username || "Unknown", type: "CREDIT", amount: "", reason: "" })}
                >
                  <MaterialIcons name="add" size={14} color="white" />
                  <Text style={styles.adjustBtnText}>CREDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adjustBtn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.3)" }]}
                  onPress={() => setAdjustModal({ visible: true, walletId: w._id, username: w.user?.username || "Unknown", type: "DEBIT", amount: "", reason: "" })}
                >
                  <MaterialIcons name="remove" size={14} color="#ef4444" />
                  <Text style={[styles.adjustBtnText, { color: "#ef4444" }]}>DEBIT</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.adjustBtn, { backgroundColor: "rgba(59,130,246,0.15)", borderColor: "rgba(59,130,246,0.3)" }]}
                  onPress={() => navigation.navigate("UserDetail", { userId: w.user?._id })}
                >
                  <MaterialIcons name="person" size={14} color="#3b82f6" />
                  <Text style={[styles.adjustBtnText, { color: "#3b82f6" }]}>VIEW</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {hasMore && wallets.length > 0 && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {!loading && wallets.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="account-balance-wallet" size={48} color="rgba(255,255,255,0.08)" />
              <Text style={styles.emptyText}>No wallets found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Adjust Modal */}
      <Modal visible={adjustModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Balance — {adjustModal.username}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, adjustModal.type === "CREDIT" && styles.typeBtnActive]} onPress={() => setAdjustModal({ ...adjustModal, type: "CREDIT" })}>
                <Text style={[styles.typeBtnText, adjustModal.type === "CREDIT" && { color: "white" }]}>CREDIT (+)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, adjustModal.type === "DEBIT" && styles.typeBtnActiveDebit]} onPress={() => setAdjustModal({ ...adjustModal, type: "DEBIT" })}>
                <Text style={[styles.typeBtnText, adjustModal.type === "DEBIT" && { color: "white" }]}>DEBIT (-)</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Amount" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="numeric" value={adjustModal.amount} onChangeText={(t) => setAdjustModal({ ...adjustModal, amount: t })} />
            <TextInput style={styles.input} placeholder="Reason (optional)" placeholderTextColor="rgba(255,255,255,0.2)" value={adjustModal.reason} onChangeText={(t) => setAdjustModal({ ...adjustModal, reason: t })} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAdjustModal({ ...adjustModal, visible: false })}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: adjustModal.type === "CREDIT" ? COLORS.success : COLORS.error }]} onPress={handleAdjust} disabled={adjusting}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  // Search
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 14 },
  searchInput: { flex: 1, color: "white", fontSize: 14, paddingVertical: 12 },
  searchBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },

  resultCount: { color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "bold", marginBottom: 12, marginLeft: 4 },

  // Wallet Card
  walletCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  walletTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  walletInfo: { flex: 1 },
  walletUser: { color: "white", fontSize: 15, fontWeight: "bold" },
  walletEmail: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: "bold", letterSpacing: 0.5 },

  balanceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  balanceItem: { flex: 1, backgroundColor: "rgba(255,255,255,0.025)", borderRadius: 10, padding: 10, alignItems: "center" },
  balanceVal: { fontSize: 14, fontWeight: "900", marginBottom: 2 },
  balanceLbl: { fontSize: 8, color: "rgba(255,255,255,0.35)" },

  walletActions: { flexDirection: "row", gap: 8 },
  adjustBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" },
  adjustBtnText: { fontSize: 10, fontWeight: "bold", color: COLORS.success },

  loadMoreBtn: { paddingVertical: 20, alignItems: "center" },

  // Empty
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 12 },

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
