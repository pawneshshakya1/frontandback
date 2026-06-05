import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from '@react-navigation/native';
import api from "../../services/api";

const { width } = Dimensions.get("window");

export const MatchesListScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("All");
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const categories = ["All", "Battle Royale", "Deathmatch", "Search & Destroy"];

  const fetchMatches = async () => {
    try {
      const res = await api.get('/matches');
      setMatches(res.data.data || res.data); // Handle potential response structure diffs
    } catch (err) {
      console.error("Failed to fetch matches", err);
      Alert.alert('Error', 'Failed to load matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return '#f47b25';
      case 'ONGOING': return '#f47b25';
      case 'COMPLETED': return '#3b82f6';
      default: return '#9ca3af';
    }
  };

  const filteredMatches = matches.filter(m => {
    if (filter === 'All') return true;
    return m.game_type === filter || m.mode === filter; // loose filtering based on available data
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Active matches</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, filter === cat && styles.activeChip]}
              onPress={() => setFilter(cat)}
            >
              <Text style={[styles.chipText, filter === cat && styles.activeChipText]}>{cat.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#f47b25" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f47b25" />}
        >
          {filteredMatches.length > 0 ? filteredMatches.map((item, index) => (
            <TouchableOpacity
              key={item._id || index}
              style={styles.matchCard}
              onPress={() => navigation.navigate("MatchDetail", { matchId: item._id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.game_type || "CUSTOM"}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {item.isPublished === false && (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={[styles.statusText, { color: '#ffffff' }]}>DRAFT</Text>
                    </View>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.matchTitle}>{item.title}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>ENTRY</Text>
                  <Text style={styles.statValue}>{item.entry_fee > 0 ? `₹${item.entry_fee}` : 'FREE'}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>PRIZE</Text>
                  <Text style={[styles.statValue, { color: '#f47b25' }]}>₹{item.prize_pool}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>PLAYERS</Text>
                  <Text style={styles.statValue}>{item.participants?.length || 0}/{item.max_players}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No matches found.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f47b25",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 16,
  },
  filterBar: {
    paddingVertical: 16,
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
  scrollView: {
    flex: 1,
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
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 8,
    fontWeight: 'bold'
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
});
