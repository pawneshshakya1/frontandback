import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme/colors';

export interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onPress: () => void;
  badge?: string | number;
  /** Whether the action is highlighted (with a primary ring) */
  highlight?: boolean;
  /** Whether the action is disabled */
  disabled?: boolean;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
  /** If true, renders a horizontal scroll; otherwise wraps to multiple rows */
  layout?: 'horizontal' | 'grid';
  /** Container style */
  style?: ViewStyle;
  /** Card width when horizontal */
  cardWidth?: number;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  actions,
  layout = 'horizontal',
  style,
  cardWidth = 100,
}) => {
  if (layout === 'horizontal') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={styles.horizontalContent}
      >
        {actions.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            cardWidth={cardWidth}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.gridContainer, style]}>
      {actions.map((a) => (
        <View key={a.id} style={{ width: `${100 / 4}%`, padding: 4 }}>
          <ActionCard action={a} cardWidth={'100%' as any} />
        </View>
      ))}
    </View>
  );
};

const ActionCard: React.FC<{ action: QuickAction; cardWidth: number | string }> = ({
  action,
  cardWidth,
}) => {
  const cardStyle: ViewStyle = {
    width: cardWidth as any,
    backgroundColor: action.highlight ? 'rgba(244,123,37,0.08)' : COLORS.surface,
    borderColor: action.highlight ? 'rgba(244,123,37,0.3)' : 'rgba(255,255,255,0.05)',
    opacity: action.disabled ? 0.4 : 1,
  };

  return (
    <TouchableOpacity
      style={[styles.card, cardStyle]}
      onPress={action.onPress}
      disabled={action.disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={action.label}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: action.iconBg || 'rgba(244,123,37,0.1)' },
        ]}
      >
        <MaterialIcons
          name={action.icon}
          size={20}
          color={action.iconColor || COLORS.primary}
        />
        {action.badge !== undefined && action.badge !== null && (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{action.badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionLabel} numberOfLines={2}>
        {action.label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  horizontalContent: {
    paddingHorizontal: SPACING.SCREEN_PADDING,
    gap: SPACING.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  actionBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  actionBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default QuickActionsGrid;
