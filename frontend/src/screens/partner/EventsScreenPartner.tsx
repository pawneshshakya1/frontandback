import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Image,
  Switch,
} from "react-native";
import * as Location from "expo-location";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";
import { FilterBottomSheet, FilterSection } from "../../components/FilterBottomSheet";

const { width } = Dimensions.get("window");

export const EventsScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Ongoing");
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    gameType: "All", // 'CS', 'BR'
    mode: "All", // '1v1', '4v4', etc.
    entryType: "All", // 'Free', 'Paid'
  });
  const [activeFilters, setActiveFilters] = useState({
    gameType: "All",
    mode: "All",
    entryType: "All",
  });
  const [isNearby, setIsNearby] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error" as "success" | "error" | "warning" | "info",
  });

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {};
      if (isNearby && location) {
        params.latitude = location.latitude;
        params.longitude = location.longitude;
      }
      const response = await api.get("/partner/events", { params });
      if (response.data.success) {
        setMatches(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch matches:", error);
      setError("Failed to load events");
      setPopup({
        visible: true,
        title: "Error",
        message: "Failed to load events",
        type: "error",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [isNearby, location]);

  const toggleNearby = async (value: boolean) => {
    if (value) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPopup({
          visible: true,
          title: "Permission denied",
          message: "Allow location access to find nearby events.",
          type: "warning",
        });
        return;
      }

      setIsLoading(true);
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setIsNearby(true);
    } else {
      setIsNearby(false);
      setLocation(null);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchMatches();
  };

  const getFilteredMatches = () => {
    let results = matches;

    // Filter by Tab (Status)
    switch (activeTab) {
      case "Ongoing":
        results = results.filter((m) => m.status === "ONGOING");
        break;
      case "Upcoming":
        results = results.filter((m) => m.status === "OPEN");
        break;
      case "Results":
        results = results.filter(
          (m) => m.status === "COMPLETED" || m.status === "REVIEW",
        );
        break;
    }

    // Apply User Filters
    if (activeFilters.gameType !== "All") {
      results = results.filter((m) => m.game_type === activeFilters.gameType);
    }
    if (activeFilters.mode !== "All") {
      results = results.filter((m) => m.mode === activeFilters.mode);
    }
    if (activeFilters.entryType !== "All") {
      if (activeFilters.entryType === "Free") {
        results = results.filter((m) => m.entry_fee === 0);
      } else {
        results = results.filter((m) => m.entry_fee > 0);
      }
    }

    return results;
  };

  const applyFilters = (values: Record<string, string>) => {
    const newFilters = {
      gameType: values.gameType || "All",
      mode: values.mode || "All",
      entryType: values.entryType || "All",
    };
    setFilters(newFilters);
    setActiveFilters(newFilters);
    setIsFilterVisible(false);
  };

  const resetFilters = () => {
    const defaultFilters = {
      gameType: "All",
      mode: "All",
      entryType: "All",
    };
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
    setIsFilterVisible(false);
  };

  const filteredEvents = getFilteredMatches();

  const filterSections: FilterSection[] = [
    {
      key: "gameType",
      label: "Game Type",
      value: filters.gameType,
      options: [
        { key: "All", label: "All Games", icon: "apps" },
        { key: "CS", label: "Clash Squad", icon: "groups" },
        { key: "BR", label: "Battle Royale", icon: "public" },
      ],
    },
    {
      key: "mode",
      label: "Game Mode",
      value: filters.mode,
      options: [
        { key: "All", label: "All Modes", icon: "view-list" },
        { key: "1v1", label: "1v1 Solo", icon: "person" },
        { key: "2v2", label: "2v2 Duo", icon: "group" },
        { key: "4v4", label: "4v4 Squad", icon: "groups-2" },
        { key: "Full Map", label: "Full Map", icon: "map" },
      ],
    },
    {
      key: "entryType",
      label: "Entry Type",
      value: filters.entryType,
      options: [
        { key: "All", label: "All Entries", icon: "apps" },
        { key: "Free", label: "Free", icon: "redeem" },
        { key: "Paid", label: "Paid", icon: "attach-money" },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Decorative Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top Status Bar Blur */}
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

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              height: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255,255,255,0.05)",
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <Text
              style={{
                color: isNearby ? "#f47b25" : "rgba(255,255,255,0.4)",
                fontSize: 10,
                fontWeight: "bold",
              }}
            >
              NEARBY
            </Text>
            <Switch
              value={isNearby}
              onValueChange={toggleNearby}
              trackColor={{ false: "#333", true: "rgba(244,123,37,0.3)" }}
              thumbColor={isNearby ? "#f47b25" : "#f4f3f4"}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFilters.gameType !== "All" ||
              activeFilters.mode !== "All" ||
              activeFilters.entryType !== "All"
                ? styles.filterBtnActive
                : null,
            ]}
            onPress={() => setIsFilterVisible(true)}
          >
            <MaterialIcons
              name="tune"
              size={20}
              color={
                activeFilters.gameType !== "All" ||
                activeFilters.mode !== "All" ||
                activeFilters.entryType !== "All"
                  ? "#f47b25"
                  : "white"
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {["Upcoming", "Results"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#f47b25"
          />
        }
      >
        {isLoading ? (
          <View style={{ marginTop: 100 }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={COLORS.error}
            />
            <Text style={styles.emptyText}>{error || "An error occurred"}</Text>
            <TouchableOpacity
              style={[styles.applyBtn, { marginTop: 16 }]}
              onPress={fetchMatches}
            >
              <Text style={styles.applyBtnText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEvents.length > 0 ? (
          filteredEvents.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.matchRow}
              onPress={() =>
                navigation.navigate("MatchDetail", { matchId: item._id })
              }
            >
              <Image
                source={{
                  uri: item.banner_url || "https://via.placeholder.com/400x200",
                }}
                style={styles.matchThumb}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.statusRowHeader}>
                  <View
                    style={[
                      styles.statusTag,
                      {
                        backgroundColor:
                          item.status === "OPEN"
                            ? "rgba(244,123,37,0.2)"
                            : item.status === "ONGOING"
                              ? "rgba(244,123,37,0.2)"
                              : "rgba(37,99,235,0.2)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.status === "OPEN"
                              ? "#f47b25"
                              : item.status === "ONGOING"
                                ? "#f47b25"
                                : "#2563eb",
                        },
                      ]}
                    >
                      {item.status || "OPEN"}
                    </Text>
                  </View>
                  <MaterialIcons name="verified" size={10} color="#3b82f6" />
                </View>
                <Text style={styles.matchRowTitle}>{item.title}</Text>
                <View style={styles.matchRowStats}>
                  <View>
                    <Text style={styles.rowStatLabel}>ENTRY</Text>
                    <Text style={[styles.rowStatValue, { color: "#f47b25" }]}>
                      ₹{item.entry_fee}
                    </Text>
                  </View>
                  <View style={styles.verticalDivider} />
                  <View>
                    <Text style={styles.rowStatLabel}>PRIZE</Text>
                    <Text style={styles.rowStatValue}>₹{item.prize_pool}</Text>
                  </View>
                  <View style={styles.rowRating}>
                    <MaterialIcons name="star" size={10} color="#fbbf24" />
                    <Text style={styles.rowRatingText}>4.8</Text>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.joinButton,
                  {
                    backgroundColor:
                      item.status === "OPEN"
                        ? "#f47b25"
                        : "rgba(255,255,255,0.1)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.joinButtonText,
                    item.status !== "OPEN" && { opacity: 0.4 },
                  ]}
                >
                  {item.status === "OPEN"
                    ? "JOIN"
                    : item.status === "ONGOING"
                      ? "LIVE"
                      : "DONE"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="event-busy"
              size={48}
              color="rgba(255,255,255,0.1)"
            />
            <Text style={styles.emptyText}>
              No {activeTab.toLowerCase()} events found.
            </Text>
          </View>
        )}

        {activeTab === "Results" && filteredEvents.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="history"
              size={48}
              color="rgba(255,255,255,0.1)"
            />
            <Text style={styles.emptyText}>No recent results available.</Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={isFilterVisible}
        onClose={() => setIsFilterVisible(false)}
        title="Filter Events"
        subtitle="Refine your results"
        sections={filterSections}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      <PopupModal
        visible={popup.visible}
        type={popup.type as any}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    letterSpacing: -0.5,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  activeTab: {
    backgroundColor: `${COLORS.primary}1A`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}4D`,
  },
  tabText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  matchRow: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    marginBottom: 16,
  },
  matchThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  statusRowHeader: {
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
    fontWeight: "bold",
  },
  matchRowTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  matchRowStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowStatLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    textTransform: "uppercase",
  },
  rowStatValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "white",
  },
  verticalDivider: {
    width: 1,
    height: 16,
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
    fontWeight: "bold",
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  joinButtonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    gap: 16,
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 14,
    fontWeight: "500",
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: `${COLORS.primary}26`,
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: `${COLORS.accentBlue}1A`,
    borderRadius: 150,
    opacity: 0.5,
  },
  applyBtn: {
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
  },
  applyBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  filterBtnActive: {
    borderColor: `${COLORS.primary}4D`,
    backgroundColor: `${COLORS.primary}1A`,
  },
});
