import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import api, { setAuthToken } from "../../services/api";
import { useAuthStore } from "../../store/useAuthStore";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

interface Benefit {
  title: string;
  description: string;
  icon: string;
}

interface ElitePass {
  _id: string;
  pass_type: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  winnings_boost: number;
  features: string[];
  color: string;
  is_active: boolean;
  is_popular: boolean;
  benefits: Benefit[];
}

export const ElitePassScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm, PopupElement } = usePopup();
  const { token } = useAuthStore();
  const [passes, setPasses] = useState<ElitePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPass, setEditingPass] = useState<ElitePass | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    pass_type: "pro",
    name: "",
    description: "",
    price: "",
    duration_days: "30",
    winnings_boost: "5",
    features: "",
    color: "#f47b25",
    is_popular: false,
  });

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
    fetchPasses();
  }, [token]);

  const fetchPasses = async () => {
    try {
      const response = await api.get('/elite-pass/admin/all');
      if (response.data.success) {
        setPasses(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch passes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedPasses = async () => {
    showConfirm(
      "Seed Passes",
      "This will create default passes (PRO, ELITE, SUPREME). Continue?",
      async () => {
        try {
          await api.post('/elite-pass/admin/seed');
          showSuccess("Success", "Default passes created!");
          fetchPasses();
        } catch (error) {
          showError("Error", "Failed to seed passes");
        }
      },
      "Seed",
    );
  };

  const openCreateModal = () => {
    setEditingPass(null);
    setFormData({
      pass_type: "pro",
      name: "",
      description: "",
      price: "",
      duration_days: "30",
      winnings_boost: "5",
      features: "",
      color: "#f47b25",
      is_popular: false,
    });
    setModalVisible(true);
  };

  const openEditModal = (pass: ElitePass) => {
    setEditingPass(pass);
    setFormData({
      pass_type: pass.pass_type,
      name: pass.name,
      description: pass.description || "",
      price: pass.price.toString(),
      duration_days: pass.duration_days.toString(),
      winnings_boost: pass.winnings_boost.toString(),
      features: pass.features?.join(", ") || "",
      color: pass.color,
      is_popular: pass.is_popular,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.duration_days) {
      showError("Error", "Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        pass_type: formData.pass_type,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_days: parseInt(formData.duration_days),
        winnings_boost: parseInt(formData.winnings_boost),
        features: formData.features.split(",").map(f => f.trim()).filter(f => f),
        color: formData.color,
        is_popular: formData.is_popular,
      };

      if (editingPass) {
        await api.put(`/elite-pass/admin/${editingPass._id}`, payload);
        showSuccess("Success", "Pass updated!");
      } else {
        await api.post('/elite-pass/admin', payload);
        showSuccess("Success", "Pass created!");
      }

      setModalVisible(false);
      fetchPasses();
    } catch (error: any) {
      showError("Error", error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (pass: ElitePass) => {
    showConfirm(
      "Delete Pass",
      `Are you sure you want to delete ${pass.name}?`,
      async () => {
        try {
          await api.delete(`/elite-pass/admin/${pass._id}`);
          showSuccess("Success", "Pass deleted!");
          fetchPasses();
        } catch (error) {
          showError("Error", "Failed to delete pass");
        }
      },
      "Delete",
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Elite Pass Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f47b25" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Elite Pass Management</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 24 }}>
          <LinearGradient colors={["#f47b25", "#8b5cf6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <MaterialIcons name="admin-panel-settings" size={48} color="white" style={{ opacity: 0.9 }} />
            <Text style={styles.heroTitle}>MANAGE PASSES</Text>
            <Text style={styles.heroSubtitle}>Create and manage Elite Pass plans for your users</Text>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
              <MaterialIcons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>CREATE PASS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedButton} onPress={handleSeedPasses}>
              <MaterialIcons name="autorenew" size={20} color="#f47b25" />
              <Text style={styles.seedButtonText}>SEED DEFAULTS</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>ACTIVE PASSES</Text>

          {passes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="info-outline" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyText}>No passes created</Text>
              <Text style={styles.emptySubtext}>Create a pass or seed defaults to get started</Text>
            </View>
          ) : (
            passes.map((pass) => (
              <View key={pass._id} style={[styles.passCard, { borderColor: pass.color }]}>
                <View style={styles.passHeader}>
                  <View>
                    <Text style={[styles.passName, { color: pass.color }]}>{pass.name}</Text>
                    <Text style={styles.passType}>{pass.pass_type.toUpperCase()}</Text>
                  </View>
                  <View style={styles.passActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(pass)}>
                      <MaterialIcons name="edit" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(pass)}>
                      <MaterialIcons name="delete" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.passDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>PRICE</Text>
                    <Text style={styles.detailValue}>₹{pass.price}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>DURATION</Text>
                    <Text style={styles.detailValue}>{pass.duration_days} days</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>BOOST</Text>
                    <Text style={styles.detailValue}>{pass.winnings_boost}%</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>STATUS</Text>
                    <Text style={[styles.detailValue, { color: pass.is_active ? "#22c55e" : "#ef4444" }]}>
                      {pass.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>

                {pass.features && pass.features.length > 0 && (
                  <View style={styles.featuresSection}>
                    <Text style={styles.featuresLabel}>FEATURES:</Text>
                    <View style={styles.featuresList}>
                      {pass.features.map((feature, idx) => (
                        <View key={idx} style={styles.featureTag}>
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPass ? "EDIT PASS" : "CREATE PASS"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.inputLabel}>PASS TYPE</Text>
              <View style={styles.typeSelector}>
                {["pro", "elite", "supreme"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, formData.pass_type === type && styles.typeBtnActive]}
                    onPress={() => setFormData({ ...formData, pass_type: type })}
                  >
                    <Text style={[styles.typeBtnText, formData.pass_type === type && styles.typeBtnTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>NAME *</Text>
              <TextInput style={styles.input} value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} placeholder="Pass Name" placeholderTextColor="#666" />

              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput style={[styles.input, { height: 60 }]} value={formData.description} onChangeText={(v) => setFormData({ ...formData, description: v })} placeholder="Description" placeholderTextColor="#666" multiline />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>PRICE (₹) *</Text>
                  <TextInput style={styles.input} value={formData.price} onChangeText={(v) => setFormData({ ...formData, price: v })} placeholder="99" placeholderTextColor="#666" keyboardType="numeric" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>DURATION (DAYS) *</Text>
                  <TextInput style={styles.input} value={formData.duration_days} onChangeText={(v) => setFormData({ ...formData, duration_days: v })} placeholder="30" placeholderTextColor="#666" keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>WINNINGS BOOST (%)</Text>
                  <TextInput style={styles.input} value={formData.winnings_boost} onChangeText={(v) => setFormData({ ...formData, winnings_boost: v })} placeholder="5" placeholderTextColor="#666" keyboardType="numeric" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>COLOR</Text>
                  <TextInput style={styles.input} value={formData.color} onChangeText={(v) => setFormData({ ...formData, color: v })} placeholder="#f47b25" placeholderTextColor="#666" />
                </View>
              </View>

              <Text style={styles.inputLabel}>FEATURES (comma separated)</Text>
              <TextInput style={[styles.input, { height: 60 }]} value={formData.features} onChangeText={(v) => setFormData({ ...formData, features: v })} placeholder="Feature 1, Feature 2, Feature 3" placeholderTextColor="#666" multiline />

              <TouchableOpacity style={styles.popularToggle} onPress={() => setFormData({ ...formData, is_popular: !formData.is_popular })}>
                <MaterialIcons name={formData.is_popular ? "check-box" : "check-box-outline-blank"} size={24} color="#f47b25" />
                <Text style={styles.popularToggleText}>Mark as Popular</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingPass ? "UPDATE PASS" : "CREATE PASS"}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <PopupElement />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
  scrollView: { flex: 1 },
  heroCard: { height: 160, borderRadius: 24, padding: 24, alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  heroTitle: { color: "white", fontSize: 22, fontWeight: "900", fontStyle: "italic", letterSpacing: 2, textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, textAlign: "center", lineHeight: 18 },
  content: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 12, marginBottom: 20, marginLeft: 4 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  addButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f47b25", paddingVertical: 14, borderRadius: 12 },
  addButtonText: { color: "white", fontSize: 12, fontWeight: "900" },
  seedButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  seedButtonText: { color: "#f47b25", fontSize: 12, fontWeight: "900" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubtext: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 },
  passCard: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  passHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  passName: { fontSize: 18, fontWeight: "bold" },
  passType: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  passActions: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  passDetails: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  detailItem: { minWidth: (width - 80) / 2 },
  detailLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "bold", letterSpacing: 1 },
  detailValue: { color: "white", fontSize: 14, fontWeight: "bold", marginTop: 2 },
  featuresSection: { marginTop: 8 },
  featuresLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginBottom: 8 },
  featuresList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureTag: { backgroundColor: "rgba(244,123,37,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  featureText: { color: "#f47b25", fontSize: 11 },
  bgGlowTop: { position: "absolute", top: "-10%", right: "-20%", width: 300, height: 300, backgroundColor: "rgba(244,123,37,0.15)", borderRadius: 150, opacity: 0.5 },
  bgGlowBottom: { position: "absolute", bottom: "-10%", left: "-20%", width: 300, height: 300, backgroundColor: "rgba(37,99,235,0.1)", borderRadius: 150, opacity: 0.5 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1a1a1a", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  inputLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: "#0d0d0d", borderRadius: 12, padding: 14, color: "white", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  row: { flexDirection: "row" },
  typeSelector: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#0d0d0d", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  typeBtnActive: { backgroundColor: "#f47b25", borderColor: "#f47b25" },
  typeBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "bold" },
  typeBtnTextActive: { color: "white" },
  popularToggle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  popularToggleText: { color: "white", fontSize: 14 },
  saveButton: { backgroundColor: "#f47b25", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 24, marginBottom: 40 },
  saveButtonText: { color: "white", fontSize: 14, fontWeight: "900" },
});