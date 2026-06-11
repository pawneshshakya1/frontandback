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
  Alert,
  RefreshControl,
} from "react-native";
import * as Location from "expo-location";
// safe-area handled by SafeScreen
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import api, {
  notificationAPI,
  partnerSubscriptionAPI,
  chatAPI,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import { sseService } from "../../services/sse";
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

const { width } = Dimensions.get("window");

const FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAwQWNaaBgdOXGVmuHX-vDdsW0B_K4GoKl2GcFXoCxPWPrQZ_yNXFZOV5TpsZC00vfqBOwhnsWVfPwodPRTwwgaukeSR6KstNxSN-kB2RD5o5ZN4Dtx6LRX9NuHKTTC52i8O1H4FEh0YIB2T81bmY0Gty3tZzDUJ_8kNaBqKGtXSoHDqmcZ8rBcGZ4mAEb-uJpfHgfiwd-2a7KZ8XkgHuZp6x3V_wCKtwO3E9IZoW6fvj41ubixnkcdl0NX9KIaqM0_5TRfzNgtXEQ";

const PASS_CONFIG: Record<
  string,
  { name: string; suffix: string; color: string; glow: string | null }
> = {
  none: { name: "BATTLE", suffix: "CORE", color: COLORS.primary, glow: null },
  pro: {
    name: "PRO",
    suffix: "PASS",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.3)",
  },
  elite: {
    name: "ELITE",
    suffix: "PASS",
    color: COLORS.primary,
    glow: "rgba(244,123,37,0.3)",
  },
  supreme: {
    name: "SUPREME",
    suffix: "PASS",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.3)",
  },
};

