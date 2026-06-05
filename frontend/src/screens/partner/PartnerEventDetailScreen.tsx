import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sseService } from "../../services/sse";
import { partnerAPI } from "../../services/api";
import { COLORS, SPACING, RADIUS } from "../../theme/colors";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";

export const PartnerEventDetailScreen = ({ route, navigation }: any) => {
  const { event: initialEvent } = route.params;
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState(initialEvent);
  const [participants, setParticipants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const ParticipantCard = ({ participant }: any) => (
    <View style={styles.participantCard}>
      <View style={styles.participantAvatar}>
        <MaterialIcons name="person" size={20} color="white" />
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{participant.username || "Unknown"}</Text>
        <Text style={styles.participantId}>ID: {participant._id?.slice(-6) || "N/A"}</Text>
      </View>
      <View style={styles.participantStatus}>
        <Text style={styles.participantStatusText}>
          {participant.kills !== undefined ? `${participant.kills} kills` : "Joined"}
        </Text>
      </View>
    </View>
  );

  // Store callback references for proper SSE cleanup
  const handleParticipantJoin = (data: any) => {
    if (data.matchId === event._id) {
      setParticipants((prev) => [...prev, data.participant]);
    }
  };

  const handleStatusChange = (data: any) => {
    if (data.matchId === event._id) {
      setEvent((prev: any) => ({ ...prev, status: data.status }));
    }
  };

  const handleRoomUpdate = (data: any) => {
    if (data.matchId === event._id) {
      setEvent((prev: any) => ({
        ...prev,
        room_id: data.room_id,
        room_password: data.room_password,
      }));
    }
  };

  useEffect(() => {
    loadEventDetails();

    sseService.on("PARTICIPANT_JOIN", handleParticipantJoin);
    sseService.on("MATCH_STATUS_CHANGE", handleStatusChange);
    sseService.on("ROOM_DETAILS_UPDATE", handleRoomUpdate);

    return () => {
      sseService.off("PARTICIPANT_JOIN", handleParticipantJoin);
      sseService.off("MATCH_STATUS_CHANGE", handleStatusChange);
      sseService.off("ROOM_DETAILS_UPDATE", handleRoomUpdate);
    };
  }, [event._id]);

  const loadEventDetails = async () => {
    setRefreshing(true);
    try {
      const res = await partnerAPI.getEvent(event._id);
      if (res.data.success) {
        setEvent(res.data.data);
        setParticipants(res.data.data.participants || []);
      }
    } catch (e: any) {
      console.error("Load event error:", e.message);
      Alert.alert("Error", e.response?.data?.message || "Failed to load event");
    } finally {
      setRefreshing(false);
    }
  };

  const isRoomEditable = () => {
    if (!event.match_date || !event.match_time) return false;
    const eventDateTime = new Date(`${event.match_date}T${event.match_time}`);
    const now = new Date();
    const diffMinutes = (eventDateTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 10 && diffMinutes > 0;
  };

  const handleUpdateRoom = async () => {
    if (!isRoomEditable()) {
      Alert.alert(
        "Cannot Update",
        "Room details can only be updated within 10 minutes of event start."
      );
      return;
    }

    navigation.navigate("PartnerRoomUpdate", { event });
  };

  const handleDeleteDraft = async () => {
    if (event.status !== "DRAFT") {
      Alert.alert("Cannot Delete", "Only draft events can be deleted.");
      return;
    }
    Alert.alert(
      "Delete Draft",
      "Are you sure you want to delete this draft? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await partnerAPI.deleteEvent(event._id);
              Alert.alert("Deleted", "Draft deleted successfully", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert("Error", e.response?.data?.message || "Failed to delete draft");
            }
          },
        },
      ]
    );
  };

  const handlePublishDraft = async () => {
    Alert.alert(
      "Publish Event",
      "This will make the event visible to all players. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          onPress: async () => {
            try {
              await partnerAPI.publishEvent(event._id);
              Alert.alert("Published", "Event is now live!", [
                { text: "OK", onPress: () => loadEventDetails() },
              ]);
            } catch (e: any) {
              Alert.alert("Error", e.response?.data?.message || "Failed to publish event");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return COLORS.success;
      case "COMPLETED": return COLORS.completed;
      case "DRAFT": return COLORS.draft;
      default: return COLORS.error;
    }
  };

  const formatMoney = (val: number) => `₹ ${Number(val).toLocaleString()}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#1a1a1a", "#0d0d0d"]} style={styles.absoluteFull} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEventDetails} tintColor={COLORS.primary} />}
      >
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) + "20" }]}>
            <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
              {event.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>{event.match_date} at {event.match_time}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons
              name={event.event_type === "OFFLINE" ? "location-on" : "wifi"}
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>{event.event_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="people" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>
              {participants.length}/{event.max_players} Players
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="currency-rupee" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Entry: {formatMoney(event.entry_fee)}</Text>
          </View>
          {event.per_kill > 0 && (
            <View style={styles.infoRow}>
              <MaterialIcons name="star" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>Per Kill: {formatMoney(event.per_kill)}</Text>
            </View>
          )}
          {event.event_type === "OFFLINE" && event.venue_name && (
            <View style={styles.infoRow}>
              <MaterialIcons name="place" size={18} color={COLORS.primary} />
              <Text style={styles.infoText}>{event.venue_name}</Text>
            </View>
          )}
        </View>

        {event.room_id && (
          <View style={styles.roomCard}>
            <View style={styles.roomHeader}>
              <MaterialIcons name="vpn-lock" size={20} color={COLORS.primary} />
              <Text style={styles.roomTitle}>Room Details</Text>
            </View>
            <View style={styles.roomDetails}>
              <Text style={styles.roomLabel}>Room ID:</Text>
              <Text style={styles.roomValue}>{event.room_id}</Text>
            </View>
            <View style={styles.roomDetails}>
              <Text style={styles.roomLabel}>Password:</Text>
              <Text style={styles.roomValue}>{event.room_password || "None"}</Text>
            </View>
            {isRoomEditable() && (
              <TouchableOpacity style={styles.updateRoomBtn} onPress={handleUpdateRoom}>
                <MaterialIcons name="edit" size={16} color="white" />
                <Text style={styles.updateRoomBtnText}>Update Room Details</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PARTICIPANTS ({participants.length})
          </Text>
          {participants.map((p) => (
            <ParticipantCard key={p._id} participant={p} />
          ))}
          {participants.length === 0 && (
            <EmptyState
              icon="people-outline"
              title="No participants yet"
            />
          )}
        </View>

        {event.status === "DRAFT" && (
          <View style={styles.draftActions}>
            <TouchableOpacity
              style={[styles.draftActionBtn, styles.editBtn]}
              onPress={() => navigation.navigate("PartnerEditEvent", { event })}
            >
              <MaterialIcons name="edit" size={20} color="white" />
              <Text style={styles.draftActionText}>Edit Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.draftActionBtn, styles.publishBtn]}
              onPress={handlePublishDraft}
            >
              <MaterialIcons name="publish" size={20} color="white" />
              <Text style={styles.draftActionText}>Publish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.draftActionBtn, styles.deleteBtn]}
              onPress={handleDeleteDraft}
            >
              <MaterialIcons name="delete" size={20} color="white" />
              <Text style={styles.draftActionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  absoluteFull: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  scrollContent: { paddingBottom: 100 },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  eventTitle: { color: "white", fontSize: 22, fontWeight: "bold", flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  infoText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  roomCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  roomHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  roomTitle: { color: "white", fontSize: 16, fontWeight: "bold" },
  roomDetails: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  roomLabel: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  roomValue: { color: "white", fontSize: 14, fontWeight: "bold" },
  updateRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  updateRoomBtnText: { color: "white", fontWeight: "bold", fontSize: 13 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginBottom: 12,
  },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  participantInfo: { flex: 1, marginLeft: 12 },
  participantName: { color: "white", fontSize: 14, fontWeight: "bold" },
  participantId: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  participantStatus: {
    backgroundColor: COLORS.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  participantStatusText: { color: COLORS.success, fontSize: 12, fontWeight: "bold" },
  draftActions: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  draftActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  editBtn: { backgroundColor: COLORS.accentBlue },
  publishBtn: { backgroundColor: COLORS.success },
  deleteBtn: { backgroundColor: COLORS.error },
  draftActionText: { color: "white", fontWeight: "bold", fontSize: 13 },
});
