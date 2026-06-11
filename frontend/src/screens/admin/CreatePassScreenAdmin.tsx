import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#f47b25", // orange/primary
  "#8b5cf6", // purple
  "#10b981", // green
  "#ef4444", // red
  "#fbbf24", // yellow/gold
  "#94a3b8", // gray
  "#ec4899", // pink
];

const DEFAULT_USER_TIERS = [
  { pass_type: "pro", label: "PRO", color: "#3b82f6", defaultEvents: 30 },
  { pass_type: "elite", label: "ELITE", color: "#f47b25", defaultEvents: 70 },
  { pass_type: "supreme", label: "SUPREME", color: "#8b5cf6", defaultEvents: 90 },
];

const DEFAULT_PARTNER_TIERS = [
  { pass_type: "standard", label: "STANDARD", color: "#94a3b8", defaultEvents: 10 },
  { pass_type: "sponsored", label: "SPONSORED", color: "#3b82f6", defaultEvents: 30 },
  { pass_type: "premium", label: "PREMIUM", color: "#fbbf24", defaultEvents: 999 },
];

type Category = "user" | "partner";

type PassForm = {
  pass_type: string;
  name: string;
  price: string;
  duration: string;
  eventCount: string;
  commission: string;
  description: string;
  features: string;
  color: string;
  isCustomType: boolean;
};

const EMPTY_FORM: PassForm = {
  pass_type: "",
  name: "",
  price: "",
  duration: "30",
  eventCount: "30",
  commission: "1",
  description: "",
  features: "",
  color: PRESET_COLORS[1],
  isCustomType: false,
};

