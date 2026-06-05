import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { partnerAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { SafeScreen } from "../../components/SafeScreen";
import { EmptyState } from "../../components/EmptyState";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

const FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAwQWNaaBgdOXGVmuHX-vDdsW0B_K4GoKl2GcFXoCxPWPrQZ_yNXFZOV5TpsZC00vfqBOwhnsWVfPwodPRTwwgaukeSR6KstNxSN-kB2RD5o5ZN4Dtx6LRX9NuHKTTC52i8O1H4FEh0YIB2T81bmY0Gty3tZzDUJ_8kNaBqKGtXSoHDqmcZ8rBcGZ4mAEb-uJpfHgfiwd-2a7KZ8XkgHuZp6x3V_wCKtwO3E9IZoW6fvj41ubixnkcdl0NX9KIaqM0_5TRfzNgtXEQ";

const PARTNER_TIER_CONFIG: Record<
  string,
  { name: string; color: string; glow: string | null }
> = {
  standard: { name: "STANDARD", color: "#94a3b8", glow: null },
  sponsored: { name: "SPONSORED", color: "#3b82f6", glow: "rgba(59,130,246,0.3)" },
  premium: { name: "PREMIUM", color: "#fbbf24", glow: "rgba(251,191,36,0.3)" },
};

export const FeaturedEventsScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, PopupElement } = usePopup();

  const [partnerTier, setPartnerTier] = useState<string>("standard");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentTier = PARTNER_TIER_CONFIG[partnerTier] || PARTNER_TIER_CONFIG.standard;

  const loadEvents = useCallback(async () => {
    try {
      const [dashboardRes, tierRes] = await Promise.allSettled([
        partnerAPI.getDashboard(),
        partnerAPI.getTierInfo().catch(() => ({ data: { data: null } })),
      ]);

      if (dashboardRes.status === "fulfilled" && dashboardRes.value.data.data) {
        const all = dashboardRes.value.data.data.events || [];
        const featured = [...all]
          .filter((e: any) => e.isPublished)
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setEvents(featured);
      }
      if (tierRes.status === "fulfilled" && tierRes.value.data.data) {
        setPartnerTier(tierRes.value.data.data.current_tier || "standard");
      }
    } catch (err) {
      console.error("load featured events error", err);
      showError("Error", "Failed to load featured events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const renderCard = (item: any) => {
    const isFull = (item.participants?.length || 0) >= item.max_players;
    return (
      <TouchableOpacity
        key={item._id}
        onPress={() =>
          navigation.navigate("MatchDetail", { matchId: item._id })
        }
        style={[styles.featuredCard, isFull && { opacity: 0.6 }]}
        activeOpacity={0.85}
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
          <View
            style={[
              styles.verifiedBadge,
              { backgroundColor: currentTier.color },
            ]}
          >
            <MaterialIcons name="verified" size={10} color="white" />
            <Text style={styles.verifiedText}>LIVE</Text>
          </View>
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
              <MaterialIcons name="people" size={12} color={currentTier.color} />
              <Text style={styles.ratingText}>
                {item.participants?.length || 0}/{item.max_players}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeScreen role="PARTNER">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTier.color} />
          <Text style={styles.loadingText}>Loading featured events...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen role="PARTNER">
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Theme glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top status bar blur */}
      <BlurView
        intensity={250}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          zIndex: 100,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="chevron-left"
            size={26}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Featured Events</Text>
          <Text style={styles.headerSubtitle}>
            {events.length} live event{events.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={styles.circleBtnPlaceholder} />
      </View>

      {events.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={currentTier.color}
              colors={[currentTier.color]}
            />
          }
        >
          {events.map(renderCard)}
          <View style={{ height: 32 }} />
        </ScrollView>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="event-busy"
            title="No featured events"
            description="Publish events to make them featured here."
          />
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate("CreateMatch")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={COLORS.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createBtnGradient}
            >
              <MaterialIcons name="add-circle" size={20} color="white" />
              <Text style={styles.createBtnText}>CREATE EVENT</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

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
    bottom: "-15%",
    left: "-15%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.textLight,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  /* Scroll */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  /* Featured Card — same as home carousel */
  featuredCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  featuredImageContainer: {
    height: 150,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "#020617",
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

  /* Empty state */
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
    alignItems: "center",
  },
  createBtn: {
    marginTop: 24,
    borderRadius: 14,
    overflow: "hidden",
  },
  createBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  createBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
});

export default FeaturedEventsScreenPartner;
