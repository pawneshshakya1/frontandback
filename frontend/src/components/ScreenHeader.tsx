import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING } from '../theme/colors';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  /** Optional badge count shown on right icon */
  rightBadge?: number;
  /** Optional second right icon */
  rightIcon2?: keyof typeof MaterialIcons.glyphMap;
  onRightPress2?: () => void;
  /** Optional custom node rendered in the right area (overrides rightIcon/rightIcon2) */
  rightSlot?: React.ReactNode;
  /** Optional custom center content (overrides title) */
  centerContent?: React.ReactNode;
  /** Override the title text color */
  titleColor?: string;
  /** Optional title icon */
  titleIcon?: keyof typeof MaterialIcons.glyphMap;
  titleIconColor?: string;
  /** Whether to apply safe area top padding automatically */
  applyTopInset?: boolean;
  /** Center the title text horizontally in the header */
  centerTitle?: boolean;
  style?: ViewStyle;
}

/**
 * ScreenHeader — Reusable header with safe-area top inset, blur background,
 * back button, optional right actions and badge. Used by USER, ADMIN, PARTNER.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  rightBadge,
  rightIcon2,
  onRightPress2,
  rightSlot,
  centerContent,
  titleColor = COLORS.textLight,
  titleIcon,
  titleIconColor = COLORS.primary,
  applyTopInset = true,
  centerTitle = false,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, style]}>
      {applyTopInset && (
        <BlurView
          intensity={250}
          tint="dark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            zIndex: 100,
          }}
        />
      )}
      <View
        style={[
          styles.container,
          { paddingTop: applyTopInset ? insets.top + 12 : 12 },
        ]}
      >
        <View style={styles.row}>
          {showBack && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onBack || (() => {})}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialIcons name="chevron-left" size={28} color="white" />
            </TouchableOpacity>
          )}

          {centerContent ? (
            <View style={styles.centerContent}>{centerContent}</View>
          ) : (
            <View style={[styles.titleContainer, centerTitle && styles.titleContainerCentered]}>
              {titleIcon && (
                <MaterialIcons
                  name={titleIcon}
                  size={20}
                  color={titleIconColor}
                  style={{ marginRight: 8 }}
                />
              )}
              <View style={centerTitle ? styles.titleTextWrapperCentered : undefined}>
                <Text
                  style={[
                    styles.title,
                    { color: titleColor },
                    centerTitle && styles.titleTextCentered,
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    style={[styles.subtitle, centerTitle && styles.subtitleCentered]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.rightActions}>
            {rightSlot ? (
              rightSlot
            ) : (
              <>
                {rightIcon && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={onRightPress}
                    accessibilityRole="button"
                    accessibilityLabel="Action"
                  >
                    <MaterialIcons name={rightIcon} size={22} color="white" />
                    {typeof rightBadge === 'number' && rightBadge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {rightBadge > 9 ? '9+' : rightBadge}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                {rightIcon2 && (
                  <TouchableOpacity
                    style={[styles.iconButton, { marginLeft: 8 }]}
                    onPress={onRightPress2}
                    accessibilityRole="button"
                    accessibilityLabel="Action"
                  >
                    <MaterialIcons name={rightIcon2} size={22} color="white" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainerCentered: {
    justifyContent: 'center',
  },
  titleTextWrapperCentered: {
    alignItems: 'center',
  },
  titleTextCentered: {
    textAlign: 'center',
  },
  subtitleCentered: {
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.backgroundDark,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default ScreenHeader;
