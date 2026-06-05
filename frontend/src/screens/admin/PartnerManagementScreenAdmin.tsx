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
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import api, { partnerAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

const TIER_COLORS: Record<string, string> = { standard: "#94a3b8", sponsored: "#3b82f6", premium: "#fbbf24" };

export const PartnerManagementScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tier change modal
  const [tierModal, setTierModal] = useState({ visible: false, partnerId: "", username: "", currentTier: "", newTier: "" });

  useFocusEffect(useCallback(() => { loadPartners(); }, []));

  const loadPartners = async () => {
    try {
      setLoading(true);
      // Get all users with partner role
      const res = await api.get("/admin/users", { params: { role: "PARTNER", limit: 50 } });
      if (res.data.success) {
        setPartners(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading partners:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadPartners(); };

  const handleChangeTier = async () => {
    if (!tierModal.newTier) {
      Alert.alert("Select Tier", "Please select a tier");
      return;
    }
    try {
      // Use partnerAPI upgradeTier with admin override
      await api.post("/partner/tier/upgrade", { tier: tierModal.newTier, userId: tierModal.partnerId });
      setTierModal({ visible: false, partnerId: "", username: "", currentTier: "", newTier: "" });
      Alert.alert("Success", "Partner tier updated");
      loadPartners();
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update tier");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(251,191,36,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.resultCount}>{partners.length} partners found</Text>

          {partners.map((partner, idx) => (
            <View key={partner._id || idx} style={styles.partnerCard}>
              <View style={styles.partnerTop}>
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{partner.username}</Text>
                  <Text style={styles.partnerEmail}>{partner.email}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.tierBadge, { backgroundColor: (TIER_COLORS[partner.partner_tier] || COLORS.primary) + "20" }]}
                  onPress={() => setTierModal({ visible: true, partnerId: partner._id, username: partner.username, currentTier: partner.partner_tier || "standard", newTier: "" })}
                >
                  <Text style={[styles.tierBadgeText, { color: TIER_COLORS[partner.partner_tier] || COLORS.primary }]}>
                    {(partner.partner_tier || "standard").toUpperCase()}
                  </Text>
                  <MaterialIcons name="edit" size={12} color={TIER_COLORS[partner.partner_tier] || COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.partnerStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: COLORS.primary }]}>{partner.total_events_created || 0}</Text>
                  <Text style={styles.statLbl}>Events</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: COLORS.success }]}>{partner.total_participants || 0}</Text>
                  <Text style={styles.statLbl}>Players</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, { color: "#fbbf24" }]}>{partner.commission_rate || 1}%</Text>
                  <Text style={styles.statLbl}>Commission</Text>
                </View>
              </View>

              <View style={styles.partnerActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate("UserDetail", { userId: partner._id })}>
                  <MaterialIcons name="person" size={14} color={COLORS.primary} />
                  <Text style={styles.actionBtnText}>VIEW</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)" }]}
                  onPress={() => {
                    Alert.alert("Suspend Partner", `Suspend ${partner.username}?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Suspend", style: "destructive", onPress: async () => {
                        try {
                          await api.post(`/admin/users/${partner._id}/block`, { action: "BLOCK", reason: "Suspended by admin" });
                          Alert.alert("Success", "Partner suspended");
                          loadPartners();
                        } catch (err: any) { Alert.alert("Error", err.response?.data?.message || "Failed"); }
                      }},
                    ]);
                  }}
                >
                  <MaterialIcons name="block" size={14} color="#ef4444" />
                  <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>SUSPEND</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {!loading && partners.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="handshake" size={48} color="rgba(255,255,255,0.08)" />
              <Text style={styles.emptyText}>No partners found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Tier Change Modal */}
      <Modal visible={tierModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Tier — {tierModal.username}</Text>
            <Text style={styles.modalCurrent}>Current: {tierModal.currentTier.toUpperCase()}</Text>
            <View style={styles.tierOptions}>
              {(["standard", "sponsored", "premium"] as const).map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[styles.tierOption, tierModal.newTier === tier && { borderColor: TIER_COLORS[tier], borderWidth: 2 }]}
                  onPress={() => setTierModal({ ...tierModal, newTier: tier })}
                >
                  <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[tier] }]} />
                  <Text style={[styles.tierOptionText, { color: TIER_COLORS[tier] }]}>{tier.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setTierModal({ ...tierModal, visible: false })}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleChangeTier}>
                <Text style={styles.modalConfirmText}>UPDATE TIER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  resultCount: { color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "bold", marginBottom: 12, marginLeft: 4 },

  partnerCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  partnerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  partnerInfo: { flex: 1 },
  partnerName: { color: "white", fontSize: 15, fontWeight: "bold" },
  partnerEmail: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tierBadgeText: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },

  partnerStats: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statItem: { flex: 1, backgroundColor: "rgba(255,255,255,0.025)", borderRadius: 10, padding: 10, alignItems: "center" },
  statVal: { fontSize: 16, fontWeight: "900", marginBottom: 2 },
  statLbl: { fontSize: 9, color: "rgba(255,255,255,0.35)" },

  partnerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(244,123,37,0.1)", borderWidth: 1, borderColor: "rgba(244,123,37,0.2)" },
  actionBtnText: { fontSize: 10, fontWeight: "bold", color: COLORS.primary },

  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  modalCurrent: { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginBottom: 20 },
  tierOptions: { flexDirection: "row", gap: 10, marginBottom: 20 },
  tierOption: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tierDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  tierOptionText: { fontSize: 11, fontWeight: "bold", letterSpacing: 0.5 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalCancelText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "bold" },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.primary },
  modalConfirmText: { color: "white", fontSize: 13, fontWeight: "bold" },
});
