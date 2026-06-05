import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

interface GlassCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  /** Optional gradient (defaults to subtle surface->background) */
  gradient?: readonly [string, string];
  /** Right side action button text */
  actionLabel?: string;
  onAction?: () => void;
  /** Tag above title */
  tag?: string;
  tagColor?: string;
  /** Make the whole card pressable */
  onPress?: () => void;
  style?: ViewStyle;
  /** Children below the main content */
  children?: React.ReactNode;
}

/**
 * GlassCard — Premium looking promotional/feature card.
 * Used for upgrade banners, sponsor blocks, and featured sections.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  subtitle,
  description,
  icon,
  iconColor = COLORS.primary,
  gradient = ['rgba(30,58,138,0.4)', 'rgba(49,46,129,0.4)'] as const,
  actionLabel,
  onAction,
  tag,
  tagColor,
  onPress,
  style,
  children,
}) => {
  const content = (
    <LinearGradient
      colors={gradient as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.card, style]}
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          {tag && (
            <View
              style={[
                styles.tag,
                tagColor
                  ? { backgroundColor: tagColor }
                  : { backgroundColor: 'rgba(255,255,255,0.1)' },
              ]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>

        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: `${iconColor}1A` }]}>
            <MaterialIcons name={icon} size={28} color={iconColor} />
          </View>
        )}
      </View>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: iconColor }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <MaterialIcons name="arrow-forward" size={14} color="white" />
        </TouchableOpacity>
      )}

      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  tagText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  description: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    lineHeight: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  actionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export default GlassCard;
