import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Clipboard, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  CREDENTIALS_REVEAL_BEFORE_MIN,
  formatCountdown,
  getCredentialsEditCutoff,
  getCredentialsRevealTime,
  secondsUntil,
} from "../utils/matchTime";

interface RoomCredentialsCardProps {
  match: any;
  isHost?: boolean;
  onEdit?: () => void;
  accentColor?: string;
}

export const RoomCredentialsCard: React.FC<RoomCredentialsCardProps> = ({
  match,
  isHost = false,
  onEdit,
  accentColor = "#fbbf24",
}) => {
  const [, setTick] = useState(0);

  // Re-render every second to keep countdown live
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!match) return null;

  const revealAt = getCredentialsRevealTime(match);
  const editOpensAt = getCredentialsEditCutoff(match);
  const now = new Date();
  const isRevealed = revealAt && now >= revealAt;
  const editOpensIn = secondsUntil(editOpensAt);
  const revealIn = secondsUntil(revealAt);
  const hasRoomId = !!match.room_id;
  const hasPassword = !!match.room_password;

  // For HOST: show edit / view
  if (isHost) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { borderColor: `${accentColor}50` }]}>
            <MaterialIcons name="vpn-key" size={18} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Room Credentials</Text>
            <Text style={styles.subtitle}>
              {hasRoomId ? "Visible to participants now" : "Not set yet"}
            </Text>
          </View>
          {onEdit && (
            <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
              <MaterialIcons
                name={hasRoomId ? "edit" : "add"}
                size={14}
                color={accentColor}
              />
              <Text style={[styles.editBtnText, { color: accentColor }]}>
                {hasRoomId ? "EDIT" : "ADD"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {hasRoomId ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <CredentialRow
              label="ROOM ID"
              value={match.room_id}
              accentColor={accentColor}
            />
            {hasPassword && (
              <CredentialRow
                label="PASSWORD"
                value={match.room_password}
                accentColor={accentColor}
              />
            )}
            <View style={styles.hostNote}>
              <MaterialIcons
                name="visibility"
                size={12}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.hostNoteText}>
                Players will see these {CREDENTIALS_REVEAL_BEFORE_MIN} min before
                match start
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="lock-clock"
              size={28}
              color="rgba(255,255,255,0.3)"
            />
            <Text style={styles.emptyText}>
              Add room ID {editOpensIn > 0 ? `(available in ${formatCountdown(editOpensIn)})` : "(edit window open)"}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // For JOINER
  if (!hasRoomId) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { borderColor: "rgba(255,255,255,0.1)" }]}>
            <MaterialIcons name="vpn-key" size={18} color="rgba(255,255,255,0.4)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Room Credentials</Text>
            <Text style={styles.subtitle}>
              Host hasn't shared the room yet
            </Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <MaterialIcons
            name="hourglass-empty"
            size={28}
            color="rgba(255,255,255,0.3)"
          />
          <Text style={styles.emptyText}>
            The host will share the room ID and password 5 minutes before the
            match starts.
          </Text>
        </View>
      </View>
    );
  }

  // Credentials set, but not yet visible
  if (!isRevealed) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { borderColor: `${accentColor}50` }]}>
            <MaterialIcons name="lock-clock" size={18} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Room Credentials</Text>
            <Text style={styles.subtitle}>Host has set the room</Text>
          </View>
        </View>

        <View style={styles.lockedBody}>
          <BlurView intensity={40} tint="dark" style={styles.lockedOverlay}>
            <View style={styles.lockedTextGroup}>
              <Text style={styles.lockedLabel}>ROOM ID</Text>
              <Text style={styles.lockedValue}>••••••</Text>
            </View>
            {hasPassword && (
              <View style={styles.lockedTextGroup}>
                <Text style={styles.lockedLabel}>PASSWORD</Text>
                <Text style={styles.lockedValue}>••••••</Text>
              </View>
            )}
          </BlurView>
        </View>

        <View style={styles.countdownRow}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={accentColor}
          />
          <Text style={[styles.countdownText, { color: accentColor }]}>
            Unlocks in {formatCountdown(revealIn)}
          </Text>
        </View>
      </View>
    );
  }

  // Revealed!
  return (
    <View style={[styles.card, { borderColor: `${accentColor}40` }]}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconBox,
            { borderColor: accentColor, backgroundColor: `${accentColor}15` },
          ]}
        >
          <MaterialIcons name="vpn-key" size={18} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Room Credentials</Text>
          <Text style={[styles.subtitle, { color: accentColor }]}>
            Live now — join the room
          </Text>
        </View>
        <View style={styles.livePulse}>
          <View style={styles.pulseDot} />
          <Text style={[styles.livePulseText, { color: accentColor }]}>LIVE</Text>
        </View>
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        <CredentialRow
          label="ROOM ID"
          value={match.room_id}
          accentColor={accentColor}
        />
        {hasPassword && (
          <CredentialRow
            label="PASSWORD"
            value={match.room_password}
            accentColor={accentColor}
          />
        )}
      </View>
    </View>
  );
};

const CredentialRow = ({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor: string;
}) => {
  const copy = () => {
    Clipboard.setString(value);
    Alert.alert("Copied", `${label} copied to clipboard`);
  };
  return (
    <TouchableOpacity
      style={styles.credentialRow}
      onPress={copy}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.credLabel}>{label}</Text>
        <Text style={[styles.credValue, { color: accentColor }]} selectable>
          {value}
        </Text>
      </View>
      <MaterialIcons
        name="content-copy"
        size={16}
        color="rgba(255,255,255,0.4)"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  editBtnText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  lockedBody: {
    position: "relative",
    marginTop: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  lockedOverlay: {
    padding: 16,
    gap: 12,
  },
  lockedTextGroup: {
    gap: 4,
  },
  lockedLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  lockedValue: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 4,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: "700",
  },
  credentialRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  credLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  credValue: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: "Courier",
  },
  hostNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  hostNoteText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    flex: 1,
  },
  livePulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fbbf24",
  },
  livePulseText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