export const CreatePassScreenAdmin = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const initialCategory: Category = route?.params?.category === "partner" ? "partner" : "user";
  const [category, setCategory] = useState<Category>(initialCategory);
  const [form, setForm] = useState<PassForm>(() => ({
    ...EMPTY_FORM,
    pass_type: initialCategory === "user" ? "pro" : "standard",
  }));
  const [saving, setSaving] = useState(false);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [existingPasses, setExistingPasses] = useState<any[]>([]);
  const [popup, setPopup] = useState({ visible: false, type: "info" as any, title: "", message: "" });

  const defaultTiers = category === "user" ? DEFAULT_USER_TIERS : DEFAULT_PARTNER_TIERS;

  useEffect(() => {
    fetchExistingPasses();
  }, []);

  const fetchExistingPasses = async () => {
    setLoadingPasses(true);
    try {
      const res = await api.get("/elite-pass/admin/all");
      if (res.data.success) {
        setExistingPasses(res.data.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch passes:", e);
    } finally {
      setLoadingPasses(false);
    }
  };

  const getDefaultConfig = (passType: string) => {
    const tier = defaultTiers.find((t) => t.pass_type === passType);
    if (tier) {
      return {
        eventCount: String(tier.defaultEvents),
        color: tier.color,
      };
    }
    return {
      eventCount: "30",
      color: PRESET_COLORS[1],
    };
  };

  const handleCategoryChange = (next: Category) => {
    setCategory(next);
    const defaultType = next === "user" ? "pro" : "standard";
    const config = getDefaultConfig(defaultType);
    setForm({
      ...form,
      pass_type: defaultType,
      eventCount: config.eventCount,
      color: config.color,
      isCustomType: false,
    });
  };

  const handleTierSelect = (passType: string) => {
    const config = getDefaultConfig(passType);
    setForm({
      ...form,
      pass_type: passType,
      eventCount: config.eventCount,
      color: config.color,
      isCustomType: false,
    });
  };

  const handleCustomTypeToggle = () => {
    if (form.isCustomType) {
      const config = getDefaultConfig(defaultTiers[0].pass_type);
      setForm({
        ...form,
        isCustomType: false,
        pass_type: defaultTiers[0].pass_type,
        eventCount: config.eventCount,
        color: config.color,
      });
    } else {
      setForm({
        ...form,
        isCustomType: true,
        pass_type: "",
      });
    }
  };

  const handleSave = async () => {
    const passType = form.pass_type.trim().toLowerCase().replace(/\s+/g, "_");
    if (!passType) {
      setPopup({ visible: true, type: "warning", title: "Pass Type required", message: "Please enter a pass type (e.g., pro, elite, my_custom_pass)." });
      return;
    }
    if (!form.name.trim()) {
      setPopup({ visible: true, type: "warning", title: "Name required", message: "Please enter a pass name." });
      return;
    }
    const priceNum = parseFloat(form.price);
    if (!form.price || isNaN(priceNum) || priceNum <= 0) {
      setPopup({ visible: true, type: "warning", title: "Price required", message: "Please enter a valid price greater than 0." });
      return;
    }
    const durationNum = parseInt(form.duration) || 30;

    const featureList = (form.features || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let payload: any = {
      pass_type: passType,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      duration_days: durationNum,
      color: form.color,
      is_active: true,
      features: featureList,
      benefits: featureList.map((s) => ({ title: s, description: s, icon: "star" })),
      pass_category: category,
    };

    if (category === "user") {
      payload.event_count = parseInt(form.eventCount) || 30;
      payload.winnings_boost = 0;
    } else {
      payload.partner_tier = passType;
      payload.commission_rate = parseFloat(form.commission) || 1;
      payload.max_events_per_month = parseInt(form.eventCount) || 10;
    }

    try {
      setSaving(true);
      const res = await api.post("/elite-pass/admin", payload);
      if (res.data.success) {
        const wasUpdate = (res.data.message || "").toLowerCase().includes("updated");
        setPopup({
          visible: true,
          type: "success",
          title: wasUpdate ? "Pass updated" : "Pass created",
          message: wasUpdate
            ? `${payload.name} has been re-configured.`
            : `${payload.name} is now live for ${category === "user" ? "users" : "partners"}.`,
        });
        setForm({ ...EMPTY_FORM, pass_type: category === "user" ? "pro" : "standard" });
        fetchExistingPasses();
      } else {
        setPopup({ visible: true, type: "error", title: "Failed", message: res.data.message || "Server rejected the pass." });
      }
    } catch (err: any) {
      setPopup({ visible: true, type: "error", title: "Error", message: err.response?.data?.message || "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, category === "user" && { backgroundColor: COLORS.primary + "20", borderColor: COLORS.primary }]}
            onPress={() => handleCategoryChange("user")}
          >
            <MaterialIcons name="workspace-premium" size={20} color={category === "user" ? COLORS.primary : "rgba(255,255,255,0.4)"} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tabTitle, category === "user" && { color: COLORS.primary }]}>Elite Pass</Text>
              <Text style={styles.tabSub}>User Event Passes</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, category === "partner" && { backgroundColor: "#fbbf2420", borderColor: "#fbbf24" }]}
            onPress={() => handleCategoryChange("partner")}
          >
            <MaterialIcons name="handshake" size={20} color={category === "partner" ? "#fbbf24" : "rgba(255,255,255,0.4)"} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tabTitle, category === "partner" && { color: "#fbbf24" }]}>Become a Partner</Text>
              <Text style={styles.tabSub}>Partner Tier Passes</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>PASS TYPE</Text>
          <View style={styles.tierRow}>
            {defaultTiers.map((tier) => {
              const active = form.pass_type === tier.pass_type && !form.isCustomType;
              return (
                <TouchableOpacity
                  key={tier.pass_type}
                  style={[styles.tierBtn, active && { borderColor: tier.color, borderWidth: 2, backgroundColor: tier.color + "10" }]}
                  onPress={() => handleTierSelect(tier.pass_type)}
                >
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <Text style={[styles.tierBtnText, { color: active ? tier.color : "rgba(255,255,255,0.4)" }]}>
                    {tier.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.tierBtn, form.isCustomType && { borderColor: form.color, borderWidth: 2, backgroundColor: form.color + "10" }]}
              onPress={handleCustomTypeToggle}
            >
              <View style={[styles.tierDot, { backgroundColor: form.isCustomType ? form.color : "rgba(255,255,255,0.3)" }]} />
              <Text style={[styles.tierBtnText, { color: form.isCustomType ? form.color : "rgba(255,255,255,0.4)" }]}>
                CUSTOM
              </Text>
            </TouchableOpacity>
          </View>

          {form.isCustomType && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 12 }]}>CUSTOM PASS TYPE (URL-SAFE)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. my_custom_pass"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={form.pass_type}
                onChangeText={(t) => setForm({ ...form, pass_type: t.toLowerCase().replace(/\s+/g, "_") })}
                autoCapitalize="none"
              />
              <Text style={styles.hintText}>Use lowercase letters, numbers, underscores. This is the unique identifier.</Text>
            </>
          )}

          <Text style={styles.sectionLabel}>NAME (DISPLAY)</Text>
          <TextInput
            style={styles.input}
            placeholder={category === "user" ? "e.g. ELITE Pass" : "e.g. Sponsored Partner"}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />

          <Text style={styles.sectionLabel}>COLOR</Text>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorBtn, { backgroundColor: c }, form.color === c && styles.colorBtnActive]}
                onPress={() => setForm({ ...form, color: c })}
              >
                {form.color === c && <MaterialIcons name="check" size={16} color="white" />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>PRICE (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder={category === "user" ? "99" : "1499"}
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(t) => setForm({ ...form, price: t.replace(/[^0-9.]/g, "") })}
          />

          <Text style={styles.sectionLabel}>DURATION (DAYS)</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="numeric"
            value={form.duration}
            onChangeText={(t) => setForm({ ...form, duration: t.replace(/[^0-9]/g, "") })}
          />

          {category === "user" ? (
            <>
              <Text style={styles.sectionLabel}>EVENT COUNT</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                value={form.eventCount}
                onChangeText={(t) => setForm({ ...form, eventCount: t.replace(/[^0-9]/g, "") })}
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>COMMISSION RATE (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="3"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                value={form.commission}
                onChangeText={(t) => setForm({ ...form, commission: t.replace(/[^0-9.]/g, "") })}
              />
              <Text style={styles.sectionLabel}>EVENTS / MONTH</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                value={form.eventCount}
                onChangeText={(t) => setForm({ ...form, eventCount: t.replace(/[^0-9]/g, "") })}
              />
            </>
          )}

          <Text style={styles.sectionLabel}>DESCRIPTION (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            placeholder="Short description shown to users"
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
          />

          <Text style={styles.sectionLabel}>FEATURES (comma separated)</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            placeholder={category === "user" ? "30 Events, Friend Chat, PRO Badge" : "Featured Listing, Analytics, Priority Support"}
            placeholderTextColor="rgba(255,255,255,0.2)"
            multiline
            value={form.features}
            onChangeText={(t) => setForm({ ...form, features: t })}
          />

          {existingPasses.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>EXISTING PASSES</Text>
              <View style={styles.existingPassesList}>
                {existingPasses
                  .filter((p) => p.pass_category === category)
                  .map((p) => (
                    <View key={p._id} style={[styles.existingPassItem, { borderLeftColor: p.color || "#666" }]}>
                      <Text style={styles.existingPassName}>{p.name}</Text>
                      <Text style={styles.existingPassType}>₹{p.price} • {p.event_count || p.duration_days} days</Text>
                    </View>
                  ))}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: form.color }, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialIcons name="check" size={18} color="white" />
              <Text style={styles.saveBtnText}>CREATE PASS</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        confirmText={popup.type === "success" ? "DONE" : "OK"}
        onConfirm={() => {
          setPopup({ visible: false, type: "info", title: "", message: "" });
        }}
        onClose={() => setPopup({ visible: false, type: "info", title: "", message: "" })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  tabRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  tabTitle: { color: "white", fontSize: 13, fontWeight: "900" },
  tabSub: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 },

  formCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "900", color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 12, color: "white", fontSize: 14 },
  hintText: { fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 },

  tierRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tierBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", minWidth: 60 },
  tierDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  tierBtnText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 4 },
  colorBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  colorBtnActive: { borderWidth: 2, borderColor: "white" },

  existingPassesList: { gap: 8 },
  existingPassItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 12, borderLeftWidth: 3, paddingVertical: 8 },
  existingPassName: { color: "white", fontSize: 13, fontWeight: "600" },
  existingPassType: { color: "rgba(255,255,255,0.5)", fontSize: 11 },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  saveBtnText: { color: "white", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
});