import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { notificationAPI } from "../../services/api";
import { COLORS, SPACING, RADIUS } from "../../theme/colors";
import { sseService } from "../../services/sse";
import { useAuth } from "../../context/AuthContext";
import { PopupModal } from "../../components/PopupModal";

// Notification type config
const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  SYSTEM: { icon: "info", color: "#3b82f6" },
  ANNOUNCEMENT: { icon: "campaign", color: "#a855f7" },
  MATCH_UPDATE: { icon: "sports-esports", color: "#22c55e" },
  FRIEND_REQUEST: { icon: "person-add", color: "#3b82f6" },
  FRIEND_EVENT: { icon: "people", color: "#3b82f6" },
  PAYMENT: { icon: "payment", color: "#22c55e" },
  WALLET: { icon: "account-balance-wallet", color: "#f47b25" },
  PASS: { icon: "military-tech", color: "#a855f7" },
  PARTNER_EVENT: { icon: "handshake", color: "#fbbf24" },
  SECURITY: { icon: "shield", color: "#ef4444" },
  SECURITY_ALERT: { icon: "security", color: "#ef4444" },
  REWARD: { icon: "card-giftcard", color: "#22c55e" },
  PROMOTION: { icon: "local-offer", color: "#f47b25" },
};

interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  data: any;
  isRead: boolean;
  createdAt: string;
  sender_id?: { username: string; avatar: string };
}

