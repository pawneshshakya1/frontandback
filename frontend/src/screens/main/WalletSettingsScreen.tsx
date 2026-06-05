import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Switch,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { walletAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PER_TXN_PRESETS = [500, 1000, 2000, 5000, 10000, 25000];
const DAILY_SEND_PRESETS = [2000, 5000, 10000, 25000, 50000, 100000];
const MAX_BALANCE_PRESETS = [10000, 25000, 50000, 100000, 250000, 500000];
const LOW_BALANCE_PRESETS = [50, 100, 250, 500, 1000, 2000];
const PIN_REQUIRED_PRESETS = [0, 500, 1000, 2000, 5000, 10000];

export const WalletSettingsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [customEditing, setCustomEditing] = useState<string | null>(null);
  const [customValue, setCustomValue] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const res = await walletAPI.getSettings();
      if (res.data?.success) {
        setSettings(res.data.data);
        setDraft(res.data.data);
      }
    } catch (err) {
      console.error("[WalletSettings] load error:", err);
      Alert.alert("Error", "Failed to load wallet settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadSettings);
    return unsubscribe;
  }, [navigation, loadSettings]);

  const updateDraft = (key: string, value: any) => {
    setDraft((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        per_transaction_limit: Number(draft.per_transaction_limit) || 0,
        daily_send_limit: Number(draft.daily_send_limit) || 0,
        max_wallet_balance: Number(draft.max_wallet_balance) || 0,
        low_balance_threshold: Number(draft.low_balance_threshold) || 0,
        require_pin_above: Number(draft.require_pin_above) || 0,
        transaction_notifications: !!draft.transaction_notifications,
        low_balance_alerts: !!draft.low_balance_alerts,
        auto_lock_inactive: !!draft.auto_lock_inactive,
        hide_balance_by_default: !!draft.hide_balance_by_default,
      };
      const res = await walletAPI.updateSettings(payload);
      if (res.data?.success) {
        setSettings(res.data.data);
        setDraft(res.data.data);
        setDirty(false);
        Alert.alert("Success", "Wallet settings updated");
      } else {
        Alert.alert("Error", res.data?.message || "Failed to save settings");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(settings);
    setDirty(false);
    setCustomEditing(null);
  };

  const startCustomEdit = (key: string, currentValue: number) => {
    setCustomEditing(key);
    setCustomValue(String(currentValue || 0));
  };

  const commitCustomEdit = () => {
    if (!customEditing) return;
    const num = parseInt(customValue, 10);
    if (isNaN(num) || num < 0) {
      Alert.alert("Invalid", "Please enter a valid non-negative number");
      return;
    }
    updateDraft(customEditing, num);
    setCustomEditing(null);
    setCustomValue("");
  };

  const ChipSelector = ({
    label,
    field,
    presets,
    suffix = "",
    description,
  }: any) => {
    const value = Number(draft?.[field] ?? 0);
    const isCustom = !presets.includes(value);
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionLabel}>{label}</Text>
            {description && (
              <Text style={styles.sectionDesc}>{description}</Text>
            )}
          </View>
          <View style={styles.valuePill}>
            <Text style={styles.valuePillText}>
              {suffix === "PIN" ? (value === 0 ? "OFF" : fmt(value)) : fmt(value)}
            </Text>
          </View>
        </View>
        <View style={styles.chipRow}>
          {presets.map((p: number) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, value === p && styles.chipActive]}
              onPress={() => updateDraft(field, p)}
            >
              <Text
                style={[styles.chipText, value === p && styles.chipTextActive]}
              >
                {suffix === "PIN" && p === 0 ? "OFF" : fmt(p)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, styles.chipCustom, isCustom && styles.chipActive]}
            onPress={() => startCustomEdit(field, value)}
          >
            <Text
              style={[
                styles.chipText,
                isCustom && styles.chipTextActive,
                styles.chipCustomText,
              ]}
            >
              {isCustom ? fmt(value) : "Custom"}
            </Text>
            <MaterialIcons
              name="edit"
              size={12}
              color={isCustom ? "white" : "rgba(255,255,255,0.4)"}
            />
          </TouchableOpacity>
        </View>
        {customEditing === field && (
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              value={customValue}
              onChangeText={setCustomValue}
              keyboardType="numeric"
              placeholder={`Enter ${label.toLowerCase()}`}
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoFocus
            />
            <TouchableOpacity
              style={styles.customConfirm}
              onPress={commitCustomEdit}
            >
              <Text style={styles.customConfirmText}>SET</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customCancel}
              onPress={() => {
                setCustomEditing(null);
                setCustomValue("");
              }}
            >
              <Text style={styles.customCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const ToggleRow = ({
    title,
    description,
    icon,
    iconColor,
    field,
  }: any) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View
          style={[
            styles.toggleIcon,
            { backgroundColor: `${iconColor}20` },
          ]}
        >
          <MaterialIcons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>{title}</Text>
          {description && (
            <Text style={styles.toggleDesc}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        trackColor={{ false: "#333", true: COLORS.primary }}
        thumbColor={draft?.[field] ? "white" : "#f4f3f4"}
        onValueChange={(v) => updateDraft(field, v)}
        value={!!draft?.[field]}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.viewWalletBtn}
          onPress={() => navigation.navigate("MainTabs", { screen: "Wallet" })}
        >
          <View style={styles.viewWalletLeft}>
            <View
              style={[
                styles.viewWalletIcon,
                { backgroundColor: "rgba(244,123,37,0.15)" },
              ]}
            >
              <MaterialIcons
                name="account-balance-wallet"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View>
              <Text style={styles.viewWalletTitle}>View Wallet</Text>
              <Text style={styles.viewWalletSub}>
                Open wallet home · transactions
              </Text>
            </View>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color="rgba(255,255,255,0.4)"
          />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>SEND LIMITS</Text>
        <View style={styles.card}>
          <ChipSelector
            label="Per-Transaction Limit"
            description="Maximum amount allowed in a single send or gift"
            field="per_transaction_limit"
            presets={PER_TXN_PRESETS}
          />
          <View style={styles.divider} />
          <ChipSelector
            label="Daily Send Limit"
            description="Total you can send in a day (gifts + withdrawals)"
            field="daily_send_limit"
            presets={DAILY_SEND_PRESETS}
          />
        </View>

        <Text style={styles.sectionTitle}>WALLET LIMITS</Text>
        <View style={styles.card}>
          <ChipSelector
            label="Maximum Balance"
            description="Auto-reject deposits that would push balance above this"
            field="max_wallet_balance"
            presets={MAX_BALANCE_PRESETS}
          />
          <View style={styles.divider} />
          <ChipSelector
            label="Low Balance Alert"
            description="Get notified when your balance drops below this"
            field="low_balance_threshold"
            presets={LOW_BALANCE_PRESETS}
          />
        </View>

        <Text style={styles.sectionTitle}>SECURITY</Text>
        <View style={styles.card}>
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionLabel}>
                  Require PIN Above Amount
                </Text>
                <Text style={styles.sectionDesc}>
                  Wallet PIN is mandatory for transactions at or above this
                  amount. Set to OFF to require PIN for every send.
                </Text>
              </View>
              <View style={styles.valuePill}>
                <Text style={styles.valuePillText}>
                  {Number(draft?.require_pin_above ?? 0) === 0
                    ? "OFF"
                    : fmt(draft?.require_pin_above)}
                </Text>
              </View>
            </View>
            <View style={styles.chipRow}>
              {PIN_REQUIRED_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    Number(draft?.require_pin_above) === p && styles.chipActive,
                  ]}
                  onPress={() => updateDraft("require_pin_above", p)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      Number(draft?.require_pin_above) === p && styles.chipTextActive,
                    ]}
                  >
                    {p === 0 ? "OFF" : fmt(p)}
                  </Text>
                </TouchableOpacity>
              ))}
              {Number(draft?.require_pin_above) > 0 &&
                !PIN_REQUIRED_PRESETS.includes(
                  Number(draft?.require_pin_above)
                ) && (
                  <TouchableOpacity
                    style={[styles.chip, styles.chipActive]}
                    onPress={() =>
                      startCustomEdit(
                        "require_pin_above",
                        Number(draft?.require_pin_above)
                      )
                    }
                  >
                    <Text style={[styles.chipText, styles.chipTextActive]}>
                      {fmt(draft?.require_pin_above)}
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View
                  style={[
                    styles.toggleIcon,
                    { backgroundColor: "rgba(244,123,37,0.15)" },
                  ]}
                >
                  <MaterialIcons
                    name="lock-reset"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Reset Wallet PIN</Text>
                  <Text style={styles.toggleDesc}>
                    Send OTP to your registered email
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.resetPinAction}
                onPress={() => navigation.navigate("MainTabs", { screen: "Wallet" })}
              >
                <Text style={styles.resetPinText}>GO</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={14}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <ToggleRow
            title="Transaction Notifications"
            description="Get notified for every send, receive, deposit and withdrawal"
            icon="notifications-active"
            iconColor={COLORS.primary}
            field="transaction_notifications"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Low Balance Alerts"
            description="Notify me when balance drops below my threshold"
            icon="warning"
            iconColor="#eab308"
            field="low_balance_alerts"
          />
        </View>

        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          <ToggleRow
            title="Hide Balance by Default"
            description="Balance is masked when you open the wallet"
            icon="visibility-off"
            iconColor="#a855f7"
            field="hide_balance_by_default"
          />
          <View style={styles.divider} />
          <ToggleRow
            title="Auto-Lock When Inactive"
            description="Lock wallet after extended inactivity (PIN to unlock)"
            icon="lock-clock"
            iconColor="#ef4444"
            field="auto_lock_inactive"
          />
        </View>

        <Text style={styles.footerText}>
          Settings are stored securely on your account and apply to every
          device. Limits are enforced on all send / gift / withdrawal
          transactions.
        </Text>
      </ScrollView>

      {dirty && (
        <View
          style={[
            styles.saveBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={handleReset}
            disabled={saving}
          >
            <Text style={styles.discardText}>DISCARD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveText}>SAVE CHANGES</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  centerContent: { justifyContent: "center", alignItems: "center" },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(244,123,37,0.15)",
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  viewWalletBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.25)",
  },
  viewWalletLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  viewWalletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  viewWalletTitle: { color: "white", fontSize: 15, fontWeight: "bold" },
  viewWalletSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  section: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeaderLeft: { flex: 1, paddingRight: 10 },
  sectionLabel: { color: "white", fontSize: 14, fontWeight: "bold" },
  sectionDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  valuePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(244,123,37,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  valuePillText: { color: COLORS.primary, fontSize: 12, fontWeight: "bold" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipActive: {
    backgroundColor: "rgba(244,123,37,0.15)",
    borderColor: "rgba(244,123,37,0.4)",
  },
  chipCustom: { minWidth: 90, justifyContent: "center" },
  chipText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: COLORS.primary, fontWeight: "bold" },
  chipCustomText: { fontSize: 12 },
  customInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  customInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    color: "white",
    fontSize: 14,
  },
  customConfirm: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  customConfirmText: { color: "white", fontSize: 12, fontWeight: "bold" },
  customCancel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
  },
  customCancelText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "bold" },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { flex: 1 },
  toggleTitle: { color: "white", fontSize: 14, fontWeight: "600" },
  toggleDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
    paddingRight: 10,
  },
  resetPinAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(244,123,37,0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  resetPinText: { color: COLORS.primary, fontSize: 11, fontWeight: "bold" },
  footerText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginTop: 24,
    marginHorizontal: 8,
    lineHeight: 18,
  },
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    backgroundColor: "rgba(13,13,13,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  discardBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: { color: "white", fontSize: 13, fontWeight: "bold", letterSpacing: 1 },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "white", fontSize: 13, fontWeight: "bold", letterSpacing: 1 },
});

export default WalletSettingsScreen;
