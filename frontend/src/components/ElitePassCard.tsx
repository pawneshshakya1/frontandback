import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Rect,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { COLORS } from "../theme/colors";

interface Benefit {
  title: string;
  description: string;
  icon: string;
}

interface PassData {
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
  benefits?: Benefit[];
  pass_category?: string;
  partner_tier?: string;
  commission_rate?: number | null;
  max_events_per_month?: number | null;
}

interface Props {
  pass: PassData;
  isActive?: boolean;
  onPress: () => void;
  category: "user" | "partner";
}

const PASS_ICONS: Record<string, string> = {
  pro: "military-tech",
  elite: "workspace-premium",
  supreme: "stars",
  standard: "shield",
  sponsored: "campaign",
  premium: "workspace-premium",
};

const R = 24;
const dashLen = 800;

export const ElitePassCard: React.FC<Props> = ({
  pass,
  isActive = false,
  onPress,
  category,
}) => {
  const snakeProgress = useRef(new Animated.Value(0)).current;
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 });

  const tierColor = pass.color || COLORS.primary;
  const icon = PASS_ICONS[pass.partner_tier || pass.pass_type] || "stars";
  const displayName = pass.name?.toUpperCase() || pass.pass_type?.toUpperCase();
  const features = (pass.features || []).slice(0, 8);
  const benefits = pass.benefits || [];

  useEffect(() => {
    if (!isActive) return;
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
  }, [isActive]);

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
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.premiumCard, isActive && { borderWidth: 0 }]}
      onLayout={
        isActive
          ? (e) => {
              const { width, height } = e.nativeEvent.layout;
              setCardSize({ w: width, h: height });
            }
          : undefined
      }
    >
      {/* Snake border animation for active tier */}
      {isActive && cardSize.w > 0 && cardSize.h > 0 && (
        <Svg
          width={cardSize.w}
          height={cardSize.h}
          viewBox={`0 0 ${cardSize.w} ${cardSize.h}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <SvgGradient id={`snakeGrad-${pass._id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={tierColor} stopOpacity="1" />
              <Stop offset="40%" stopColor={tierColor} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={tierColor} stopOpacity="0" />
            </SvgGradient>
          </Defs>
          <AnimatedRect
            x={0}
            y={0}
            width={cardSize.w}
            height={cardSize.h}
            rx={R}
            ry={R}
            stroke={tierColor}
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
            stroke={`url(#snakeGrad-${pass._id})`}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={dashArr}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      )}

      <View style={isActive ? styles.animContentWrap : { flex: 1 }}>
        {/* Glow orb */}
        <View
          style={[styles.cardGlow, { backgroundColor: tierColor + "12" }]}
        />

        {/* Header gradient */}
        <LinearGradient
          colors={[tierColor + "25", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerBg}
        />

        {/* Popular badge */}
        {pass.is_popular && (
          <View style={[styles.popularBadge, { backgroundColor: tierColor }]}>
            <MaterialIcons name="local-fire-department" size={12} color="white" />
            <Text style={styles.popularBadgeText}>POPULAR</Text>
          </View>
        )}

        {/* Header: icon + name + price */}
        <View style={styles.header}>
          <View
            style={[styles.iconWrap, { backgroundColor: tierColor + "20" }]}
          >
            <MaterialIcons name={icon as any} size={24} color={tierColor} />
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.tierLabel, { color: tierColor }]}>
              {displayName}
            </Text>
            <Text style={styles.categoryTag}>
              {category === "partner" ? "PARTNER TIER" : "ELITE PASS"}
            </Text>
          </View>
          <View style={styles.priceArea}>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>₹</Text>
              <Text style={styles.priceValue}>
                {pass.price?.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.pricePeriod}>/{pass.duration_days} days</Text>
          </View>
        </View>

        {/* Description */}
        {pass.description ? (
          <Text style={styles.description}>{pass.description}</Text>
        ) : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          {category === "user" && pass.event_count != null && (
            <View style={[styles.statPill, { borderColor: tierColor + "40" }]}>
              <MaterialIcons name="event" size={14} color={tierColor} />
              <Text style={[styles.statPillValue, { color: tierColor }]}>
                {pass.event_count}
              </Text>
              <Text style={styles.statPillLabel}>Events</Text>
            </View>
          )}
          {category === "partner" && pass.commission_rate != null && (
            <View style={[styles.statPill, { borderColor: tierColor + "40" }]}>
              <MaterialIcons name="percent" size={14} color={tierColor} />
              <Text style={[styles.statPillValue, { color: tierColor }]}>
                {pass.commission_rate}%
              </Text>
              <Text style={styles.statPillLabel}>Fee</Text>
            </View>
          )}
          {category === "partner" && pass.max_events_per_month != null && (
            <View style={[styles.statPill, { borderColor: tierColor + "40" }]}>
              <MaterialIcons name="event-repeat" size={14} color={tierColor} />
              <Text style={[styles.statPillValue, { color: tierColor }]}>
                {pass.max_events_per_month === 999 ? "∞" : pass.max_events_per_month}
              </Text>
              <Text style={styles.statPillLabel}>Events/Mo</Text>
            </View>
          )}
          {pass.winnings_boost > 0 && (
            <View style={[styles.statPill, { borderColor: tierColor + "40" }]}>
              <MaterialIcons name="trending-up" size={14} color={tierColor} />
              <Text style={[styles.statPillValue, { color: tierColor }]}>
                +{pass.winnings_boost}%
              </Text>
              <Text style={styles.statPillLabel}>Boost</Text>
            </View>
          )}
        </View>

        {/* Features grid - 2 columns */}
        {features.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.sectionLabel}>FEATURES</Text>
            <View style={styles.featuresGrid}>
              {features.map((f, i) => (
                <View key={i} style={styles.featureCol}>
                  <View
                    style={[
                      styles.featureCheck,
                      { backgroundColor: tierColor + "20" },
                    ]}
                  >
                    <MaterialIcons name="check" size={10} color={tierColor} />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Benefits list */}
        {benefits.length > 0 && (
          <View style={styles.benefitsSection}>
            <Text style={styles.sectionLabel}>BENEFITS</Text>
            {benefits.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitIconWrap,
                    { backgroundColor: tierColor + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={(b.icon as any) || "star"}
                    size={14}
                    color={tierColor}
                  />
                </View>
                <View style={styles.benefitInfo}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CTA Button */}
        {isActive ? (
          <View style={styles.activeRow}>
            <MaterialIcons name="check-circle" size={14} color="#22c55e" />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: tierColor }]}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <MaterialIcons name="flash-on" size={14} color="white" />
            <Text style={styles.ctaText}>
              {category === "partner" ? "BECOME A PARTNER" : "GET THIS PASS"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  premiumCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    marginBottom: 16,
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
  cardGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 24,
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "white",
    letterSpacing: 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  priceArea: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceCurrency: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    marginRight: 1,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "500",
    marginLeft: 4,
  },
  description: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  featuresSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1,
    marginBottom: 8,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureCol: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    flexShrink: 1,
  },
  benefitsSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  benefitIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 1,
  },
  benefitDesc: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 14,
  },
  ctaButton: {
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
  ctaText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "white",
  },
  activeRow: {
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
  activeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#22c55e",
    letterSpacing: 0.8,
  },
});

export default ElitePassCard;
