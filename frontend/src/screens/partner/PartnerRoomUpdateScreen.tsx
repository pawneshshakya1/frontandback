import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../theme/colors";

const COLORS_LOCAL = {
  inputBg: "#2a2a2a",
};

export const PartnerRoomUpdateScreen = ({ route, navigation }: any) => {
  const { event } = route.params;
  const insets = useSafeAreaInsets();
  const [roomId, setRoomId] = useState(event.room_id || "");
  const [roomPassword, setRoomPassword] = useState(event.room_password || "");
  const [updating, setUpdating] = useState(false);

  const isEditable = () => {
    if (!event.match_date || !event.match_time) return false;
    const eventDateTime = new Date(`${event.match_date}T${event.match_time}`);
    const now = new Date();
    const diffMinutes = (eventDateTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 10 && diffMinutes > 0;
  };

  const handleUpdate = async () => {
    if (!roomId) {
      Alert.alert("Validation Error", "Room ID is required");
      return;
    }

    if (!isEditable()) {
      Alert.alert(
        "Cannot Update",
        "Room details can only be updated within 10 minutes of event start."
      );
      return;
    }

    setUpdating(true);
    try {
      const api = (await import("../../services/api")).default;
      const res = await api.post(`/partner/events/${event._id}/room-details`, {
        room_id: roomId,
        room_password: roomPassword,
      });

      if (res.data.success) {
        Alert.alert("Success", "Room details updated successfully", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Failed to update room details");
    } finally {
      setUpdating(false);
    }
  };

  if (!isEditable()) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={["#1a1a1a", "#0d0d0d"]} style={styles.absoluteFull} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Room</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.blockedContainer}>
          <MaterialIcons name="lock" size={64} color="rgba(255,255,255,0.2)" />
          <Text style={styles.blockedTitle}>Room Update Locked</Text>
          <Text style={styles.blockedText}>
            Room details can only be updated within 10 minutes of the event start time.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#1a1a1a", "#0d0d0d"]} style={styles.absoluteFull} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Room</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventTime}>
            {event.match_date} at {event.match_time}
          </Text>
        </View>

        <View style={styles.warningBox}>
          <MaterialIcons name="warning" size={20} color={COLORS.primary} />
          <Text style={styles.warningText}>
            Room details can be updated only once every 10 minutes.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Room ID *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Room ID"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={roomId}
            onChangeText={setRoomId}
          />

          <Text style={styles.inputLabel}>Room Password (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Room Password"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={roomPassword}
            onChangeText={setRoomPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.updateBtn, updating && styles.updateBtnDisabled]}
          onPress={handleUpdate}
          disabled={updating}
        >
          <MaterialIcons name="update" size={20} color="white" />
          <Text style={styles.updateBtnText}>
            {updating ? "Updating..." : "Update Room Details"}
          </Text>
        </TouchableOpacity>
      </View>
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
  blockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  blockedTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  blockedText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  eventInfo: { marginBottom: 24 },
  eventTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  eventTime: { color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 4 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${COLORS.primary}20`,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  warningText: { color: COLORS.primary, fontSize: 13, flex: 1 },
  form: { marginBottom: 32 },
  inputLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 8,
  },
    input: {
    backgroundColor: COLORS_LOCAL.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "white",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 16,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  updateBtnDisabled: { opacity: 0.5 },
  updateBtnText: { color: "white", fontWeight: "bold", fontSize: 14 },
});
