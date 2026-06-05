import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import { partnerAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { WebView } from "react-native-webview";
import { PopupModal } from "../../components/PopupModal";
import { PartnerOverview } from "../../components/partner/PartnerOverview";
import { PartnerUpgrade } from "../../components/partner/PartnerUpgrade";
import { PartnerHistory } from "../../components/partner/PartnerHistory";

const TIER_UI: Record<
  string,
  {
    color: string;
    icon: string;
    gradient: readonly [string, string];
    glow: string;
  }
> = {
  standard: {
    color: "#94a3b8",
    icon: "shield",
    gradient: ["#475569", "#334155"] as const,
    glow: "rgba(148,163,184,0.15)",
  },
  sponsored: {
    color: "#3b82f6",
    icon: "campaign",
    gradient: ["#2563eb", "#1d4ed8"] as const,
    glow: "rgba(59,130,246,0.15)",
  },
  premium: {
    color: "#fbbf24",
    icon: "workspace-premium",
    gradient: ["#f59e0b", "#d97706"] as const,
    glow: "rgba(251,191,36,0.15)",
  },
};

interface TierInfo {
  current_tier: string;
  tier_label: string;
  tier_config: any;
  all_tiers: any;
  stats: {
    events_this_month: number;
    max_events_per_month: number;
    remaining_events: number;
    total_events_created: number;
    total_revenue: number;
    total_commission_paid: number;
    commission_rate: number;
  };
  tier_expiry: string | null;
  tier_upgraded_at: string | null;
  benefits: any;
}

export const PartnerTierScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [tierHistory, setTierHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "upgrade" | "history"
  >("overview");

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const [popup, setPopup] = useState({
    visible: false,
    type: "info" as "success" | "error" | "warning" | "info" | "confirm",
    title: "",
    message: "",
  });
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const showPopup = (
    type: "success" | "error" | "warning" | "info" | "confirm",
    title: string,
    message?: string,
    onConfirm?: () => void,
  ) => {
    setPopup({ visible: true, type, title, message: message || "" });
    setConfirmAction(() => onConfirm || null);
  };

  const hidePopup = () => {
    setPopup({ ...popup, visible: false });
    setConfirmAction(null);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const [tierRes, historyRes] = await Promise.allSettled([
        partnerAPI.getTierInfo(),
        partnerAPI.getTierHistory(),
      ]);
      if (tierRes.status === "fulfilled" && tierRes.value.data.success)
        setTierInfo(tierRes.value.data.data);
      if (
        historyRes.status === "fulfilled" &&
        historyRes.value.data.success
      ) {
        setTierHistory(historyRes.value.data.data || []);
      }
    } catch (err) {
      console.error("Error loading tier data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpgradeTier = async (tier: string) => {
    setSelectedTier(tier);
    setShowUpgradeModal(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedTier) return;
    setUpgrading(true);
    try {
      const response = await partnerAPI.purchaseTier({ tier: selectedTier });
      if (!response.data.success) {
        showPopup(
          "error",
          "Upgrade Failed",
          response.data.message || "Failed to initiate upgrade",
        );
        return;
      }
      const sessionId = response.data.data?.payment_session_id;
      const orderId = response.data.data?.order_id;
      if (!sessionId) {
        showPopup(
          "error",
          "Payment Error",
          "Payment session not created. Please try again.",
        );
        return;
      }
      setShowUpgradeModal(false);
      setPaymentSessionId(sessionId);
      setCurrentOrderId(orderId);
      setShowPaymentModal(true);
    } catch (error: any) {
      showPopup(
        "error",
        "Upgrade Failed",
        error.response?.data?.message || "Failed to upgrade tier",
      );
    } finally {
      setUpgrading(false);
    }
  };

  const handleDegrade = () => {
    showPopup(
      "warning",
      "Downgrade Tier",
      "Are you sure you want to downgrade? You will lose current tier benefits.",
      async () => {
        try {
          const response = await partnerAPI.degradeTier();
          if (response.data.success) {
            showPopup("success", "Tier Downgraded", response.data.data.message);
            loadData();
          }
        } catch (error: any) {
          showPopup(
            "error",
            "Downgrade Failed",
            error.response?.data?.message || "Failed to downgrade",
          );
        }
      },
    );
  };

  const handlePaymentStateChange = (navState: any) => {
    // B2 fix: explicit parenthesization. The original expression
    //   A || B || C && D
    // is parsed as
    //   A || B || (C && D)
    // which fires on any cashfree URL once loading completes
    // (even the SDK's own iframe loads), not just return URLs.
    // Wrap the cashfree branch in parens and require loading to
    // be false on EVERY return-style URL.
    const url: string = navState?.url || "";
    const isReturnUrl =
      url.includes("battlecore.app/payment-return") ||
      url.includes("google.com") ||
      (url.includes("cashfree") && navState.loading === false);
    if (isReturnUrl) {
      setShowPaymentModal(false);
      verifyUpgradePayment();
    }
  };

  const verifyUpgradePayment = async () => {
    if (!currentOrderId) return;
    try {
      const response = await partnerAPI.verifyTierPurchase({
        order_id: currentOrderId,
        tier: selectedTier,
      });
      if (response.data.success) {
        showPopup(
          "success",
          "Tier Upgraded!",
          response.data.message || "Tier upgraded successfully!",
        );
        loadData();
      } else {
        showPopup(
          "warning",
          "Payment Pending",
          "Payment not completed yet. Please try again.",
        );
      }
    } catch (error: any) {
      showPopup(
        "error",
        "Verification Failed",
        error.response?.data?.message || "Failed to verify payment",
      );
    } finally {
      setPaymentSessionId(null);
      setCurrentOrderId(null);
    }
  };

  const paymentHtml = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script><style>body{display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;margin:0;font-family:sans-serif}.loader{border:4px solid #333;border-top:4px solid #f47b25;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head><body><div style="text-align:center"><div class="loader"></div><div style="margin-top:16px;font-size:14px;color:rgba(255,255,255,0.6)">Opening payment gateway...</div></div><script>const cashfree=Cashfree({mode:"sandbox"});window.onload=function(){cashfree.checkout({paymentSessionId:"${paymentSessionId}",redirectTarget:"_self"})}</script></body></html>`;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Tier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  if (!loading && !tierInfo) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Tier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color="rgba(255,255,255,0.2)"
          />
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 16,
            }}
          >
            Failed to load tier info
          </Text>
          <TouchableOpacity
            onPress={loadData}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              paddingHorizontal: 20,
              backgroundColor: COLORS.primary,
              borderRadius: 12,
            }}
          >
            <Text
              style={{ color: "white", fontWeight: "bold", letterSpacing: 1 }}
            >
              RETRY
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentTier = tierInfo?.current_tier || "standard";
  const tierUI = TIER_UI[currentTier] || TIER_UI.standard;
  const stats = tierInfo?.stats;
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background Glows */}
      <View
        style={[
          styles.bgGlow,
          { backgroundColor: "rgba(244,123,37,0.15)", top: -60, right: -80 },
        ]}
      />
      <View
        style={[
          styles.bgGlow,
          { backgroundColor: "rgba(244,123,37,0.08)", bottom: 200, left: -100 },
        ]}
      />

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

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Tier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Current Tier Hero Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <LinearGradient
            colors={[COLORS.gradientPrimary[0], COLORS.gradientPrimary[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tierHero}
          >
            <View style={styles.tierHeroGlow} />
            <View style={styles.tierHeroTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.tierHeroPill}>
                  <MaterialIcons
                    name={tierUI.icon as any}
                    size={12}
                    color="white"
                  />
                  <Text style={styles.tierHeroPillText}>
                    {currentTier.toUpperCase()} PARTNER
                  </Text>
                </View>
                <Text style={styles.tierHeroName}>
                  {tierInfo?.tier_label || "Standard Partner"}
                </Text>
              </View>
              <View style={styles.tierHeroIcon}>
                <MaterialIcons
                  name={tierUI.icon as any}
                  size={32}
                  color="white"
                />
              </View>
            </View>

            <View style={styles.tierHeroStats}>
              <View style={styles.tierHeroStat}>
                <Text style={styles.tierHeroStatVal}>
                  {stats?.commission_rate || 1}%
                </Text>
                <Text style={styles.tierHeroStatLbl}>PLATFORM FEE</Text>
              </View>
              <View style={styles.tierHeroDivider} />
              <View style={styles.tierHeroStat}>
                <Text style={styles.tierHeroStatVal}>
                  {stats?.total_events_created || 0}
                </Text>
                <Text style={styles.tierHeroStatLbl}>EVENTS</Text>
              </View>
              <View style={styles.tierHeroDivider} />
              <View style={styles.tierHeroStat}>
                <Text style={styles.tierHeroStatVal}>
                  ₹{(stats?.total_commission_paid || 0).toLocaleString()}
                </Text>
                <Text style={styles.tierHeroStatLbl}>PAID</Text>
              </View>
            </View>

            {tierInfo?.tier_expiry && (
              <View style={styles.tierExpiry}>
                <MaterialIcons
                  name="schedule"
                  size={12}
                  color="rgba(255,255,255,0.6)"
                />
                <Text style={styles.tierExpiryText}>
                  Expires{" "}
                  {new Date(tierInfo.tier_expiry).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          {(["overview", "upgrade", "history"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === tab && styles.tabBtnTextActive,
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === "overview" && (
          <PartnerOverview
            tierInfo={tierInfo}
            currentTier={currentTier}
            handleDegrade={handleDegrade}
          />
        )}

        {/* ============ UPGRADE TAB ============ */}
        {activeTab === "upgrade" && (
          <PartnerUpgrade
            currentTier={currentTier}
            handleUpgradeTier={handleUpgradeTier}
            upgrading={upgrading}
          />
        )}

        {/* ============ HISTORY TAB ============ */}
        {activeTab === "history" && (
          <PartnerHistory tierHistory={tierHistory} />
        )}
      </ScrollView>

      {/* Upgrade Modal — uses the shared PopupModal with the
          summary-rows variant to keep the styling, blur, and
          animations in one place. Values are pulled from
          tierInfo.all_tiers (authoritative backend config) with a
          hard-coded fallback so the modal still works before the
          first loadData() resolves. */}
      <PopupModal
        visible={showUpgradeModal}
        type="confirm"
        icon="upgrade"
        iconColor={TIER_UI[selectedTier]?.color || COLORS.primary}
        title={`Upgrade to ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}?`}
        message="You will be charged the tier price and your Platform Fee will be adjusted."
        confirmText="CONFIRM & PAY"
        cancelText="CANCEL"
        confirmLoading={upgrading}
        onConfirm={confirmUpgrade}
        onCancel={() => setShowUpgradeModal(false)}
        onClose={() => setShowUpgradeModal(false)}
        summary={(() => {
          const tierCfg =
            tierInfo?.all_tiers?.[String(selectedTier).toUpperCase()];
          const commissionPct = tierCfg?.commission_rate ?? (
            selectedTier === "premium" ? 5 : selectedTier === "sponsored" ? 3 : 1
          );
          const monthlyEvents = tierCfg?.max_events_per_month === -1
            ? "Unlimited"
            : (tierCfg?.max_events_per_month ?? (
                selectedTier === "premium" ? "Unlimited" : selectedTier === "sponsored" ? 30 : 10
              ));
          const price = tierCfg?.price ?? (
            selectedTier === "premium" ? 4999 : selectedTier === "sponsored" ? 1499 : 499
          );
          const accent = TIER_UI[selectedTier]?.color || COLORS.primary;
          return [
            { label: "Platform Fee", value: `${commissionPct}%`, valueColor: accent },
            { label: "Monthly Events", value: String(monthlyEvents), valueColor: accent },
            { label: "Price", value: `₹${Number(price).toLocaleString("en-IN")}`, valueColor: accent },
          ];
        })()}
      />

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {paymentSessionId && (
            <WebView
              source={{ html: paymentHtml }}
              onNavigationStateChange={handlePaymentStateChange}
              onShouldStartLoadWithRequest={(req) => {
                if (
                  req.url.includes("battlecore.app/payment-return") ||
                  req.url.includes("google.com") ||
                  !req.url.includes("cashfree")
                ) {
                  setShowPaymentModal(false);
                  verifyUpgradePayment();
                  return false;
                }
                return true;
              }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
            />
          )}
        </View>
      </Modal>

      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={hidePopup}
        onConfirm={confirmAction || undefined}
        confirmText={popup.type === "confirm" ? "Confirm" : "OK"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    letterSpacing: -0.5,
  },

  // Tier Hero
  tierHero: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.4)",
    overflow: "hidden",
  },
  tierHeroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tierHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  tierHeroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  tierHeroPillText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  tierHeroLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  tierHeroName: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    fontStyle: "italic",
    letterSpacing: -0.4,
  },
  tierHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tierHeroStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  tierHeroStat: { alignItems: "center" },
  tierHeroStatVal: { fontSize: 18, fontWeight: "900", color: "white" },
  tierHeroStatLbl: {
    fontSize: 8,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginTop: 2,
  },
  tierHeroDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tierExpiry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  tierExpiryText: { fontSize: 11, color: "rgba(255,255,255,0.5)" },

  // Tabs
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
  },
  tabBtnTextActive: { color: "white" },

  paymentHeader: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  paymentTitle: { color: "white", fontWeight: "bold", fontSize: 16 },
});
