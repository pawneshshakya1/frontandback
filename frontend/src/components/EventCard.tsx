import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../theme/colors';
import { CountdownTimer } from './CountdownTimer';

const FALLBACK_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwQWNaaBgdOXGVmuHX-vDdsW0B_K4GoKl2GcFXoCxPWPrQZ_yNXFZOV5TpsZC00vfqBOwhnsWVfPwodPRTwwgaukeSR6KstNxSN-kB2RD5o5ZN4Dtx6LRX9NuHKTTC52i8O1H4FEh0YIB2T81bmY0Gty3tZzDUJ_8kNaBqKGtXSoHDqmcZ8rBcGZ4mAEb-uJpfHgfiwd-2a7KZ8XkgHuZp6x3V_wCKtwO3E9IZoW6fvj41ubixnkcdl0NX9KIaqM0_5TRfzNgtXEQ';

interface EventCardProps {
  event: any;
  onPress: () => void;
  onPublish?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  variant?: 'list' | 'compact' | 'featured';
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, onEdit, variant = 'list' }) => {
  const isDraft = !event.isPublished;
  const participantsCount = event.participants?.length || 0;
  const maxPlayers = event.max_players || 100;
  const percent = Math.min(100, Math.round((participantsCount / maxPlayers) * 100));
  const mapImage = event.map_image || FALLBACK_IMAGE;

  if (variant === 'compact') {
    return (
      <TouchableOpacity onPress={onPress} style={styles.compactCard}>
        <Image source={{ uri: mapImage }} style={styles.compactThumb} />
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.compactMeta}>{event.mode} • {event.game_type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isDraft ? COLORS.draft : COLORS.success }]}>
          <Text style={styles.statusText}>{isDraft ? 'DRAFT' : event.status}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardMainRow}>
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: mapImage }} style={styles.thumbnailImage} resizeMode="cover" />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.titlePrizeRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
            <View style={styles.prizeBlock}>
              <Text style={styles.prizeLabel}>Prize</Text>
              <Text style={styles.prizeAmount}>₹{event.prize_pool || 0}</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.cardMeta}>{(event.mode || 'Solo').toUpperCase()} • {(event.game_type || 'Battle Royale').toUpperCase()}</Text>
            {event.match_date && event.match_time && (
              <CountdownTimer targetDate={`${event.match_date} ${event.match_time}`} variant="inline" />
            )}
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>JOINED: {participantsCount}/{maxPlayers}</Text>
              <Text style={[styles.progressPercent, { color: COLORS.primary }]}>{percent}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: COLORS.primary }]} />
            </View>
          </View>
          <View style={styles.actionGrid}>
            {isDraft ? (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOrange]} onPress={onEdit}>
                  <Text style={styles.actionBtnTextDark}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDark]} onPress={onPress}>
                  <Text style={styles.actionBtnTextLight}>View</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDark]} onPress={onPress}>
                  <Text style={styles.actionBtnTextLight}>View</Text>
                </TouchableOpacity>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardMainRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  thumbnailContainer: { width: 90, height: 90, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  thumbnailImage: { width: '100%', height: '100%' },
  cardInfo: { flex: 1 },
  titlePrizeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm },
  cardTitle: { flex: 1, color: COLORS.textLight, fontSize: 16, fontWeight: 'bold', lineHeight: 20 },
  prizeBlock: { alignItems: 'flex-end' },
  prizeLabel: { color: COLORS.textMuted, fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  prizeAmount: { color: COLORS.primary, fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  cardMeta: { color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  progressSection: { marginBottom: SPACING.sm },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  progressText: { color: COLORS.textSecondary, fontSize: 9, fontWeight: 'bold' },
  progressPercent: { fontSize: 9, fontWeight: 'bold' },
  progressBarBg: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  actionGrid: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: { flex: 1, paddingVertical: 7, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  actionBtnOrange: { backgroundColor: COLORS.primary },
  actionBtnDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  actionBtnTextDark: { color: '#000', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  actionBtnTextLight: { color: COLORS.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(244,123,37,0.1)', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: `${COLORS.primary}40` },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  liveBadgeText: { color: COLORS.primary, fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  compactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  compactThumb: { width: 48, height: 48, borderRadius: RADIUS.sm },
  compactInfo: { flex: 1, marginLeft: SPACING.md },
  compactTitle: { color: COLORS.textLight, fontSize: 14, fontWeight: 'bold' },
  compactMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
