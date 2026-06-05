import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { COLORS } from "../../theme/colors";

interface Props {
  currentTier: string;
  handleUpgradeTier: (tier: string) => void;
  upgrading: boolean;
}

const allTiers = [
  {
    key: "standard",
    name: "Standard",
    price: 499,
    commission: "1%",
    events: "10/mo",
    entryFee: "₹100",
    prizePool: "₹5K",
    color: "#94a3b8",
    icon: "shield",
    features: [
      "1% Platform Fee",
      "10 Events/Month",
      "Standard Events",
      "Partner Badge",
      "Verified Profile",
      "Email Support",
    ],
  },
  {
    key: "sponsored",
    name: "Sponsored",
    price: 1499,
    commission: "3%",
    events: "30/mo",
    entryFee: "₹500",
    prizePool: "₹25K",
    color: "#3b82f6",
    icon: "campaign",
    features: [
      "3% Platform Fee",
      "30 Events/Month",
      "Sponsored Events",
      "Featured Listing",
      "Offline Events",
      "Analytics",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: 4999,
    commission: "5%",
    events: "Unlimited",
    entryFee: "₹1,000",
    prizePool: "₹1L",
    color: "#fbbf24",
    icon: "workspace-premium",
    features: [
      "5% Platform Fee",
      "Unlimited Events",
      "All Event Types",
      "Priority Support",
      "Full Analytics",
      "Premium Badge",
    ],
  },
];

const R = 24;
const dashLen = 800;

export const PartnerUpgrade = ({ currentTier, handleUpgradeTier, upgrading }: Props) => {
  const snakeProgress = useRef(new Animated.Value(0)).current;
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(snakeProgress, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const perim =
    cardSize.w > 0 && cardSize.h > 0
      ? 2 * (cardSize.w - 2 * R) + 2 * (cardSize.h - 2 * R) + 2 * Math.PI * R
      : 0;
  const dashArr = perim > 0 ? `${dashLen} ${perim - dashLen}` : "80 1000";

  const dashOffset = snakeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -perim],
  });

  const AnimatedRect = useRef(Animated.createAnimatedComponent(Rect)).current;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabSubtitle}>
        Upgrade to unlock more features, create more events, and reduce
        Platform Fee rates.
      </Text>

      {allTiers.map((tier) => {
        const isCurrent = tier.key === currentTier;
        const isUpgrade =
          (currentTier === "standard" &&
            (tier.key === "sponsored" || tier.key === "premium")) ||
          (currentTier === "sponsored" && tier.key === "premium");

        return (
          <View
            key={tier.key}
            style={[styles.premiumCard, isCurrent && { borderWidth: 0 }]}
            onLayout={
              isCurrent
                ? (e) => {
                    const { width, height } = e.nativeEvent.layout;
                    setCardSize({ w: width, h: height });
                  }
                : undefined
            }
          >
            {/* Snake border animation */}
            {isCurrent && cardSize.w > 0 && cardSize.h > 0 && (
              <Svg
                width={cardSize.w}
                height={cardSize.h}
                viewBox={`0 0 ${cardSize.w} ${cardSize.h}`}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                <Defs>
                  <SvgGradient id="snakeGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#f47b25" stopOpacity="1" />
                    <Stop offset="40%" stopColor="#f47b25" stopOpacity="0.5" />
                    <Stop offset="100%" stopColor="#f47b25" stopOpacity="0" />
                  </SvgGradient>
                </Defs>
                <AnimatedRect
                  x={0}
                  y={0}
                  width={cardSize.w}
                  height={cardSize.h}
                  rx={R}
                  ry={R}
                  stroke="#f47b25"
                  strokeWidth={10}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={dashArr}
                  strokeDashoffset={dashOffset}
                  opacity={0.15}
                />
                <AnimatedRect
                  x={0}
                  y={0}
                  width={cardSize.w}
                  height={cardSize.h}
                  rx={R}
                  ry={R}
                  stroke="url(#snakeGrad)"
                  strokeWidth={4}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={dashArr}
                  strokeDashoffset={dashOffset}
                />
              </Svg>
            )}

            <View style={isCurrent ? styles.animContentWrap : { flex: 1 }}>
              <View
                style={[
                  styles.premiumCardGlow,
                  { backgroundColor: tier.color + "12" },
                ]}
              />

              <LinearGradient
                colors={[tier.color + "25", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.premiumHeaderBg}
              />

              <View style={styles.premiumHeader}>
                <View
                  style={[
                    styles.premiumIconWrap,
                    { backgroundColor: tier.color + "20" },
                  ]}
                >
                  <MaterialIcons
                    name={tier.icon as any}
                    size={24}
                    color={tier.color}
                  />
                </View>
                <View style={styles.premiumHeaderRight}>
                  <Text
                    style={[styles.premiumTierLabel, { color: tier.color }]}
                  >
                    {tier.name}
                  </Text>
                </View>
                <View style={styles.premiumPriceArea}>
                  <View style={styles.premiumPriceAreaInner}>
                    <Text style={styles.premiumPriceCurrency}>₹</Text>
                    <Text style={styles.premiumPrice}>
                      {tier.price.toLocaleString()}/
                    </Text>
                  </View>
                  <Text style={styles.premiumPricePeriod}>month</Text>
                </View>
              </View>

              <View style={styles.premiumFeaturesGrid}>
                {tier.features.map((f, i) => (
                  <View key={i} style={styles.premiumFeatureCol}>
                    <View
                      style={[
                        styles.premiumFeatureCheck,
                        { backgroundColor: tier.color + "20" },
                      ]}
                    >
                      <MaterialIcons
                        name="check"
                        size={10}
                        color={tier.color}
                      />
                    </View>
                    <Text style={styles.premiumFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent ? (
                <TouchableOpacity
                  style={[
                    styles.premiumCta,
                    isUpgrade
                      ? { backgroundColor: "#f47b25" }
                      : {
                          backgroundColor: "rgba(239,68,68,0.1)",
                          borderWidth: 1,
                          borderColor: "rgba(239,68,68,0.25)",
                        },
                  ]}
                  onPress={() => isUpgrade && handleUpgradeTier(tier.key)}
                  disabled={!isUpgrade || upgrading}
                >
                  <MaterialIcons
                    name={isUpgrade ? "flash-on" : "arrow-downward"}
                    size={14}
                    color={isUpgrade ? "white" : "#ef4444"}
                  />
                  <Text
                    style={[
                      styles.premiumCtaText,
                      { color: isUpgrade ? "white" : "#ef4444" },
                    ]}
                  >
                    {isUpgrade ? "UPGRADE NOW" : "DOWNGRADE"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.premiumActiveRow}>
                  <MaterialIcons name="check-circle" size={14} color="#22c55e" />
                  <Text style={styles.premiumActiveText}>ACTIVE PLAN</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: { paddingHorizontal: 16 },
  tabSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },

  // Premium Upgrade Cards
  premiumCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    position: "relative",
    paddingBottom: 16,
  },
  animContentWrap: {
    margin: 2,
    backgroundColor: "#111111",
    borderRadius: 22,
    flex: 1,
    overflow: "hidden",
  },
  premiumCardGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  premiumHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  premiumIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumHeaderRight: {
    flex: 1,
  },
  premiumTierLabel: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  premiumPriceArea: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  premiumPriceAreaInner: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  premiumPriceCurrency: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    marginRight: 1,
  },
  premiumPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1,
  },
  premiumPricePeriod: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
    marginLeft: 4,
  },
  premiumFeaturesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  premiumFeatureCol: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumFeatureCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  premiumFeatureText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    flexShrink: 1,
  },
  premiumCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  premiumCtaText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  premiumActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  premiumActiveText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#22c55e",
    letterSpacing: 0.8,
  },
});
