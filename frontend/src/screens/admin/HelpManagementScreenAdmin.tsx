import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supportAPI } from '../../services/api';
import { SafeScreen } from '../../components/SafeScreen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PopupModal } from '../../components/PopupModal';
import { FilterBottomSheet, FilterSection } from '../../components/FilterBottomSheet';
import { COLORS } from '../../theme/colors';

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  PAYMENT_ISSUE: { icon: 'credit-card', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Payment' },
  MATCH_DISPUTE: { icon: 'gavel', color: '#f97316', bg: 'rgba(249,115,22,0.12)', label: 'Dispute' },
  ACCOUNT_ISSUE: { icon: 'account-circle', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Account' },
  PARTNER_RELATED: { icon: 'handshake', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'Partner' },
  TECHNICAL_BUG: { icon: 'bug-report', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Bug' },
  REFUND_REQUEST: { icon: 'undo', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', label: 'Refund' },
  REPORT_PLAYER: { icon: 'flag', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Report' },
  GAME_RULES: { icon: 'sports-esports', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', label: 'Rules' },
  FEATURE_REQUEST: { icon: 'lightbulb-outline', color: '#eab308', bg: 'rgba(234,179,8,0.12)', label: 'Feature' },
  OTHER: { icon: 'help-outline', color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)', label: 'Other' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  OPEN: { label: 'OPEN', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'inbox' },
  IN_PROGRESS: { label: 'IN PROGRESS', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', icon: 'autorenew' },
  AWAITING_USER: { label: 'AWAITING USER', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: 'hourglass-top' },
  RESOLVED: { label: 'RESOLVED', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: 'check-circle' },
  CLOSED: { label: 'CLOSED', color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', icon: 'lock' },
};

const PRIORITY_META: Record<string, { color: string; icon: string }> = {
  LOW: { color: '#3b82f6', icon: 'arrow-downward' },
  MEDIUM: { color: '#fbbf24', icon: 'remove' },
  HIGH: { color: '#f97316', icon: 'arrow-upward' },
  URGENT: { color: '#ef4444', icon: 'priority-high' },
};

const STATUS_FILTERS: { key: string; label: string; icon: any }[] = [
  { key: 'ALL', label: 'All', icon: 'apps' },
  { key: 'OPEN', label: 'Open', icon: 'inbox' },
  { key: 'IN_PROGRESS', label: 'Active', icon: 'autorenew' },
  { key: 'AWAITING_USER', label: 'Waiting', icon: 'hourglass-top' },
  { key: 'RESOLVED', label: 'Resolved', icon: 'check-circle' },
  { key: 'CLOSED', label: 'Closed', icon: 'lock' },
];

export const HelpManagementScreenAdmin = ({ navigation }: any) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: any = { limit: 100 };
      if (filter !== 'ALL') params.status = filter;
      if (search.trim()) params.search = search.trim();
      const [ticketsRes, statsRes] = await Promise.all([
        supportAPI.getAllTickets(params),
        supportAPI.getTicketStats().catch(() => null),
      ]);
      if (ticketsRes.data?.success) setTickets(ticketsRes.data.data?.tickets || []);
      if (statsRes?.data?.success) setStats(statsRes.data.data);
    } catch {
      // silent
    }
  }, [filter, search]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const renderTicket = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] || STATUS_META.OPEN;
    const cat = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
    const pri = PRIORITY_META[item.priority] || PRIORITY_META.MEDIUM;
    const isUnassigned = !item.assigned_to;
    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() =>
          navigation.navigate('HelpConversation', {
            ticketId: item._id,
            isAdmin: true,
          })
        }
        activeOpacity={0.85}
      >
        {/* Priority accent bar */}
        <View style={[styles.priorityBar, { backgroundColor: pri.color }]} />

        <View style={styles.ticketInner}>
          {/* Category icon */}
          <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
            <MaterialIcons name={cat.icon as any} size={20} color={cat.color} />
          </View>

          <View style={styles.ticketBody}>
            <View style={styles.ticketTopRow}>
              <Text style={styles.ticketNumber} numberOfLines={1}>
                {item.ticket_number}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                <MaterialIcons name={meta.icon as any} size={9} color={meta.color} />
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <Text style={styles.ticketSubject} numberOfLines={2}>
              {item.subject}
            </Text>
            <View style={styles.userRow}>
              <View style={styles.avatarBubble}>
                <Text style={styles.avatarText}>
                  {(item.user_id?.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.user_id?.username || 'Unknown'}
                </Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{item.user_role}</Text>
                </View>
              </View>
            </View>
            <View style={styles.ticketMetaRow}>
              <View style={styles.metaItem}>
                <MaterialIcons name="category" size={10} color="rgba(255,255,255,0.4)" />
                <Text style={styles.metaItemText}>{cat.label}</Text>
              </View>
              <View style={styles.dot} />
              <View style={styles.metaItem}>
                <MaterialIcons name={pri.icon as any} size={10} color={pri.color} />
                <Text style={[styles.metaItemText, { color: pri.color }]}>{item.priority}</Text>
              </View>
              <View style={styles.dot} />
              <View style={styles.metaItem}>
                <MaterialIcons name="forum" size={10} color="rgba(255,255,255,0.4)" />
                <Text style={styles.metaItemText}>{(item.replies?.length || 0) + 1}</Text>
              </View>
              {isUnassigned && (
                <>
                  <View style={styles.dot} />
                  <View style={[styles.unassignedPill]}>
                    <MaterialIcons name="person-off" size={9} color="#ef4444" />
                    <Text style={styles.unassignedPillText}>Unassigned</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeScreen role="ADMIN">
      <ScreenHeader
        title="Support Tickets"
        titleIcon="support-agent"
        titleIconColor="#ef4444"
        centerTitle
        showBack
        onBack={() => navigation.goBack()}
        rightIcon="tune"
        onRightPress={() => setShowFilter(true)}
      />

      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        renderItem={renderTicket}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
            colors={['#ef4444']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero stats card */}
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroPattern} />
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <View style={styles.heroIconWrap}>
                    <MaterialIcons name="headset-mic" size={22} color="white" />
                  </View>
                  <View>
                    <Text style={styles.heroTitle}>Support Queue</Text>
                    <Text style={styles.heroSubtitle}>
                      {stats?.unassigned || 0} unassigned • {stats?.urgent || 0} urgent
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.heroStatsRow}>
                <HeroStat label="Open" value={stats?.open || 0} color="rgba(255,255,255,0.9)" />
                <View style={styles.heroStatDivider} />
                <HeroStat label="In Prog" value={stats?.inProgress || 0} color="rgba(255,255,255,0.9)" />
                <View style={styles.heroStatDivider} />
                <HeroStat label="Waiting" value={stats?.awaitingUser || 0} color="rgba(255,255,255,0.9)" />
                <View style={styles.heroStatDivider} />
                <HeroStat label="Urgent" value={stats?.urgent || 0} color="#fde047" />
              </View>
            </LinearGradient>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by subject, ticket #, or description…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={searchInput}
                onChangeText={setSearchInput}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchInput('');
                    setSearch('');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {STATUS_FILTERS.map((s) => {
                const active = filter === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                    onPress={() => setFilter(s.key)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name={s.icon as any}
                      size={13}
                      color={active ? 'white' : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ef4444" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconOuter}>
                <LinearGradient
                  colors={['rgba(239,68,68,0.2)', 'rgba(220,38,38,0.05)']}
                  style={styles.emptyIconInner}
                >
                  <MaterialIcons name="inbox" size={40} color="#ef4444" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search query.' : 'No support tickets match the current filter.'}
              </Text>
            </View>
          )
        }
      />

      <FilterBottomSheet
        visible={showFilter}
        title="Filter Tickets"
        subtitle="Refine support queue"
        accentColor="#ef4444"
        sections={[
          {
            key: 'status',
            label: 'Status',
            value: filter,
            options: STATUS_FILTERS.map((s) => ({
              key: s.key,
              label: s.label,
              icon: s.icon,
            })),
          },
        ]}
        onClose={() => setShowFilter(false)}
        onApply={(values) => {
          setFilter(values.status || 'ALL');
          setShowFilter(false);
        }}
      />
    </SafeScreen>
  );
};

// ============== HERO STAT ==============
const HeroStat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.heroStatItem}>
    <Text style={[styles.heroStatValue, { color }]}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

// ============== FILTER MODAL REMOVED — using shared component ==============

const styles = StyleSheet.create({
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },

  // Hero
  heroCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroPattern: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroContent: { marginBottom: 16 },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: 'white', fontSize: 17, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.4 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: { flex: 1, color: 'white', fontSize: 13, padding: 0 },

  // Filter pills
  filterScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterPillActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  filterPillText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  filterPillTextActive: { color: 'white' },

  // Ticket card
  ticketCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  priorityBar: { width: 4 },
  ticketInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBody: { flex: 1, gap: 4 },
  ticketTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketNumber: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  ticketSubject: { color: 'white', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  avatarBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(244,123,37,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#f47b25', fontSize: 11, fontWeight: '900' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  rolePill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaItemText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  unassignedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unassignedPillText: { color: '#ef4444', fontSize: 9, fontWeight: '800' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  emptySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 19 },
});
