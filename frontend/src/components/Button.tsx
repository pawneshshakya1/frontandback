import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: {
      backgroundColor: COLORS.primary,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 6,
    },
    text: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  },
  secondary: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: COLORS.primary,
    },
    text: {
      color: COLORS.primary,
      fontWeight: '700',
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
    },
    text: {
      color: COLORS.primary,
      fontWeight: '600',
    },
  },
  danger: {
    container: {
      backgroundColor: COLORS.error,
      shadowColor: COLORS.error,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
      elevation: 6,
    },
    text: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  },
};

const SIZE_STYLES: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: {
      height: 36,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.sm,
    },
    text: {
      fontSize: 12,
      letterSpacing: 0.5,
    },
  },
  md: {
    container: {
      height: 44,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.md,
    },
    text: {
      fontSize: 14,
      letterSpacing: 0.8,
    },
  },
  lg: {
    container: {
      height: 52,
      paddingHorizontal: SPACING.xl,
      borderRadius: RADIUS.lg,
    },
    text: {
      fontSize: 16,
      letterSpacing: 1,
    },
  },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  fullWidth = false,
  accessibilityLabel,
}) => {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...variantStyle.container,
    ...sizeStyle.container,
    ...(fullWidth ? { width: '100%' } : {}),
    ...(isDisabled ? { opacity: 0.5 } : {}),
    ...style,
  };

  const combinedTextStyle: TextStyle = {
    ...variantStyle.text,
    ...sizeStyle.text,
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : COLORS.primary} />
      ) : (
        <>
          {leftIcon && leftIcon}
          <Text style={combinedTextStyle}>{title}</Text>
          {rightIcon && rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
