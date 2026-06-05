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
  Modal,
  TextInput,
  Switch,
  Share,
  Linking,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { partnerSubscriptionAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { RoleBadge } from "../../components/RoleBadge";

const { width } = Dimensions.get("window");

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

export const PartnerProfileScreen = ({ route, navigation }: any) => {
  const { partnerId } = route.params;
  const insets = useSafeAreaInsets();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notifyEvents, setNotifyEvents] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [prefsModalVisible, setPrefsModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [unsubscribePopupVisible, setUnsubscribePopupVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPartner();
    }, [partnerId]),
  );

  const fetchPartner = async () => {
    try {
      const res = await partnerSubscriptionAPI.getPublicPartnerProfile(partnerId);
      if (res.data.success && res.data.data) {
        setPartner(res.data.data);
        const sub = res.data.data.subscription;
        if (sub && sub.status === 'ACTIVE') {
          setIsSubscribed(true);
          setNotifyEvents(sub.notify_new_events ?? true);
          setNotifyPromos(sub.notify_promotions ?? false);
        } else {
          setIsSubscribed(false);
        }
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to load partner",
        "error",
      );
      setTimeout(() => navigation.goBack(), 1200);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPartner();
  };

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  };

  const handleShare = async () => {
    if (!partner) return;
    try {
      const message =
        `🎮 ${partner.business_name || partner.user_id?.username || "Check out this partner"} on BattleCore!\n\n` +
        `Subscribe to never miss their events: priority listing, instant alerts, QR-based follow.\n\n` +
        `${partner.share_url || `https://battlecore.app/partner/${partner._id}`}`;
      await Share.share({ message });
    } catch (err) {
      console.log("Share cancelled");
    }
  };

  const handleShareQr = async () => {
    if (!partner) return;
    try {
      const token = partner.qr_token || partner._id;
      const shareUrl =
        partner.share_url || `https://battlecore.app/partner/${token}`;
      const message =
        `🎮 Subscribe to ${partner.business_name || partner.user_id?.username || "this partner"} on BattleCore!\n\n` +
        `Scan this QR or use invite code:\n${token}\n\n` +
        `${shareUrl}`;
      await Share.share({ message });
    } catch (err) {
      // user cancelled
    }
  };

  const handleDownloadQr = async () => {
    if (!partner) return;
    const url =
      partner.qr_code_url ||
      partner.share_url ||
      `https://battlecore.app/partner/${partner._id}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast("Unable to open download link", "error");
      }
    } catch {
      showToast("Unable to open download link", "error");
    }
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const response = await partnerSubscriptionAPI.subscribe({ partner_id: partnerId });
      if (response.data.success) {
        setIsSubscribed(true);
        showToast("Subscribed! You'll see their events first", "success");
        await fetchPartner();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Could not subscribe", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = () => {
    setUnsubscribePopupVisible(true);
  };

  const confirmUnsubscribe = async () => {
    setUnsubscribePopupVisible(false);
    setActionLoading(true);
    try {
      const response = await partnerSubscriptionAPI.unsubscribe(partnerId);
      if (response.data.success) {
        setIsSubscribed(false);
        showToast("Unsubscribed", "success");
        await fetchPartner();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePrefs = async () => {
    setActionLoading(true);
    try {
      await partnerSubscriptionAPI.updatePreferences(partnerId, {
        notify_new_events: notifyEvents,
        notify_promotions: notifyPromos,
      });
      setPrefsModalVisible(false);
      showToast("Notification preferences updated", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!partner) return null;

  const tierColor = TIER_COLORS[partner.partner_tier] || TIER_COLORS.standard;
  const tierIcon = TIER_ICONS[partner.partner_tier] || "shield";

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Banner + Profile Section (ProfileScreenPartner design) */}
        <View style={styles.banner}>
          {partner.banner_url ? (
            <Image
              source={{ uri: partner.banner_url }}
              style={styles.bannerImage}
            />
          ) : (
            <View
              style={[
                styles.bannerPlaceholder,
                { backgroundColor: `${tierColor}22` },
              ]}
            >
              <MaterialIcons
                name={tierIcon as any}
                size={80}
                color={`${tierColor}55`}
              />
            </View>
          )}
          <LinearGradient
            colors={["rgba(2,6,23,0)", "rgba(2,6,23,0.8)", "rgba(2,6,23,1)"]}
            style={styles.heroGradient}
          />

          <BlurView
            intensity={200}
            tint="dark"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top,
            }}
          />

          <View style={[styles.headerRow, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="chevron-left" size={26} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setQrModalVisible(true)}
            >
              <MaterialIcons name="qr-code-2" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Profile Section (matches ProfileScreenPartner) */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarBorder, { borderColor: tierColor }]}>
                {partner.logo_url ? (
                  <Image
                    source={{ uri: partner.logo_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: `${tierColor}22` },
                    ]}
                  >
                    <MaterialIcons
                      name={tierIcon as any}
                      size={36}
                      color={tierColor}
                    />
                  </View>
                )}
                <View
                  style={[styles.roleBadge, { backgroundColor: tierColor }]}
                >
                  <MaterialIcons name="handshake" size={12} color="white" />
                </View>
              </View>
            </View>

            <Text style={styles.partnerName} numberOfLines={1}>
              {partner.business_name || partner.user_id?.username}
            </Text>

            <View style={styles.badgeRow}>
              <RoleBadge
                role="PARTNER"
                label={`${(partner.tier_label || partner.partner_tier).toUpperCase()}`}
              />
            </View>

            {partner.city && (
              <View style={styles.locationRow}>
                <MaterialIcons
                  name="location-on"
                  size={13}
                  color="rgba(255,255,255,0.5)"
                />
                <Text style={styles.locationText}>
                  {partner.city}
                  {partner.distance_km != null
                    ? ` • ${partner.distance_km} km away`
                    : ""}
                </Text>
              </View>
            )}

            {partner.bio && <Text style={styles.bio}>{partner.bio}</Text>}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <MaterialIcons name="star" size={20} color="#fbbf24" />
            <Text style={styles.statValue}>
              {partner.rating > 0 ? partner.rating.toFixed(1) : "—"}
            </Text>
            <Text style={styles.statLabel}>RATING</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons name="people" size={20} color="#3b82f6" />
            <Text style={styles.statValue}>
              {partner.subscription_count || 0}
            </Text>
            <Text style={styles.statLabel}>SUBSCRIBERS</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons
              name="emoji-events"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.statValue}>
              {partner.total_events_created || 0}
            </Text>
            <Text style={styles.statLabel}>EVENTS</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons
              name="local-fire-department"
              size={20}
              color="#ef4444"
            />
            <Text style={styles.statValue}>
              {partner.total_live_events || 0}
            </Text>
            <Text style={styles.statLabel}>LIVE</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionRow}>
          {isSubscribed ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.prefsBtn]}
                onPress={() => setPrefsModalVisible(true)}
              >
                <MaterialIcons name="tune" size={16} color="white" />
                <Text style={styles.prefsBtnText}>PREFERENCES</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.unsubscribeBtn]}
                onPress={handleUnsubscribe}
                disabled={actionLoading}
              >
                <MaterialIcons
                  name="notifications-off"
                  size={16}
                  color="#ef4444"
                />
                <Text style={styles.unsubscribeBtnText}>UNSUBSCRIBE</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.subscribeBtn]}
              onPress={handleSubscribe}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="add" size={18} color="white" />
                  <Text style={styles.subscribeBtnText}>SUBSCRIBE</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Member Since */}
        {partner.created_at && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>PARTNER INFO</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="event" size={14} color={tierColor} />
              <Text style={styles.infoText}>
                Partner since{" "}
                {new Date(partner.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            {partner.is_verified ? (
              <View style={styles.infoRow}>
                <MaterialIcons name="verified" size={14} color="#3b82f6" />
                <Text style={styles.infoText}>Verified Partner</Text>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="schedule"
                  size={14}
                  color="rgba(255,255,255,0.4)"
                />
                <Text style={styles.infoText}>Verification pending</Text>
              </View>
            )}
          </View>
        )}

        {/* Social Links */}
        {(() => {
          const s = partner.socials;
          if (!s) return null;
          const links = [
            { key: "instagram", label: "Instagram", icon: "logo-instagram", color: "#E1306C", url: s.instagram },
            { key: "facebook", label: "Facebook", icon: "logo-facebook", color: "#1877F2", url: s.facebook },
            { key: "x_twitter", label: "X (Twitter)", icon: "logo-twitter", color: "#ffffff", url: s.x_twitter },
            { key: "youtube", label: "YouTube", icon: "logo-youtube", color: "#FF0000", url: s.youtube },
            { key: "threads", label: "Threads", icon: "at", color: "#000000", url: s.threads },
            { key: "discord_server", label: "Discord", icon: "logo-discord", color: "#5865F2", url: s.discord_server },
          ].filter((l) => !!l.url);
          if (links.length === 0) return null;
          const open = async (url: string) => {
            const full = /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
            try {
              const supported = await Linking.canOpenURL(full);
              if (supported) await Linking.openURL(full);
              else showToast("Cannot open link", "error");
            } catch {
              showToast("Cannot open link", "error");
            }
          };
          return (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>SOCIAL LINKS</Text>
              <View style={styles.socialGrid}>
                {links.map((l) => (
                  <TouchableOpacity
                    key={l.key}
                    style={styles.socialChip}
                    activeOpacity={0.7}
                    onPress={() => open(l.url)}
                  >
                    <View
                      style={[
                        styles.socialIconWrap,
                        { backgroundColor: `${l.color}22`, borderColor: `${l.color}55` },
                      ]}
                    >
                      <MaterialIcons name={l.icon as any} size={18} color={l.color} />
                    </View>
                    <Text style={styles.socialChipText} numberOfLines={1}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })()}
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
                <View
                  style={[
                    styles.qrHeaderIcon,
                    { borderColor: `${tierColor}50` },
                  ]}
                >
                  <MaterialIcons name="qr-code-2" size={20} color={tierColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qrModalTitle}>Partner QR</Text>
                  <Text style={styles.qrModalSubtitle} numberOfLines={1}>
                    {partner.business_name ||
                      partner.user_id?.username ||
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

            {/* QR Code Image */}
            <View style={styles.qrImageWrapper}>
              <View style={styles.qrImageInner}>
                {partner.qr_code_url ? (
                  <Image
                    source={{ uri: partner.qr_code_url }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                ) : (
                  <QRCode
                    value={
                      partner.qr_token || `battlecore:partner:${partner._id}`
                    }
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
                {partner.qr_token || partner._id}
              </Text>
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
                <MaterialIcons
                  name="download"
                  size={16}
                  color={COLORS.primary}
                />
                <Text style={[styles.qrActionText, { color: COLORS.primary }]}>
                  DOWNLOAD
                </Text>
              </TouchableOpacity>
            </View>

            {/* Hint */}
            <View style={styles.qrHintRow}>
              <MaterialIcons
                name="info-outline"
                size={11}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.qrHintText}>
                Share this QR so others can subscribe to{" "}
                {partner.business_name || "this partner"} instantly
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preferences Modal */}
      <Modal
        visible={prefsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrefsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.prefsModal}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="tune" size={22} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Notification Preferences</Text>
              <TouchableOpacity
                onPress={() => setPrefsModalVisible(false)}
                style={styles.modalClose}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.prefRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>New Events</Text>
                <Text style={styles.prefSub}>
                  Get notified when this partner hosts new events
                </Text>
              </View>
              <Switch
                value={notifyEvents}
                onValueChange={setNotifyEvents}
                trackColor={{ false: "#3a3a3a", true: COLORS.primary }}
                thumbColor="white"
              />
            </View>

            <View style={styles.prefRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>Promotions</Text>
                <Text style={styles.prefSub}>
                  Receive offers and promotional announcements
                </Text>
              </View>
              <Switch
                value={notifyPromos}
                onValueChange={setNotifyPromos}
                trackColor={{ false: "#3a3a3a", true: COLORS.primary }}
                thumbColor="white"
              />
            </View>

            <TouchableOpacity
              style={[styles.savePrefsBtn, actionLoading && { opacity: 0.5 }]}
              onPress={handleSavePrefs}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.savePrefsText}>SAVE PREFERENCES</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unsubscribe Confirmation Popup */}
      <Modal
        visible={unsubscribePopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnsubscribePopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.popupCard}>
            <View
              style={[
                styles.popupIconCircle,
                { backgroundColor: "rgba(239,68,68,0.1)" },
              ]}
            >
              <MaterialIcons
                name="notifications-off"
                size={28}
                color="#ef4444"
              />
            </View>
            <Text style={styles.popupTitle}>Unsubscribe?</Text>
            <Text style={styles.popupSubtitle}>
              You won't see{" "}
              {partner.business_name ||
                partner.user_id?.username ||
                "this partner"}
              's events first in your feed anymore.
            </Text>
            <View style={styles.popupActions}>
              <TouchableOpacity
                style={styles.popupCancelBtn}
                onPress={() => setUnsubscribePopupVisible(false)}
              >
                <Text style={styles.popupCancelText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.popupConfirmBtn}
                onPress={confirmUnsubscribe}
              >
                <Text style={styles.popupConfirmText}>Unsubscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Popup */}
      {toastVisible && (
        <View pointerEvents="none" style={styles.toastWrapper}>
          <View
            style={[
              styles.toastCard,
              toastType === "success"
                ? { borderColor: "rgba(34,197,94,0.4)" }
                : { borderColor: "rgba(239,68,68,0.4)" },
            ]}
          >
            <View
              style={[
                styles.toastIcon,
                {
                  backgroundColor:
                    toastType === "success"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.15)",
                },
              ]}
            >
              <MaterialIcons
                name={toastType === "success" ? "check-circle" : "error"}
                size={18}
                color={toastType === "success" ? "#22c55e" : "#ef4444"}
              />
            </View>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    height: 280,
    position: "relative",
    backgroundColor: "#0a0a0a",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  tierBadgeBig: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierBadgeBigText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  profileSection: {
    position: "absolute",
    top: 180,
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
    padding: 3,
    backgroundColor: COLORS.backgroundDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  partnerName: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  bio: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 19,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 100,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  statValue: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  subscribeBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subscribeBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  prefsBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  prefsBtnText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  unsubscribeBtn: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  unsubscribeBtnText: {
    color: "#ef4444",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  infoSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  infoText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    flex: 1,
  },
  socialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialChip: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  socialIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  socialChipText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    flex: 1,
  },
  benefitList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  prefsModal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  modalTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
    flex: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  prefLabel: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  prefSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 2,
  },
  savePrefsBtn: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  savePrefsText: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Unsubscribe Popup
  popupCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  popupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  popupTitle: {
    color: "white",
    fontSize: 19,
    fontWeight: "900",
    fontStyle: "italic",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  popupSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  popupActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  popupCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  popupCancelText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  popupConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  popupConfirmText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  // Toast
  toastWrapper: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  toastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
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
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
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
  qrImageWrapper: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 16,
  },
  qrImageInner: {
    width: 180,
    height: 180,
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
    marginBottom: 12,
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
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  qrDownloadBtn: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  qrActionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  qrHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  qrHintText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
});