export const HomeScreen = ({ navigation }: any) => {
  const { authData } = useAuth();

  const [matches, setMatches] = useState<any[]>([]);
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isMediator, setIsMediator] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalMatches: 0, totalWinnings: 0 });
  const [subscribedPartners, setSubscribedPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getPassInfo = () => {
    const passType =
      userProfile?.elite_pass_type || userProfile?.pass_type || "none";
    return PASS_CONFIG[passType] || PASS_CONFIG.none;
  };

  const currentPass = getPassInfo();
  // Show promo only when user has NO active pass
  // Check: pass_type is none/missing OR pass_expiry is null/expired
  const userPassType = userProfile?.elite_pass_type || userProfile?.pass_type;
  const hasActivePass = userPassType
    && userPassType !== "none"
    && userProfile?.pass_expiry
    && new Date(userProfile.pass_expiry) > new Date();

  const loadInitialData = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let locCoords: { latitude: number; longitude: number } | null = null;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        locCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setHasLocationPermission(true);
      }

      const [
        matchesRes,
        featuredRes,
        bannersRes,
        medRes,
        statsRes,
        userRes,
        subsRes,
      ] = await Promise.allSettled([
        api.get("/matches", { params: locCoords || {} }),
        api.get("/matches", { params: { featured: "true" } }),
        api.get("/banners"),
        api
          .get("/matches/mediator/check")
          .catch(() => ({ data: { isMediator: false } })),
        api
          .get("/users/stats")
          .catch(() => ({
            data: { data: { totalMatches: 0, totalWinnings: 0 } },
          })),
        api.get("/auth/me").catch(() => ({ data: { data: null } })),
        partnerSubscriptionAPI
          .getMySubscriptionsWithDetails(
            locCoords
              ? {
                lat: locCoords.latitude.toString(),
                lng: locCoords.longitude.toString(),
              }
              : undefined,
          )
          .catch(() => ({ data: { data: [] } })),
      ]);

      if (matchesRes.status === "fulfilled")
        setMatches(matchesRes.value.data.data || []);
      if (featuredRes.status === "fulfilled")
        setFeaturedMatches(featuredRes.value.data.data || []);
      if (bannersRes.status === "fulfilled")
        setBanners(bannersRes.value.data.data || []);
      if (medRes.status === "fulfilled")
        setIsMediator(medRes.value.data.isMediator);
      if (userRes.status === "fulfilled" && userRes.value.data.data) {
        setUserProfile(userRes.value.data.data);
      }
      if (statsRes.status === "fulfilled" && statsRes.value.data.data) {
        setStats({
          totalMatches: statsRes.value.data.data.totalMatches || 0,
          totalWinnings: statsRes.value.data.data.totalWinnings || 0,
        });
      }
      if (subsRes.status === "fulfilled" && subsRes.value.data.success) {
        const subs = subsRes.value.data.data || [];
        const subsList = Array.isArray(subs) ? subs : [];
        setSubscribedPartners(
          subsList
            .map((s: any) => s.partner)
            .filter((p: any) => p)
            .sort((a: any, b: any) => {
              // sort by live events desc, then distance asc
              const liveDiff =
                (b?.total_live_events || 0) - (a?.total_live_events || 0);
              if (liveDiff !== 0) return liveDiff;
              return (a?.distance_km || 9999) - (b?.distance_km || 9999);
            }),
        );
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }, []);

  useEffect(() => {
    loadInitialData().finally(() => setLoading(false));
  }, [loadInitialData]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationAPI.getUnreadCount();
        if (res.data.success) setUnreadCount(res.data.data.unreadCount || 0);
      } catch (e) {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchChatUnread = useCallback(async () => {
    try {
      const res = await chatAPI.getUnreadCount();
      if (res.data.success) setChatUnreadCount(res.data.data.unreadCount || 0);
    } catch (e) {
      // ignore (likely ineligible / 403)
    }
  }, []);

  useEffect(() => {
    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchChatUnread]);

  useEffect(() => {
    const refreshUnread = async () => {
      try {
        const res = await notificationAPI.getUnreadCount();
        if (res.data.success) setUnreadCount(res.data.data.unreadCount || 0);
      } catch (e) {
        // ignore
      }
    };
    const unsubscribe = navigation.addListener("focus", () => {
      refreshUnread();
      fetchChatUnread();
    });
    return unsubscribe;
  }, [navigation, fetchChatUnread]);

  useEffect(() => {
    const handleNotification = () => setUnreadCount((p) => p + 1);
    const handleBannerUpdate = async () => {
      try {
        const res = await api.get("/banners");
        setBanners(res.data.data || []);
      } catch (e) { }
    };
    const handleMatchUpdate = () => loadInitialData();
    const handleNewPartnerEvent = () => loadInitialData();
    const handleSubscriptionChange = () => loadInitialData();
    const handleChatMessage = () => setChatUnreadCount((p) => p + 1);

    sseService.on("NOTIFICATION", handleNotification);
    sseService.on("BANNER_UPDATE", handleBannerUpdate);
    sseService.on("MATCH_UPDATE", handleMatchUpdate);
    sseService.on("NEW_PARTNER_EVENT", handleNewPartnerEvent as any);
    sseService.on("MATCH_PUBLISHED", handleNewPartnerEvent as any);
    sseService.on("PARTNER_SUBSCRIBED", handleSubscriptionChange as any);
    sseService.on("PARTNER_UNSUBSCRIBED", handleSubscriptionChange as any);
    sseService.on("CHAT_MESSAGE", handleChatMessage as any);

    return () => {
      sseService.off("NOTIFICATION", handleNotification);
      sseService.off("BANNER_UPDATE", handleBannerUpdate);
      sseService.off("MATCH_UPDATE", handleMatchUpdate);
      sseService.off("NEW_PARTNER_EVENT", handleNewPartnerEvent as any);
      sseService.off("MATCH_PUBLISHED", handleNewPartnerEvent as any);
      sseService.off("PARTNER_SUBSCRIBED", handleSubscriptionChange as any);
      sseService.off("PARTNER_UNSUBSCRIBED", handleSubscriptionChange as any);
      sseService.off("CHAT_MESSAGE", handleChatMessage as any);
    };
  }, [loadInitialData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  const quickActions: QuickAction[] = [
    {
      id: "create",
      label: "CREATE",
      icon: "add-circle",
      iconColor: COLORS.primary,
      iconBg: "rgba(244,123,37,0.1)",
      onPress: () => navigation.navigate("CreateMatch"),
    },
    {
      id: "myevents",
      label: "MY EVENTS",
      icon: "event-note",
      iconColor: "#a855f7",
      iconBg: "rgba(168,85,247,0.1)",
      onPress: () => navigation.navigate("MyEvents"),
    },
    {
      id: "join",
      label: "JOIN",
      icon: "login",
      iconColor: "#eab308",
      iconBg: "rgba(234,179,8,0.1)",
      onPress: () => navigation.navigate("JoinRoomScreen"),
    },
    {
      id: "upload",
      label: "UPLOAD SS",
      icon: "cloud-upload",
      iconColor: COLORS.accentBlue,
      iconBg: "rgba(37,99,235,0.1)",
      onPress: () => navigation.navigate("UploadScreenshot"),
    },
  ];

  if (isMediator) {
    quickActions.push({
      id: "mediator",
      label: "MEDIATOR",
      icon: "gavel",
      iconColor: "#ef4444",
      iconBg: "rgba(220, 38, 38, 0.1)",
      onPress: () => navigation.navigate("MediatorDashboard"),
    });
  }

  const renderFeatured = (item: any) => {
    const isFull = (item.participants?.length || 0) >= item.max_players;
    return (
      <TouchableOpacity
        key={item._id}
        onPress={() =>
          navigation.navigate("MatchDetail", { matchId: item._id })
        }
        activeOpacity={0.85}
        style={[styles.featuredCard, isFull && { opacity: 0.6 }]}
      >
        <View style={styles.featuredImageContainer}>
          <Image
            source={{ uri: item.banner_url || FALLBACK_IMAGE }}
            style={styles.featuredImage}
          />
          <LinearGradient
            colors={["transparent", COLORS.surface]}
            style={styles.gradientOverlay}
          />
          {item.isPublished && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={10} color="white" />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          )}
        </View>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.featuredStats}>
            <View>
              <Text style={styles.statLabel}>ENTRY FEE</Text>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {item.entry_fee > 0 ? `₹${item.entry_fee}` : "Free"}
              </Text>
            </View>
            <View>
              <Text style={styles.statLabel}>PRIZE POOL</Text>
              <Text style={styles.statValue}>
                ₹{(item.prize_pool || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <MaterialIcons name="people" size={12} color="#fbbf24" />
              <Text style={styles.ratingText}>
                {item.participants?.length || 0}/{item.max_players}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
            <MaterialIcons name="verified" size={10} color="#3b82f6" />
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
      <SafeScreen role="USER">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading arena...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen role="USER" disableBottomSafeArea>
      {/* Decorative Background */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatarContainer,
                currentPass.glow
                  ? {
                    borderColor: currentPass.color,
                    shadowColor: currentPass.color,
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
                  colors={[COLORS.primary, "#ea580c"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarFallback}
                >
                  <Text style={styles.avatarInitials}>
                    {(userProfile?.username ||
                      authData?.user?.username ||
                      authData?.user?.email ||
                      "P")[0]?.toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View
                style={[
                  styles.avatarRing,
                  currentPass.glow
                    ? { borderColor: `${currentPass.color}60` }
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
                {userProfile?.username || authData?.user?.username || "Player"}
              </Text>
              <View style={styles.headerBadgeRow}>
                <View
                  style={[
                    styles.passPill,
                    {
                      backgroundColor: currentPass.glow
                        ? `${currentPass.color}1A`
                        : "rgba(255,255,255,0.04)",
                      borderColor: currentPass.glow
                        ? `${currentPass.color}50`
                        : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="workspace-premium"
                    size={9}
                    color={currentPass.glow ? currentPass.color : "#94a3b8"}
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.passPillText,
                      {
                        color: currentPass.glow ? currentPass.color : "#94a3b8",
                      },
                    ]}
                  >
                    {currentPass.name} {currentPass.suffix}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("ChatList")}
            >
              <MaterialIcons name="chat-bubble" size={22} color="white" />
              {chatUnreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("Notifications")}
            >
              <MaterialIcons name="notifications" size={22} color="white" />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 0
                    ? unreadCount > 9
                      ? "9+"
                      : unreadCount
                    : "3"}
                </Text>
              </View>
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
          title="Quick Link"
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />
        <QuickActionsGrid actions={quickActions} />

        {/* Your Partners - Premium Card */}
        <SectionHeader
          title="Your Partners"
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />

        <View style={styles.partnerPromoContainer}>
          <GlassCard
            tag={
              subscribedPartners.length > 0
                ? `${subscribedPartners.length} Active`
                : "New Feature"
            }
            tagColor={COLORS.primary}
            subtitle={
              subscribedPartners.length > 0
                ? "Subscribed hosts"
                : "Never miss a beat"
            }
            title="Subscribe to Partners"
            description={
              subscribedPartners.length > 0
                ? "Browse and follow esports hosts. Their events appear first in your feed — instant alerts, priority slots, QR subscribe."
                : "Scan their QR or browse nearby hosts. Their events appear first in your feed — instant alerts, priority slots."
            }
            icon={subscribedPartners.length > 0 ? "groups" : "qr-code-scanner"}
            iconColor={COLORS.primary}
            gradient={["rgba(244,123,37,0.25)", "rgba(234,88,12,0.15)"]}
            // actionLabel={
            //   subscribedPartners.length > 0
            //     ? "Manage Partners"
            //     : "Browse Partners"
            // }
            onAction={() => navigation.navigate("SubscribePartners")}
            onPress={() => navigation.navigate("SubscribePartners")}
          >
            <View style={styles.partnerPromoStats}>
              <View style={styles.partnerPromoStatItem}>
                <MaterialIcons
                  name="location-on"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.partnerPromoStatText}>Nearby</Text>
              </View>
              <View style={styles.partnerPromoDivider} />
              <View style={styles.partnerPromoStatItem}>
                <MaterialIcons
                  name="qr-code-2"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.partnerPromoStatText}>QR Scan</Text>
              </View>
              <View style={styles.partnerPromoDivider} />
              <View style={styles.partnerPromoStatItem}>
                <MaterialIcons
                  name="flash-on"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.partnerPromoStatText}>Priority</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Featured Events */}
        <SectionHeader
          title="Featured Events"
          actionLabel="View All"
          onActionPress={() => navigation.navigate("Events")}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />

        {featuredMatches.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {featuredMatches.slice(0, 5).map(renderFeatured)}
          </ScrollView>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon="event-busy"
              title="No featured events"
              description="Pull to refresh and check back soon."
            />
          </View>
        )}

        {/* Elite Pass Promo — only show when user has NO active pass */}
        {/* User Stats */}
        <SectionHeader
          title="Upgrade"
          accentColor={COLORS.success}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />
        <View style={styles.partnerPromoContainer}>
          <GlassCard
            tag="New Feature"
            tagColor="#fbbf24"
            subtitle="Upgrade now"
            title="Upgrade to Elite Pass"
            description="Get 50% extra winnings on every match, priority slot booking, and exclusive tournament access."
            icon="workspace-premium"
            iconColor="#fbbf24"
            gradient={["rgba(251,191,36,0.25)", "rgba(217,119,6,0.15)"]}
            onAction={() => navigation.navigate("ElitePass")}
            onPress={() => navigation.navigate("ElitePass")}
          >
            <View style={styles.partnerPromoStats}>
              <View style={styles.partnerPromoStatItem}>
                <MaterialIcons
                  name="trending-up"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.partnerPromoStatText}>+50% Winnings</Text>
              </View>
              <View style={styles.partnerPromoDivider} />
              <View style={styles.partnerPromoStatItem}>
                <MaterialIcons
                  name="flash-on"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.partnerPromoStatText}>Priority</Text>
              </View>
              <View style={styles.partnerPromoDivider} />
              <View style={styles.partnerPromoStatItem}>
                <MaterialIcons
                  name="workspace-premium"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.partnerPromoStatText}>Exclusive</Text>
              </View>
            </View>
          </GlassCard>
        </View>


        {/* User Stats */}
        <SectionHeader
          title="Your Stats"
          accentColor={COLORS.success}
          containerStyle={{ paddingHorizontal: 16, marginTop: 28 }}
        />
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <MaterialIcons
              name="emoji-events"
              size={22}
              color={COLORS.primary}
            />
            <Text style={styles.statTileValue}>
              {(userProfile?.totalWins || stats.totalMatches).toLocaleString()}
            </Text>
            <Text style={styles.statTileLabel}>Total Wins</Text>
          </View>
          <View style={styles.statTile}>
            <MaterialIcons name="whatshot" size={22} color="#ef4444" />
            <Text style={styles.statTileValue}>
              ₹{((stats.totalWinnings || 0) / 1000).toFixed(1)}K
            </Text>
            <Text style={styles.statTileLabel}>Winnings</Text>
          </View>
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
              title="No matches available"
              description="Be the first to host a tournament."
              actionLabel="Create Match"
              onAction={() => navigation.navigate("CreateMatch")}
            />
          </View>
        )}

        {/* Stats Footer */}
        <View style={styles.statsFooter}>
          <View>
            <Text style={styles.footerBigNum}>
              {stats.totalMatches.toLocaleString()}
            </Text>
            <Text style={[styles.footerLabel, { color: COLORS.primary }]}>
              Total Matches
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View>
            <Text style={styles.footerBigNum}>
              ₹{(stats.totalWinnings / 1000).toFixed(1)}K
            </Text>
            <Text style={[styles.footerLabel, { color: COLORS.primary }]}>
              Winnings Paid
            </Text>
          </View>
        </View>
      </ScrollView>
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
  passPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  passPillText: {
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
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  partnerPromoContainer: {
    paddingHorizontal: 16,
    marginTop: 4,
  },
  partnerPromoStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 12,
  },
  partnerPromoStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  partnerPromoStatText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  partnerPromoDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  bannerWrap: {
    marginBottom: 8,
  },
  featuredCard: {
    width: width - 64,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  featuredImageContainer: {
    height: 130,
    position: "relative",
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  verifiedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  featuredContent: {
    padding: 14,
    marginTop: -28,
    position: "relative",
    zIndex: 10,
  },
  featuredTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  featuredStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  statValue: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  ratingBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },
  promoContainer: {
    paddingHorizontal: 16,
    marginVertical: 24,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    gap: 4,
  },
  statTileValue: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    marginTop: 4,
  },
  statTileLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
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
  statsFooter: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
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
});

export default HomeScreen;
