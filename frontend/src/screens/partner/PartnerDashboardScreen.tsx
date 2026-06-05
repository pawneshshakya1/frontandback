import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { sseService } from "../../services/sse";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

const StatCard = ({ icon, label, value, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
      <MaterialIcons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const EventCard = ({ event, navigation }: any) => (
  <TouchableOpacity
    style={styles.eventCard}
    onPress={() => navigation.navigate("PartnerEventDetail", { event })}
  >
    <View style={styles.eventHeader}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              event.status === "OPEN"
                ? COLORS.success + "20"
                : event.status === "COMPLETED"
                ? COLORS.accentBlue + "20"
                : event.status === "DRAFT"
                ? "#6b7280" + "20"
                : COLORS.error + "20",
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color:
                event.status === "OPEN"
                  ? COLORS.success
                  : event.status === "COMPLETED"
                  ? COLORS.accentBlue
                  : event.status === "DRAFT"
                  ? "#6b7280"
                  : COLORS.error,
            },
          ]}
        >
          {event.status}
        </Text>
      </View>
    </View>
    <View style={styles.eventDetails}>
      <View style={styles.eventDetailRow}>
        <MaterialIcons name="calendar-today" size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.eventDetailText}>
          {event.match_date} at {event.match_time}
        </Text>
      </View>
      <View style={styles.eventDetailRow}>
        <MaterialIcons name="people" size={14} color="rgba(255,255,255,0.5)" />
        <Text style={styles.eventDetailText}>
          {event.participants?.length || 0}/{event.max_players} Joined
        </Text>
      </View>
      <View style={styles.eventDetailRow}>
        <MaterialIcons
          name={event.event_type === "OFFLINE" ? "location-on" : "wifi"}
          size={14}
          color="rgba(255,255,255,0.5)"
        />
        <Text style={styles.eventDetailText}>
          {event.event_type === "OFFLINE" ? "OFFLINE" : "ONLINE"}
        </Text>
      </View>
    </View>
    <View style={styles.eventActions}>
      {event.status === "DRAFT" && (
        <>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate("PartnerEditEvent", { event })}
          >
            <MaterialIcons name="edit" size={16} color="white" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={() => Alert.alert("Publish", "Publish this event?")}
          >
            <MaterialIcons name="publish" size={16} color="white" />
            <Text style={styles.actionBtnText}>Publish</Text>
          </TouchableOpacity>
        </>
      )}
      {event.status === "OPEN" && (
        <>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.accentBlue }]}
            onPress={() =>
              navigation.navigate("PartnerParticipants", { event })
            }
          >
            <MaterialIcons name="group" size={16} color="white" />
            <Text style={styles.actionBtnText}>Participants</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
            onPress={() =>
              navigation.navigate("PartnerRoomUpdate", { event })
            }
          >
            <MaterialIcons name="vpn-lock" size={16} color="white" />
            <Text style={styles.actionBtnText}>Room Details</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  </TouchableOpacity>
);

export const PartnerDashboardScreen = ({ navigation }: any) => {
  const { authData } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>({
    total_events: 0,
    open_events: 0,
    completed_events: 0,
    total_participants: 0,
    online_events: 0,
    offline_events: 0,
    total_revenue: 0,
  });
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();

    sseService.on("MATCH_UPDATE", () => loadDashboard());
    sseService.on("PARTICIPANT_UPDATE", () => loadDashboard());

    return () => {
      sseService.off("MATCH_UPDATE", () => {});
      sseService.off("PARTICIPANT_UPDATE", () => {});
    };
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const api = (await import("../../services/api")).default;
      const res = await api.get("/partner/dashboard");
      if (res.data.success) {
        setStats(res.data.data.stats);
        setEvents(res.data.data.events);
      }
    } catch (e: any) {
      console.error("Partner dashboard error:", e.message);
      setError('Failed to load dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val: number) => `₹ ${Number(val).toLocaleString()}`;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={["#1a1a1a", "#0d0d0d"]} style={styles.absoluteFull} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={["#1a1a1a", "#0d0d0d"]} style={styles.absoluteFull} />
        <MaterialIcons name="error-outline" size={48} color={COLORS.error} />
        <Text style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>{error || 'An error occurred'}</Text>
        <TouchableOpacity
          style={[styles.createBtn, { marginTop: 16 }]}
          onPress={loadDashboard}
        >
          <MaterialIcons name="refresh" size={20} color="white" />
          <Text style={styles.createBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={["#1a1a1a", "#0d0d0d"]}
        style={styles.absoluteFull}
      />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.username}>{authData?.username || "Partner"}</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate("PartnerCreateEvent")}
        >
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.createBtnText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsGrid}>
          <StatCard icon="emoji-events" label="Total Events" value={stats.total_events} color={COLORS.primary} />
          <StatCard icon="currency-rupee" label="Revenue" value={formatMoney(stats.total_revenue)} color={COLORS.success} />
          <StatCard icon="wifi" label="Online" value={stats.online_events} color={COLORS.accentBlue} />
          <StatCard icon="location-on" label="Offline" value={stats.offline_events} color="#a855f7" />
          <StatCard icon="people" label="Participants" value={stats.total_participants} color="#f59e0b" />
          <StatCard icon="check-circle" label="Completed" value={stats.completed_events} color={COLORS.success} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING EVENTS</Text>
          {events
            .filter((e) => e.status === "OPEN" || e.status === "DRAFT")
            .slice(0, 5)
            .map((event) => (
              <EventCard key={event._id} event={event} navigation={navigation} />
            ))}
          {events.filter((e) => e.status === "OPEN" || e.status === "DRAFT").length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="emoji-events" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No upcoming events</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate("PartnerCreateEvent")}
              >
                <Text style={styles.emptyBtnText}>Create Your First Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  absoluteFull: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greeting: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  username: { color: "white", fontSize: 20, fontWeight: "bold" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  createBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
  scrollContent: { paddingBottom: 100 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { color: "white", fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventTitle: { color: "white", fontSize: 16, fontWeight: "bold", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "bold", textTransform: "uppercase" },
  eventDetails: { gap: 8, marginBottom: 12 },
  eventDetailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventDetailText: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  eventActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: { color: "white", fontWeight: "bold", fontSize: 13 },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 16, marginTop: 12 },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
});
