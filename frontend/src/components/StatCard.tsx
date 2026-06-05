import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';

interface StatCardProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  value: string | number;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, iconColor, value, label }) => (
  <View style={styles.container}>
    <MaterialIcons name={icon} size={24} color={iconColor} />
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