export const NotificationsScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const initialShowSettings = route?.params?.showSettings || false;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(initialShowSettings);
  const [prefs, setPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState(initialShowSettings);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState({ visible: false, type: "info" as "success" | "error" | "warning" | "info", title: "", message: "" });

  // Load preferences if opened from settings
  useEffect(() => {
    if (initialShowSettings && !prefs) loadPreferences();
  }, []);

  // Fetch notifications from REST API
  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const response = await notificationAPI.getNotifications({ page: pageNum, limit: 20 });
      if (response.data.success) {
        const newNotifications = response.data.data.notifications || [];
        const count = response.data.data.unreadCount || 0;

        if (append) {
          setNotifications(prev => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }
        setUnreadCount(count);
        setHasMore(newNotifications.length === 20);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      fetchNotifications(1, false);
      loadPreferences();
    }, [fetchNotifications])
  );

  const loadPreferences = async () => {
    try {
      const response = await notificationAPI.getPreferences();
      if (response.data.success) setPrefs(response.data.data);
    } catch (error) { console.error("Failed to load preferences:", error); }
    finally { setPrefsLoading(false); }
  };

  const updatePref = async (key: string, value: boolean) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
    setSaving(true);
    try { await notificationAPI.updatePreferences({ [key]: value }); }
    catch (error) { setPrefs({ ...prefs, [key]: !value }); setPopup({ visible: true, type: "error", title: "Save Failed", message: "Could not save preference" }); }
    finally { setSaving(false); }
  };

  // SSE listener for real-time notifications
  useEffect(() => {
    const handleNotification = (event: any) => {
      const newNotif = event.data;
      if (newNotif) {
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleNotificationRead = (event: any) => {
      if (event.data?.unreadCount !== undefined) {
        setUnreadCount(event.data.unreadCount);
      }
    };

    sseService.on("NOTIFICATION", handleNotification);
    sseService.on("NOTIFICATION_READ", handleNotificationRead);

    return () => {
      sseService.off("NOTIFICATION", handleNotification);
      sseService.off("NOTIFICATION_READ", handleNotificationRead);
    };
  }, []);

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchNotifications(1, false);
  };

  // Load more
  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, true);
    }
  };

  // Mark single as read
  const handleNotificationPress = async (item: Notification) => {
    if (!item.isRead) {
      try {
        await notificationAPI.markAsRead(item._id);
        setNotifications(prev =>
          prev.map(n => n._id === item._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // Navigate based on notification type/data
    if (item.data?.match_id) {
      navigation.navigate("MatchDetail", { matchId: item.data.match_id });
    } else if (item.data?.action === "join") {
      navigation.navigate("MatchDetail", { matchId: item.data.match_id });
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Delete notification
  const handleDelete = async (id: string) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  // Get relative time
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // Render notification item
  const renderItem = ({ item }: { item: Notification }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.SYSTEM;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color + "15" }]}>
          <MaterialIcons name={config.icon as any} size={22} color={config.color} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadText]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.time}>{getRelativeTime(item.createdAt)}</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>

          {/* Type badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + "15" }]}>
              <Text style={[styles.typeBadgeText, { color: config.color }]}>
                {item.type.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <MaterialIcons name="notifications-none" size={48} color="rgba(255,255,255,0.15)" />
      </View>
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>You'll see tournament updates, payments, and security alerts here</Text>
    </View>
  );

  // Footer loader
  const renderFooter = () => {
    if (!hasMore || notifications.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{showSettings ? "Notification Settings" : "Notifications"}</Text>
          {!showSettings && unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>

        {!showSettings && unreadCount > 0 && (
          <TouchableOpacity style={styles.markReadButton} onPress={handleMarkAllRead}>
            <MaterialIcons name="done-all" size={20} color={COLORS.primary} />
            <Text style={styles.markReadText}>Read All</Text>
          </TouchableOpacity>
        )}
        {!showSettings && unreadCount === 0 && <View style={{ width: 40 }} />}
      </View>

      {/* Content */}
      {showSettings ? (
        /* ============ SETTINGS VIEW ============ */
        <ScrollView style={styles.settingsScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {prefsLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <>
              {/* Channels */}
              <Text style={styles.sectionTitle}>CHANNELS</Text>
              <View style={styles.settingsCard}>
                <ToggleRow title="Push Notifications" desc="Real-time alerts on your device" value={prefs?.push_enabled ?? true} onToggle={(v) => updatePref("push_enabled", v)} icon="notifications" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Email Notifications" desc="Receive alerts via email" value={prefs?.email_enabled ?? false} onToggle={(v) => updatePref("email_enabled", v)} icon="email" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="In-App Notifications" desc="Show notifications in the app" value={prefs?.in_app_enabled ?? true} onToggle={(v) => updatePref("in_app_enabled", v)} icon="notifications-active" />
              </View>

              {/* Activity */}
              <Text style={styles.sectionTitle}>ACTIVITY</Text>
              <View style={styles.settingsCard}>
                <ToggleRow title="Tournament Updates" desc="Match starts, results, and invites" value={prefs?.tournament_updates ?? true} onToggle={(v) => updatePref("tournament_updates", v)} icon="sports-esports" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Payment Updates" desc="Payment success, failure, and refunds" value={prefs?.payment_updates ?? true} onToggle={(v) => updatePref("payment_updates", v)} icon="payment" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Wallet Updates" desc="Deposits, withdrawals, and prizes" value={prefs?.wallet_updates ?? true} onToggle={(v) => updatePref("wallet_updates", v)} icon="account-balance-wallet" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Friend Activity" desc="Friend requests and updates" value={prefs?.friend_activity ?? true} onToggle={(v) => updatePref("friend_activity", v)} icon="people" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Partner Events" desc="New events from subscribed partners" value={prefs?.partner_events ?? true} onToggle={(v) => updatePref("partner_events", v)} icon="handshake" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Elite Pass" desc="Pass expiry and renewal reminders" value={prefs?.pass_updates ?? true} onToggle={(v) => updatePref("pass_updates", v)} icon="military-tech" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="System Announcements" desc="App updates and maintenance notices" value={prefs?.system_announcements ?? true} onToggle={(v) => updatePref("system_announcements", v)} icon="info" />
              </View>

              {/* Rewards & Security */}
              <Text style={styles.sectionTitle}>REWARDS & SECURITY</Text>
              <View style={styles.settingsCard}>
                <ToggleRow title="Rewards & Promotions" desc="Bonuses, offers, and special deals" value={prefs?.rewards_promotions ?? true} onToggle={(v) => updatePref("rewards_promotions", v)} icon="card-giftcard" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Security Alerts" desc="New logins and account changes (always on)" value={true} onToggle={() => {}} icon="shield" locked />
              </View>

              {/* Email Preferences */}
              <Text style={styles.sectionTitle}>EMAIL PREFERENCES</Text>
              <View style={styles.settingsCard}>
                <ToggleRow title="Payment Emails" desc="Receive payment confirmations via email" value={prefs?.payment_email ?? true} onToggle={(v) => updatePref("payment_email", v)} icon="receipt" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Security Emails" desc="Critical security alerts via email (always on)" value={true} onToggle={() => {}} icon="enhanced-encryption" locked />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Tournament Emails" desc="Tournament updates via email" value={prefs?.tournament_email ?? false} onToggle={(v) => updatePref("tournament_email", v)} icon="email" />
                <View style={styles.settingsDivider} />
                <ToggleRow title="Promotion Emails" desc="Special offers and deals via email" value={prefs?.rewards_email ?? false} onToggle={(v) => updatePref("rewards_email", v)} icon="local-offer" />
              </View>
            </>
          )}
        </ScrollView>
      ) : (
      /* ============ NOTIFICATION LIST ============ */
      loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )
      )}

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
  bgGlowTop: { position: "absolute", top: "-10%", right: "-20%", width: 300, height: 300, backgroundColor: "rgba(244,123,37,0.15)", borderRadius: 150, opacity: 0.5 },
  bgGlowBottom: { position: "absolute", bottom: "10%", left: "-20%", width: 300, height: 300, backgroundColor: "rgba(59,130,246,0.1)", borderRadius: 150, opacity: 0.5 },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", textAlign: "center" },
  unreadBadge: { backgroundColor: COLORS.primary, minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadBadgeText: { color: "white", fontSize: 11, fontWeight: "bold" },
  markReadButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(244,123,37,0.1)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  markReadText: { color: COLORS.primary, fontSize: 11, fontWeight: "bold" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 40 },

  // Notification Item
  itemContainer: { flexDirection: "row", padding: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", alignItems: "flex-start" },
  unreadItem: { borderColor: "rgba(244,123,37,0.2)", backgroundColor: "rgba(244,123,37,0.03)" },
  iconContainer: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  contentContainer: { flex: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 14, color: "rgba(255,255,255,0.9)", flex: 1, marginRight: 8 },
  unreadText: { fontWeight: "bold", color: "white" },
  body: { fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 18, marginBottom: 8 },
  time: { fontSize: 10, color: "rgba(255,255,255,0.3)" },
  badgeRow: { flexDirection: "row", gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: "bold", letterSpacing: 0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4 },
  deleteButton: { padding: 4, marginLeft: 8 },

  // Empty
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 80, gap: 12 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyText: { color: "white", fontSize: 18, fontWeight: "bold" },
  emptySubtext: { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 18, paddingHorizontal: 40 },

  footerLoader: { paddingVertical: 20, alignItems: "center" },

  // Settings
  settingsScroll: { flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 28, marginBottom: 12, marginLeft: 4 },
  settingsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  settingsDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 18 },
  settingsItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  settingsItemLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  settingsIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(244,123,37,0.1)", alignItems: "center", justifyContent: "center" },
  settingsTextContainer: { flex: 1 },
  settingsItemTitle: { color: "white", fontSize: 14, fontWeight: "600" },
  settingsItemDesc: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
});

// ============ TOGGLE ROW COMPONENT ============
const ToggleRow = ({ title, desc, value, onToggle, icon, locked }: { title: string; desc: string; value: boolean; onToggle: (v: boolean) => void; icon: string; locked?: boolean }) => (
  <View style={styles.settingsItem}>
    <View style={styles.settingsItemLeft}>
      <View style={[styles.settingsIconBg, locked && { backgroundColor: "rgba(239,68,68,0.1)" }]}>
        <MaterialIcons name={icon as any} size={20} color={locked ? "#ef4444" : COLORS.primary} />
      </View>
      <View style={styles.settingsTextContainer}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        <Text style={styles.settingsItemDesc}>{desc}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#333", true: COLORS.primary }}
      thumbColor="#fff"
      disabled={locked}
    />
  </View>
);
