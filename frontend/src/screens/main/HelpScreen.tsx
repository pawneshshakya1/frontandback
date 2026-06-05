import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supportAPI } from '../../services/api';
import { SafeScreen } from '../../components/SafeScreen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PopupModal } from '../../components/PopupModal';
import { FilterBottomSheet, FilterSection } from '../../components/FilterBottomSheet';
import { COLORS } from '../../theme/colors';

const CATEGORIES: { key: string; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'PAYMENT_ISSUE', label: 'Payment', icon: 'credit-card', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { key: 'MATCH_DISPUTE', label: 'Dispute', icon: 'gavel', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { key: 'ACCOUNT_ISSUE', label: 'Account', icon: 'account-circle', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'PARTNER_RELATED', label: 'Partner', icon: 'handshake', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { key: 'TECHNICAL_BUG', label: 'Bug', icon: 'bug-report', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { key: 'REFUND_REQUEST', label: 'Refund', icon: 'undo', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  { key: 'REPORT_PLAYER', label: 'Report', icon: 'flag', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  { key: 'GAME_RULES', label: 'Rules', icon: 'sports-esports', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { key: 'FEATURE_REQUEST', label: 'Feature', icon: 'lightbulb-outline', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  { key: 'OTHER', label: 'Other', icon: 'help-outline', color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)' },
];

const PRIORITIES: { key: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; label: string; color: string; icon: string }[] = [
  { key: 'LOW', label: 'Low', color: '#3b82f6', icon: 'arrow-downward' },
  { key: 'MEDIUM', label: 'Medium', color: '#fbbf24', icon: 'remove' },
  { key: 'HIGH', label: 'High', color: '#f97316', icon: 'arrow-upward' },
  { key: 'URGENT', label: 'Urgent', color: '#ef4444', icon: 'priority-high' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  OPEN: { label: 'OPEN', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'inbox' },
  IN_PROGRESS: { label: 'IN PROGRESS', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', icon: 'autorenew' },
  AWAITING_USER: { label: 'AWAITING YOU', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: 'hourglass-top' },
  RESOLVED: { label: 'RESOLVED', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: 'check-circle' },
  CLOSED: { label: 'CLOSED', color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', icon: 'lock' },
};

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All', icon: 'apps' },
  { key: 'OPEN', label: 'Open', icon: 'inbox' },
  { key: 'IN_PROGRESS', label: 'Active', icon: 'autorenew' },
  { key: 'RESOLVED', label: 'Resolved', icon: 'check-circle' },
  { key: 'CLOSED', label: 'Closed', icon: 'lock' },
];

export const HelpScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [preSelectedCategory, setPreSelectedCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params: any = { limit: 50 };
      if (filter !== 'ALL') params.status = filter;
      const res = await supportAPI.getMyTickets(params);
      if (res.data?.success) setTickets(res.data.data?.tickets || []);
    } catch {
      // silent
    }
  }, [filter]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const counts = {
    open: tickets.filter(t => t.status === 'OPEN' || t.status === 'AWAITING_USER').length,
    active: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
    total: tickets.length,
  };

  const getStatusCount = (key: string): number | undefined => {
    if (key === 'ALL') return counts.total;
    if (key === 'OPEN') return counts.open;
    if (key === 'IN_PROGRESS') return counts.active;
    if (key === 'RESOLVED') return counts.resolved;
    return undefined;
  };

  const filterSections: FilterSection[] = [
    {
      key: 'status',
      label: 'Status',
      value: filter,
      options: STATUS_FILTERS.map((s) => {
        const c = getStatusCount(s.key);
        const opt: { key: string; label: string; icon: any; count?: number } = {
          key: s.key,
          label: s.label,
          icon: s.icon,
        };
        if (c !== undefined) opt.count = c;
        return opt;
      }),
    },
  ];

  const renderTicket = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] || STATUS_META.OPEN;
    const cat = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[9];
    const pri = PRIORITIES.find(p => p.key === item.priority) || PRIORITIES[1];
    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() =>
          navigation.navigate('HelpConversation', {
            ticketId: item._id,
            isAdmin: false,
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
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {item.subject}
            </Text>
            <View style={styles.ticketMetaRow}>
              <View style={styles.metaItem}>
                <MaterialIcons name="category" size={10} color="rgba(255,255,255,0.4)" />
                <Text style={styles.metaItemText}>{cat.label}</Text>
              </View>
              <View style={styles.dot} />
              <View style={styles.metaItem}>
                <MaterialIcons name={pri.icon as any} size={10} color={pri.color} />
                <Text style={[styles.metaItemText, { color: pri.color }]}>{pri.label}</Text>
              </View>
              <View style={styles.dot} />
              <View style={styles.metaItem}>
                <MaterialIcons name="forum" size={10} color="rgba(255,255,255,0.4)" />
                <Text style={styles.metaItemText}>{(item.replies?.length || 0) + 1}</Text>
              </View>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.2)" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ScreenHeader
        title="Help & Support"
        subtitle={STATUS_FILTERS.find(s => s.key === filter)?.label || 'All'}
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
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Stats Card */}
            <LinearGradient
              colors={['#f47b25', '#ea580c']}
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
                    <Text style={styles.heroTitle}>Need a hand?</Text>
                    <Text style={styles.heroSubtitle}>
                      Avg. response time: 1–2 hours
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.heroCta}
                  onPress={() => setShowCreate(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroCtaText}>New Ticket</Text>
                  <MaterialIcons name="arrow-forward" size={14} color="#f47b25" />
                </TouchableOpacity>
              </View>
              <View style={styles.heroStatsRow}>
                <HeroStat label="Open" value={counts.open} />
                <View style={styles.heroStatDivider} />
                <HeroStat label="Active" value={counts.active} />
                <View style={styles.heroStatDivider} />
                <HeroStat label="Done" value={counts.resolved} />
                <View style={styles.heroStatDivider} />
                <HeroStat label="Total" value={counts.total} />
              </View>
            </LinearGradient>

            {/* Quick Category Shortcuts */}
            <View style={styles.quickSection}>
              <View style={styles.quickSectionHeader}>
                <Text style={styles.quickSectionTitle}>Common Topics</Text>
                {/* <Text style={styles.quickSectionSubtitle}>Quick start</Text> */}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickScroll}
              >
                {CATEGORIES.slice(0, 6).map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[styles.quickChip, { backgroundColor: c.bg, borderColor: c.color + '30' }]}
                    onPress={() => {
                      setPreSelectedCategory(c.key);
                      setShowCreate(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.quickChipIcon, { backgroundColor: c.color + '20' }]}>
                      <MaterialIcons name={c.icon as any} size={16} color={c.color} />
                    </View>
                    <Text style={[styles.quickChipText, { color: c.color }]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <EmptyState onCreate={() => setShowCreate(true)} />
          )
        }
      />

      <CreateTicketModal
        visible={showCreate}
        preSelectedCategory={preSelectedCategory}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          setPreSelectedCategory(null);
          load();
        }}
      />

      <FilterBottomSheet
        visible={showFilter}
        title="Filter Tickets"
        subtitle="Choose what to display"
        sections={filterSections}
        onClose={() => setShowFilter(false)}
        onApply={(values) => {
          setFilter(values.status || 'ALL');
          setShowFilter(false);
        }}
      />
    </ >
  );
};

// ============== HERO STAT ==============
const HeroStat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.heroStatItem}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

// ============== EMPTY STATE ==============
const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconOuter}>
      <LinearGradient
        colors={['rgba(244,123,37,0.2)', 'rgba(234,88,12,0.05)']}
        style={styles.emptyIconInner}
      >
        <MaterialIcons name="forum" size={40} color="#f47b25" />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>No tickets here</Text>
    <Text style={styles.emptySubtitle}>
      You're all caught up! Create a new ticket and our team will help you out within hours.
    </Text>
    <TouchableOpacity
      style={styles.emptyCta}
      onPress={onCreate}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={['#f47b25', '#ea580c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.emptyCtaGradient}
      >
        <MaterialIcons name="add" size={16} color="white" />
        <Text style={styles.emptyCtaText}>Create First Ticket</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ============== CREATE TICKET MODAL ==============
const CreateTicketModal = ({ visible, preSelectedCategory, onClose, onCreated }: any) => {
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [popup, setPopup] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    visible: false, type: 'info', title: '', message: '',
  });

  useEffect(() => {
    if (visible) {
      setCategory(preSelectedCategory || 'OTHER');
      setPriority('MEDIUM');
      setSubject('');
      setDescription('');
    }
  }, [visible, preSelectedCategory]);

  const reset = () => {
    setCategory(preSelectedCategory || 'OTHER');
    setPriority('MEDIUM');
    setSubject('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setPopup({ visible: true, type: 'error', title: 'Missing Info', message: 'Please fill in subject and description.' });
      return;
    }
    if (subject.trim().length < 5) {
      setPopup({ visible: true, type: 'error', title: 'Subject Too Short', message: 'Subject must be at least 5 characters.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await supportAPI.createTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      if (res.data?.success) {
        setPopup({ visible: true, type: 'success', title: 'Ticket Created', message: `Your ticket ${res.data.data.ticket_number} has been submitted. Our team will respond shortly.` });
        reset();
        setTimeout(() => {
          setPopup((p) => ({ ...p, visible: false }));
          onCreated();
        }, 1800);
      }
    } catch (error: any) {
      setPopup({ visible: true, type: 'error', title: 'Submission Failed', message: error.response?.data?.message || 'Could not create ticket.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal gradient header */}
            <LinearGradient
              colors={['#f47b25', '#ea580c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeaderGradient}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>New Support Ticket</Text>
                <Text style={styles.modalSubtitle}>We typically reply within 1–2 hours</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.categoryChip,
                        category === c.key && { backgroundColor: c.color + '20', borderColor: c.color },
                      ]}
                      onPress={() => setCategory(c.key)}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name={c.icon as any}
                        size={14}
                        color={category === c.key ? c.color : 'rgba(255,255,255,0.5)'}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === c.key && { color: c.color, fontWeight: '800' },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Priority</Text>
                <View style={styles.priorityRow}>
                  {PRIORITIES.map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.priorityChip,
                        priority === p.key && {
                          borderColor: p.color,
                          backgroundColor: p.color + '15',
                        },
                      ]}
                      onPress={() => setPriority(p.key)}
                      activeOpacity={0.85}
                    >
                      <MaterialIcons
                        name={p.icon as any}
                        size={12}
                        color={priority === p.key ? p.color : 'rgba(255,255,255,0.4)'}
                      />
                      <Text style={[styles.priorityChipText, { color: priority === p.key ? p.color : 'rgba(255,255,255,0.5)' }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Briefly describe the issue"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={120}
                />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Provide as much detail as possible…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={5000}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.btnSecondary, submitting && { opacity: 0.4 }]}
                onPress={onClose}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, submitting && { opacity: 0.4 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <LinearGradient
                      colors={['#f47b25', '#ea580c']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnPrimaryGradient}
                    >
                      <MaterialIcons name="send" size={14} color="white" />
                      <Text style={styles.btnPrimaryText}>Submit Ticket</Text>
                    </LinearGradient>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>

      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup((p) => ({ ...p, visible: false }))}
      />
    </Modal>
  );
};

// ============== FILTER MODAL REMOVED — using shared component ==============

const styles = StyleSheet.create({
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },

  // Hero
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
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
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
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
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  heroCtaText: { color: '#f47b25', fontSize: 12, fontWeight: '900' },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: 'white', fontSize: 18, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.4 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Quick categories
  quickSection: {
    marginTop: 4,
    marginBottom: 20,
  },
  quickSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  quickSectionTitle: { color: 'white', fontSize: 14, fontWeight: '800' },
  quickSectionSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
  quickScroll: { gap: 8, paddingRight: 16 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 14,
    paddingLeft: 6,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  quickChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: { fontSize: 12, fontWeight: '700' },

  // Filter modal — moved to shared component

  // Ticket card
  ticketCard: {
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
    alignItems: 'center',
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
  ticketSubject: { color: 'white', fontSize: 14, fontWeight: '700' },
  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaItemText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600' },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

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
    borderColor: 'rgba(244,123,37,0.3)',
  },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  emptySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 19 },
  emptyCta: { borderRadius: 24, overflow: 'hidden', marginTop: 12 },
  emptyCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyCtaText: { color: 'white', fontSize: 13, fontWeight: '800' },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowColor: '#f47b25',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  modalHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalTitle: { color: 'white', fontSize: 17, fontWeight: '900' },
  modalSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { padding: 16, paddingTop: 8 },
  fieldLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  priorityChipText: { fontSize: 11, fontWeight: '800' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: 'white',
    fontSize: 14,
  },
  textarea: { minHeight: 100 },
  modalFooter: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 8 },
  btnSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  btnSecondaryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  btnPrimary: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  btnPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
  },
  btnPrimaryText: { color: 'white', fontSize: 13, fontWeight: '900' },
});
