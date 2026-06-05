import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import { partnerSubscriptionAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";
import { useToast } from "../../components/Toast";

const { width } = Dimensions.get("window");

const TIER_COLORS: Record<string, string> = {
  standard: "#94a3b8",
  sponsored: "#3b82f6",
  premium: "#fbbf24",
};

const TIER_ICONS: Record<string, string> = {
  standard: "shield",
  sponsored: "campaign",
  premium: "workspace-premium",
};

const TIER_LABELS: Record<string, string> = {
  standard: "STANDARD",
  sponsored: "SPONSORED",
  premium: "PREMIUM",
};

export const SubscribePartnersScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"subscribed" | "discover">("discover");
  const [subscribedPartners, setSubscribedPartners] = useState<any[]>([]);
  const [allPartners, setAllPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<
    "all" | "standard" | "sponsored" | "premium"
  >("all");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const { showToast, ToastElement } = useToast();
  const [confirmPopupVisible, setConfirmPopupVisible] = useState(false);
  const [confirmPartnerName, setConfirmPartnerName] = useState("");
  const confirmActionRef = useRef<(() => void) | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [location, nearbyOnly]),
  );

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchAll();
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, tierFilter]);

  const requestLocation = async (): Promise<boolean> => {
    setRequestingLocation(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (newStatus !== "granted") {
          setRequestingLocation(false);
          return false;
        }
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setRequestingLocation(false);
      return true;
    } catch (e) {
      setRequestingLocation(false);
      return false;
    }
  };

  const handleNearbyToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestLocation();
      if (granted) {
        setNearbyOnly(true);
      } else {
        showToast("Enable location permission to find partners near you.", "warning");
      }
    } else {
      setNearbyOnly(false);
    }
  };

