import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { WebView } from "react-native-webview";
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import api, { setAuthToken, elitePassAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";
import { PartnerUpgrade } from "../../components/partner/PartnerUpgrade";

const { width } = Dimensions.get("window");

interface Benefit {
  title: string;
  description: string;
  icon: string;
}

interface ElitePass {
  _id: string;
  pass_type: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  winnings_boost: number;
  event_count?: number | null;
  features: string[];
  color: string;
  is_active: boolean;
  is_popular: boolean;
  benefits: Benefit[];
  pass_category?: string;
  partner_tier?: string;
  commission_rate?: number | null;
  max_events_per_month?: number | null;
}

// Partner tier UI config
const PARTNER_TIER_UI: Record<string, { color: string; icon: string }> = {
  standard: { color: "#94a3b8", icon: "shield" },
  sponsored: { color: "#3b82f6", icon: "campaign" },
  premium: { color: "#fbbf24", icon: "workspace-premium" },
};

export const ElitePassScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const [passes, setPasses] = useState<ElitePass[]>([]);
  const [partnerPasses, setPartnerPasses] = useState<ElitePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"user" | "partner">(
    route?.params?.initialTab === "partner" ? "partner" : "user"
  );
  const [userPassStatus, setUserPassStatus] = useState<any>(null);

  // Hero card snake animation
  const snakeProgress = useRef(new Animated.Value(0)).current;
  const [heroSize, setHeroSize] = useState({ w: 0, h: 0 });
  const HeroAnimatedRect = useRef(Animated.createAnimatedComponent(Rect)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(snakeProgress, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Popup state
  const [popup, setPopup] = useState({ visible: false, type: "info" as "success" | "error" | "warning" | "info" | "confirm", title: "", message: "" });
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const showPopup = (type: "success" | "error" | "warning" | "info" | "confirm", title: string, message?: string, onConfirm?: () => void) => {
    setPopup({ visible: true, type, title, message: message || "" });
    setConfirmAction(() => onConfirm || null);
  };

  const hidePopup = () => {
    setPopup({ ...popup, visible: false });
    setConfirmAction(null);
  };

  useEffect(() => {
    if (authData?.token) {
      setAuthToken(authData.token);
    }
    fetchAllPasses();
  }, [authData]);

  const fetchAllPasses = async () => {
    try {
      const [userPassesRes, partnerPassesRes, myPassRes] = await Promise.allSettled([
        elitePassAPI.getActivePasses(),
        elitePassAPI.getPartnerPasses(),
        authData?.token ? elitePassAPI.getMyPass() : Promise.resolve(null),
      ]);

      if (userPassesRes.status === "fulfilled" && userPassesRes.value.data.success) {
        setPasses(userPassesRes.value.data.data);
      }

      if (partnerPassesRes.status === "fulfilled" && partnerPassesRes.value.data.success) {
        setPartnerPasses(partnerPassesRes.value.data.data);
      }

      if (myPassRes?.status === "fulfilled" && myPassRes?.value?.data?.success) {
        setUserPassStatus(myPassRes.value.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch passes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pass: ElitePass) => {
    if (!authData?.token) {
      showPopup("warning", "Login Required", "Please login to purchase a pass");
      return;
    }

    setPurchasing(pass._id);
    try {
      const response = await elitePassAPI.purchase({
        pass_type: pass.pass_type,
        become_partner: pass.pass_category === "partner",
      });

      if (!response.data.success) {
        showPopup("error", "Purchase Failed", response.data.message || "Failed to initiate purchase");
        return;
      }

      const sessionId = response.data.data?.payment_session_id;
      const orderId = response.data.data?.order_id;

      if (!sessionId) {
        showPopup("error", "Payment Error", "Payment session not created. Please try again.");
        return;
      }

      setPaymentSessionId(sessionId);
      setCurrentOrderId(orderId);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error("Purchase failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to initiate purchase";
      showPopup("error", "Purchase Failed", errorMessage);
    } finally {
      setPurchasing(null);
    }
  };

  const handlePaymentStateChange = (navState: any) => {
    if (navState.url.includes("battlecore.app/payment-return")) {
      setShowPaymentModal(false);
      verifyPurchase();
    }
  };

  const verifyPurchase = async () => {
    if (!currentOrderId) return;
    try {
      const response = await elitePassAPI.verify({ order_id: currentOrderId });

      if (response.data.success) {
        const msg = response.data.message || "Your Pass has been activated!";
        showPopup("success", "Pass Activated!", msg);
        setTimeout(() => { fetchAllPasses(); navigation.goBack(); }, 1500);
      } else {
        showPopup("warning", "Payment Pending", "Payment not completed yet. Please try again.");
      }
    } catch (error: any) {
      console.error("Verification failed:", error);
      showPopup("error", "Verification Failed", error.response?.data?.message || "Failed to verify payment");
    } finally {
      setPaymentSessionId(null);
      setCurrentOrderId(null);
    }
  };

  const paymentHtml = `
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; color: #fff; margin: 0; font-family: sans-serif; }
        .loader { border: 4px solid #333; border-top: 4px solid #f47b25; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .text { margin-top: 16px; font-size: 14px; color: rgba(255,255,255,0.6); }
      </style>
    </head>
    <body>
      <div style="text-align:center">
        <div class="loader"></div>
        <div class="text">Opening payment gateway...</div>
      </div>
      <script>
        const cashfree = Cashfree({ mode: "sandbox" });
        window.onload = function() {
          cashfree.checkout({
            paymentSessionId: "${paymentSessionId}",
            redirectTarget: "_self"
          });
        }
      </script>
    </body>
    </html>
  `;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Elite Pass</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f47b25" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Decorative Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Tier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ============ SECTION TABS ============ */}
        <View style={styles.sectionTabs}>
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === "user" && styles.sectionTabActive]}
            onPress={() => setActiveSection("user")}
          >
            <MaterialIcons name="military-tech" size={18} color={activeSection === "user" ? "white" : "rgba(255,255,255,0.4)"} />
            <Text style={[styles.sectionTabText, activeSection === "user" && styles.sectionTabTextActive]}>ELITE PASSES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === "partner" && styles.sectionTabActive]}
            onPress={() => setActiveSection("partner")}
          >
            <MaterialIcons name="handshake" size={18} color={activeSection === "partner" ? "white" : "rgba(255,255,255,0.4)"} />
            <Text style={[styles.sectionTabText, activeSection === "partner" && styles.sectionTabTextActive]}>BECOME A PARTNER</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Card — Tab-Aware Active Plan */}
        {(() => {
          const activePass = userPassStatus?.has_active_pass
            ? passes.find((p) => p.pass_type === userPassStatus.pass_type)
            : null;
          const activePartnerPass = userPassStatus?.is_partner
            ? partnerPasses.find((p) => p.partner_tier === userPassStatus.partner_tier)
            : null;

          const isUserTab = activeSection === "user";
          const activePlan = isUserTab ? activePass : activePartnerPass;
          const hasActive = !!activePlan;
          const planIcon = isUserTab
            ? activePass?.pass_type === "supreme"
              ? "stars"
              : activePass?.pass_type === "pro"
                ? "military-tech"
                : "workspace-premium"
            : activePartnerPass
              ? PARTNER_TIER_UI[activePartnerPass.partner_tier || "standard"]?.icon || "handshake"
              : "handshake";
          const planName = isUserTab
            ? activePass?.name || ""
            : activePartnerPass?.name || "";
          const planLabel = isUserTab
            ? activePass
              ? `${activePass.pass_type?.toUpperCase()} PASS`
              : "JOIN THE ELITE"
            : activePartnerPass
              ? `${activePartnerPass.partner_tier?.toUpperCase()} PARTNER`
              : "BECOME A HOST";

          const heroPerim =
            heroSize.w > 0 && heroSize.h > 0
              ? 2 * (heroSize.w - 2 * 24) + 2 * (heroSize.h - 2 * 24) + 2 * Math.PI * 24
              : 0;
          const heroDashArr = heroPerim > 0 ? `${800} ${heroPerim - 800}` : "80 1000";
          const heroDashOffset = snakeProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -heroPerim],
          });

          return (
            <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 20 }}>
              <LinearGradient
                colors={[COLORS.gradientPrimary[0], COLORS.gradientPrimary[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tierHeroCard, { borderColor: "rgba(244,123,37,0.4)" }]}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setHeroSize({ w: width, h: height });
                }}
              >
                {/* Snake border for active plan */}
                {hasActive && heroSize.w > 0 && heroSize.h > 0 && (
                  <Svg
                    width={heroSize.w}
                    height={heroSize.h}
                    viewBox={`0 0 ${heroSize.w} ${heroSize.h}`}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  >
                    <Defs>
                      <SvgGradient id="heroSnakeGrad2" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#f47b25" stopOpacity="1" />
                        <Stop offset="40%" stopColor="#f47b25" stopOpacity="0.5" />
                        <Stop offset="100%" stopColor="#f47b25" stopOpacity="0" />
                      </SvgGradient>
                    </Defs>
                    <HeroAnimatedRect
                      x={0} y={0}
                      width={heroSize.w} height={heroSize.h}
                      rx={24} ry={24}
                      stroke="#f47b25"
                      strokeWidth={10}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={heroDashArr}
                      strokeDashoffset={heroDashOffset}
                      opacity={0.15}
                    />
                    <HeroAnimatedRect
                      x={0} y={0}
                      width={heroSize.w} height={heroSize.h}
                      rx={24} ry={24}
                      stroke="url(#heroSnakeGrad2)"
                      strokeWidth={4}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={heroDashArr}
                      strokeDashoffset={heroDashOffset}
                    />
                  </Svg>
                )}

                {/* Glow orb */}
                <View style={styles.tierHeroGlow} />

                {/* Top section */}
                <View style={styles.tierHeroTop}>
                  <View style={{ flex: 1 }}>
                    {(hasActive || !isUserTab) ? (
                      <View style={styles.tierHeroPill}>
                        <MaterialIcons name={planIcon as any} size={12} color="white" />
                        <Text style={styles.tierHeroPillText}>{planLabel}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.tierHeroName}>{hasActive ? planName : planLabel}</Text>

                  </View>
                  <View style={styles.tierHeroIconCircle}>
                    <MaterialIcons
                      name={hasActive ? (planIcon as any) : (isUserTab ? "stars" : "handshake")}
                      size={32}
                      color="white"
                    />
                  </View>
                </View>

                {/* Stats row (only for active plans) */}
                {hasActive && isUserTab && activePass && (
                  <View style={styles.tierHeroStats}>
                    <View style={styles.tierHeroStat}>
                      <Text style={styles.tierHeroStatVal}>₹{activePass.price}</Text>
                      <Text style={styles.tierHeroStatLbl}>PRICE</Text>
                    </View>
                    <View style={styles.tierHeroDivider} />
                    <View style={styles.tierHeroStat}>
                      <Text style={styles.tierHeroStatVal}>{activePass.event_count || "∞"}</Text>
                      <Text style={styles.tierHeroStatLbl}>EVENTS</Text>
                    </View>

                    <View style={styles.tierHeroDivider} />
                    <View style={styles.tierHeroStat}>
                      <Text style={styles.tierHeroStatVal}>{new Date(userPassStatus?.pass_expiry).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}</Text>
                      <Text style={styles.tierHeroStatLbl}>EXPIRES</Text>
                    </View>
                  </View>
                )}

                {hasActive && !isUserTab && activePartnerPass && (
                  <View style={styles.tierHeroStats}>
                    <View style={styles.tierHeroStat}>
                      <Text style={styles.tierHeroStatVal}>
                        {activePartnerPass.commission_rate != null ? `${activePartnerPass.commission_rate}%` : "—"}
                      </Text>
                      <Text style={styles.tierHeroStatLbl}>PLATFORM FEE</Text>
                    </View>
                    <View style={styles.tierHeroDivider} />
                    <View style={styles.tierHeroStat}>
                      <Text style={styles.tierHeroStatVal}>
                        {activePartnerPass.max_events_per_month === 999
                          ? "∞"
                          : activePartnerPass.max_events_per_month || "—"}
                      </Text>
                      <Text style={styles.tierHeroStatLbl}>EVENTS</Text>
                    </View>
                    <View style={styles.tierHeroDivider} />
                    <View style={styles.tierHeroStat}>
                      <Text style={styles.tierHeroStatVal}>₹{activePartnerPass.price}</Text>
                      <Text style={styles.tierHeroStatLbl}>PRICE</Text>
                    </View>
                  </View>
                )}

                {!hasActive && (
                  <Text style={styles.tierHeroSub}>
                    {isUserTab
                      ? "Unlock exclusive benefits and dominate the leaderboard"
                      : "Create your own esports tournaments, set entry fees, prize pools, and earn from every match."
                    }
                  </Text>
                )}
              </LinearGradient>
            </View>
          );
        })()}

        <View style={styles.content}>
          {/* ============ USER PASSES SECTION ============ */}
          {activeSection === "user" && (
            <>
              <Text style={styles.sectionTitle}>CHOOSE YOUR PLAN</Text>
              {(() => {
                const userPassesList = passes.filter(
                  (plan) => !userPassStatus?.has_active_pass || plan.pass_type !== userPassStatus.pass_type
                );
                const totalUserPasses = passes.length;
                const userTiers = passes.map((plan) => ({
                  key: plan.pass_type,
                  name: plan.name,
                  price: plan.price,
                  commission: plan.winnings_boost ? `+${plan.winnings_boost}%` : "—",
                  events: plan.event_count ? `${plan.event_count} events` : "—",
                  entryFee: "—",
                  prizePool: "—",
                  color: plan.color,
                  icon: plan.pass_type === "supreme"
                    ? "stars"
                    : plan.pass_type === "pro"
                      ? "military-tech"
                      : "workspace-premium",
                  features: plan.features || [],
                }));
                const USER_TIER_ORDER = ["pro", "elite", "supreme"];
                const handleUpgradeUser = (tierKey: string) => {
                  const matchedPlan = passes.find(
                    (p) => p.pass_type === tierKey
                  );
                  if (matchedPlan) handlePurchase(matchedPlan);
                };
                return totalUserPasses === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="info-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>No passes available</Text>
                    <Text style={styles.emptySubtext}>Check back later for exciting offers</Text>
                  </View>
                ) : (
                  <View style={{ marginHorizontal: -16 }}>
                    <PartnerUpgrade
                      currentTier={userPassStatus?.has_active_pass ? userPassStatus.pass_type : ""}
                      handleUpgradeTier={handleUpgradeUser}
                      upgrading={purchasing !== null}
                      tiers={userTiers}
                      allUpgradable={!userPassStatus?.has_active_pass}
                      tierOrder={USER_TIER_ORDER}
                    />
                  </View>
                );
              })()}
            </>
          )}

          {/* ============ PARTNER PASSES SECTION ============ */}
          {activeSection === "partner" && (
            <>
              <Text style={styles.sectionTitle}>CHOOSE YOUR PARTNER TIER</Text>
              {(() => {
                const mappedTiers = partnerPasses.map((plan) => ({
                  key: plan.partner_tier || "standard",
                  name: plan.name,
                  price: plan.price,
                  commission: plan.commission_rate ? `${plan.commission_rate}%` : "0%",
                  events: plan.max_events_per_month
                    ? plan.max_events_per_month === 999
                      ? "Unlimited"
                      : `${plan.max_events_per_month}/mo`
                    : "N/A",
                  entryFee: "—",
                  prizePool: "—",
                  color: plan.color,
                  icon: PARTNER_TIER_UI[plan.partner_tier || "standard"]?.icon || "shield",
                  features: plan.features || [],
                }));
                const userIsPartner = userPassStatus?.is_partner;
                const currentPartnerTier = userPassStatus?.partner_tier || "";
                const handleUpgradeByTier = (tierKey: string) => {
                  const matchedPlan = partnerPasses.find(
                    (p) => p.partner_tier === tierKey
                  );
                  if (matchedPlan) handlePurchase(matchedPlan);
                };
                return (
                  <View style={{ marginHorizontal: -16 }}>
                    <PartnerUpgrade
                      currentTier={userIsPartner ? currentPartnerTier : ""}
                      handleUpgradeTier={handleUpgradeByTier}
                      upgrading={purchasing !== null}
                      tiers={
                        mappedTiers.length > 0 ? mappedTiers : undefined
                      }
                      allUpgradable={!userIsPartner}
                    />
                  </View>
                );
              })()}
            </>
          )}

          <Text style={styles.footerNote}>Cancel anytime. Benefits apply immediately upon activation.</Text>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPaymentModal(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.paymentModalHeader}>
            <Text style={styles.paymentModalTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          {paymentSessionId && (
            <WebView
              source={{ html: paymentHtml }}
              onNavigationStateChange={handlePaymentStateChange}
              onShouldStartLoadWithRequest={(request) => {
                if (request.url.includes('battlecore.app/payment-return')) {
                  setShowPaymentModal(false);
                  verifyPurchase();
                  return false;
                }
                return true;
              }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          )}
        </View>
      </Modal>

      {/* Custom Popup */}
      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={hidePopup}
        onConfirm={confirmAction || undefined}
        confirmText="OK"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
  scrollView: { flex: 1 },
  // Hero Card
  tierHeroCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
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
  tierHeroName: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    fontStyle: "italic",
    letterSpacing: -0.4,
  },
  tierHeroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
    marginTop: 6,
  },
  tierHeroIconCircle: {
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

  // Section Tabs
  sectionTabs: { flexDirection: "row", marginHorizontal: 16, marginBottom: 20, gap: 8 },
  sectionTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  sectionTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sectionTabText: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  sectionTabTextActive: { color: "white" },

  content: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 12, marginBottom: 20, marginLeft: 4 },
  footerNote: { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", marginTop: 20, lineHeight: 16 },

  // Payment Modal
  paymentModalHeader: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" },
  paymentModalTitle: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Empty
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubtext: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 8 },

  // Background Glows
  bgGlowTop: { position: "absolute", top: "-10%", right: "-20%", width: 300, height: 300, backgroundColor: "rgba(244,123,37,0.15)", borderRadius: 150, opacity: 0.5 },
  bgGlowBottom: { position: "absolute", bottom: "-10%", left: "-20%", width: 300, height: 300, backgroundColor: "rgba(37,99,235,0.1)", borderRadius: 150, opacity: 0.5 },
});
