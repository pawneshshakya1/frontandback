import React, { useState, useEffect } from "react";
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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { WebView } from "react-native-webview";
import api, { setAuthToken, elitePassAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";

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
}

// Partner tier UI config
const PARTNER_TIER_UI: Record<string, { color: string; icon: string }> = {
  standard: { color: "#94a3b8", icon: "shield" },
  sponsored: { color: "#3b82f6", icon: "campaign" },
  premium: { color: "#fbbf24", icon: "workspace-premium" },
};

export const ElitePassScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const [passes, setPasses] = useState<ElitePass[]>([]);
  const [partnerPasses, setPartnerPasses] = useState<ElitePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"user" | "partner">("user");
  const [userPassStatus, setUserPassStatus] = useState<any>(null);

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
    if (navState.url.includes("battlecore.app/payment-return") || navState.url.includes("google.com")) {
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

  const defaultBenefits = [
    { title: "Host Events", desc: "Create up to N events in 30 days", icon: "event" },
    { title: "Play With Friends", desc: "Create friends-only tournaments", icon: "group" },
    { title: "Friend Chat", desc: "Direct chat with all your friends", icon: "chat" },
    { title: "Priority Support", desc: "Fast customer support", icon: "support-agent" },
  ];

  const benefits = passes.length > 0 && passes[0].benefits?.length > 0
    ? passes.flatMap((p) => p.benefits || [])
    : defaultBenefits;

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

  const isPartner = userPassStatus?.is_partner || authData?.role === "PARTNER";

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
        <Text style={styles.headerTitle}>Elite Pass</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Card */}
        <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 24 }}>
          <LinearGradient colors={["#f47b25", "#8b5cf6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <MaterialIcons name="stars" size={64} color="white" style={{ opacity: 0.9 }} />
            <Text style={styles.heroTitle}>JOIN THE ELITE</Text>
            <Text style={styles.heroSubtitle}>Unlock exclusive benefits and dominate the leaderboard</Text>
          </LinearGradient>
        </View>

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

        <View style={styles.content}>
          {/* ============ USER PASSES SECTION ============ */}
          {activeSection === "user" && (
            <>
              <Text style={styles.sectionTitle}>MEMBERSHIP BENEFITS</Text>
              <View style={styles.benefitsGrid}>
                {benefits.slice(0, 4).map((item, index) => {
                  const desc = "description" in item ? item.description : "desc" in item ? (item as any).desc : "";
                  const icon = "icon" in item ? item.icon : "star";
                  return (
                    <View key={index} style={styles.benefitCard}>
                      <View style={styles.iconBg}>
                        <MaterialIcons name={(icon as any) || "star"} size={24} color="#f47b25" />
                      </View>
                      <Text style={styles.benefitTitle}>{item.title}</Text>
                      <Text style={styles.benefitDesc}>{desc}</Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>CHOOSE YOUR PLAN</Text>
              <View style={styles.plansContainer}>
                {passes.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="info-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>No passes available</Text>
                    <Text style={styles.emptySubtext}>Check back later for exciting offers</Text>
                  </View>
                ) : (
                  passes.map((plan) => (
                    <View
                      key={plan._id}
                      style={[styles.planCard, plan.is_popular && styles.planCardPopular, { borderColor: plan.is_popular ? plan.color : "rgba(255,255,255,0.1)" }]}
                    >
                      {plan.is_popular && (
                        <View style={[styles.popularTag, { backgroundColor: plan.color }]}>
                          <Text style={styles.popularTagText}>MOST POPULAR</Text>
                        </View>
                      )}
                      <View style={styles.planHeader}>
                        <Text style={[styles.planName, { color: plan.color }]}>{plan.name.toUpperCase()}</Text>
                        <Text style={styles.planPrice}>
                          ₹{plan.price}
                          <Text style={styles.planPeriod}>/{plan.duration_days} days</Text>
                        </Text>
                      </View>
                      {plan.event_count ? (
                        <View style={[styles.eventCountPill, { borderColor: plan.color, backgroundColor: `${plan.color}1A` }]}>
                          <MaterialIcons name="event" size={16} color={plan.color} />
                          <Text style={[styles.eventCountText, { color: plan.color }]}>
                            {plan.event_count} Events Included
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.planFeatures}>
                        {plan.features?.map((feature, idx) => (
                          <View key={idx} style={styles.featureRow}>
                            <MaterialIcons name="check-circle" size={16} color={plan.color} />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[styles.planSubscribeBtn, plan.is_popular ? { backgroundColor: plan.color } : { backgroundColor: "white" }]}
                        onPress={() => handlePurchase(plan)}
                        disabled={purchasing === plan._id}
                      >
                        {purchasing === plan._id ? (
                          <ActivityIndicator size="small" color={plan.is_popular ? "white" : "#0d0d0d"} />
                        ) : (
                          <Text style={[styles.planSubscribeBtnText, plan.is_popular ? { color: "white" } : { color: "#0d0d0d" }]}>SELECT PLAN</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {/* ============ PARTNER PASSES SECTION ============ */}
          {activeSection === "partner" && (
            <>
              {/* Partner CTA Banner */}
              <View style={styles.partnerCTA}>
                <LinearGradient colors={["rgba(251,191,36,0.15)", "rgba(245,158,11,0.05)"]} style={styles.partnerCTAGradient}>
                  <View style={styles.partnerCTAIcon}>
                    <MaterialIcons name="handshake" size={32} color="#fbbf24" />
                  </View>
                  <Text style={styles.partnerCTATitle}>BECOME A TOURNAMENT HOST</Text>
                  <Text style={styles.partnerCTADescription}>
                    Create your own esports tournaments, set entry fees, prize pools, and earn from every match. Choose a partner tier to get started!
                  </Text>

                  {isPartner && (
                    <View style={styles.currentPartnerBadge}>
                      <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
                      <Text style={styles.currentPartnerText}>
                        You are a {userPassStatus?.partner_tier || "Standard"} Partner
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </View>

              {/* Partner Pass Benefits */}
              <Text style={styles.sectionTitle}>PARTNER BENEFITS</Text>
              <View style={styles.benefitsGrid}>
                {[
                  { title: "Create Tournaments", desc: "Host your own events", icon: "event" },
                  { title: "Set Entry Fees", desc: "Monetize your events", icon: "paid" },
                  { title: "Sponsor Support", desc: "Attract sponsors", icon: "campaign" },
                  { title: "Analytics", desc: "Track your performance", icon: "analytics" },
                ].map((item, index) => (
                  <View key={index} style={styles.benefitCard}>
                    <View style={[styles.iconBg, { backgroundColor: "rgba(251,191,36,0.1)" }]}>
                      <MaterialIcons name={item.icon as any} size={24} color="#fbbf24" />
                    </View>
                    <Text style={styles.benefitTitle}>{item.title}</Text>
                    <Text style={styles.benefitDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionTitle}>CHOOSE YOUR PARTNER TIER</Text>
              <View style={styles.plansContainer}>
                {partnerPasses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="info-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>No partner passes available</Text>
                    <Text style={styles.emptySubtext}>Check back later</Text>
                  </View>
                ) : (
                  partnerPasses.map((plan) => {
                    const tierUI = PARTNER_TIER_UI[plan.partner_tier || "standard"];
                    return (
                      <View key={plan._id} style={[styles.planCard, plan.is_popular && styles.planCardPopular, { borderColor: plan.is_popular ? tierUI?.color || plan.color : "rgba(255,255,255,0.1)" }]}>
                        {plan.is_popular && (
                          <View style={[styles.popularTag, { backgroundColor: tierUI?.color || plan.color }]}>
                            <Text style={styles.popularTagText}>RECOMMENDED</Text>
                          </View>
                        )}

                        <View style={styles.planHeader}>
                          <View style={styles.planNameRow}>
                            <MaterialIcons name={tierUI?.icon as any || "shield"} size={20} color={tierUI?.color || plan.color} />
                            <Text style={[styles.planName, { color: tierUI?.color || plan.color }]}>{plan.name.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.planPrice}>
                            ₹{plan.price}
                            <Text style={styles.planPeriod}>/{plan.duration_days} days</Text>
                          </Text>
                        </View>

                        <View style={styles.planFeatures}>
                          {plan.features?.map((feature, idx) => (
                            <View key={idx} style={styles.featureRow}>
                              <MaterialIcons name="check-circle" size={16} color={tierUI?.color || plan.color} />
                              <Text style={styles.featureText}>{feature}</Text>
                            </View>
                          ))}
                        </View>

                        <TouchableOpacity
                          style={[styles.planSubscribeBtn, plan.is_popular ? { backgroundColor: tierUI?.color || plan.color } : { backgroundColor: "white" }]}
                          onPress={() => handlePurchase(plan)}
                          disabled={purchasing === plan._id}
                        >
                          {purchasing === plan._id ? (
                            <ActivityIndicator size="small" color={plan.is_popular ? "white" : "#0d0d0d"} />
                          ) : (
                            <Text style={[styles.planSubscribeBtnText, plan.is_popular ? { color: "white" } : { color: "#0d0d0d" }]}>
                              {isPartner ? "UPGRADE TIER" : "BECOME A PARTNER"}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
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
                if (request.url.includes('battlecore.app/payment-return') || request.url.includes('google.com') || !request.url.includes('cashfree')) {
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
  scrollView: { flex: 1 },
  heroCard: { height: 200, borderRadius: 24, padding: 24, alignItems: "center", justifyContent: "center", gap: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  heroTitle: { color: "white", fontSize: 28, fontWeight: "900", fontStyle: "italic", letterSpacing: 2, textAlign: "center" },
  heroSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Section Tabs
  sectionTabs: { flexDirection: "row", marginHorizontal: 16, marginBottom: 20, gap: 8 },
  sectionTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  sectionTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sectionTabText: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  sectionTabTextActive: { color: "white" },

  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 12, marginBottom: 20, marginLeft: 4 },
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
  benefitCard: { width: (width - 52) / 2, backgroundColor: "#1a1a1a", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  iconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(244,123,37,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  benefitTitle: { color: "white", fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  benefitDesc: { color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 18 },
  plansContainer: { gap: 16 },
  planCard: { backgroundColor: "#1a1a1a", borderRadius: 24, padding: 24, borderWidth: 1, position: "relative", overflow: "hidden" },
  planCardPopular: { backgroundColor: "rgba(244,123,37,0.05)" },
  popularTag: { position: "absolute", top: 0, right: 0, paddingHorizontal: 16, paddingVertical: 6, borderBottomLeftRadius: 16 },
  popularTagText: { color: "white", fontSize: 10, fontWeight: "bold", letterSpacing: 1 },
  planHeader: { marginBottom: 20 },
  planNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontSize: 12, fontWeight: "bold", letterSpacing: 2, marginBottom: 4 },
  planPrice: { color: "white", fontSize: 32, fontWeight: "900" },
  planPeriod: { color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: "normal" },
  planFeatures: { gap: 12, marginBottom: 24 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  planSubscribeBtn: { width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  planSubscribeBtnText: { fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  eventCountPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: "flex-start", borderWidth: 1, marginBottom: 12 },
  eventCountText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  footerNote: { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", marginTop: 20, lineHeight: 16 },

  // Partner CTA
  partnerCTA: { marginBottom: 24 },
  partnerCTAGradient: { padding: 24, borderRadius: 24, borderWidth: 1, borderColor: "rgba(251,191,36,0.2)", alignItems: "center" },
  partnerCTAIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(251,191,36,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  partnerCTATitle: { color: "#fbbf24", fontSize: 18, fontWeight: "900", letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  partnerCTADescription: { color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 12 },
  currentPartnerBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  currentPartnerText: { color: COLORS.success, fontSize: 12, fontWeight: "bold" },

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
