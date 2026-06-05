import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../theme/colors";

interface Stats {
  events_this_month: number;
  max_events_per_month: number;
  remaining_events: number;
  total_events_created: number;
  total_revenue: number;
  total_commission_paid: number;
  commission_rate: number;
}

interface Benefits {
  can_create_sponsored?: boolean;
  can_create_premium?: boolean;
  can_create_offline?: boolean;
  max_entry_fee?: number;
  max_prize_pool?: number;
  max_players_per_event?: number;
}

interface TierInfo {
  current_tier: string;
  tier_label: string;
  tier_config: any;
  all_tiers: any;
  stats: Stats;
  tier_expiry: string | null;
  tier_upgraded_at: string | null;
  benefits: Benefits;
}

interface Props {
  tierInfo: TierInfo | null;
  currentTier: string;
  handleDegrade: () => void;
}

export const PartnerOverview = ({ tierInfo, currentTier, handleDegrade }: Props) => {
  if (!tierInfo) return null;
  const stats = tierInfo.stats;

  return (
    <View style={styles.tabContent}>
      {/* Monthly Usage */}
      <LinearGradient
        colors={[COLORS.surface, COLORS.backgroundDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.usageCard}
      >
        <View style={styles.usageHeader}>
          <View style={styles.usageHeaderLeft}>
            <View style={styles.usageIconWrap}>
              <MaterialIcons name="event" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.usageTitle}>Monthly Usage</Text>
          </View>
          <View
            style={[
              styles.usagePill,
              {
                backgroundColor:
                  (stats?.remaining_events || 0) > 0 ||
                  stats?.remaining_events === -1
                    ? "rgba(34,197,94,0.12)"
                    : "rgba(239,68,68,0.12)",
                borderColor:
                  (stats?.remaining_events || 0) > 0 ||
                  stats?.remaining_events === -1
                    ? "rgba(34,197,94,0.25)"
                    : "rgba(239,68,68,0.25)",
              },
            ]}
          >
            <MaterialIcons
              name={
                (stats?.remaining_events || 0) > 0 ||
                stats?.remaining_events === -1
                  ? "check-circle"
                  : "warning"
              }
              size={12}
              color={
                (stats?.remaining_events || 0) > 0 ||
                stats?.remaining_events === -1
                  ? COLORS.success
                  : COLORS.error
              }
            />
            <Text
              style={[
                styles.usagePillText,
                {
                  color:
                    (stats?.remaining_events || 0) > 0 ||
                    stats?.remaining_events === -1
                      ? COLORS.success
                      : COLORS.error,
                },
              ]}
            >
              {stats?.remaining_events === -1
                ? "Unlimited"
                : `${stats?.remaining_events || 0} left`}
            </Text>
          </View>
        </View>

        <View style={styles.usageCountArea}>
          <View style={styles.usageCountRow}>
            <Text style={styles.usageCountNum}>
              {stats?.events_this_month || 0}
            </Text>
            <Text style={styles.usageCountLabel}>events used</Text>
          </View>
          <View style={styles.usageMaxBadge}>
            <Text style={styles.usageMaxText}>
              {stats?.max_events_per_month === -1
                ? "∞"
                : `${stats?.max_events_per_month}`}
            </Text>
            <Text style={styles.usageMaxLabel}>max</Text>
          </View>
        </View>

        <View style={styles.usageTrack}>
          <View
            style={[
              styles.usageFill,
              {
                width: `${(stats?.max_events_per_month || 10) === -1 ? 20 : Math.min(100, ((stats?.events_this_month || 0) / (stats?.max_events_per_month || 10)) * 100)}%`,
              },
            ]}
          >
            <LinearGradient
              colors={[COLORS.primary, "#fb923c"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>
      </LinearGradient>

      {/* Benefits */}
      <View style={styles.benefitsCard}>
        <View style={styles.benefitsHeader}>
          <View style={styles.benefitsIconWrap}>
            <MaterialIcons name="workspace-premium" size={18} color="#fbbf24" />
          </View>
          <Text style={styles.benefitsTitle}>Benefits</Text>
        </View>

        <View style={styles.benefitsGrid}>
          <View
            style={[
              styles.benefitBlock,
              !tierInfo.benefits?.can_create_sponsored && styles.benefitBlockDisabled,
            ]}
          >
            <MaterialIcons
              name="campaign"
              size={16}
              color={
                tierInfo.benefits?.can_create_sponsored
                  ? COLORS.primary
                  : "rgba(255,255,255,0.15)"
              }
            />
            <Text
              style={[
                styles.benefitBlockText,
                !tierInfo.benefits?.can_create_sponsored && {
                  color: "rgba(255,255,255,0.2)",
                },
              ]}
              numberOfLines={1}
            >
              Sponsored
            </Text>
          </View>
          <View
            style={[
              styles.benefitBlock,
              !tierInfo.benefits?.can_create_premium && styles.benefitBlockDisabled,
            ]}
          >
            <MaterialIcons
              name="star"
              size={16}
              color={
                tierInfo.benefits?.can_create_premium
                  ? "#fbbf24"
                  : "rgba(255,255,255,0.15)"
              }
            />
            <Text
              style={[
                styles.benefitBlockText,
                !tierInfo.benefits?.can_create_premium && {
                  color: "rgba(255,255,255,0.2)",
                },
              ]}
              numberOfLines={1}
            >
              Premium
            </Text>
          </View>
          <View
            style={[
              styles.benefitBlock,
              !tierInfo.benefits?.can_create_offline && styles.benefitBlockDisabled,
            ]}
          >
            <MaterialIcons
              name="wifi-off"
              size={16}
              color={
                tierInfo.benefits?.can_create_offline
                  ? COLORS.info
                  : "rgba(255,255,255,0.15)"
              }
            />
            <Text
              style={[
                styles.benefitBlockText,
                !tierInfo.benefits?.can_create_offline && {
                  color: "rgba(255,255,255,0.2)",
                },
              ]}
              numberOfLines={1}
            >
              Offline
            </Text>
          </View>
        </View>

        <View style={styles.limitsSection}>
          <Text style={styles.limitsLabel}>Limits</Text>
          <View style={styles.limitsRow}>
            <View style={styles.limitItem}>
              <Text style={styles.limitValue}>
                ₹{tierInfo.benefits?.max_entry_fee || 100}
              </Text>
              <Text style={styles.limitDesc}>Max Entry Fee</Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitItem}>
              <Text style={styles.limitValue}>
                ₹
                {(
                  tierInfo.benefits?.max_prize_pool || 5000
                ).toLocaleString()}
              </Text>
              <Text style={styles.limitDesc}>Prize Pool</Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitItem}>
              <Text style={styles.limitValue}>
                {tierInfo.benefits?.max_players_per_event || 50}
              </Text>
              <Text style={styles.limitDesc}>Players</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Lifetime Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statsCardHeader}>
          <View style={styles.statsIconWrap}>
            <MaterialIcons name="insights" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.statsCardTitle}>Lifetime Stats</Text>
        </View>

        <View style={styles.statsRowNew}>
          <View style={[styles.statBlock, { borderLeftColor: COLORS.primary }]}>
            <MaterialIcons
              name="event-note"
              size={20}
              color={COLORS.primary}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.statBlockValue, { color: COLORS.primary }]}>
              {stats?.total_events_created || 0}
            </Text>
            <Text style={styles.statBlockLabel}>Events</Text>
          </View>
          <View style={[styles.statBlock, { borderLeftColor: COLORS.success }]}>
            <MaterialIcons
              name="account-balance-wallet"
              size={20}
              color={COLORS.success}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.statBlockValue, { color: COLORS.success }]}>
              ₹{(stats?.total_revenue || 0).toLocaleString()}
            </Text>
            <Text style={styles.statBlockLabel}>Revenue</Text>
          </View>
          <View style={[styles.statBlock, { borderLeftColor: COLORS.error }]}>
            <MaterialIcons
              name="receipt-long"
              size={20}
              color={COLORS.error}
              style={{ marginBottom: 6 }}
            />
            <Text style={[styles.statBlockValue, { color: COLORS.error }]}>
              ₹{(stats?.total_commission_paid || 0).toLocaleString()}
            </Text>
            <Text style={styles.statBlockLabel}>Platform Fee</Text>
          </View>
        </View>
      </View>

      {currentTier !== "standard" && (
        <TouchableOpacity style={styles.downgradeBtn} onPress={handleDegrade}>
          <MaterialIcons name="arrow-downward" size={16} color={COLORS.error} />
          <Text style={styles.downgradeText}>Downgrade to Standard</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { paddingHorizontal: 16 },

  // Usage card
  usageCard: {
    borderRadius: 20,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  usageHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  usageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(244,123,37,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  usageTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  usagePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  usagePillText: { fontSize: 11, fontWeight: "700" },
  usageCountArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  usageCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  usageCountNum: {
    fontSize: 36,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1,
  },
  usageCountLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  usageMaxBadge: {
    alignItems: "flex-end",
  },
  usageMaxText: {
    fontSize: 18,
    fontWeight: "800",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: -0.5,
  },
  usageMaxLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
    fontWeight: "600",
    marginTop: 1,
  },
  usageTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  usageFill: { height: "100%", borderRadius: 3, overflow: "hidden" },

  // Benefits card
  benefitsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  benefitsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  benefitsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(251,191,36,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  benefitsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  benefitBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  benefitBlockDisabled: {
    opacity: 0.5,
  },
  benefitBlockText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  limitsSection: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 14,
  },
  limitsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1,
    marginBottom: 10,
  },
  limitsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  limitItem: {
    flex: 1,
    alignItems: "center",
  },
  limitValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "white",
    marginBottom: 2,
  },
  limitDesc: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
  },
  limitDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // Stats card
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  statsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(244,123,37,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
  },
  statsRowNew: {
    flexDirection: "row",
    gap: 10,
  },
  statBlock: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    borderLeftWidth: 3,
  },
  statBlockValue: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 2,
  },
  statBlockLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Downgrade
  downgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    backgroundColor: "rgba(239,68,68,0.04)",
  },
  downgradeText: { color: COLORS.error, fontSize: 13, fontWeight: "bold" },
});
