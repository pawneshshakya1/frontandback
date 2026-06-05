import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";

const USER_TIERS: Record<string, { color: string; label: string; defaultEvents: number }> = {
  pro: { color: "#3b82f6", label: "PRO", defaultEvents: 30 },
  elite: { color: COLORS.primary, label: "ELITE", defaultEvents: 70 },
  supreme: { color: "#8b5cf6", label: "SUPREME", defaultEvents: 90 },
};

const PARTNER_TIERS: Record<string, { color: string; label: string; defaultCommission: number; defaultEvents: number }> = {
  standard: { color: "#94a3b8", label: "STANDARD", defaultCommission: 1, defaultEvents: 10 },
  sponsored: { color: "#3b82f6", label: "SPONSORED", defaultCommission: 3, defaultEvents: 30 },
  premium: { color: "#fbbf24", label: "PREMIUM", defaultCommission: 5, defaultEvents: 999 },
};

type Category = "user" | "partner";

type PassForm = {
  name: string;
  price: string;
  duration: string;
  tier: string;
  eventCount: string;
  commission: string;
  description: string;
  features: string;
};

const EMPTY_FORM: PassForm = {
  name: "",
  price: "",
  duration: "30",
  tier: "pro",
  eventCount: "30",
  commission: "1",
  description: "",
  features: "",
};

export const CreatePassScreenAdmin = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const initialCategory: Category = route?.params?.category === "partner" ? "partner" : "user";
  const [category, setCategory] = useState<Category>(initialCategory);
  const [form, setForm] = useState<PassForm>(() => ({
    ...EMPTY_FORM,
    tier: initialCategory === "user" ? "pro" : "standard",
    eventCount: initialCategory === "user" ? "30" : "10",
  }));
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState({ visible: false, type: "info" as any, title: "", message: "" });

  const tierMap = category === "user" ? USER_TIERS : PARTNER_TIERS;
  const tierKeys = Object.keys(tierMap);
  const currentTier = tierMap[form.tier] || Object.values(tierMap)[0];

  const handleCategoryChange = (next: Category) => {
    setCategory(next);
    if (next === "user") {
      setForm({ ...form, tier: "pro", eventCount: "30", commission: "1" });
    } else {
      setForm({ ...form, tier: "standard", eventCount: "10", commission: "1" });
    }
  };

  const handleTierChange = (tier: string) => {
    const cfg = tierMap[tier];
    if (!cfg) return;
    if (category === "user") {
      setForm({ ...form, tier, eventCount: String((cfg as any).defaultEvents) });
    } else {
      const pCfg = cfg as typeof PARTNER_TIERS.standard;
      setForm({ ...form, tier, eventCount: String(pCfg.defaultEvents), commission: String(pCfg.defaultCommission) });
    }
  };

  const handleSave = async () => {
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
      pass_type: form.tier,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: priceNum,
      duration_days: durationNum,
      color: currentTier.color,
      is_active: true,
      features: featureList,
      benefits: featureList.map((s) => ({ title: s, description: s, icon: "star" })),
      pass_category: category,
    };

    if (category === "user") {
      payload.event_count = parseInt(form.eventCount) || 30;
      payload.winnings_boost = 0;
    } else {
      payload.partner_tier = form.tier;
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
        setForm(EMPTY_FORM);
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
              <Text style={styles.tabSub}>Pro / Elite / Supreme</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, category === "partner" && { backgroundColor: "#fbbf2420", borderColor: "#fbbf24" }]}
            onPress={() => handleCategoryChange("partner")}
          >
            <MaterialIcons name="handshake" size={20} color={category === "partner" ? "#fbbf24" : "rgba(255,255,255,0.4)"} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tabTitle, category === "partner" && { color: "#fbbf24" }]}>Become a Partner</Text>
              <Text style={styles.tabSub}>Standard / Sponsored / Premium</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>TIER</Text>
          <View style={styles.tierRow}>
            {tierKeys.map((t) => {
              const cfg = tierMap[t];
              const active = form.tier === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tierBtn, active && { borderColor: cfg.color, borderWidth: 2, backgroundColor: cfg.color + "10" }]}
                  onPress={() => handleTierChange(t)}
                >
                  <View style={[styles.tierDot, { backgroundColor: cfg.color }]} />
                  <Text style={[styles.tierBtnText, { color: active ? cfg.color : "rgba(255,255,255,0.4)" }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>NAME</Text>
          <TextInput
            style={styles.input}
            placeholder={category === "user" ? "e.g. ELITE Pass" : "e.g. Sponsored Partner"}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
          />

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
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: currentTier.color }, saving && { opacity: 0.5 }]}
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
          if (popup.type === "success") {
            setForm(EMPTY_FORM);
          }
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

  tierRow: { flexDirection: "row", gap: 8 },
  tierBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tierDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  tierBtnText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  saveBtnText: { color: "white", fontSize: 14, fontWeight: "900", letterSpacing: 1 },
});
