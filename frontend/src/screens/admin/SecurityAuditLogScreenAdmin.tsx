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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import { adminAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

const AUDIT_ICONS: Record<string, { icon: string; color: string }> = {
  LOGIN: { icon: "login", color: "#3b82f6" },
  LOGOUT: { icon: "logout", color: "#94a3b8" },
  PASSWORD_CHANGE: { icon: "lock", color: "#fbbf24" },
  PROFILE_UPDATE: { icon: "person", color: COLORS.primary },
  WALLET_ADJUST: { icon: "account-balance-wallet", color: "#22c55e" },
  USER_BLOCK: { icon: "block", color: "#ef4444" },
  USER_UNBLOCK: { icon: "lock-open", color: "#22c55e" },
  MATCH_CREATE: { icon: "add-circle", color: COLORS.primary },
  MATCH_DELETE: { icon: "delete", color: "#ef4444" },
  PAYMENT: { icon: "payment", color: "#22c55e" },
  WITHDRAWAL: { icon: "money-off", color: "#fbbf24" },
  TIER_CHANGE: { icon: "upgrade", color: "#a855f7" },
  SECURITY_ALERT: { icon: "security", color: "#ef4444" },
  FAILED_LOGIN: { icon: "gpp-bad", color: "#ef4444" },
};

export const SecurityAuditLogScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(useCallback(() => { loadAudits(1, false); }, []));

  const loadAudits = async (pageNum: number, append: boolean) => {
    try {
      if (!append) setLoading(true);
      const res = await adminAPI.getSecurityAudits({ page: pageNum, limit: 30 });
      if (res.data.success) {
        const data = res.data.data || [];
        setAudits(append ? [...audits, ...data] : data);
        setHasMore(data.length === 30);
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Error loading audits:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadAudits(1, false); };
  const loadMore = () => { if (hasMore && !loading) loadAudits(page + 1, true); };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(239,68,68,0.08)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Audit Log</Text>
        <View style={{ width: 40 }} />
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
          {audits.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="security" size={48} color="rgba(255,255,255,0.08)" />
              <Text style={styles.emptyText}>No security events yet</Text>
            </View>
          ) : (
            audits.map((audit, idx) => {
              const config = AUDIT_ICONS[audit.action] || { icon: "info", color: COLORS.primary };
              return (
                <View key={audit._id || idx} style={styles.auditCard}>
                  <View style={[styles.auditIcon, { backgroundColor: config.color + "15" }]}>
                    <MaterialIcons name={config.icon as any} size={18} color={config.color} />
                  </View>
                  <View style={styles.auditInfo}>
                    <Text style={styles.auditAction}>{audit.action?.replace(/_/g, " ")}</Text>
                    <Text style={styles.auditDesc} numberOfLines={2}>
                      {typeof audit.description === 'string' 
                        ? audit.description 
                        : typeof audit.details === 'string' 
                          ? audit.details 
                          : audit.description?.action || audit.details?.method || "No details"}
                    </Text>
                    <View style={styles.auditMeta}>
                      <Text style={styles.auditUser}>
                        {typeof audit.user_id === 'object' && audit.user_id !== null
                          ? audit.user_id?.username || 'Unknown'
                          : typeof audit.user_id === 'string'
                            ? audit.user_id
                            : audit.user || "System"}
                      </Text>
                      <Text style={styles.auditTime}>{getTimeAgo(audit.createdAt || audit.timestamp)}</Text>
                    </View>
                  </View>
                  {audit.ip_address && (
                    <View style={styles.ipBadge}>
                      <Text style={styles.ipText}>{audit.ip_address}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
          {hasMore && audits.length > 0 && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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

  auditCard: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 12 },
  auditIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  auditInfo: { flex: 1 },
  auditAction: { color: "white", fontSize: 13, fontWeight: "bold", textTransform: "capitalize", marginBottom: 2 },
  auditDesc: { color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 16, marginBottom: 6 },
  auditMeta: { flexDirection: "row", justifyContent: "space-between" },
  auditUser: { color: COLORS.primary, fontSize: 11, fontWeight: "600" },
  auditTime: { color: "rgba(255,255,255,0.3)", fontSize: 10 },
  ipBadge: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  ipText: { color: "rgba(255,255,255,0.3)", fontSize: 9 },

  loadMoreBtn: { paddingVertical: 20, alignItems: "center" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 12 },
});
