import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import api, { partnerAPI, notificationAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { LoadingOverlay } from "../../components/LoadingOverlay";
import { useAuth } from "../../context/AuthContext";
import { usePopup } from "../../components/PopupModal";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import {
  QuickActionsGrid,
  QuickAction,
} from "../../components/QuickActionsGrid";
import { InfoCard } from "../../components/InfoCard";
import { GlassCard } from "../../components/GlassCard";
import { EmptyState } from "../../components/EmptyState";
import { BannerCarousel } from "../../components/BannerCarousel";
import { FeaturedEventsCarousel } from "../../components/FeaturedEventsCarousel";
import { sseService } from "../../services/sse";

const { width } = Dimensions.get("window");

const FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAwQWNaaBgdOXGVmuHX-vDdsW0B_K4GoKl2GcFXoCxPWPrQZ_yNXFZOV5TpsZC00vfqBOwhnsWVfPwodPRTwwgaukeSR6KstNxSN-kB2RD5o5ZN4Dtx6LRX9NuHKTTC52i8O1H4FEh0YIB2T81bmY0Gty3tZzDUJ_8kNaBqKGtXSoHDqmcZ8rBcGZ4mAEb-uJpfHgfiwd-2a7KZ8XkgHuZp6x3V_wCKtwO3E9IZoW6fvj41ubixnkcdl0NX9KIaqM0_5TRfzNgtXEQ";

const PARTNER_TIER_CONFIG: Record<
  string,
  {
    name: string;
    color: string;
    glow: string | null;
    icon: any;
    gradient: readonly [string, string];
  }
> = {
  standard: {
    name: "STANDARD",
    color: "#94a3b8",
    glow: null,
    icon: "shield",
    gradient: ["#64748b", "#475569"] as const,
  },
  sponsored: {
    name: "SPONSORED",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.3)",
    icon: "campaign",
    gradient: ["#3b82f6", "#2563eb"] as const,
  },
  premium: {
    name: "PREMIUM",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.3)",
    icon: "workspace-premium",
    gradient: ["#fbbf24", "#f59e0b"] as const,
  },
};

