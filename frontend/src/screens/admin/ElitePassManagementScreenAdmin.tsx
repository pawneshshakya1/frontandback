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
  Modal,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

const TIER_UI: Record<string, { color: string; label: string }> = {
  pro: { color: "#94a3b8", label: "PRO" },
  elite: { color: "#f47b25", label: "ELITE" },
  supreme: { color: "#fbbf24", label: "SUPREME" },
};

export const ElitePassManagementScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm, PopupElement } = usePopup();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create/Edit modal
  const [modal, setModal] = useState({ visible: false, editId: "", name: "", price: "", duration: "", tier: "pro", benefits: "" });

  useFocusEffect(useCallback(() => { loadPasses(); }, []));

  const loadPasses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/elite-pass/admin/all");
      if (res.data.success) setPasses(res.data.data || []);
    } catch (err) {
      console.error("Error loading passes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadPasses(); };

  const handleSave = async () => {
    if (!modal.name || !modal.price) {
      showError("Required", "Name and price are required");
      return;
    }
    try {
      const featureList = (modal.benefits || "")
        .split(",")
        .map((b: string) => b.trim())
        .filter(Boolean);

      const payload = {
        name: modal.name,
        price: parseFloat(modal.price),
        duration_days: parseInt(modal.duration) || 30,
        tier: modal.tier,
        features: featureList,
        benefits: featureList.map((s) => ({ title: s, description: s, icon: "star" })),
      };

      if (modal.editId) {
        await api.put(`/elite-pass/admin/${modal.editId}`, payload);
        showSuccess("Success", "Pass updated");
      } else {
        await api.post("/elite-pass/admin", payload);
        showSuccess("Success", "Pass created");
      }
      setModal({ visible: false, editId: "", name: "", price: "", duration: "", tier: "pro", benefits: "" });
      loadPasses();
    } catch (err: any) {
      showError("Error", err.response?.data?.message || "Failed");
    }
  };

  const handleDelete = (id: string, name: string) => {
    showConfirm("Delete Pass", `Delete "${name}"?`, async () => {
      try {
        await api.delete(`/elite-pass/admin/${id}`);
        showSuccess("Deleted", "Pass removed");
        loadPasses();
      } catch (err: any) {
        showError("Error", err.response?.data?.message || "Failed");
      }
    }, "Delete");
  };

  const handleSeedDefaults = async () => {
    showConfirm("Seed Default Passes", "Create default Pro, Elite, and Supreme passes?", async () => {
      try {
        await api.post("/elite-pass/admin/seed");
        showSuccess("Success", "Default passes created");
        loadPasses();
      } catch (err: any) {
        showError("Error", err.response?.data?.message || "Failed");
      }
    }, "Seed");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(244,123,37,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Elite Passes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal({ visible: true, editId: "", name: "", price: "", duration: "30", tier: "pro", benefits: "" })}>
          <MaterialIcons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Seed Defaults Button */}
          {passes.length === 0 && (
            <TouchableOpacity style={styles.seedBtn} onPress={handleSeedDefaults}>
              <MaterialIcons name="auto-fix-high" size={20} color={COLORS.primary} />
              <Text style={styles.seedBtnText}>SEED DEFAULT PASSES</Text>
            </TouchableOpacity>
          )}

          {passes.map((pass, idx) => {
            const tier = TIER_UI[pass.tier] || TIER_UI.pro;
            return (
              <View key={pass._id || idx} style={styles.passCard}>
                <View style={styles.passTop}>
                  <View style={[styles.passIcon, { backgroundColor: tier.color + "20" }]}>
                    <MaterialIcons name="military-tech" size={24} color={tier.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passName}>{pass.name}</Text>
                    <Text style={[styles.passTier, { color: tier.color }]}>{tier.label}</Text>
                  </View>
                  <Text style={styles.passPrice}>₹{pass.price}</Text>
                </View>

                <View style={styles.passDetails}>
                  <View style={styles.passDetailItem}>
                    <MaterialIcons name="schedule" size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.passDetailText}>{pass.duration_days || 30} days</Text>
                  </View>
                  <View style={styles.passDetailItem}>
                    <MaterialIcons name="check-circle" size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.passDetailText}>{pass.benefits?.length || 0} benefits</Text>
                  </View>
                  <View style={[styles.passStatus, { backgroundColor: pass.is_active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                    <Text style={[styles.passStatusText, { color: pass.is_active ? COLORS.success : COLORS.error }]}>
                      {pass.is_active ? "ACTIVE" : "INACTIVE"}
                    </Text>
                  </View>
                </View>

                <View style={styles.passActions}>
                  <TouchableOpacity
                    style={styles.passActionBtn}
                    onPress={() => setModal({ visible: true, editId: pass._id, name: pass.name, price: String(pass.price), duration: String(pass.duration_days || 30), tier: pass.tier || "pro", benefits: (pass.benefits || []).join(", ") })}
                  >
                    <MaterialIcons name="edit" size={14} color={COLORS.primary} />
                    <Text style={[styles.passActionText, { color: COLORS.primary }]}>EDIT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.passActionBtn, { backgroundColor: "rgba(239,68,68,0.1)" }]} onPress={() => handleDelete(pass._id, pass.name)}>
                    <MaterialIcons name="delete" size={14} color="#ef4444" />
                    <Text style={[styles.passActionText, { color: "#ef4444" }]}>DELETE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {!loading && passes.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="military-tech" size={48} color="rgba(255,255,255,0.08)" />
              <Text style={styles.emptyText}>No passes created yet</Text>
              <Text style={styles.emptySubtext}>Create passes or seed defaults to get started</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modal.editId ? "Edit Pass" : "Create Pass"}</Text>

            <Text style={styles.inputLabel}>NAME</Text>
            <TextInput style={styles.input} placeholder="Pass name" placeholderTextColor="rgba(255,255,255,0.2)" value={modal.name} onChangeText={(t) => setModal({ ...modal, name: t })} />

            <Text style={styles.inputLabel}>PRICE (₹)</Text>
            <TextInput style={styles.input} placeholder="999" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="numeric" value={modal.price} onChangeText={(t) => setModal({ ...modal, price: t })} />

            <Text style={styles.inputLabel}>DURATION (DAYS)</Text>
            <TextInput style={styles.input} placeholder="30" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="numeric" value={modal.duration} onChangeText={(t) => setModal({ ...modal, duration: t })} />

            <Text style={styles.inputLabel}>TIER</Text>
            <View style={styles.tierRow}>
              {(["pro", "elite", "supreme"] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.tierBtn, modal.tier === t && { borderColor: TIER_UI[t].color, borderWidth: 2 }]} onPress={() => setModal({ ...modal, tier: t })}>
                  <Text style={[styles.tierBtnText, { color: modal.tier === t ? TIER_UI[t].color : "rgba(255,255,255,0.4)" }]}>{TIER_UI[t].label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>BENEFITS (comma separated)</Text>
            <TextInput style={styles.input} placeholder="Extra kills, Priority queue, ..." placeholderTextColor="rgba(255,255,255,0.2)" value={modal.benefits} onChangeText={(t) => setModal({ ...modal, benefits: t })} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal({ ...modal, visible: false })}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSave}>
                <Text style={styles.modalConfirmText}>{modal.editId ? "UPDATE" : "CREATE"}</Text>
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
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },

  seedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(244,123,37,0.3)", borderStyle: "dashed" },
  seedBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: "bold", letterSpacing: 1 },

  passCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  passTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  passIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  passName: { color: "white", fontSize: 16, fontWeight: "bold" },
  passTier: { fontSize: 11, fontWeight: "bold", marginTop: 2 },
  passPrice: { color: COLORS.primary, fontSize: 20, fontWeight: "900" },

  passDetails: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 },
  passDetailItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  passDetailText: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  passStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: "auto" },
  passStatusText: { fontSize: 9, fontWeight: "bold", letterSpacing: 0.5 },

  passActions: { flexDirection: "row", gap: 8 },
  passActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(244,123,37,0.1)", borderWidth: 1, borderColor: "rgba(244,123,37,0.2)" },
  passActionText: { fontSize: 10, fontWeight: "bold" },

  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "white", fontSize: 16, fontWeight: "bold", marginTop: 12 },
  emptySubtext: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4, textAlign: "center" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", maxHeight: "80%" },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  inputLabel: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 12, color: "white", fontSize: 14 },
  tierRow: { flexDirection: "row", gap: 8 },
  tierBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tierBtnText: { fontSize: 11, fontWeight: "bold" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalCancelText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "bold" },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.primary },
  modalConfirmText: { color: "white", fontSize: 13, fontWeight: "bold" },
});
