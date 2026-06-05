import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  Share,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import { partnerAPI, partnerSubscriptionAPI } from "../../services/api";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { InfoCard } from "../../components/InfoCard";
import { Button } from "../../components/Button";
import { RoleBadge } from "../../components/RoleBadge";
import { StatCard } from "../../components/StatCard";

const { width } = Dimensions.get("window");

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD8SramNZdVi1A8A-J6l2KUxr-hdqaZXJsnAO0_xZjG3BDsC1UQPKiyudff4EEVYR78z4r-WcYTwSWIeDLuOSAVkg_K0mCdOGZZ4N8ot5c04pGmA50sirkGZoW5d3t1ZP536e3ro0c1U0Ooh7LO40NYk2-vUI7Bd2qNVCVykUhwMsQddSGeSwf0XbPrDsuynVt-jEciI8dOHpTgK4QX-aYM9avIdfBTRbYWYBI7CQcp0nwreHu-wZfJK2z5lGUp9DrkpXqlBDqnm4k";
const DEFAULT_COVER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAh5AJVtKymLINB1Rn9KLf0PTMYIkgB3Q5LIzoxYUINBFDPzQKls6ZwkJRVwtMGgSP-izheoxRyYg5y3VnHsRTCrzjABw8IpQlH49m6qQcQgNjaXyQ75nJRP5zicKoCr3_OTd7cXc8wtgyKTK5_WBGmfX56S4sVxbxTwlYRcated-55EhAJOC1lWr1Z3_zIVl8ejuZV5mXk3_pqyBGlU1nma9h1VH3TqElVc3gciyzvzZVe4V02RIOi7r8loAkIU2n5sFgMU7LZ-pI";

