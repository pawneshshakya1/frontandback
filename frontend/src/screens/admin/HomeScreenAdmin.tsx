import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { adminAPI } from "../../services/api";
import { sseService } from "../../services/sse";
import { COLORS } from "../../theme/colors";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import {
  QuickActionsGrid,
  QuickAction,
} from "../../components/QuickActionsGrid";
import { InfoCard } from "../../components/InfoCard";
import { StatCard } from "../../components/StatCard";
import { GlassCard } from "../../components/GlassCard";
import PieChart from "react-native-pie-chart";
import { RoleBadge } from "../../components/RoleBadge";

const { width } = Dimensions.get("window");

export const HomeScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<
    "REVENUE" | "USER GROWTH" | "PARTICIPATION"
  >("REVENUE");
  const [stats, setStats] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [liveActiveUsers, setLiveActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAdminData = useCallback(async () => {
    try {
      const [statsRes, matchesRes, txRes, weeklyRes] = await Promise.allSettled(
        [
          adminAPI.getStats(),
          adminAPI.getMatches(),
          adminAPI.getTransactions(),
          adminAPI.getWeeklyPerformance(),
        ],
      );

      if (statsRes.status === "fulfilled")
        setStats(statsRes.value.data.data || null);
      if (weeklyRes.status === "fulfilled")
        setWeekly(weeklyRes.value.data.data || null);

      if (matchesRes.status === "fulfilled") {
        const allMatches = matchesRes.value.data.data || [];
        const upcomingMatches = allMatches.filter(
          (m: any) => m.status === "OPEN",
        );
        setUpcoming(upcomingMatches.slice(0, 2));
      }

      if (txRes.status === "fulfilled") {
        const transactions = txRes.value.data.data || [];
        const recentPayouts = transactions
          .filter((t: any) => t.type === "WITHDRAW" || t.status === "PENDING")
          .slice(0, 2);
        setPayouts(recentPayouts);
      }
    } catch (e: any) {
      console.error("Dashboard load error:", e);
    }
  }, []);

  useEffect(() => {
    loadAdminData().finally(() => setLoading(false));
  }, [loadAdminData]);

  useEffect(() => {
    const handleActive = (data: any) => setLiveActiveUsers(data.active || 0);
    const handleMatchUpdate = () => loadAdminData();
    sseService.on("ACTIVE_USERS_UPDATE", handleActive);
    sseService.on("MATCH_UPDATE", handleMatchUpdate);
    return () => {
      sseService.off("ACTIVE_USERS_UPDATE", handleActive);
      sseService.off("MATCH_UPDATE", handleMatchUpdate);
    };
  }, [loadAdminData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  };

  const totalUsers = stats?.totalUsers ?? 0;
  const totalMatches = stats?.totalMatches ?? 0;
  const activeMatches = stats?.activeMatches ?? 0;
  const totalWalletBalance = stats?.totalWalletBalance ?? 0;
  const participationPct =
    totalMatches > 0 ? Math.round((activeMatches / totalMatches) * 100) : 0;
  const formatMoney = (val: number) => `₹ ${Number(val).toLocaleString()}`;

  const labels = weekly?.labels || [
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
    "SUN",
  ];
  const series = weekly?.series || {
    revenue: [],
    userGrowth: [],
    participation: [],
  };
  const trend = weekly?.trends || {
    revenuePct: 0,
    userGrowthPct: 0,
    participationPct: 0,
  };

  const activeSeries =
    activeTab === "REVENUE"
      ? series.revenue
      : activeTab === "USER GROWTH"
        ? series.userGrowth
        : series.participation;
  const maxVal = Math.max(1, ...(activeSeries || [1]));
  const trendValue =
    activeTab === "REVENUE"
      ? trend.revenuePct
      : activeTab === "USER GROWTH"
        ? trend.userGrowthPct
        : trend.participationPct;

  const adminActions: QuickAction[] = [
    {
      id: "create",
      label: "New Event",
      icon: "add-task",
      iconColor: COLORS.primary,
      iconBg: "rgba(244,123,37,0.1)",
      onPress: () => navigation.navigate("CreateMatch"),
    },
    {
      id: "payouts",
      label: "Payouts",
      icon: "payments",
      iconColor: COLORS.success,
      iconBg: "rgba(34,197,94,0.1)",
      onPress: () => navigation.navigate("PaymentDashboard"),
    },
    {
      id: "users",
      label: "Users",
      icon: "people",
      iconColor: "#3b82f6",
      iconBg: "rgba(59,130,246,0.1)",
      onPress: () => navigation.navigate("UsersList"),
    },
    {
      id: "wallets",
      label: "Wallets",
      icon: "account-balance-wallet",
      iconColor: "#3b82f6",
      iconBg: "rgba(59,130,246,0.1)",
      onPress: () => navigation.navigate("WalletManagement"),
    },
    {
      id: "partners",
      label: "Partners",
      icon: "handshake",
      iconColor: "#fbbf24",
      iconBg: "rgba(251,191,36,0.1)",
      onPress: () => navigation.navigate("PartnerManagement"),
    },
    {
      id: "mediator",
      label: "Mediator",
      icon: "gavel",
      iconColor: "#a855f7",
      iconBg: "rgba(168,85,247,0.1)",
      onPress: () => navigation.navigate("MediatorApproval"),
    },
    {
      id: "promo",
      label: "Promo",
      icon: "campaign",
      iconColor: "#ef4444",
      iconBg: "rgba(239,68,68,0.1)",
      onPress: () => navigation.navigate("PromoBanner"),
    },
    {
      id: "push",
      label: "Push",
      icon: "send",
      iconColor: "#3b82f6",
      iconBg: "rgba(59,130,246,0.1)",
      onPress: () => navigation.navigate("PushNotification"),
    },
    {
      id: "audit",
      label: "Audit",
      icon: "security",
      iconColor: "#ef4444",
      iconBg: "rgba(239,68,68,0.1)",
      onPress: () => navigation.navigate("SecurityAuditLog"),
    },
    {
      id: "spending",
      label: "Spending",
      icon: "analytics",
      iconColor: "#a855f7",
      iconBg: "rgba(168,85,247,0.1)",
      onPress: () => navigation.navigate("UserSpending"),
    },
    {
      id: "passes",
      label: "Passes",
      icon: "military-tech",
      iconColor: COLORS.primary,
      iconBg: "rgba(244,123,37,0.1)",
      onPress: () => navigation.navigate("ElitePassManagement"),
    },
    {
      id: "settings",
      label: "App Settings",
      icon: "settings",
      iconColor: COLORS.textSecondary,
      iconBg: "rgba(148,163,184,0.1)",
      onPress: () => navigation.navigate("AppSettings"),
    },
  ];

  if (loading) {
    return (
      <SafeScreen role="ADMIN">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen role="ADMIN" disableBottomSafeArea>
      <View style={styles.backgroundBlobs}>
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
            colors={["#ef4444"]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <RoleBadge role="ADMIN" label="Admin · Command Center" />
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {liveActiveUsers} live · {totalUsers.toLocaleString()} total users
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => navigation.navigate("NotificationsAdmin")}
          >
            <MaterialIcons
              name="admin-panel-settings"
              size={22}
              color="#ef4444"
            />
            {liveActiveUsers > 0 && (
              <View style={styles.liveDot}>
                <View style={styles.liveDotInner} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Performance Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <LinearGradient
            colors={[COLORS.surface, COLORS.backgroundDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.performanceCard}
          >
            <View style={styles.pillContainer}>
              {(["REVENUE", "USER GROWTH", "PARTICIPATION"] as const).map(
                (tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={
                      activeTab === tab
                        ? styles.pillActive
                        : styles.pillInactive
                    }
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text
                      style={
                        activeTab === tab
                          ? styles.pillTextActive
                          : styles.pillTextInactive
                      }
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <View style={styles.revenueHeader}>
              <View>
                <Text style={styles.cardLabel}>WEEKLY PERFORMANCE</Text>
                <View style={styles.revenueAmountWrapper}>
                  <Text style={styles.revenueAmount}>
                    {activeTab === "REVENUE"
                      ? formatMoney(totalWalletBalance)
                      : activeTab === "USER GROWTH"
                        ? totalUsers
                        : `${participationPct}%`}
                    {activeTab === "REVENUE" && (
                      <Text style={styles.revenueDecimals}>.00</Text>
                    )}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      trendValue >= 0
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(239,68,68,0.1)",
                  },
                ]}
              >
                <MaterialIcons
                  name={trendValue >= 0 ? "trending-up" : "trending-down"}
                  size={12}
                  color={trendValue >= 0 ? COLORS.success : COLORS.error}
                />
                <Text
                  style={[
                    styles.trendText,
                    { color: trendValue >= 0 ? COLORS.success : COLORS.error },
                  ]}
                >
                  {trendValue >= 0 ? "+" : ""}
                  {trendValue}%
                </Text>
              </View>
            </View>

            {/* Bar chart */}
            <View style={styles.chartContainer}>
              {(activeSeries && activeSeries.length > 0
                ? activeSeries
                : [0, 0, 0, 0, 0, 0, 0]
              ).map((val: number, idx: number) => {
                const heightVal = Math.max(8, Math.round((val / maxVal) * 100));
                const isPeak = val === maxVal;
                return (
                  <View
                    key={`bar-${idx}`}
                    style={[
                      styles.chartBar,
                      {
                        height: heightVal,
                        backgroundColor: isPeak
                          ? "#ef4444"
                          : "rgba(239,68,68,0.4)",
                        shadowColor: isPeak ? "#ef4444" : undefined,
                        shadowRadius: isPeak ? 8 : 0,
                        shadowOpacity: isPeak ? 0.5 : 0,
                      },
                    ]}
                  />
                );
              })}
            </View>

            <View style={styles.daysRow}>
              {labels.map((day: string, index: number) => (
                <View key={`${day}-${index}`} style={styles.dayItem}>
                  <Text
                    style={[
                      styles.dayText,
                      index === labels.length - 1 && styles.activeDayText,
                    ]}
                  >
                    {day.length > 3
                      ? new Date(day)
                          .toLocaleDateString("en-US", { weekday: "short" })
                          .toUpperCase()
                      : day}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* KPI Stat Cards */}
        <View style={styles.kpiRow}>
          <StatCard
            icon="people"
            iconColor={COLORS.success}
            value={(stats?.activeUsers ?? 0).toLocaleString()}
            label="Active Users"
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon="sports-esports"
            iconColor="#3b82f6"
            value={(stats?.totalMatches ?? 0).toLocaleString()}
            label="Total Matches"
          />
        </View>

        {/* Quick Management */}
        <SectionHeader
          title="Quick Management"
          accentColor="#ef4444"
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />
        <QuickActionsGrid actions={adminActions} />

        {/* Passes — Create Elite Pass + Become Partner */}
        <SectionHeader
          title="Passes"
          accentColor={COLORS.primary}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <GlassCard
            tag="User Pass"
            tagColor={COLORS.primary}
            subtitle="Event-based membership"
            title="Create Elite Pass"
            description="Pro / Elite / Supreme — set price, duration, and event count. Friends chat, host events, priority access."
            icon="workspace-premium"
            iconColor={COLORS.primary}
            gradient={["rgba(244,123,37,0.25)", "rgba(234,88,12,0.15)"]}
            onAction={() => navigation.navigate("CreatePass", { category: "user" })}
            onPress={() => navigation.navigate("CreatePass", { category: "user" })}
          >
            <View style={styles.passStatRow}>
              <View style={styles.passStatItem}>
                <MaterialIcons name="event" size={12} color={COLORS.primary} />
                <Text style={styles.passStatText}>Event-based</Text>
              </View>
              <View style={styles.passStatDivider} />
              <View style={styles.passStatItem}>
                <MaterialIcons name="group" size={12} color={COLORS.primary} />
                <Text style={styles.passStatText}>Friend Chat</Text>
              </View>
              <View style={styles.passStatDivider} />
              <View style={styles.passStatItem}>
                <MaterialIcons name="flash-on" size={12} color={COLORS.primary} />
                <Text style={styles.passStatText}>Priority</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard
            tag="Partner Tier"
            tagColor="#fbbf24"
            subtitle="Recurring partner membership"
            title="Create Become a Partner"
            description="Standard / Sponsored / Premium — commission rate, events/month, sponsor slots, analytics access."
            icon="handshake"
            iconColor="#fbbf24"
            gradient={["rgba(251,191,36,0.25)", "rgba(217,119,6,0.15)"]}
            onAction={() => navigation.navigate("CreatePass", { category: "partner" })}
            onPress={() => navigation.navigate("CreatePass", { category: "partner" })}
          >
            <View style={styles.passStatRow}>
              <View style={styles.passStatItem}>
                <MaterialIcons name="percent" size={12} color="#fbbf24" />
                <Text style={[styles.passStatText, { color: "#fbbf24" }]}>Commission</Text>
              </View>
              <View style={[styles.passStatDivider, { backgroundColor: "rgba(251,191,36,0.2)" }]} />
              <View style={styles.passStatItem}>
                <MaterialIcons name="event" size={12} color="#fbbf24" />
                <Text style={[styles.passStatText, { color: "#fbbf24" }]}>Events/mo</Text>
              </View>
              <View style={[styles.passStatDivider, { backgroundColor: "rgba(251,191,36,0.2)" }]} />
              <View style={styles.passStatItem}>
                <MaterialIcons name="workspace-premium" size={12} color="#fbbf24" />
                <Text style={[styles.passStatText, { color: "#fbbf24" }]}>Premium Perks</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* User Analytics */}
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>USER ANALYTICS</Text>
              <Text style={styles.liveSyncText}>LIVE SYNC</Text>
            </View>
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              {(() => {
                const activeCount = liveActiveUsers || 0;
                const inactiveCount =
                  Math.max(0, totalUsers - activeCount) || 0;
                const totalCount = activeCount + inactiveCount;
                let activePercent = 0;
                let pieSeries: { value: number; color: string }[] = [];
                if (totalCount > 0) {
                  activePercent = Math.round((activeCount / totalCount) * 100);
                  pieSeries = [
                    { value: activeCount, color: "#ef4444" },
                    { value: inactiveCount, color: COLORS.textMuted },
                  ].filter((x) => x.value > 0);
                }
                if (pieSeries.length === 0) {
                  pieSeries = [{ value: 1, color: `${COLORS.textMuted}20` }];
                }
                return (
                  <>
                    <PieChart widthAndHeight={150} series={pieSeries} />
                    <View
                      style={{
                        position: "absolute",
                        alignItems: "center",
                        top: 70,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ef4444",
                          fontSize: 24,
                          fontWeight: "900",
                          fontStyle: "italic",
                        }}
                      >
                        {activePercent}%
                      </Text>
                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontSize: 9,
                          textTransform: "uppercase",
                        }}
                      >
                        Active
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", gap: 16, marginTop: 12 }}
                    >
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: "#ef4444" },
                          ]}
                        />
                        <Text style={styles.legendText}>
                          Active ({activePercent}%)
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: COLORS.textMuted },
                          ]}
                        />
                        <Text style={styles.legendText}>
                          Inactive ({100 - activePercent}%)
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          </View>
        </View>

        {/* Upcoming Events */}
        <SectionHeader
          title="Upcoming Events"
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {upcoming.length > 0 ? (
            upcoming.map((m, idx) => (
              <InfoCard
                key={m._id || idx}
                icon="sports-esports"
                iconColor={idx % 2 === 0 ? COLORS.primary : COLORS.accentBlue}
                title={m.title}
                subtitle={`REGISTRATION OPEN · ₹ ${Number(m.prize_pool || 0).toLocaleString()}`}
                rightValue={m.status}
                showChevron
                onPress={() =>
                  navigation.navigate("MatchDetail", { matchId: m._id })
                }
              />
            ))
          ) : (
            <InfoCard
              icon="event-busy"
              title="No upcoming events"
              subtitle="Create one to populate this list."
              showChevron
              onPress={() => navigation.navigate("CreateMatch")}
            />
          )}
        </View>

        {/* Pending Approvals */}
        <SectionHeader
          title="Pending Approvals"
          actionLabel="View All"
          onActionPress={() => navigation.navigate("MediatorApproval")}
          accentColor={COLORS.warning}
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="gavel"
            iconColor="#a855f7"
            title="Mediator Applications"
            subtitle="3 new applications awaiting review"
            rightValue="3"
            variant="warning"
            showChevron
            onPress={() => navigation.navigate("MediatorApproval")}
          />
          <InfoCard
            icon="event-busy"
            iconColor={COLORS.error}
            title="Pending Withdrawals"
            subtitle="Review and approve user withdrawals"
            rightValue={`${payouts.length}`}
            variant="danger"
            showChevron
            onPress={() => navigation.navigate("PaymentDashboard")}
          />
        </View>

        {/* Recent Payouts */}
        <SectionHeader
          title="Recent Payouts"
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {payouts.length > 0 ? (
            payouts.map((p, idx) => {
              const name =
                typeof p.user_id === "object"
                  ? p.user_id?.username || p.user_id?.email || "Unknown"
                  : typeof p.user_id === "string"
                    ? p.user_id
                    : "Unknown";
              return (
                <InfoCard
                  key={p._id || idx}
                  icon="account-circle"
                  title={name}
                  subtitle={`${p.type || "WITHDRAW"} · ${p.status || "PENDING"}`}
                  rightValue={`₹ ${Number(p.amount || 0).toLocaleString()}`}
                  rightLabel={p.status || "PENDING"}
                  variant={p.status === "APPROVED" ? "success" : "warning"}
                  showChevron
                  onPress={() =>
                    Alert.alert(
                      "Approve Payout",
                      `Approve payout of ₹${Number(p.amount || 0).toLocaleString()} for ${name}?`,
                    )
                  }
                />
              );
            })
          ) : (
            <InfoCard
              icon="check-circle"
              iconColor={COLORS.success}
              title="All caught up"
              subtitle="No pending payouts at the moment"
              variant="success"
            />
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  backgroundBlobs: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: -1,
  },
  blobTop: {
    position: "absolute",
    top: "-5%",
    right: "-10%",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(239,68,68,0.15)",
    opacity: 0.6,
  },
  blobBottom: {
    position: "absolute",
    bottom: "20%",
    left: "-20%",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(59,130,246,0.1)",
    opacity: 0.6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "white",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  liveDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  performanceCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(2,6,23,0.4)",
    padding: 4,
    borderRadius: 100,
    marginBottom: 20,
  },
  pillActive: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    borderRadius: 100,
    alignItems: "center",
  },
  pillInactive: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  pillTextActive: {
    fontSize: 9,
    fontWeight: "900",
    color: "white",
    letterSpacing: 0.8,
  },
  pillTextInactive: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  revenueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  revenueAmountWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  revenueAmount: {
    fontSize: 26,
    fontWeight: "900",
    fontStyle: "italic",
    color: COLORS.textLight,
  },
  revenueDecimals: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "900",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  chartBar: {
    flex: 1,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 6,
    paddingHorizontal: 4,
  },
  dayItem: {
    flex: 1,
    alignItems: "center",
  },
  dayText: {
    fontSize: 8,
    fontWeight: "700",
    color: "rgba(255,255,255,0.2)",
  },
  activeDayText: {
    color: "#ef4444",
    fontWeight: "900",
  },
  kpiRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: COLORS.textMuted,
  },
  liveSyncText: {
    fontSize: 9,
    fontWeight: "900",
    color: COLORS.success,
    letterSpacing: 0.5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  passStatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  passStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  passStatText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  passStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(244,123,37,0.2)",
  },
});

export default HomeScreenAdmin;
