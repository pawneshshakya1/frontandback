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
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const AppSettingsScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [editModal, setEditModal] = useState({ visible: false, key: "", label: "", value: "" });
  const { showSuccess, showError, PopupElement } = usePopup();

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/app/version");
      if (res.data.success) {
        const data = res.data.data;
        setSettings({
          android_version: data.android_version || data.platforms?.android?.latestVersion || "",
          ios_version: data.ios_version || data.platforms?.ios?.latestVersion || "",
          min_android_version: data.min_android_version || data.platforms?.android?.minSupportedVersion || "",
          platform_fee: data.platform_fee || 1,
          min_withdrawal: data.min_withdrawal || 100,
          joining_bonus: data.joining_bonus || 0,
          referral_bonus: data.referral_bonus || 0,
        });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      // Set default values on error so screen doesn't break
      setSettings({
        android_version: "",
        ios_version: "",
        min_android_version: "",
        platform_fee: 1,
        min_withdrawal: 100,
        joining_bonus: 0,
        referral_bonus: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVersion = async () => {
    try {
      await api.post("/admin/app/version", { version: editModal.value, platform: editModal.key });
      showSuccess("Success", "App version updated");
      setEditModal({ visible: false, key: "", label: "", value: "" });
      loadSettings();
    } catch (err: any) {
      showError("Error", err.response?.data?.message || "Failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(59,130,246,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* App Version */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>APP VERSION</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => setEditModal({ visible: true, key: "android", label: "Android Version", value: settings?.android_version || "" })}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="android" size={20} color="#22c55e" />
              <Text style={styles.settingText}>Android Version</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings?.android_version || "Not set"}</Text>
              <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.2)" />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={() => setEditModal({ visible: true, key: "ios", label: "iOS Version", value: settings?.ios_version || "" })}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="apple" size={20} color="white" />
              <Text style={styles.settingText}>iOS Version</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings?.ios_version || "Not set"}</Text>
              <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.2)" />
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} onPress={() => setEditModal({ visible: true, key: "min_android", label: "Min Android Version", value: settings?.min_android_version || "" })}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="system-update" size={20} color="#fbbf24" />
              <Text style={styles.settingText}>Min Android Version</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{settings?.min_android_version || "Not set"}</Text>
              <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.2)" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Platform Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PLATFORM INFO</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <MaterialIcons name="android" size={24} color="#22c55e" />
              <Text style={styles.infoVal}>{settings?.android_version || "—"}</Text>
              <Text style={styles.infoLbl}>Android</Text>
            </View>
            <View style={styles.infoBox}>
              <MaterialIcons name="apple" size={24} color="white" />
              <Text style={styles.infoVal}>{settings?.ios_version || "—"}</Text>
              <Text style={styles.infoLbl}>iOS</Text>
            </View>
            <View style={styles.infoBox}>
              <MaterialIcons name="security" size={24} color="#fbbf24" />
              <Text style={styles.infoVal}>{settings?.min_android_version || "—"}</Text>
              <Text style={styles.infoLbl}>Min Android</Text>
            </View>
          </View>
        </View>

        {/* Quick Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PLATFORM SETTINGS</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="payments" size={20} color={COLORS.primary} />
              <Text style={styles.settingText}>Platform Fee (%)</Text>
            </View>
            <Text style={styles.settingValue}>{settings?.platform_fee || "1%"} </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="money" size={20} color={COLORS.success} />
              <Text style={styles.settingText}>Min Withdrawal</Text>
            </View>
            <Text style={styles.settingValue}>₹{settings?.min_withdrawal || 100}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="card-giftcard" size={20} color="#a855f7" />
              <Text style={styles.settingText}>Joining Bonus</Text>
            </View>
            <Text style={styles.settingValue}>₹{settings?.joining_bonus || 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons name="group-add" size={20} color="#3b82f6" />
              <Text style={styles.settingText}>Referral Bonus</Text>
            </View>
            <Text style={styles.settingValue}>₹{settings?.referral_bonus || 0}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Version Modal */}
      <Modal visible={editModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update {editModal.label}</Text>
            <TextInput style={styles.input} placeholder="e.g. 2.1.0" placeholderTextColor="rgba(255,255,255,0.2)" value={editModal.value} onChangeText={(t) => setEditModal({ ...editModal, value: t })} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditModal({ ...editModal, visible: false })}>
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUpdateVersion}>
                <Text style={styles.modalConfirmText}>UPDATE</Text>
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

  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 16 },

  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingText: { color: "white", fontSize: 14, fontWeight: "500" },
  settingRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingValue: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.04)" },

  infoGrid: { flexDirection: "row", gap: 10 },
  infoBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.025)", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  infoVal: { color: "white", fontSize: 14, fontWeight: "bold", marginTop: 6, marginBottom: 2 },
  infoLbl: { color: "rgba(255,255,255,0.35)", fontSize: 10 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 12, color: "white", fontSize: 16 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalCancelText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "bold" },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.primary },
  modalConfirmText: { color: "white", fontSize: 13, fontWeight: "bold" },
});
