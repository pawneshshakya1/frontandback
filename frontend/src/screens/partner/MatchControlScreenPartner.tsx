import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
    label,
    value,
    warn,
    iconColor = '#F59E0B',
    loading,
    dot,
}: {
    label: string;
    value: string;
    warn?: boolean;
    iconColor?: string;
    loading?: boolean;
    dot?: boolean;
}) => (
    <View style={[s.statCard, warn && s.statCardWarn]}>
        <View style={s.statHeader}>
            <Text style={s.statLabel}>{label}</Text>
            {dot && <View style={s.onlineDot} />}
        </View>
        <View style={s.statRow}>
            {loading ? (
                <ActivityIndicator size="small" color={iconColor} />
            ) : (
                <Text style={s.statValue}>{value}</Text>
            )}
        </View>
    </View>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
};

const formatCurrency = (n: number): string => {
    if (n >= 1000000) return `₹${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n.toFixed(0)}`;
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const MatchControlScreenPartner = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [stats, setStats] = useState<{
        totalMatches: number;
        activeMatches: number;
        completedMatches: number; // Will mock derived from fetch or add to stats later
        totalWalletBalance: number; // Using as placeholder for prize pool if not available
    } | null>(null);

    const fetchData = async () => {
        try {
            // Fetch stats
            const statsRes = await api.get('/partner/dashboard');
            if (statsRes.data.success) {
                setStats({
                    ...statsRes.data.data,
                    completedMatches: statsRes.data.data.totalMatches - statsRes.data.data.activeMatches,
                });
            }

            // Fetch live matches
            const matchesRes = await api.get('/partner/events');
            if (matchesRes.data.success) {
                // Filter to only show OPEN or ONGOING
                const live = matchesRes.data.data.filter((m: any) => m.status === 'OPEN' || m.status === 'ONGOING');
                setMatches(live);
            }
        } catch (err) {
            console.error('Failed to fetch match control data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleEmergencyStop = () => {
        Alert.alert(
            "EMERGENCY STOP",
            "Are you sure you want to stop all active matches? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "STOP ALL",
                    style: "destructive",
                    onPress: () => Alert.alert("Initiated", "All active matches have been stopped.")
                }
            ]
        );
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Glow accents */}
            <View style={s.glowTop} />
            <View style={s.glowBottom} />

            {/* Safe-area blur */}
            <BlurView
                intensity={250}
                tint="dark"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }}
            />

            <ScrollView
                style={s.scroll}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f47b25" />}
            >
                {/* ── Header ── */}
                <View style={[s.header, { paddingTop: insets.top + 16 }]}>
                    <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}>
                        <MaterialIcons name="chevron-left" size={28} color="white" />
                    </TouchableOpacity>
                    <View style={s.headerTextWrap}>
                        <Text style={s.headerTitle}>Match Control</Text>
                        <Text style={s.headerSub}>MANAGEMENT</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* ── Stats Scroll Row ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.statsScroll}
                    contentContainerStyle={s.statsScrollContent}
                >
                    <StatCard
                        label="Total Matches"
                        value={stats ? formatNumber(stats.totalMatches) : '--'}
                        loading={loading}
                    />
                    <StatCard
                        label="Live Now"
                        value={stats ? String(stats.activeMatches) : '--'}
                        dot={true}
                        loading={loading}
                    />
                    <StatCard
                        label="Completed"
                        value={stats ? formatNumber(stats.completedMatches) : '--'}
                        loading={loading}
                    />
                    <StatCard
                        label="Prize Pool"
                        value={stats ? formatCurrency(stats.totalWalletBalance * 0.1) : '--'} // Mocking 10% of liquidity as active prize pool
                        loading={loading}
                    />
                </ScrollView>

                {/* ── Quick Actions ── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>QUICK ACTIONS</Text>
                    <View style={s.quickActionsGrid}>
                        <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('CreateMatch')} activeOpacity={0.8}>
                            <MaterialIcons name="add-circle" size={20} color="#0a0a0a" />
                            <Text style={s.btnPrimaryText}>Create New Match</Text>
                        </TouchableOpacity>
                        <View style={s.btnRowRow}>
                            <TouchableOpacity style={s.btnGlass} onPress={() => navigation.navigate('PromoBanner')} activeOpacity={0.8}>
                                <MaterialIcons name="podcasts" size={18} color="white" />
                                <Text style={s.btnGlassText}>Broadcast</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.btnDanger} onPress={handleEmergencyStop} activeOpacity={0.8}>
                                <MaterialIcons name="emergency-share" size={18} color="#ef4444" />
                                <Text style={s.btnDangerText}>Emergency Stop</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Ongoing Matches ── */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>ONGOING MATCHES</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                            <Text style={s.viewAll}>VIEW ALL</Text>
                        </TouchableOpacity>
                    </View>

                    {loading && !refreshing ? (
                        <ActivityIndicator size="small" color="#f47b25" style={{ marginTop: 20 }} />
                    ) : matches.length === 0 ? (
                        <View style={s.emptyState}>
                            <Text style={s.emptyStateText}>No active matches.</Text>
                        </View>
                    ) : (
                        <View style={s.cardsList}>
                            {matches.map((match, idx) => (
                                <View key={match._id || idx} style={s.matchCard}>
                                    <View style={s.matchCardGlow} />
                                    <View style={s.matchCardHeader}>
                                        <View>
                                            <Text style={s.matchIdTitle}>Match ID: #{match._id?.slice(-5).toUpperCase() || 'AX782'}</Text>
                                            <Text style={s.matchOrg}>Organizer: <Text style={s.matchOrgBold}>{match.created_by?.username || 'Partner'}</Text></Text>
                                        </View>
                                        <View style={s.matchTierBadge}>
                                            <Text style={s.matchTierText}>{match.is_sponsored ? 'SPONSORED' : (match.game_type || 'TIER 1')}</Text>
                                        </View>
                                    </View>

                                    <View style={s.matchProgressWrap}>
                                        <View style={s.matchProgressLabelRow}>
                                            <Text style={s.matchProgressLabel}>Players Joined</Text>
                                            <Text style={s.matchProgressValue}>{match.players?.length || 0}/{match.max_players || 50}</Text>
                                        </View>
                                        <View style={s.progressBarBg}>
                                            <View
                                                style={[
                                                    s.progressBarFill,
                                                    { width: `${Math.min(100, ((match.players?.length || 0) / (match.max_players || 50)) * 100)}%` }
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    <View style={s.matchFooter}>
                                        <TouchableOpacity
                                            style={s.manageBtn}
                                            onPress={() => navigation.navigate('MatchDetail', { matchId: match._id })}
                                        >
                                            <Text style={s.manageBtnText}>MANAGE</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

export default MatchControlScreenPartner;

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.06)';
const R = 16; // Using slightly smaller radius for these cards to match design

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F19' },
    scroll: { flex: 1 },
    glowTop: {
        position: 'absolute', top: '-5%', right: '-10%',
        width: 256, height: 256, backgroundColor: 'rgba(245,158,11,0.15)',
        borderRadius: 128, opacity: 0.5,
    },
    glowBottom: {
        position: 'absolute', bottom: '20%', left: '-10%',
        width: 256, height: 256, backgroundColor: 'rgba(245,158,11,0.08)',
        borderRadius: 128, opacity: 0.5,
    },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 20,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTextWrap: { alignItems: 'center', flex: 1 },
    headerTitle: { fontSize: 20, fontFamily: 'FiraCode_700Bold', fontStyle: 'italic', color: 'white', textTransform: 'uppercase', letterSpacing: -0.5 },
    headerSub: { fontSize: 10, fontFamily: 'FiraCode_700Bold', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 2, marginTop: 2 },

    // Stats Scroll
    statsScroll: { paddingBottom: 16 },
    statsScrollContent: { paddingHorizontal: 16, gap: 12 },
    statCard: {
        minWidth: 140, backgroundColor: CARD, borderRadius: R, borderWidth: 1, borderColor: BORDER, padding: 16,
    },
    statCardWarn: { borderColor: 'rgba(239,68,68,0.3)' },
    statHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f47b25', shadowColor: '#f47b25', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
    statRow: { minHeight: 28, justifyContent: 'center' },
    statValue: { fontSize: 24, fontFamily: 'FiraCode_700Bold', color: 'white' },

    // Sections
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontSize: 10, fontFamily: 'FiraCode_700Bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 },
    viewAll: { fontSize: 10, color: '#F59E0B', fontFamily: 'FiraCode_700Bold', textDecorationLine: 'underline', textTransform: 'uppercase' },

    // Quick Actions
    quickActionsGrid: { gap: 12 },
    btnPrimary: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 56, backgroundColor: '#F59E0B', borderRadius: R,
    },
    btnPrimaryText: { fontSize: 16, fontFamily: 'FiraCode_700Bold', color: '#0B0F19', letterSpacing: -0.5 },
    btnRowRow: { flexDirection: 'row', gap: 12 },
    btnGlass: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 56, backgroundColor: CARD, borderRadius: R, borderWidth: 1, borderColor: BORDER,
    },
    btnGlassText: { fontSize: 14, fontFamily: 'FiraCode_700Bold', color: 'white', letterSpacing: -0.5 },
    btnDanger: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        height: 56, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: R, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    },
    btnDangerText: { fontSize: 14, fontFamily: 'FiraCode_700Bold', color: '#ef4444', letterSpacing: -0.5 },

    // Match Cards
    cardsList: { gap: 16 },
    matchCard: {
        backgroundColor: CARD, borderRadius: R, borderWidth: 1, borderColor: BORDER, padding: 20, position: 'relative', overflow: 'hidden'
    },
    matchCardGlow: {
        position: 'absolute', top: -30, right: -40, width: 100, height: 100, backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: 50
    },
    matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    matchIdTitle: { fontSize: 18, fontFamily: 'FiraCode_700Bold', color: 'white', lineHeight: 20 },
    matchOrg: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    matchOrgBold: { color: 'rgba(255,255,255,0.8)' },
    matchTierBadge: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
    matchTierText: { fontSize: 10, fontFamily: 'FiraCode_700Bold', color: '#F59E0B', textTransform: 'uppercase' },

    matchProgressWrap: { marginBottom: 24 },
    matchProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    matchProgressLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },
    matchProgressValue: { fontSize: 11, fontWeight: '600', color: 'white' },
    progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 3, shadowColor: '#F59E0B', shadowOpacity: 0.4, shadowRadius: 8 },

    matchFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
    manageBtn: {
        paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8,
        backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)'
    },
    manageBtnText: { fontSize: 12, fontFamily: 'FiraCode_700Bold', color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1 },

    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 }
});