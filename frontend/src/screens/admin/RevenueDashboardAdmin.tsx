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
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { paymentAPI, analyticsAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

export const RevenueDashboardAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revenue, setRevenue] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [revRes, statsRes, paymentsRes] = await Promise.allSettled([
        analyticsAPI.getSystemRevenue(),
        paymentAPI.getAdminStats(),
        paymentAPI.getAdminPayments({ limit: 10 }),
      ]);

      if (revRes.status === "fulfilled" && revRes.value.data.success) {
        setRevenue(revRes.value.data.data);
      }
      if (statsRes.status === "fulfilled" && statsRes.value.data.success) {
        setStats(statsRes.value.data.data);
      }
      if (paymentsRes.status === "fulfilled" && paymentsRes.value.data.success) {
        setRecentPayments(paymentsRes.value.data.data.payments || []);
      }
    } catch (err) {
      console.error("Error loading revenue data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Revenue</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Glows */}
      <View style={[styles.bgGlow, { backgroundColor: "rgba(34,197,94,0.1)", top: -60, right: -80 }]} />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(244,123,37,0.08)", bottom: 200, left: -100 }]} />

      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revenue Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Overview Cards */}
        <View style={styles.heroCard}>
          <LinearGradient colors={["#059669", "#047857"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
            <View style={styles.heroGlow} />
            <Text style={styles.heroLabel}>TOTAL REVENUE</Text>
            <Text style={styles.heroValue}>{formatCurrency(revenue?.platform_revenue || 0)}</Text>
            <Text style={styles.heroSub}>Platform earnings from entry fees & passes</Text>
          </LinearGradient>
        </View>

        {/* Time-based Revenue */}
        <View style={styles.timeRow}>
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>TODAY</Text>
            <Text style={[styles.timeValue, { color: COLORS.success }]}>{formatCurrency(stats?.todayRevenue || 0)}</Text>
          </View>
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>THIS WEEK</Text>
            <Text style={[styles.timeValue, { color: COLORS.info }]}>{formatCurrency(stats?.weekRevenue || 0)}</Text>
          </View>
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>THIS MONTH</Text>
            <Text style={[styles.timeValue, { color: COLORS.primary }]}>{formatCurrency(stats?.monthRevenue || 0)}</Text>
          </View>
        </View>

        {/* Revenue Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>REVENUE BREAKDOWN</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: COLORS.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownLabel}>Total Deposits</Text>
                <Text style={[styles.breakdownValue, { color: COLORS.success }]}>{formatCurrency(revenue?.total_deposits || 0)}</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: COLORS.error }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownLabel}>Total Withdrawals</Text>
                <Text style={[styles.breakdownValue, { color: COLORS.error }]}>{formatCurrency(revenue?.total_withdrawals || 0)}</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: COLORS.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownLabel}>Entry Fees Collected</Text>
                <Text style={[styles.breakdownValue, { color: COLORS.primary }]}>{formatCurrency(revenue?.total_entry_fees || 0)}</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: "#a855f7" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownLabel}>Prizes Distributed</Text>
                <Text style={[styles.breakdownValue, { color: "#a855f7" }]}>{formatCurrency(revenue?.total_prizes_distributed || 0)}</Text>
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: "#fbbf24" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownLabel}>Pass Revenue</Text>
                <Text style={[styles.breakdownValue, { color: "#fbbf24" }]}>{formatCurrency(revenue?.total_pass_revenue || 0)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PAYMENT STATS</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: COLORS.success }]}>{stats?.successRate || 0}%</Text>
              <Text style={styles.statLbl}>Success Rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: COLORS.error }]}>{stats?.failedPayments || 0}</Text>
              <Text style={styles.statLbl}>Failed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: COLORS.primary }]}>{stats?.walletDeposits || 0}</Text>
              <Text style={styles.statLbl}>Wallet Txns</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: COLORS.info }]}>{stats?.cashfreePayments || 0}</Text>
              <Text style={styles.statLbl}>Gateway Txns</Text>
            </View>
          </View>

          {/* Pending Withdrawals */}
          {stats?.pendingWithdrawals?.count > 0 && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingLeft}>
                <MaterialIcons name="pending-actions" size={20} color="#fbbf24" />
                <View>
                  <Text style={styles.pendingTitle}>Pending Withdrawals</Text>
                  <Text style={styles.pendingCount}>{stats.pendingWithdrawals.count} requests</Text>
                </View>
              </View>
              <Text style={styles.pendingAmount}>{formatCurrency(stats.pendingWithdrawals.totalAmount || 0)}</Text>
            </View>
          )}
        </View>

        {/* Method Breakdown */}
        {stats?.methodBreakdown?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PAYMENT METHODS</Text>
            {stats.methodBreakdown.map((method: any, idx: number) => (
              <View key={idx} style={[styles.methodRow, idx < stats.methodBreakdown.length - 1 && styles.methodDivider]}>
                <View style={styles.methodLeft}>
                  <MaterialIcons name={method._id?.includes("CASHFREE") ? "credit-card" : "account-balance-wallet"} size={18} color={COLORS.primary} />
                  <Text style={styles.methodName}>{method._id || "Unknown"}</Text>
                </View>
                <View style={styles.methodRight}>
                  <Text style={styles.methodCount}>{method.count} txns</Text>
                  <Text style={styles.methodAmount}>{formatCurrency(method.total || 0)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RECENT TRANSACTIONS</Text>
          {recentPayments.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={40} color="rgba(255,255,255,0.08)" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            recentPayments.slice(0, 8).map((payment: any, idx: number) => (
              <View key={idx} style={[styles.txnRow, idx < 7 && styles.txnDivider]}>
                <View style={styles.txnLeft}>
                  <View style={[styles.txnIcon, { backgroundColor: payment.status === "SUCCESS" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }]}>
                    <MaterialIcons
                      name={payment.status === "SUCCESS" ? "check-circle" : "cancel"}
                      size={16}
                      color={payment.status === "SUCCESS" ? COLORS.success : COLORS.error}
                    />
                  </View>
                  <View>
                    <Text style={styles.txnUser}>
                      {typeof payment.user_id === 'object' 
                        ? payment.user_id?.username || "Unknown"
                        : typeof payment.user_id === 'string'
                          ? payment.user_id
                          : "Unknown"}
                    </Text>
                    <Text style={styles.txnType}>{payment.type} • {typeof payment.method === 'string' ? payment.method : payment.method?.name || "N/A"}</Text>
                  </View>
                </View>
                <View style={styles.txnRight}>
                  <Text style={[styles.txnAmount, { color: payment.status === "SUCCESS" ? COLORS.success : COLORS.error }]}>
                    {payment.status === "SUCCESS" ? "+" : "-"}₹{payment.amount?.toLocaleString("en-IN") || 0}
                  </Text>
                  <Text style={styles.txnStatus}>{payment.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.5 },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  // Hero Card
  heroCard: { paddingHorizontal: 16, marginBottom: 16 },
  heroGradient: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  heroGlow: { position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.1)" },
  heroLabel: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.6)", letterSpacing: 1.5, marginBottom: 4 },
  heroValue: { fontSize: 36, fontWeight: "900", color: "white", marginBottom: 4 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.5)" },

  // Time Row
  timeRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  timeCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", alignItems: "center" },
  timeLabel: { fontSize: 9, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 6 },
  timeValue: { fontSize: 16, fontWeight: "900" },

  // Cards
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 16 },

  // Breakdown
  breakdownRow: { gap: 0 },
  breakdownItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 2 },
  breakdownValue: { fontSize: 16, fontWeight: "bold" },

  // Stats
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.025)", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },
  statVal: { fontSize: 18, fontWeight: "900", marginBottom: 4 },
  statLbl: { fontSize: 9, color: "rgba(255,255,255,0.4)", textAlign: "center" },

  // Pending
  pendingCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(251,191,36,0.08)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)" },
  pendingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  pendingTitle: { color: "white", fontSize: 13, fontWeight: "bold" },
  pendingCount: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  pendingAmount: { color: "#fbbf24", fontSize: 16, fontWeight: "bold" },

  // Methods
  methodRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  methodDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  methodName: { color: "white", fontSize: 13, fontWeight: "600" },
  methodRight: { alignItems: "flex-end" },
  methodCount: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginBottom: 2 },
  methodAmount: { color: COLORS.primary, fontSize: 14, fontWeight: "bold" },

  // Transactions
  txnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  txnDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  txnLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  txnIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  txnUser: { color: "white", fontSize: 13, fontWeight: "600" },
  txnType: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 },
  txnRight: { alignItems: "flex-end" },
  txnAmount: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  txnStatus: { fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: "bold", textTransform: "uppercase" },

  // Empty
  emptyState: { alignItems: "center", padding: 24 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 },
});
