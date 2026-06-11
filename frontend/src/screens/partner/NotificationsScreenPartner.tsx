import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from "../../theme/colors";
import { notificationAPI } from "../../services/api";
import { PopupModal } from "../../components/PopupModal";

export const NotificationsScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);

  // Popup state
  const [popup, setPopup] = useState({ visible: false, type: "info" as "success" | "error" | "warning" | "info", title: "", message: "" });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await notificationAPI.getPreferences();
      if (response.data.success) {
        setPrefs(response.data.data);
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePref = async (key: string, value: boolean) => {
    if (!prefs) return;

    // Optimistic update
    setPrefs({ ...prefs, [key]: value });
    setSaving(true);

    try {
      await notificationAPI.updatePreferences({ [key]: value });
    } catch (error) {
      // Revert on error
      setPrefs({ ...prefs, [key]: !value });
      setPopup({ visible: true, type: "error", title: "Save Failed", message: "Could not save notification preference" });
      console.error("Failed to update preference:", error);
    } finally {
      setSaving(false);
    }
  };

  const ToggleItem = ({ title, desc, value, onValueChange, icon, locked }: any) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, locked && { backgroundColor: "rgba(239,68,68,0.1)" }]}>
          <MaterialIcons name={icon} size={20} color={locked ? "#ef4444" : COLORS.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemDesc}>{desc}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#333", true: COLORS.primary }}
        thumbColor="#fff"
        disabled={locked}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {saving && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        {!saving && <View style={{ width: 40 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Channel Settings */}
        <Text style={styles.sectionTitle}>CHANNELS</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Push Notifications"
            desc="Real-time alerts on your device"
            value={prefs?.push_enabled ?? true}
            onValueChange={(v: boolean) => updatePref("push_enabled", v)}
            icon="notifications"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Email Notifications"
            desc="Receive alerts via email"
            value={prefs?.email_enabled ?? false}
            onValueChange={(v: boolean) => updatePref("email_enabled", v)}
            icon="email"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="In-App Notifications"
            desc="Show notifications in the app"
            value={prefs?.in_app_enabled ?? true}
            onValueChange={(v: boolean) => updatePref("in_app_enabled", v)}
            icon="notifications-active"
          />
        </View>

        {/* Activity Types */}
        <Text style={styles.sectionTitle}>ACTIVITY</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Tournament Updates"
            desc="Match starts, results, and invites"
            value={prefs?.tournament_updates ?? true}
            onValueChange={(v: boolean) => updatePref("tournament_updates", v)}
            icon="sports-esports"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Payment Updates"
            desc="Payment success, failure, and refunds"
            value={prefs?.payment_updates ?? true}
            onValueChange={(v: boolean) => updatePref("payment_updates", v)}
            icon="payment"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Wallet Updates"
            desc="Deposits, withdrawals, and prizes"
            value={prefs?.wallet_updates ?? true}
            onValueChange={(v: boolean) => updatePref("wallet_updates", v)}
            icon="account-balance-wallet"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Friend Activity"
            desc="Friend requests and updates"
            value={prefs?.friend_activity ?? true}
            onValueChange={(v: boolean) => updatePref("friend_activity", v)}
            icon="people"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Partner Events"
            desc="New events from subscribed partners"
            value={prefs?.partner_events ?? true}
            onValueChange={(v: boolean) => updatePref("partner_events", v)}
            icon="handshake"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Elite Pass"
            desc="Pass expiry and renewal reminders"
            value={prefs?.pass_updates ?? true}
            onValueChange={(v: boolean) => updatePref("pass_updates", v)}
            icon="military-tech"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="System Announcements"
            desc="App updates and maintenance notices"
            value={prefs?.system_announcements ?? true}
            onValueChange={(v: boolean) => updatePref("system_announcements", v)}
            icon="info"
          />
        </View>

        {/* Rewards & Security */}
        <Text style={styles.sectionTitle}>REWARDS & SECURITY</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Rewards & Promotions"
            desc="Bonuses, offers, and special deals"
            value={prefs?.rewards_promotions ?? true}
            onValueChange={(v: boolean) => updatePref("rewards_promotions", v)}
            icon="card-giftcard"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Security Alerts"
            desc="New logins and account changes (always on)"
            value={true}
            onValueChange={() => {}}
            icon="shield"
            locked={true}
          />
        </View>

        {/* Email Preferences */}
        <Text style={styles.sectionTitle}>EMAIL PREFERENCES</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Payment Emails"
            desc="Receive payment confirmations via email"
            value={prefs?.payment_email ?? true}
            onValueChange={(v: boolean) => updatePref("payment_email", v)}
            icon="receipt"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Security Emails"
            desc="Critical security alerts via email (always on)"
            value={true}
            onValueChange={() => {}}
            icon="enhanced-encryption"
            locked={true}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Tournament Emails"
            desc="Tournament updates via email"
            value={prefs?.tournament_email ?? false}
            onValueChange={(v: boolean) => updatePref("tournament_email", v)}
            icon="email"
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Promotion Emails"
            desc="Special offers and deals via email"
            value={prefs?.rewards_email ?? false}
            onValueChange={(v: boolean) => updatePref("rewards_email", v)}
            icon="local-offer"
          />
        </View>
      </ScrollView>

      {/* Popup */}
      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlowTop: { position: "absolute", top: "-10%", right: "-20%", width: 300, height: 300, backgroundColor: "rgba(244,123,37,0.15)", borderRadius: 150, opacity: 0.5 },
  bgGlowBottom: { position: "absolute", bottom: "-10%", left: "-20%", width: 300, height: 300, backgroundColor: "rgba(37,99,235,0.1)", borderRadius: 150, opacity: 0.5 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },

  scrollView: { flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 28, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", overflow: "hidden" },

  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(244,123,37,0.1)", alignItems: "center", justifyContent: "center" },
  textContainer: { flex: 1 },
  itemTitle: { color: "white", fontSize: 14, fontWeight: "600" },
  itemDesc: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 18 },
});
