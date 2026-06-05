import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../theme/colors';

export type Role = 'USER' | 'ADMIN' | 'PARTNER' | 'MEDIATOR';

interface RoleBadgeProps {
  role: Role;
  /** Custom label override */
  label?: string;
  /** Compact mode (less padding) */
  compact?: boolean;
  /** Custom style override */
  style?: ViewStyle;
}

const ROLE_CONFIG: Record<
  Role,
  {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    bg: string;
    fg: string;
    border: string;
  }
> = {
  USER: {
    label: 'PLAYER',
    icon: 'sports-esports',
    bg: 'rgba(244,123,37,0.1)',
    fg: COLORS.primary,
    border: 'rgba(244,123,37,0.2)',
  },
  ADMIN: {
    label: 'ADMIN',
    icon: 'admin-panel-settings',
    bg: 'rgba(239,68,68,0.1)',
    fg: '#ef4444',
    border: 'rgba(239,68,68,0.2)',
  },
  PARTNER: {
    label: 'PARTNER',
    icon: 'handshake',
    bg: 'rgba(251,191,36,0.1)',
    fg: '#fbbf24',
    border: 'rgba(251,191,36,0.2)',
  },
  MEDIATOR: {
    label: 'MEDIATOR',
    icon: 'gavel',
    bg: 'rgba(168,85,247,0.1)',
    fg: '#a855f7',
    border: 'rgba(168,85,247,0.2)',
  },
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  label,
  compact = false,
  style,
}) => {
  const cfg = ROLE_CONFIG[role];
  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
        },
        style,
      ]}
    >
      <MaterialIcons
        name={cfg.icon}
        size={compact ? 10 : 12}
        color={cfg.fg}
      />
      <Text
        style={[
          styles.text,
          compact && styles.compactText,
          { color: cfg.fg },
        ]}
      >
        {label || cfg.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compactContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  compactText: {
    fontSize: 8,
  },
});

export default RoleBadge;
