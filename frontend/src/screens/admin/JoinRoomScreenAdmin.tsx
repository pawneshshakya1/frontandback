import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from "../../services/api";
import { useFocusEffect } from "@react-navigation/native";
import { FilterBottomSheet, FilterSection } from "../../components/FilterBottomSheet";

const { width } = Dimensions.get("window");

export const JoinRoomScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'FINISHED'>('ALL');
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories = ["All", "Battle Royale", "Deathmatch", "Search & Destroy"];

  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/matches/my-matches');
      if (response.data.success) {
        setMatches(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch joined matches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchMatches();
    }, [])
  );

  const handleConfirmDate = (date: Date) => {
    setSelectedDate(date);
    setDatePickerVisible(false);
    setFilterModalVisible(false); // Close modal after picking date? Or keep open? Let's close for now or let user manually apply.
    // For smoother UX, maybe verify if we want to just set date and keep modal open.
    // User asked "filter by date and time".
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSelectedDate(null);
  };

  const applyFilters = (values: Record<string, string>) => {
    const newStatus = (values.status || 'ALL') as 'ALL' | 'UPCOMING' | 'FINISHED';
    setStatusFilter(newStatus);
    setFilterModalVisible(false);
  };

  const filterSections: FilterSection[] = [
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      options: [
        { key: 'ALL', label: 'All Matches', icon: 'apps' },
        { key: 'UPCOMING', label: 'Upcoming', icon: 'schedule' },
        { key: 'FINISHED', label: 'Finished', icon: 'check-circle' },
      ],
    },
  ];

  const parseMatchDate = (dateStr: string) => {
    try {
      // Try standard parsing first
      const standardTimestamp = Date.parse(dateStr);
      if (!isNaN(standardTimestamp)) return new Date(standardTimestamp);

      // Manual Parsing for "17 Jan 2026"
      const parts = dateStr.match(/(\d+)\s+([a-zA-Z]+)\s+(\d+)/);
      if (!parts) return null;

      const [_, day, monthStr, year] = parts;
      const monthMap: { [key: string]: number } = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };

      const month = monthMap[monthStr.substring(0, 3)];
      if (month === undefined) return null;

      return new Date(parseInt(year), month, parseInt(day));
    } catch (e) {
      return null;
    }
  };

  const filteredMatches = matches.filter(match => {
    // 1. Status Filter
    if (statusFilter === 'UPCOMING' && match.status !== 'OPEN' && match.status !== 'ONGOING') return false;
    if (statusFilter === 'FINISHED' && match.status !== 'COMPLETED' && match.status !== 'REVIEW') return false;

    // 2. Date Filter
    if (selectedDate) {
      const d = parseMatchDate(match.match_date);
      if (!d) return false;

      if (
        d.getDate() !== selectedDate.getDate() ||
        d.getMonth() !== selectedDate.getMonth() ||
        d.getFullYear() !== selectedDate.getFullYear()
      ) {
        return false;
      }
    }

    // 3. Category Filter
    if (filter !== "All" && match.game_type !== filter) return false;

    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Joined Match</Text>

        <TouchableOpacity
          style={[styles.filterBtn, (statusFilter !== 'ALL' || selectedDate) ? styles.filterBtnActive : null]}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="tune" size={20} color={(statusFilter !== 'ALL' || selectedDate) ? COLORS.primary : "white"} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={{ marginTop: 50 }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filteredMatches.length > 0 ? (
          filteredMatches.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.matchCard}
              onPress={() => navigation.navigate("MatchDetail", { matchId: item._id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.game_type}</Text>
                </View>
                <Text style={[styles.timeLeft, (item.status === 'COMPLETED' || item.status === 'FINISHED') && { color: '#666' }]}>
                  {item.status === 'OPEN' ? 'UPCOMING' : item.status}
                </Text>
              </View>

              <Text style={styles.matchTitle}>{item.title}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>ENTRY</Text>
                  <Text style={styles.statValue}>{item.entry_fee === 0 ? 'Free' : `$${item.entry_fee}`}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>PRIZE</Text>
                  <Text style={[styles.statValue, { color: '#f47b25' }]}>${item.prize_pool}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>PLAYERS</Text>
                  <Text style={styles.statValue}>{item.participants?.length || 0}/{item.max_players}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matches found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal (status) */}
      <FilterBottomSheet
        visible={isFilterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title="Filter Matches"
        subtitle="Refine your joined matches"
        sections={filterSections}
        onApply={applyFilters}
        onReset={clearFilters}
      />

      {/* Date filter chip + button */}
      {selectedDate && (
        <View style={styles.dateChip}>
          <MaterialIcons name="calendar-today" size={14} color={COLORS.primary} />
          <Text style={styles.dateChipText}>{selectedDate.toDateString()}</Text>
          <TouchableOpacity onPress={() => setSelectedDate(null)}>
            <MaterialIcons name="close" size={14} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity style={styles.dateFilterBtn} onPress={() => setDatePickerVisible(true)}>
        <MaterialIcons name="calendar-today" size={16} color={selectedDate ? COLORS.primary : "white"} />
        <Text style={[styles.dateFilterBtnText, selectedDate && { color: COLORS.primary }]}>
          {selectedDate ? 'Change Date' : 'Filter by Date'}
        </Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisible(false)}
        textColor="black" // Or custom based on theme support
      />
    </View>
  );
};

const COLORS = {
  primary: "#f47b25",
  bgDark: "#0d0d0d",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
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
  filterBtnActive: {
    borderColor: "rgba(244,123,37,0.3)",
    backgroundColor: "rgba(244,123,37,0.1)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  filterBar: {
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeChip: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderColor: "#f47b25",
  },
  chipText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  activeChipText: {
    color: "#f47b25",
  },
  matchCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  typeBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "bold",
  },
  timeLeft: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "bold",
  },
  matchTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 16,
  },
  stat: {
    alignItems: "flex-start",
  },
  statLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
  },

  // Date filter chip + button
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244,123,37,0.1)',
    borderColor: 'rgba(244,123,37,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  dateChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dateFilterBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
});
