import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StatusBar,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

export type SafeScreenRole = 'USER' | 'ADMIN' | 'PARTNER' | 'AUTH';

interface SafeScreenProps {
  children: React.ReactNode;
  /** Role to apply role-specific accent. Default: USER */
  role?: SafeScreenRole;
  /** Background color. Default: themeColors.backgroundDark */
  backgroundColor?: string;
  /** Disable top safe area padding (useful when header has its own padding) */
  disableTopSafeArea?: boolean;
  /** Disable bottom safe area padding (useful when tab bar handles it) */
  disableBottomSafeArea?: boolean;
  /** Edges to apply safe area to. Default: ['top','bottom'] */
  edges?: Edge[];
  /** Optional style for inner container */
  style?: ViewStyle;
  /** Show refresh control wrapper */
  refreshing?: boolean;
  /** Callback when refresh is triggered */
  onRefresh?: () => void;
  /** Scroll wrapper (renders ScrollView instead of View) */
  scroll?: boolean;
  /** Keyboard avoiding behavior */
  keyboardAvoiding?: boolean;
  /** Apply horizontal padding inside container */
  padded?: boolean;
  /** Use a status bar with light-content */
  withStatusBar?: boolean;
}

/**
 * SafeScreen — universal safe area wrapper for all roles.
 *
 * Ensures content never overlaps:
 * - device notch / status bar (top)
 * - home indicator / navigation bar (bottom)
 *
 * It is used by USER, ADMIN and PARTNER screens consistently.
 */
export const SafeScreen: React.FC<SafeScreenProps> = ({
  children,
  role = 'USER',
  backgroundColor = COLORS.backgroundDark,
  disableTopSafeArea = false,
  disableBottomSafeArea = false,
  edges = ['top', 'bottom'],
  style,
  refreshing = false,
  onRefresh,
  scroll = false,
  keyboardAvoiding = false,
  padded = false,
  withStatusBar = true,
}) => {
  const insets = useSafeAreaInsets();

  const paddingTop = !disableTopSafeArea && edges.includes('top') ? insets.top : 0;
  const paddingBottom = !disableBottomSafeArea && edges.includes('bottom') ? insets.bottom : 0;

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
  };

  const innerStyle: ViewStyle = {
    flex: scroll ? undefined : 1,
    paddingTop,
    paddingBottom,
    paddingHorizontal: padded ? 16 : 0,
    ...style,
  };

  const accentColor = getAccentForRole(role);

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={innerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
            colors={[accentColor]}
            progressBackgroundColor={COLORS.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={innerStyle}>{children}</View>
  );

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <View style={containerStyle}>
      {withStatusBar && (
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
      )}
      {wrapped}
    </View>
  );
};

const getAccentForRole = (role: SafeScreenRole): string => {
  switch (role) {
    case 'ADMIN':
      return '#ef4444';
    case 'PARTNER':
      return '#fbbf24';
    case 'AUTH':
      return COLORS.primary;
    case 'USER':
    default:
      return COLORS.primary;
  }
};

export default SafeScreen;