export const ProfileScreenPartner = ({ navigation }: any) => {
  const { authData, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // QR Code modal
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const qrRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, tierRes] = await Promise.allSettled([
        partnerAPI.getDashboard(),
        partnerAPI.getTierInfo(),
      ]);
      if (dashRes.status === "fulfilled") setDashboard(dashRes.value.data.data);
      if (tierRes.status === "fulfilled") setTierInfo(tierRes.value.data.data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadData().finally(() => setDataLoading(false));
  }, [loadData]);

  const openQrModal = async () => {
    setQrModalVisible(true);
    if (qrData) return;
    setQrLoading(true);
    try {
      const res = await partnerSubscriptionAPI.getMyQrCode();
      setQrData(res.data.data);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to load QR code",
      );
    } finally {
      setQrLoading(false);
    }
  };

  const handleShareQr = async () => {
    if (!qrData) return;
    try {
      const message =
        `🎮 Subscribe to ${qrData.partner?.business_name || authData?.organization_name || "me"} on BattleCore!\n\n` +
        `Scan my QR or use invite code:\n${qrData.qr_token}\n\n` +
        `${qrData.share_url || `https://battlecore.app/partner/${qrData.qr_token}`}`;
      await Share.share({ message });
    } catch (err) {
      // user cancelled
    }
  };

  const handleDownloadQr = async () => {
    if (!qrData) return;
    const url = qrData.qr_code_url || qrData.share_url;
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Cannot open",
          "Unable to open download link on this device",
        );
      }
    } else {
      Alert.alert(
        "Download",
        "Use the share option to save this QR code to your device",
      );
    }
  };

  const handleRegenerateQr = async () => {
    Alert.alert(
      "Regenerate QR Code?",
      "Your old QR code will stop working immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await partnerSubscriptionAPI.regenerateQrCode();
              setQrData(res.data.data);
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to regenerate",
              );
            }
          },
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const currentTier = (tierInfo?.current_tier || "standard").toUpperCase();

  return (
    <SafeScreen role="PARTNER" disableBottomSafeArea>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fbbf24"
            colors={["#fbbf24"]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: authData?.backgroundImage || DEFAULT_COVER }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(2,6,23,0)", "rgba(2,6,23,0.8)", "rgba(2,6,23,1)"]}
            style={styles.heroGradient}
          />
          <View style={[styles.topActions, { top: insets.top + 12 }]}>
            <TouchableOpacity style={styles.actionButton} onPress={openQrModal}>
              <MaterialIcons name="qr-code-2" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <Image
                  source={{ uri: authData?.avatar || DEFAULT_AVATAR }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.roleBadge}>
                <MaterialIcons name="handshake" size={12} color="white" />
              </View>
            </View>
            <Text style={styles.username}>
              {authData?.organization_name || authData?.username || "PARTNER"}
            </Text>
            <View style={styles.badgeRow}>
              <RoleBadge role="PARTNER" label={`${currentTier} Partner`} />
            </View>
          </View>
        </View>

        {/* Stats */}
        {!dataLoading && dashboard?.stats && (
          <>
            <SectionHeader
              title="Partner Overview"
              accentColor="#fbbf24"
              containerStyle={{ paddingHorizontal: 16, marginTop: 8 }}
            />
            <View style={styles.statsRow}>
              <StatCard
                icon="event"
                iconColor={COLORS.success}
                value={(dashboard.stats.total_events ?? 0).toLocaleString()}
                label="Total Events"
              />
              <View style={{ width: 8 }} />
              <StatCard
                icon="group"
                iconColor={COLORS.accentBlue}
                value={(
                  dashboard.stats.total_participants ?? 0
                ).toLocaleString()}
                label="Participants"
              />
            </View>
            <View style={[styles.statsRow, { marginTop: 8 }]}>
              <StatCard
                icon="trending-up"
                iconColor={COLORS.primary}
                value={`₹${((dashboard.stats.total_revenue ?? 0) / 1000).toFixed(1)}K`}
                label="Total Revenue"
              />
              <View style={{ width: 8 }} />
              <StatCard
                icon="percent"
                iconColor="#ef4444"
                value={`${tierInfo?.stats?.commission_rate ?? 1}%`}
                label="Platform Fee"
              />
            </View>
          </>
        )}

        {/* Quick Links */}
        <SectionHeader
          title="Partner Hub"
          accentColor="#fbbf24"
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="add-circle"
            iconColor={COLORS.primary}
            title="Create New Event"
            subtitle="Host a tournament in 60 seconds"
            variant="highlight"
            showChevron
            onPress={() => navigation.navigate("CreateMatch")}
          />
          <InfoCard
            icon="event"
            title="My Events"
            subtitle="View, edit, publish your events"
            showChevron
            onPress={() => navigation.navigate("Events")}
          />
          <InfoCard
            icon="group"
            iconColor={COLORS.success}
            title="Subscribers & Participants"
            subtitle="People following your events"
            showChevron
            onPress={() => navigation.navigate("UsersList")}
          />
          <InfoCard
            icon="workspace-premium"
            iconColor="#fbbf24"
            title="Partner Tier"
            subtitle="Manage your subscription tier"
            showChevron
            onPress={() => navigation.navigate("PartnerTier")}
          />
          <InfoCard
            icon="qr-code-2"
            iconColor={COLORS.primary}
            title="My QR Code"
            subtitle="Share your QR for player subscriptions"
            showChevron
            onPress={() => navigation.navigate("PartnerMyQR")}
          />
          <InfoCard
            icon="account-balance-wallet"
            iconColor="#3b82f6"
            title="Wallet & Payouts"
            subtitle="View earnings, withdraw, manage funds"
            showChevron
            onPress={() => navigation.navigate("PaymentDashboard")}
          />
        </View>

        {/* Account */}
        <SectionHeader
          title="Account & Settings"
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="person"
            title="Personal Information"
            subtitle="Update your partner profile"
            showChevron
            onPress={() => navigation.navigate("PersonalInformation")}
          />
          <InfoCard
            icon="shield"
            iconColor={COLORS.error}
            title="Security & Privacy"
            subtitle="2FA, login activity, password"
            variant="danger"
            showChevron
            onPress={() => navigation.navigate("SecurityPrivacy")}
          />
          <InfoCard
            icon="notifications"
            iconColor="#a855f7"
            title="Notifications"
            subtitle="Push, in-app and email preferences"
            showChevron
            onPress={() => navigation.navigate("Notifications")}
          />
          <InfoCard
            icon="support-agent"
            iconColor="#f47b25"
            title="Help & Support"
            subtitle="Get help, report issues, contact us"
            showChevron
            onPress={() => navigation.navigate("Help")}
          />
          <InfoCard
            icon="settings"
            title="Settings"
            subtitle="App preferences and legal"
            showChevron
            onPress={() => navigation.navigate("Settings")}
          />
        </View>

        <View style={{ padding: 16, marginTop: 16 }}>
          <Button
            title="Log Out"
            onPress={() => setShowLogoutModal(true)}
            variant="danger"
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={120}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.qrModal}>
            {/* Header */}
            <View style={styles.qrModalHeader}>
              <View style={styles.qrHeaderLeft}>
                <View style={styles.qrHeaderIcon}>
                  <MaterialIcons name="qr-code-2" size={20} color="#fbbf24" />
                </View>
                <View>
                  <Text style={styles.qrModalTitle}>My QR Code</Text>
                  <Text style={styles.qrModalSubtitle}>
                    {qrData?.partner?.business_name ||
                      authData?.organization_name ||
                      "Partner"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => setQrModalVisible(false)}
              >
                <MaterialIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {qrLoading || !qrData ? (
              <View style={styles.qrLoading}>
                <ActivityIndicator color="#fbbf24" size="large" />
                <Text style={styles.qrLoadingText}>Generating QR…</Text>
              </View>
            ) : (
              <>
                {/* QR Code Image */}
                <View style={styles.qrImageWrapper}>
                  <View style={styles.qrImageInner}>
                    {qrData.qr_code_url ? (
                      <Image
                        source={{ uri: qrData.qr_code_url }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <QRCode
                        value={qrData.qr_token || "battlecore"}
                        size={180}
                        color="#0a0a0a"
                        backgroundColor="white"
                      />
                    )}
                  </View>
                </View>

                {/* Partner Code */}
                <View style={styles.codeBox}>
                  <Text style={styles.codeBoxLabel}>PARTNER CODE</Text>
                  <Text style={styles.codeBoxValue} numberOfLines={1}>
                    {qrData.qr_token}
                  </Text>
                </View>

                {/* Stats Row */}
                <View style={styles.qrStatsRow}>
                  <View style={styles.qrStatBox}>
                    <MaterialIcons name="people" size={14} color="#3b82f6" />
                    <Text style={styles.qrStatValue}>
                      {qrData.partner?.subscription_count || 0}
                    </Text>
                    <Text style={styles.qrStatLabel}>SUBSCRIBERS</Text>
                  </View>
                  <View style={styles.qrStatDivider} />
                  <View style={styles.qrStatBox}>
                    <MaterialIcons
                      name="local-fire-department"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text style={styles.qrStatValue}>
                      {qrData.partner?.total_live_events || 0}
                    </Text>
                    <Text style={styles.qrStatLabel}>LIVE EVENTS</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.qrActions}>
                  <TouchableOpacity
                    style={[styles.qrActionBtn, styles.qrShareBtn]}
                    onPress={handleShareQr}
                  >
                    <MaterialIcons name="share" size={16} color="white" />
                    <Text style={styles.qrActionText}>SHARE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.qrActionBtn, styles.qrDownloadBtn]}
                    onPress={handleDownloadQr}
                  >
                    <MaterialIcons name="download" size={16} color="#fbbf24" />
                    <Text style={[styles.qrActionText, { color: "#fbbf24" }]}>
                      DOWNLOAD
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Regenerate */}
                <TouchableOpacity
                  style={styles.qrRegenerateBtn}
                  onPress={handleRegenerateQr}
                >
                  <MaterialIcons
                    name="autorenew"
                    size={14}
                    color="rgba(255,255,255,0.5)"
                  />
                  <Text style={styles.qrRegenerateText}>
                    REGENERATE QR CODE
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={120}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glassModal}>
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: "rgba(251,191,36,0.1)" },
              ]}
            >
              <MaterialIcons name="logout" size={32} color="#fbbf24" />
            </View>
            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalSubtitle}>
              You will need to log back in to manage events, view earnings and
              respond to subscribers.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: "#fbbf24" }]}
                onPress={() => {
                  setShowLogoutModal(false);
                  signOut();
                }}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: "100%",
    height: 280,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  topActions: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileSection: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#fbbf24",
    padding: 3,
    backgroundColor: COLORS.backgroundDark,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  roleBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#fbbf24",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  username: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  glassModal: {
    width: "100%",
    maxWidth: width - 48,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 32,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(244,123,37,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  confirmButton: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // QR Modal
  qrModal: {
    width: "100%",
    maxWidth: width - 48,
    backgroundColor: "#1a1a1a",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  qrModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  qrHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  qrHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrModalTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
  qrModalSubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  qrCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrLoading: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  qrLoadingText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  qrImageWrapper: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 16,
  },
  qrImageInner: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  qrImage: {
    width: "100%",
    height: "100%",
  },
  codeBox: {
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 12,
  },
  codeBoxLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  codeBoxValue: {
    color: "white",
    fontSize: 12,
    fontFamily: "Courier",
  },
  qrStatsRow: {
    flexDirection: "row",
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  qrStatBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  qrStatValue: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  qrStatLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qrStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  qrActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  qrActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  qrShareBtn: {
    backgroundColor: "#fbbf24",
    shadowColor: "#fbbf24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  qrDownloadBtn: {
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  qrActionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qrRegenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  qrRegenerateText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});

export default ProfileScreenPartner;
