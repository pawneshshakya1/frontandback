import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

interface InfoCardProps {
  /** Optional left icon name */
  icon?: keyof typeof MaterialIcons.glyphMap;
  /** Optional icon color, defaults to primary */
  iconColor?: string;
  /** Optional icon background color, defaults to primaryBg */
  iconBg?: string;
  /** Title (large) */
  title: string;
  /** Subtitle / supporting text */
  subtitle?: string;
  /** Right side value (e.g. "₹ 1,200") */
  rightValue?: string;
  /** Right side label (e.g. "Available") */
  rightLabel?: string;
  /** Show right chevron */
  showChevron?: boolean;
  onPress?: () => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Variant */
  variant?: 'default' | 'highlight' | 'warning' | 'success' | 'danger';
  /** Bottom small action row */
  footer?: React.ReactNode;
  /** Optional label badge on right */
  badge?: string;
  badgeColor?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  iconColor = COLORS.primary,
  iconBg,
  title,
  subtitle,
  rightValue,
  rightLabel,
  showChevron = false,
  onPress,
  style,
  variant = 'default',
  footer,
  badge,
  badgeColor,
}) => {
  const variantConfig = VARIANT_STYLES[variant];

  const containerStyle: ViewStyle = {
    ...styles.container,
    backgroundColor: variantConfig.background,
    borderColor: variantConfig.border,
    ...(style as ViewStyle),
  };

  const content = (
    <View style={styles.row}>
      {icon && (
        <View
          style={[
            styles.iconBox,
            { backgroundColor: iconBg || variantConfig.iconBg },
          ]}
        >
          <MaterialIcons name={icon} size={20} color={iconColor} />
        </View>
      )}

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: (badgeColor || variantConfig.badgeBg) },
              ]}
            >
              <Text style={[styles.badgeText, { color: variantConfig.badgeFg }]}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {(rightValue || showChevron) && (
        <View style={styles.rightCol}>
          {rightValue && (
            <Text style={[styles.rightValue, { color: variantConfig.rightFg }]} numberOfLines={1}>
              {rightValue}
            </Text>
          )}
          {rightLabel && <Text style={styles.rightLabel} numberOfLines={1}>{rightLabel}</Text>}
          {showChevron && (
            <MaterialIcons
              name="chevron-right"
              size={20}
              color="rgba(255,255,255,0.2)"
              style={{ marginTop: 2 }}
            />
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={containerStyle}>
      {onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
};

const VARIANT_STYLES: Record<
  'default' | 'highlight' | 'warning' | 'success' | 'danger',
  {
    background: string;
    border: string;
    iconBg: string;
    rightFg: string;
    badgeBg: string;
    badgeFg: string;
  }
> = {
  default: {
    background: COLORS.surface,
    border: COLORS.border,
    iconBg: 'rgba(244,123,37,0.1)',
    rightFg: COLORS.textLight,
    badgeBg: 'rgba(255,255,255,0.1)',
    badgeFg: COLORS.textLight,
  },
  highlight: {
    background: 'rgba(244,123,37,0.08)',
    border: 'rgba(244,123,37,0.2)',
    iconBg: 'rgba(244,123,37,0.15)',
    rightFg: COLORS.primary,
    badgeBg: 'rgba(244,123,37,0.2)',
    badgeFg: COLORS.primary,
  },
  warning: {
    background: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.2)',
    iconBg: 'rgba(234,179,8,0.15)',
    rightFg: COLORS.warning,
    badgeBg: 'rgba(234,179,8,0.2)',
    badgeFg: COLORS.warning,
  },
  success: {
    background: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    iconBg: 'rgba(34,197,94,0.15)',
    rightFg: COLORS.success,
    badgeBg: 'rgba(34,197,94,0.2)',
    badgeFg: COLORS.success,
  },
  danger: {
    background: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    iconBg: 'rgba(239,68,68,0.15)',
    rightFg: COLORS.error,
    badgeBg: 'rgba(239,68,68,0.2)',
    badgeFg: COLORS.error,
  },
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rightValue: {
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  rightLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default InfoCard;
