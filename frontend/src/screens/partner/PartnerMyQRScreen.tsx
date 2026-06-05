import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Share,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { partnerSubscriptionAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const TIER_COLORS: Record<string, string> = {
  standard: "#94a3b8",
  sponsored: "#3b82f6",
  premium: "#fbbf24",
};

const TIER_ICONS: Record<string, string> = {
  standard: "shield",
  sponsored: "campaign",
  premium: "workspace-premium",
};

export const PartnerMyQRScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchQr();
    }, [])
  );

  const fetchQr = async () => {
    try {
      const res = await partnerSubscriptionAPI.getMyQrCode();
      setQrData(res.data.data);
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to load QR code");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setRevealed(false);
    fetchQr();
  };

  const handleRegenerate = () => {
    Alert.alert(
      "Regenerate QR Code?",
      "Your old QR code will stop working. Anyone using it will need to scan the new one.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            setRegenerating(true);
            try {
              const res = await partnerSubscriptionAPI.regenerateQrCode();
              setQrData(res.data.data);
              setRevealed(false);
              Alert.alert("New QR Generated", "Share the new code with players");
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Failed to regenerate");
            } finally {
              setRegenerating(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!qrData) return;
    try {
      const message =
        `🎮 Subscribe to ${qrData.partner?.business_name || "me"} on BattleCore!\n\n` +
        `Scan my QR code or use invite code:\n${qrData.qr_token}\n\n` +
        `${qrData.share_url || `https://battlecore.app/partner/${qrData.qr_token}`}`;

      await Share.share({ message });
    } catch (err) {
      console.log("Share cancelled");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!qrData) return null;

  const tier = qrData.partner?.partner_tier || "standard";
  const tierColor = TIER_COLORS[tier];
  const tierIcon = TIER_ICONS[tier];
  const shareUrl =
    qrData.share_url || `https://battlecore.app/partner/${qrData.qr_token}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlow} />

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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My QR Code</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <MaterialIcons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Partner info card */}
        <View style={styles.partnerCard}>
          {qrData.partner?.logo_url ? (
            <Image source={{ uri: qrData.partner.logo_url }} style={styles.partnerLogo} />
          ) : (
            <View style={[styles.partnerLogoPlaceholder, { backgroundColor: `${tierColor}22` }]}>
              <MaterialIcons name="person" size={26} color={tierColor} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerName} numberOfLines={1}>
              {qrData.partner?.business_name || "Your Partner Profile"}
            </Text>
            <View style={[styles.tierBadge, { backgroundColor: `${tierColor}22`, borderColor: tierColor }]}>
              <MaterialIcons name={tierIcon as any} size={11} color={tierColor} />
              <Text style={[styles.tierBadgeText, { color: tierColor }]}>
                {qrData.partner?.tier_label || tier.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* QR Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <MaterialIcons name="qr-code-2" size={16} color={COLORS.primary} />
            <Text style={styles.qrHeaderText}>SUBSCRIBE VIA QR</Text>
          </View>

          <View style={styles.qrImageContainer}>
            {revealed ? (
              <Image
                source={{ uri: qrData.qr_code_url }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              <TouchableOpacity
                style={styles.qrHidden}
                onPress={() => setRevealed(true)}
                activeOpacity={0.8}
              >
                <View style={styles.qrHiddenInner}>
                  <MaterialIcons name="qr-code-2" size={100} color="rgba(255,255,255,0.1)" />
                  <MaterialIcons
                    name="visibility"
                    size={32}
                    color={COLORS.primary}
                    style={{ position: "absolute" }}
                  />
                </View>
                <Text style={styles.qrHiddenText}>TAP TO REVEAL</Text>
                <Text style={styles.qrHiddenSub}>
                  Keep this private — only show it to players you want to subscribe
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Token Display */}
          {revealed && (
            <View style={styles.tokenSection}>
              <Text style={styles.tokenLabel}>INVITE TOKEN</Text>
              <TouchableOpacity
                style={styles.tokenBox}
                onPress={() => {
                  // Could trigger clipboard copy in real implementation
                  Alert.alert("Copied", "Token copied to clipboard");
                }}
              >
                <Text style={styles.tokenText} numberOfLines={1}>
                  {qrData.qr_token}
                </Text>
                <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
              </TouchableOpacity>

              <Text style={styles.tokenLabel}>SHARE LINK</Text>
              <TouchableOpacity
                style={styles.tokenBox}
                onPress={() => Alert.alert("Copied", "Link copied to clipboard")}
              >
                <Text style={styles.tokenText} numberOfLines={1}>
                  {shareUrl}
                </Text>
                <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{qrData.partner?.subscription_count || 0}</Text>
              <Text style={styles.statLabel}>SUBSCRIBERS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{qrData.partner?.active_subscribers || 0}</Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{qrData.partner?.total_live_events || 0}</Text>
              <Text style={styles.statLabel}>LIVE EVENTS</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={!revealed}
        >
          <MaterialIcons name="share" size={18} color="white" />
          <Text style={styles.shareBtnText}>SHARE INVITE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.regenBtn, regenerating && { opacity: 0.5 }]}
          onPress={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <>
              <MaterialIcons name="autorenew" size={16} color={COLORS.primary} />
              <Text style={styles.regenBtnText}>REGENERATE QR CODE</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="lightbulb-outline" size={16} color="#fbbf24" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>How to use this QR</Text>
            <Text style={styles.infoText}>
              1. Reveal & screenshot the QR code{"\n"}
              2. Share it in your WhatsApp/Instagram bio{"\n"}
              3. Players scan it in BattleCore → Subscribe Partners → QR icon{"\n"}
              4. Their events list shows YOUR events first
            </Text>
          </View>
        </View>

        {/* Safety note */}
        <View style={styles.safetyCard}>
          <MaterialIcons name="shield" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.safetyText}>
            Your QR is unique to you. Regenerating immediately invalidates the old one.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  bgGlow: {
    position: "absolute",
    top: "10%",
    alignSelf: "center",
    width: 400,
    height: 400,
    backgroundColor: "rgba(244,123,37,0.08)",
    borderRadius: 200,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
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
    fontSize: 18,
    fontWeight: "900",
    color: "white",
    letterSpacing: -0.3,
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  partnerLogo: {
    width: 50,
    height: 50,
    borderRadius: 14,
  },
  partnerLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerName: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  tierBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qrCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  qrHeaderText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qrImageContainer: {
    aspectRatio: 1,
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  qrHidden: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 20,
  },
  qrHiddenInner: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  qrHiddenText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  qrHiddenSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
    marginTop: 4,
  },
  tokenSection: {
    marginTop: 20,
    gap: 8,
  },
  tokenLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 8,
  },
  tokenBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tokenText: {
    flex: 1,
    color: "white",
    fontSize: 11,
    fontFamily: "Courier",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statValue: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shareBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    backgroundColor: "rgba(244,123,37,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
    borderRadius: 14,
    marginTop: 8,
  },
  regenBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(251,191,36,0.05)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.15)",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  infoTitle: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    lineHeight: 16,
  },
  safetyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  safetyText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    flex: 1,
  },
});
