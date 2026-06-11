import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Share,
  Animated,
  Easing,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import QRCode from "react-native-qrcode-svg";
import { walletAPI } from "../../services/api";
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from "../../theme/colors";
import { useAuth } from "../../context/AuthContext";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");
const QR_SIZE = Math.min(width * 0.6, 240);

export const ReceiveQRSCREEN = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const { showError, showSuccess, PopupElement } = usePopup();

  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [accountNo, setAccountNo] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchQRCode();
    startPulse();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const fetchQRCode = async () => {
    try {
      setLoading(true);
      const response = await walletAPI.getMyQRCode();
      if (response.data?.success) {
        setQrPayload(response.data.data.qrPayload);
        setAccountNo(response.data.data.accountNo);
      }
    } catch (error: any) {
      console.error("Error fetching QR:", error);
      showError("Error", "Failed to generate QR code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!accountNo) return;
    Clipboard.setString(accountNo);
    showSuccess("Copied!", "Account number copied to clipboard.");
  };

  const handleShare = async () => {
    if (!accountNo) return;
    try {
      await Share.share({
        message: `Send me money on BattleCore! 🚀\n\nMy Account Number: ${accountNo}\n\nScan my QR or use my account number to pay.`,
      });
    } catch (error: any) {
      console.error("Share error:", error);
    }
  };

  const handleScanToPay = () => {
    const state = navigation.getState();
    const tabName = state?.routeNames?.includes("MainTabs")
      ? "MainTabs"
      : state?.routeNames?.includes("PartnerTabs")
        ? "PartnerTabs"
        : null;
    if (tabName) {
      navigation.navigate(tabName, { screen: "Scan" });
    } else {
      showError("Navigation Error", "Could not open scanner.");
    }
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Theme glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top Status Bar Blur */}
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
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="chevron-left"
            size={26}
            color={COLORS.textLight}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Payment</Text>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <MaterialIcons name="share" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SPACING.xl + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Card with pulse glow */}
        <View style={styles.qrCardOuter}>
          {/* <Animated.View
            style={[
              styles.qrPulse,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          /> */}

          <View style={styles.qrCard}>
            <LinearGradient
              colors={COLORS.gradientCard}
              style={styles.qrGradient}
            >
              <View style={styles.qrContainer}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>
                      Generating secure QR...
                    </Text>
                  </View>
                ) : qrPayload ? (
                  <QRCode
                    value={qrPayload}
                    size={QR_SIZE}
                    backgroundColor="white"
                    color={COLORS.backgroundDark}
                    logo={undefined}
                    quietZone={8}
                  />
                ) : (
                  <View style={styles.errorContainer}>
                    <MaterialIcons
                      name="error-outline"
                      size={48}
                      color={COLORS.error}
                    />
                    <Text style={styles.errorText}>Failed to load QR</Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={fetchQRCode}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.retryText}>TAP TO RETRY</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
          {/* Security badge */}
          <View style={styles.securityBadge}>
            <MaterialIcons
              name="verified-user"
              size={14}
              color={COLORS.success}
            />
            <Text style={styles.securityText}>
              Secure QR · Expires in 5 min
            </Text>
          </View>
        </View>

        {/* Account Number Card */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountLabel}>YOUR ACCOUNT NUMBER</Text>
            <TouchableOpacity
              style={styles.copyBtnSmall}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="content-copy"
                size={14}
                color={COLORS.primary}
              />
              <Text style={styles.copyBtnText}>COPY</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.accountValue} selectable>
            {accountNo}
          </Text>
        </View>

        {/* How It Works - Numbered Steps */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIconContainer}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={COLORS.info}
              />
            </View>
            <Text style={styles.infoTitle}>How It Works</Text>
          </View>

          <View style={styles.stepsList}>
            <Step
              num={1}
              icon="qrcode-scan"
              title="Show QR to sender"
              desc="Display this code in person or share"
            />
            <Step
              num={2}
              icon="bolt"
              title="They scan & enter amount"
              desc="Sender uses BattleCore scan screen"
            />
            <Step
              num={3}
              icon="check-circle"
              title="Confirm with PIN"
              desc="Funds transfer instantly to your wallet"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={handleScanToPay}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={COLORS.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanBtnGradient}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={20}
                color="white"
              />
              <Text style={styles.scanBtnText}>SCAN TO PAY</Text>
              <MaterialIcons name="arrow-forward" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PopupElement />
    </View>
  );
};

/* ============== Reusable Step Component ============== */
const Step = ({
  num,
  icon,
  title,
  desc,
}: {
  num: number;
  icon: string;
  title: string;
  desc: string;
}) => (
  <View style={styles.stepRow}>
    <View style={styles.stepNumWrap}>
      <LinearGradient colors={COLORS.gradientPrimary} style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </LinearGradient>
    </View>
    <View style={styles.stepContent}>
      <View style={styles.stepTitleRow}>
        <MaterialCommunityIcons
          name={icon as any}
          size={14}
          color={COLORS.primary}
        />
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-15%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(244, 123, 37, 0.15)",
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-15%",
    left: "-15%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: SPACING.md,
    zIndex: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.sizes.h2,
    fontWeight: "bold",
    letterSpacing: -0.3,
  },

  /* Scroll */
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: SPACING.md,
  },

  /* Hero */
  heroSection: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  heroIconWrap: {
    marginBottom: SPACING.sm,
    ...SHADOWS.orange,
  },
  heroIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.sizes.h1,
    fontWeight: "bold",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyS,
    textAlign: "center",
    paddingHorizontal: SPACING.md,
    lineHeight: 18,
  },

  /* QR Card */
  qrCardOuter: {
    position: "relative",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  qrPulse: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  qrCard: {
    width: "100%",
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    ...SHADOWS.md,
  },
  qrGradient: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 123, 37, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(244, 123, 37, 0.2)",
  },
  brandChipText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  qrContainer: {
    backgroundColor: "white",
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
  },
  loadingContainer: {
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: 60,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.bodyS,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
  },
  securityText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  errorContainer: {
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: 40,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.sizes.bodyM,
  },
  retryBtn: {
    backgroundColor: COLORS.errorBg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  retryText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  /* Account Card */
  accountCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  accountLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  copyBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244, 123, 37, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "rgba(244, 123, 37, 0.2)",
  },
  copyBtnText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  accountValue: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.sizes.numberS,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },

  /* Info / How It Works */
  infoCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.sizes.bodyL,
    fontWeight: "bold",
  },
  stepsList: {
    gap: SPACING.md,
  },
  stepRow: {
    flexDirection: "row",
    gap: SPACING.md,
    alignItems: "flex-start",
  },
  stepNumWrap: {
    ...SHADOWS.orange,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  stepTitle: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: "bold",
  },
  stepDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  /* Action Row */
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  shareBtn: {
    flex: 0.9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(244, 123, 37, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 123, 37, 0.3)",
  },
  shareBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  scanBtn: {
    flex: 1.6,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOWS.orange,
  },
  scanBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
  },
  scanBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