const fetchAll = async () => {
  console.log('Fetching subscriptions and partners...');
    try {
      const params: any = {};
      if (location) {
        params.lat = location.latitude.toString();
        params.lng = location.longitude.toString();
      }
      if (search.trim()) params.search = search.trim();
      if (tierFilter !== "all") params.tier = tierFilter;

      const [subsRes, allRes] = await Promise.all([
        partnerSubscriptionAPI.getMySubscriptionsWithDetails(
          location
            ? {
                lat: location.latitude.toString(),
                lng: location.longitude.toString(),
              }
            : undefined,
        ),
        partnerSubscriptionAPI.getAllPartners(params),
      ]);

      // subsRes and allRes are AxiosResponse objects
      if (subsRes.data && subsRes.data.success) {
        const subs = subsRes.data.data || [];
        setSubscribedPartners(Array.isArray(subs) ? subs : []);
      } else {
        console.warn('Failed to fetch subscriptions');
      }

      if (allRes.data && allRes.data.success) {
        const all = allRes.data.data || [];
        console.log('Fetched all partners count:', all?.length);
        setAllPartners(Array.isArray(all) ? all : []);
      } else {
        console.warn('Failed to fetch all partners');
      }
    } catch (err) {
      console.error("Failed to fetch partners", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const handleSubscribeToggle = async (partner: any) => {
    const isSubscribed = subscribedPartners.some(
      (s) => s.partner?._id === partner._id,
    );
    try {
      if (isSubscribed) {
        const partnerName = partner.business_name || partner.user_id?.username;
        confirmActionRef.current = async () => {
          try {
            await partnerSubscriptionAPI.unsubscribe(partner._id);
            confirmActionRef.current = null;
            setConfirmPopupVisible(false);
            showToast(`You've been unsubscribed from ${partnerName}.`, "success");
            fetchAll();
          } catch (err: any) {
            showToast(err.response?.data?.message || "Unsubscribe failed", "error");
            setConfirmPopupVisible(false);
          }
        };
        setConfirmPartnerName(partnerName);
        setConfirmPopupVisible(true);
      } else {
        try {
          await partnerSubscriptionAPI.subscribe({ partner_id: partner._id });
          const partnerName = partner.business_name || partner.user_id?.username;
          showToast(`You'll now see ${partnerName}'s events first.`, "success");
          fetchAll();
        } catch (err: any) {
          showToast(err.response?.data?.message || "Subscribe failed", "error");
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Action failed", "error");
    }
  };

  const renderPartnerCard = (partner: any, isSubscribed: boolean) => {
    const tier = partner.partner_tier || "standard";
    const tierColor = TIER_COLORS[tier];
    const tierIcon = TIER_ICONS[tier];
    const tierLabel = partner.tier_label || TIER_LABELS[tier];
    const distance = partner.distance_km;
    const liveEvents =
      partner.total_live_events || partner.live_events_count || 0;
    const subs = partner.subscription_count || 0;
    const rating = partner.rating > 0 ? partner.rating.toFixed(1) : "New";

    return (
      <TouchableOpacity
        key={partner._id}
        style={styles.cardContainer}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("PartnerProfile", { partnerId: partner._id })
        }
      >
        <View style={styles.cardMainRow}>
          {/* Partner logo / avatar thumbnail */}
          <View
            style={[
              styles.thumbnailContainer,
              isSubscribed && { borderColor: "rgba(244,123,37,0.5)" },
            ]}
          >
            {partner.logo_url || partner.banner_url ? (
              <Image
                source={{ uri: partner.logo_url || partner.banner_url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={[`${tierColor}33`, `${tierColor}11`]}
                style={styles.thumbnailImage}
              >
                <MaterialIcons
                  name={tierIcon as any}
                  size={36}
                  color={tierColor}
                />
              </LinearGradient>
            )}
            {liveEvents > 0 && (
              <View style={styles.thumbnailLiveDot}>
                <View style={styles.thumbnailLiveDotInner} />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <View style={styles.titleTierRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {partner.business_name ||
                  partner.user_id?.username ||
                  "Partner"}
              </Text>
              {/* Tier badge on right */}
              <View
                style={[
                  styles.tierBadgeMini,
                  { borderColor: tierColor, backgroundColor: `${tierColor}1A` },
                ]}
              >
                <MaterialIcons
                  name={tierIcon as any}
                  size={9}
                  color={tierColor}
                />
                <Text style={[styles.tierBadgeMiniText, { color: tierColor }]}>
                  {tierLabel}
                </Text>
              </View>
            </View>

            {/* Meta row: city + distance */}
            <View style={styles.statusRow}>
              {partner.city ? (
                <View style={styles.metaItem}>
                  <MaterialIcons name="place" size={10} color={tierColor} />
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {partner.city}
                    {distance != null ? ` • ${distance} km` : ""}
                  </Text>
                </View>
              ) : (
                <Text style={styles.cardMeta}>—</Text>
              )}
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="star" size={11} color="#fbbf24" />
                <Text style={styles.statItemText}>{rating}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={11} color="#3b82f6" />
                <Text style={styles.statItemText}>{subs}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons
                  name="local-fire-department"
                  size={11}
                  color={
                    liveEvents > 0 ? COLORS.primary : "rgba(255,255,255,0.4)"
                  }
                />
                <Text
                  style={[
                    styles.statItemText,
                    liveEvents > 0 && { color: COLORS.primary },
                  ]}
                >
                  {liveEvents} LIVE
                </Text>
              </View>
            </View>

            {/* Status badge — not a button, the whole card opens the profile */}
            <View style={styles.actionGrid}>
              <View
                style={[
                  styles.actionBtn,
                  isSubscribed ? styles.statusBtnSubscribed : styles.statusBtnSubscribe,
                ]}
              >
                <MaterialIcons
                  name={isSubscribed ? "check-circle" : "add-circle-outline"}
                  size={13}
                  color={isSubscribed ? "#10b981" : COLORS.primary}
                />
                <Text
                  style={
                    isSubscribed
                      ? styles.statusBtnSubscribedText
                      : styles.statusBtnSubscribeText
                  }
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const partnerList =
    tab === "subscribed"
      ? subscribedPartners // Already extracted partner objects from HomeScreen
      : allPartners;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

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

      {/* HEADER - clean, no subtitle */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitleCenter}>Partners</Text>

        {/* Nearby Toggle - compact icon-only with switch */}
        <TouchableOpacity
          style={[
            styles.nearbyToggle,
            nearbyOnly && styles.nearbyToggleActive,
            requestingLocation && { opacity: 0.6 },
          ]}
          onPress={() => handleNearbyToggle(!nearbyOnly)}
          activeOpacity={0.8}
          disabled={requestingLocation}
        >
          {requestingLocation ? (
            <ActivityIndicator
              size="small"
              color={nearbyOnly ? "white" : COLORS.primary}
            />
          ) : (
            <MaterialIcons
              name={nearbyOnly ? "my-location" : "location-searching"}
              size={20}
              color={nearbyOnly ? "white" : COLORS.primary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Nearby status strip (only shows when active) */}
      {nearbyOnly && location && (
        <View style={styles.nearbyBanner}>
          <MaterialIcons name="near-me" size={12} color={COLORS.primary} />
          <Text style={styles.nearbyBannerText}>
            Showing partners within 50 km
          </Text>
          <TouchableOpacity onPress={() => setNearbyOnly(false)}>
            <MaterialIcons
              name="close"
              size={14}
              color="rgba(255,255,255,0.5)"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "discover" && styles.tabActive]}
          onPress={() => setTab("discover")}
        >
          <MaterialIcons
            name="explore"
            size={16}
            color={
              tab === "discover" ? COLORS.primary : "rgba(255,255,255,0.4)"
            }
          />
          <Text
            style={[styles.tabText, tab === "discover" && styles.tabTextActive]}
          >
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "subscribed" && styles.tabActive]}
          onPress={() => setTab("subscribed")}
        >
          <MaterialIcons
            name="bookmark"
            size={16}
            color={
              tab === "subscribed" ? COLORS.primary : "rgba(255,255,255,0.4)"
            }
          />
          <Text
            style={[
              styles.tabText,
              tab === "subscribed" && styles.tabTextActive,
            ]}
          >
            Subscribed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search + Filter (only in discover) */}
      {tab === "discover" && (
        <View style={styles.searchSection}>
          <View style={styles.searchInputWrapper}>
            <MaterialIcons
              name="search"
              size={18}
              color="rgba(255,255,255,0.4)"
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or city"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <MaterialIcons
                  name="close"
                  size={18}
                  color="rgba(255,255,255,0.4)"
                />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {["all", "standard", "sponsored", "premium"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.filterChip,
                  tierFilter === t && styles.filterChipActive,
                ]}
                onPress={() => setTierFilter(t as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    tierFilter === t && styles.filterChipTextActive,
                  ]}
                >
                  {t === "all"
                    ? "All Tiers"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.loadingText}>
              {nearbyOnly ? "Finding nearby partners…" : "Finding partners…"}
            </Text>
          </View>
        ) : partnerList.length > 0 ? (
          <View style={styles.partnersGrid}>
            {partnerList
              .map((p: any) => (p?.partner ? p.partner : p))
              .filter((p: any) => p && p._id)
              .map((p: any) => {
                const isSubbed = subscribedPartners.some(
                  (s) => s.partner?._id === p._id,
                );
                return renderPartnerCard(p, isSubbed);
              })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name={nearbyOnly ? "location-off" : "search-off"}
              size={56}
              color="rgba(244,123,37,0.3)"
            />
            <Text style={styles.emptyTitle}>
              {nearbyOnly ? "No nearby partners" : "No partners found"}
            </Text>
            <Text style={styles.emptySub}>
              {nearbyOnly
                ? "Try turning off nearby mode or expand your search"
                : "Try changing filters or search terms"}
            </Text>
            {nearbyOnly && (
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => setNearbyOnly(false)}
              >
                <MaterialIcons name="public" size={14} color="white" />
                <Text style={styles.emptyActionText}>SHOW ALL</Text>
              </TouchableOpacity>
            )}
            {tab === "subscribed" && !nearbyOnly && (
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => setTab("discover")}
              >
                <Text style={styles.emptyActionText}>DISCOVER PARTNERS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <PopupModal
        visible={confirmPopupVisible}
        type="warning"
        title="Unsubscribe"
        message={`Unsubscribe from ${confirmPartnerName}? You'll stop seeing their events first.`}
        confirmText="Unsubscribe"
        cancelText="Cancel"
        onConfirm={() => confirmActionRef.current?.()}
        onCancel={() => { confirmActionRef.current = null; setConfirmPopupVisible(false); }}
        onClose={() => { confirmActionRef.current = null; setConfirmPopupVisible(false); }}
      />

      <ToastElement />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
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
    bottom: "10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },

  // Header (clean, matches My Events)
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  headerTitleCenter: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  nearbyToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(244,123,37,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyToggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },

  // Nearby status banner
  nearbyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(244,123,37,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.2)",
  },
  nearbyBannerText: {
    flex: 1,
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tabActive: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderColor: "rgba(244,123,37,0.3)",
  },
  tabText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: COLORS.primary,
  },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
    paddingVertical: 0,
  },
  filterChips: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  filterChipActive: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },

  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },

  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  emptySub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyActionText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Partner Grid
  partnersGrid: {
    gap: 0,
  },

  // =============== MyEvents-style Partner Card ===============
  cardContainer: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardMainRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  thumbnailContainer: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailLiveDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailLiveDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  cardInfo: {
    flex: 1,
  },
  titleTierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  tierBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierBadgeMiniText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  cardMeta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statItemText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "900",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  actionBtnOrange: {
    backgroundColor: COLORS.primary,
  },
  actionBtnDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusBtnSubscribe: {
    backgroundColor: "rgba(244,123,37,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.35)",
  },
  statusBtnSubscribeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  statusBtnSubscribed: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.35)",
  },
  statusBtnSubscribedText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionBtnTextLight: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  actionBtnTextDark: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
