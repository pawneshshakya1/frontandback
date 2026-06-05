import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../../theme/colors";

interface HistoryEntry {
  _id: string;
  action: string;
  label?: string;
  tier?: string;
  created_at: string;
  amount: number;
}

interface Props {
  tierHistory: HistoryEntry[];
}

const actionColors: Record<string, string> = {
  ACTIVATED: COLORS.success,
  PURCHASE: COLORS.primary,
  UPGRADE: "#fbbf24",
  DOWNGRADE: COLORS.error,
  EXPIRED: COLORS.textMuted,
};

const actionIcons: Record<string, string> = {
  ACTIVATED: "celebration",
  PURCHASE: "shopping-cart",
  UPGRADE: "trending-up",
  DOWNGRADE: "trending-down",
  EXPIRED: "timer-off",
};

const actionLabels: Record<string, string> = {
  ACTIVATED: "Activated",
  PURCHASE: "Purchased",
  UPGRADE: "Upgrade",
  DOWNGRADE: "Downgrade",
  EXPIRED: "Expired",
};

export const PartnerHistory = ({ tierHistory }: Props) => {
  return (
    <View style={styles.tabContent}>
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.historyIconWrap}>
            <MaterialIcons name="history" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.historyTitle}>Plan Changes</Text>
        </View>

        {tierHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="timeline"
              size={48}
              color="rgba(255,255,255,0.08)"
            />
            <Text style={styles.emptyTitle}>No plan changes yet</Text>
            <Text style={styles.emptySub}>
              Your subscription history will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {tierHistory.map((entry, idx) => {
              const color = actionColors[entry.action] || COLORS.textMuted;
              const icon = actionIcons[entry.action] || ("circle" as any);

              return (
                <View
                  key={entry._id || idx}
                  style={[
                    styles.historyEntry,
                    idx === tierHistory.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View
                    style={[
                      styles.historyDot,
                      { backgroundColor: color + "20", borderColor: color },
                    ]}
                  >
                    <MaterialIcons name={icon} size={14} color={color} />
                  </View>
                  <View style={styles.historyEntryBody}>
                    <View style={styles.historyEntryTop}>
                      <Text style={styles.historyEntryAction}>
                        {actionLabels[entry.action] || entry.action}
                      </Text>
                      <Text style={styles.historyEntryTier}>
                        {entry.label || entry.tier}
                      </Text>
                    </View>
                    <Text style={styles.historyEntryDate}>
                      {new Date(entry.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {entry.amount > 0 && (
                      <Text style={styles.historyEntryAmount}>
                        ₹{entry.amount.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { paddingHorizontal: 16 },

  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(244,123,37,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  historyList: {
    gap: 0,
  },
  historyEntry: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  historyDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  historyEntryBody: {
    flex: 1,
  },
  historyEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  historyEntryAction: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
  },
  historyEntryTier: {
    fontSize: 13,
    fontWeight: "800",
    color: "white",
  },
  historyEntryDate: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginTop: 1,
  },
  historyEntryAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
  },

  emptyState: { alignItems: "center", padding: 32 },
  emptyTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
  },
  emptySub: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
});