export const HomeScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const { showError, PopupElement } = usePopup();

  const [matches, setMatches] = useState<any[]>([]);
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isMediator, setIsMediator] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalMatches: 0, totalWinnings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [partnerTier, setPartnerTier] = useState<string>("standard");
  const [tierInfo, setTierInfo] = useState<any>(null);

  const getTierInfo = () => {
    return PARTNER_TIER_CONFIG[partnerTier] || PARTNER_TIER_CONFIG.standard;
  };

  const currentTier = getTierInfo();

  const loadInitialData = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") setHasLocationPermission(true);

      const [dashboardRes, bannersRes, profileRes, tierRes, mediatorRes] =
        await Promise.allSettled([
          partnerAPI.getDashboard(),
          api.get("/banners"),
          partnerAPI.getProfile().catch(() => ({ data: { data: null } })),
          partnerAPI.getTierInfo().catch(() => ({ data: { data: null } })),
          api
            .get("/matches/mediator/check")
            .catch(() => ({ data: { isMediator: false } })),
        ]);

      if (dashboardRes.status === "fulfilled" && dashboardRes.value.data.data) {
        const { stats } = dashboardRes.value.data.data;
        const events = dashboardRes.value.data.data.events || [];
        setStats({
          totalMatches: stats.total_events || 0,
          totalWinnings: stats.total_revenue || 0,
        });
        const sorted = [...events].sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setMatches(sorted);
        setFeaturedMatches(
          sorted.filter((e: any) => e.isPublished).slice(0, 10),
        );
      }
      if (bannersRes.status === "fulfilled")
        setBanners(bannersRes.value.data.data || []);
      if (profileRes.status === "fulfilled")
        setUserProfile(profileRes.value.data.data);
      if (tierRes.status === "fulfilled" && tierRes.value.data.data) {
        setTierInfo(tierRes.value.data.data);
        setPartnerTier(tierRes.value.data.data.current_tier || "standard");
      }
      if (mediatorRes.status === "fulfilled")
        setIsMediator(mediatorRes.value.data.isMediator);
    } catch (err) {
      console.error("load error", err);
      showError("Error", "Failed to load data");
    }
  }, [showError]);

  useEffect(() => {
    loadInitialData().finally(() => setLoading(false));
  }, [loadInitialData]);

  useEffect(() => {
    const handleBannerUpdate = async () => {
      try {
        const res = await api.get("/banners");
        setBanners(res.data.data || []);
      } catch (e) { }
    };
    const handleMatchUpdate = () => loadInitialData();
    sseService.on("BANNER_UPDATE", handleBannerUpdate);
    sseService.on("MATCH_UPDATE", handleMatchUpdate);
    return () => {
      sseService.off("BANNER_UPDATE", handleBannerUpdate);
      sseService.off("MATCH_UPDATE", handleMatchUpdate);
    };
  }, [loadInitialData]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationAPI.getUnreadCount();
        if (res.data?.success || res.data?.count !== undefined) {
          setUnreadCount(res.data.data?.unreadCount || res.data.count || 0);
        }
      } catch (e) { }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  const quickActions: QuickAction[] = [
    {
      id: "create",
      label: "Create",
      icon: "add-circle",
      iconColor: COLORS.primary,
      iconBg: "rgba(244,123,37,0.1)",
      onPress: () => navigation.navigate("CreateMatch"),
    },
    {
      id: "myevents",
      label: "My Events",
      icon: "event-note",
      iconColor: "#a855f7",
      iconBg: "rgba(168,85,247,0.1)",
      onPress: () => navigation.navigate("MyEvents"),
    },
    {
      id: "join",
      label: "Join Room",
      icon: "login",
      iconColor: "#eab308",
      iconBg: "rgba(234,179,8,0.1)",
      onPress: () => navigation.navigate("JoinRoomScreen"),
    },
    {
      id: "upload",
      label: "Upload SS",
      icon: "cloud-upload",
      iconColor: COLORS.accentBlue,
      iconBg: "rgba(37,99,235,0.1)",
      onPress: () => navigation.navigate("UploadScreenshot"),
    },
  ];

  if (isMediator) {
    quickActions.push({
      id: "mediator",
      label: "Mediator",
      icon: "gavel",
      iconColor: "#ef4444",
      iconBg: "rgba(220, 38, 38, 0.1)",
      onPress: () => navigation.navigate("MediatorDashboard"),
    });
  }

  const renderMatch = (item: any) => {
    const isOpen = item.status === "OPEN";
    const isFull = (item.participants?.length || 0) >= item.max_players;
    return (
      <TouchableOpacity
        key={item._id}
        onPress={() =>
          navigation.navigate("MatchDetail", { matchId: item._id })
        }
        style={styles.matchRow}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.banner_url || FALLBACK_IMAGE }}
          style={styles.matchThumb}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor: isOpen
                    ? "rgba(244,123,37,0.2)"
                    : "rgba(234,88,12,0.2)",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isOpen ? COLORS.primary : "#ea580c" },
                ]}
              >
                {item.status || "OPEN"}
              </Text>
            </View>
          </View>
          <Text style={styles.matchRowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.matchRowStats}>
            <View>
              <Text style={styles.rowStatLabel}>ENTRY</Text>
              <Text style={[styles.rowStatValue, { color: COLORS.primary }]}>
                ₹{item.entry_fee}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View>
              <Text style={styles.rowStatLabel}>PRIZE</Text>
              <Text style={styles.rowStatValue}>₹{item.prize_pool}</Text>
            </View>
            <View style={styles.rowRating}>
              <MaterialIcons name="people" size={10} color="#fbbf24" />
              <Text style={styles.rowRatingText}>
                {item.participants?.length || 0}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.joinButton,
            {
              backgroundColor:
                isOpen && !isFull ? COLORS.primary : "rgba(255,255,255,0.1)",
            },
          ]}
        >
          <Text
            style={[
              styles.joinButtonText,
              (!isOpen || isFull) && { opacity: 0.4 },
            ]}
          >
            {isOpen ? (isFull ? "FULL" : "JOIN") : "CLOSED"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeScreen role="PARTNER">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTier.color} />
          <Text style={styles.loadingText}>Loading partner hub...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen role="PARTNER" disableBottomSafeArea>
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTier.color}
            colors={[currentTier.color]}
          />
        }
      >
        {/* Header — same pattern as User HomeScreen */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatarContainer,
                currentTier.glow
                  ? {
                    borderColor: currentTier.color,
                    shadowColor: currentTier.color,
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                  }
                  : null,
              ]}
            >
              {userProfile?.avatar_url || authData?.user?.avatar_url ? (
                <Image
                  source={{
                    uri: userProfile?.avatar_url || authData?.user?.avatar_url,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <LinearGradient
                  colors={currentTier.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarFallback}
                >
                  <Text style={styles.avatarInitials}>
                    {(userProfile?.username ||
                      userProfile?.business_name ||
                      authData?.user?.username ||
                      authData?.user?.email ||
                      "P")[0]?.toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View
                style={[
                  styles.avatarRing,
                  currentTier.glow
                    ? { borderColor: `${currentTier.color}60` }
                    : null,
                ]}
              />
              {isMediator && (
                <View style={styles.mediatorDot}>
                  <MaterialIcons name="gavel" size={8} color="white" />
                </View>
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.usernameText} numberOfLines={1}>
                {userProfile?.business_name ||
                  userProfile?.username ||
                  authData?.user?.username ||
                  "Partner"}
              </Text>
              <View style={styles.headerBadgeRow}>
                <View
                  style={[
                    styles.tierPill,
                    {
                      backgroundColor: currentTier.glow
                        ? `${currentTier.color}1A`
                        : "rgba(255,255,255,0.04)",
                      borderColor: currentTier.glow
                        ? `${currentTier.color}50`
                        : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={currentTier.icon}
                    size={9}
                    color={currentTier.glow ? currentTier.color : "#94a3b8"}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.tierPillText,
                      {
                        color: currentTier.glow ? currentTier.color : "#94a3b8",
                      },
                    ]}
                  >
                    {currentTier.name} PARTNER
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("Notifications")}
            >
              <MaterialIcons name="notifications" size={22} color="white" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Banners */}
        {banners.filter((b) => b.is_active).length > 0 && (
          <View style={styles.bannerWrap}>
            <BannerCarousel
              data={banners.filter((b) => b.is_active)}
              autoPlayInterval={3000}
            />
          </View>
        )}

        {/* Quick Actions */}
        <SectionHeader
          title="Quick Actions"
          accentColor={currentTier.color}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />
        <QuickActionsGrid actions={quickActions} />

        {/* Commission Info */}
        {tierInfo && (
          <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
            <View style={styles.commissionCard}>
              <View style={styles.commissionHeader}>
                <View style={styles.commissionIconWrap}>
                  <MaterialIcons
                    name="percent"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.commissionTitle}>COMMISSION INFO</Text>
              </View>
              <View style={styles.commissionStats}>
                <View style={styles.commissionStatItem}>
                  <Text
                    style={[
                      styles.commissionStatValue,
                      { color: COLORS.primary },
                    ]}
                  >
                    {tierInfo.stats?.commission_rate || 1}%
                  </Text>
                  <Text style={styles.commissionStatLabel}>Your Rate</Text>
                </View>
                <View style={styles.commissionStatDivider} />
                <View style={styles.commissionStatItem}>
                  <Text
                    style={[
                      styles.commissionStatValue,
                      { color: COLORS.error },
                    ]}
                  >
                    ₹
                    {(
                      tierInfo.stats?.total_commission_paid || 0
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.commissionStatLabel}>Total Paid</Text>
                </View>
                <View style={styles.commissionStatDivider} />
                <View style={styles.commissionStatItem}>
                  <Text
                    style={[
                      styles.commissionStatValue,
                      { color: COLORS.success },
                    ]}
                  >
                    {tierInfo.stats?.remaining_events === -1
                      ? "∞"
                      : tierInfo.stats?.remaining_events || 0}
                  </Text>
                  <Text style={styles.commissionStatLabel}>Events Left</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Partner Tier Banner */}
        <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
          <GlassCard
            tag="Partner Tier"
            tagColor="#fbbf24"
            subtitle={`Current: ${currentTier.name}`}
            title="Upgrade Your Tier"
            description="Get more events, lower commission & sponsor support"
            icon="workspace-premium"
            iconColor="#fbbf24"
            gradient={["rgba(251,191,36,0.25)", "rgba(217,119,6,0.15)"]}
            actionLabel="Manage Tier"
            // onAction={() => navigation.navigate("PartnerTier")}
            onPress={() => navigation.navigate("PartnerTier")}>
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

        {/* Featured Events */}
        <SectionHeader
          title="Featured Events"
          actionLabel="View All"
          onActionPress={() => navigation.navigate("FeaturedEvents")}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />

        {featuredMatches.length > 0 ? (
          <FeaturedEventsCarousel
            data={featuredMatches}
            partnerTier={partnerTier}
            autoPlayInterval={4000}
            onPressEvent={(item) =>
              navigation.navigate("MatchDetail", { matchId: item._id })
            }
          />
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="event-busy"
              title="No featured events"
              description="Publish events to make them featured here."
            />
          </View>
        )}

        {/* Recent Activity */}
        <SectionHeader
          title="Recent Activity"
          accentColor={COLORS.success}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="trending-up"
            iconColor={COLORS.success}
            title="Active Subscribers"
            subtitle="People following your events"
            showChevron
            onPress={() => navigation.navigate("UsersList")}
          />
          <InfoCard
            icon="account-balance-wallet"
            iconColor="#3b82f6"
            title="Wallet & Payouts"
            subtitle="Manage your partner wallet"
            showChevron
            onPress={() => navigation.navigate("PaymentDashboard")}
          />
        </View>

        {/* Matches */}
        <SectionHeader
          title={
            hasLocationPermission ? "Matches Near You" : "Upcoming Matches"
          }
          actionLabel="View More"
          onActionPress={() => navigation.navigate("MatchesList")}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />

        {matches.length > 0 ? (
          <View style={styles.matchesList}>
            {matches.slice(0, 5).map(renderMatch)}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="sports-esports"
              title="No matches yet"
              description="Create your first event to get started."
            />
          </View>
        )}

        {/* Stats Footer */}
        <View style={styles.statsFooter}>
          <View>
            <Text style={styles.footerBigNum}>
              {stats.totalMatches.toLocaleString()}
            </Text>
            <Text style={[styles.footerLabel, { color: currentTier.color }]}>
              Total Events
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View>
            <Text style={styles.footerBigNum}>
              ₹{(stats.totalWinnings / 1000).toFixed(1)}K
            </Text>
            <Text style={[styles.footerLabel, { color: currentTier.color }]}>
              Revenue
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <PopupElement />
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },

  /* Header — same pattern as User HomeScreen */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    position: "relative",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
    overflow: "hidden",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  avatarRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  mediatorDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#020617",
  },
  headerTextContainer: {
    flex: 1,
  },
  usernameText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  tierPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierPillText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#020617",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
  },

  /* Banners */
  bannerWrap: {
    marginTop: 4,
  },

  /* Commission */
  commissionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.2)",
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  commissionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(244,123,37,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  commissionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.2,
  },
  commissionStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  commissionStatItem: {
    alignItems: "center",
  },
  commissionStatValue: {
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    marginBottom: 2,
  },
  commissionStatLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  commissionStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  /* Match Lists */
  matchesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  matchRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  matchThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  matchRowTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  matchRowStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowStatLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    textTransform: "uppercase",
  },
  rowStatValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "white",
  },
  verticalDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  rowRating: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rowRatingText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  joinButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  joinButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* Stats Footer */
  statsFooter: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "rgba(244,123,37,0.05)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.1)",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  footerBigNum: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    textAlign: "center",
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  footerDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
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

export default HomeScreenPartner;
