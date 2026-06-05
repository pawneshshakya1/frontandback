import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { adminAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

export const MatchAnalyticsScreenAdmin = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { matchId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    if (matchId) loadData();
  }, [matchId]);

  const loadData = async () => {
    try {
      const [analyticsRes, matchRes] = await Promise.allSettled([
        adminAPI.getMatchAnalytics(matchId),
        adminAPI.getMatch(matchId),
      ]);
      if (analyticsRes.status === "fulfilled" && analyticsRes.value.data.success) {
        setAnalytics(analyticsRes.value.data.data);
      }
      if (matchRes.status === "fulfilled" && matchRes.value.data.success) {
        setMatch(matchRes.value.data.data);
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match Analytics</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(59,130,246,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Match Info */}
        {match && (
          <View style={styles.matchCard}>
            <Text style={styles.matchTitle}>{match.title}</Text>
            <View style={styles.matchMeta}>
              <Text style={styles.matchMetaText}>{match.game_type} • {match.mode}</Text>
              <Text style={[styles.matchStatus, { color: match.status === "COMPLETED" ? COLORS.success : match.status === "ONGOING" ? "#3b82f6" : COLORS.primary }]}>{match.status}</Text>
            </View>
          </View>
        )}

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <MaterialIcons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.metricVal}>{analytics?.total_participants || match?.participants?.length || 0}</Text>
            <Text style={styles.metricLbl}>Participants</Text>
          </View>
          <View style={styles.metricBox}>
            <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.success} />
            <Text style={styles.metricVal}>{formatCurrency(analytics?.total_entry_fees || match?.total_entry_fees_collected || 0)}</Text>
            <Text style={styles.metricLbl}>Entry Fees</Text>
          </View>
          <View style={styles.metricBox}>
            <MaterialIcons name="emoji-events" size={20} color="#fbbf24" />
            <Text style={styles.metricVal}>{formatCurrency(analytics?.prize_pool || match?.prize_pool || 0)}</Text>
            <Text style={styles.metricLbl}>Prize Pool</Text>
          </View>
          <View style={styles.metricBox}>
            <MaterialIcons name="percent" size={20} color="#a855f7" />
            <Text style={styles.metricVal}>{formatCurrency(analytics?.commission || match?.commission_amount || 0)}</Text>
            <Text style={styles.metricLbl}>Commission</Text>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>FINANCIAL SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Entry Fees</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(match?.total_entry_fees_collected || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Prize Pool</Text>
            <Text style={[styles.summaryValue, { color: "#fbbf24" }]}>{formatCurrency(match?.prize_pool || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Commission ({match?.commission_rate || 0}%)</Text>
            <Text style={[styles.summaryValue, { color: "#a855f7" }]}>{formatCurrency(match?.commission_amount || 0)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.summaryLabel, { color: "white", fontWeight: "bold" }]}>Platform Profit</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success, fontWeight: "bold" }]}>
              {formatCurrency((match?.total_entry_fees_collected || 0) - (match?.prize_pool || 0) - (match?.commission_amount || 0))}
            </Text>
          </View>
        </View>

        {/* Participants */}
        {match?.participants?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PARTICIPANTS ({match.participants.length})</Text>
            {match.participants.map((p: any, idx: number) => {
              const participantName = typeof p.user_id === 'object' 
                ? p.user_id?.username || "?"
                : typeof p.user_id === 'string'
                  ? p.user_id
                  : "?";
              return (
              <View key={idx} style={[styles.participantRow, idx < match.participants.length - 1 && styles.participantDivider]}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantInitial}>{participantName[0]?.toUpperCase() || "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>{participantName}</Text>
                  <Text style={styles.participantTime}>Joined {new Date(p.joined_at).toLocaleDateString("en-IN")}</Text>
                </View>
                {p.kills !== undefined && <Text style={styles.participantKills}>{p.kills || 0} kills</Text>}
              </View>
              );
            })}
          </View>
        )}

        {/* Match Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MATCH SETTINGS</Text>
          <InfoRow label="Entry Fee" value={formatCurrency(match?.entry_fee || 0)} />
          <InfoRow label="Prize Pool" value={formatCurrency(match?.prize_pool || 0)} />
          <InfoRow label="Map" value={match?.map || "N/A"} />
          <InfoRow label="Max Players" value={`${match?.max_players || 0}`} />
          <InfoRow label="Event Type" value={match?.event_type || "ONLINE"} />
          <InfoRow label="Room ID" value={match?.room_id || "Not set"} />
          <InfoRow label="Mediator" value={match?.mediator_email || "None"} />
          <InfoRow label="Created By" value={match?.created_by?.username || "Unknown"} />
          <InfoRow label="Created At" value={new Date(match?.createdAt).toLocaleString("en-IN")} />
        </View>
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  // Match Card
  matchCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  matchTitle: { color: "white", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  matchMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  matchMetaText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  matchStatus: { fontSize: 12, fontWeight: "bold" },

  // Metrics
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  metricBox: { width: (width - 42) / 2, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 6 },
  metricVal: { color: "white", fontSize: 18, fontWeight: "900" },
  metricLbl: { color: "rgba(255,255,255,0.4)", fontSize: 10 },

  // Cards
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cardTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 16 },

  // Summary
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  summaryLabel: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  summaryValue: { color: "white", fontSize: 14, fontWeight: "bold" },

  // Participants
  participantRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  participantDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  participantAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center" },
  participantInitial: { color: COLORS.primary, fontSize: 14, fontWeight: "bold" },
  participantName: { color: "white", fontSize: 13, fontWeight: "600" },
  participantTime: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 },
  participantKills: { color: COLORS.primary, fontSize: 12, fontWeight: "bold" },

  // Info
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  infoLabel: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  infoValue: { color: "white", fontSize: 13, fontWeight: "600" },
});
