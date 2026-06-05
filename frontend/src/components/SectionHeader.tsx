import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { COLORS, SPACING } from "../theme/colors";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  accentColor?: string;
  /** Apply horizontal padding */
  padded?: boolean;
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  align?: "left" | "center" | "right";
}

/**
 * SectionHeader — Common "section title + optional action" header used
 * across Home, Wallet, Profile, Admin Dashboard, Partner Dashboard, etc.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  accentColor = COLORS.primary,
  padded = true,
  containerStyle,
  titleStyle,
  align = "left",
}) => {
  return (
    <View
      style={[
        styles.container,
        padded && { paddingHorizontal: SPACING.SCREEN_PADDING },
        containerStyle,
      ]}
    >
      <View
        style={[
          styles.leftRow,
          align === "center" && { justifyContent: "center" },
        ]}
      >
        <View>
          <Text
            style={[styles.title, { textAlign: align }, titleStyle]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { textAlign: align }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {actionLabel && onActionPress && (
        <Text
          style={styles.action}
          onPress={onActionPress}
          accessibilityRole="button"
        >
          {actionLabel}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  action: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});

export default SectionHeader;
