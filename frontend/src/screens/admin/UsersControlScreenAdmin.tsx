import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { adminAPI } from '../../services/api';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { EmptyState } from '../../components/EmptyState';

const { width } = Dimensions.get('window');

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
    label,
    value,
    badge,
    badgeColor = COLORS.primary,
    icon,
    warn,
    loading,
}: {
    label: string;
    value: string;
    badge?: string;
    badgeColor?: string;
    icon?: string;
    warn?: boolean;
    loading?: boolean;
}) => (
    <View style={[s.statCard, warn && s.statCardWarn]}>
        <Text style={s.statLabel}>{label}</Text>
        <View style={s.statRow}>
            {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
                <>
                    <Text style={s.statValue}>{value}</Text>
                    {badge && <Text style={[s.statBadge, { color: badgeColor }]}>{badge}</Text>}
                    {icon && <MaterialIcons name={icon as any} size={16} color={COLORS.primary} style={{ marginBottom: 2 }} />}
                    {!badge && !icon && <View style={s.onlineDot} />}
                </>
            )}
        </View>
    </View>
);

// ── Console Button ────────────────────────────────────────────────────────────
const ConsoleBtn = ({
    icon,
    label,
    badge,
    onPress,
}: {
    icon: string;
    label: string;
    badge?: string;
    onPress?: () => void;
}) => (
    <TouchableOpacity style={s.consoleBtn} onPress={onPress} activeOpacity={0.7}>
        <View style={s.consoleBtnLeft}>
            <View style={s.consoleBtnIcon}>
                <MaterialIcons name={icon as any} size={22} color={COLORS.primary} />
            </View>
            <Text style={s.consoleBtnLabel}>{label}</Text>
        </View>
        <View style={s.consoleBtnRight}>
            {badge && (
                <View style={s.badgePill}>
                    <Text style={s.badgePillText}>{badge}</Text>
                </View>
            )}
            <MaterialIcons name="chevron-right" size={22} color={COLORS.border} />
        </View>
    </TouchableOpacity>
);

// ── Activity Item ─────────────────────────────────────────────────────────────
const ActivityItem = ({
    dotColor,
    title,
    sub,
    rightText,
    rightColor,
    warn,
}: {
    dotColor: string;
    title: string;
    sub: string;
    rightText: string;
    rightColor?: string;
    warn?: boolean;
}) => (
    <View style={[s.activityItem, warn && s.activityItemWarn]}>
        <View style={s.activityLeft}>
            <View style={[s.activityDot, { backgroundColor: dotColor }]} />
            <View>
                <Text style={s.activityTitle}>{title}</Text>
                <Text style={s.activitySub}>{sub}</Text>
            </View>
        </View>
        <Text style={[s.activityRight, rightColor ? { color: rightColor } : {}]}>{rightText}</Text>
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
const UsersControlScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<{
        totalUsers: number;
        activeMatches: number;
        totalWalletBalance: number;
        pendingWithdrawals: { count: number; total: number };
        pendingMediatorApprovals: number;
    } | null>(null);

    const fetchStats = async () => {
        try {
            const res = await adminAPI.getStats();
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LoadingOverlay visible={loading} />

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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            >
                {/* ── Header ── */}
                <View style={[s.header, { paddingTop: insets.top + 16 }]}>
                    <View>
                        <Text style={s.headerTitle}>Users Control</Text>
                    </View>
                </View>

                {/* ── Stats Grid ── */}
                <View style={s.statsGrid}>
                    <StatCard
                        label="Total Users"
                        value={stats ? formatNumber(stats.totalUsers) : '--'}
                        loading={loading}
                    />
                    <StatCard
                        label="Active Matches"
                        value={stats ? String(stats.activeMatches) : '--'}
                        loading={loading}
                    />
                    <StatCard
                        label="Total Volume (₹)"
                        value={stats ? formatCurrency(stats.totalWalletBalance) : '--'}
                        icon="payments"
                        loading={loading}
                    />
                    <StatCard
                        label="Pending Withdrawals"
                        value={stats ? formatCurrency(stats.pendingWithdrawals.total) : '--'}
                        badge={stats ? `${stats.pendingWithdrawals.count} req` : undefined}
                        badgeColor={COLORS.warning}
                        warn={!!(stats && stats.pendingWithdrawals.count > 0)}
                        loading={loading}
                    />
                </View>

                {/* ── Management Console ── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Management Console</Text>
                    <View style={s.consoleList}>
                        <ConsoleBtn
                            icon="person-search"
                            label="User Management"
                            onPress={() => navigation.navigate('UsersList')}
                        />
                        <ConsoleBtn
                            icon="sports-esports"
                            label="Match Management"
                            onPress={() => navigation.navigate('MatchControlScreen')}
                        />
                        <ConsoleBtn
                            icon="verified-user"
                            label="Mediator Approval"
                            badge={stats && stats.pendingMediatorApprovals > 0 ? `${stats.pendingMediatorApprovals} NEW` : undefined}
                            onPress={() => navigation.navigate('MediatorApproval')}
                        />
                        <ConsoleBtn
                            icon="account-balance-wallet"
                            label="Wallet Control"
                            onPress={() => navigation.navigate('WalletControlScreen')}
                        />
                        <ConsoleBtn
                            icon="workspace-premium"
                            label="Create Pass"
                            onPress={() => navigation.navigate('ElitePass')}
                        />
                    </View>
                </View>

                {/* ── Platform Activity ── */}
                <View style={s.section}>
                    <View style={s.activityHeader}>
                        <Text style={s.sectionTitle}>Platform Activity</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('UsersList')}>
                            <Text style={s.viewAll}>VIEW ALL</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={s.activityList}>
                        <ActivityItem
                            dotColor={COLORS.primary}
                            title="Total Registered Users"
                            sub={loading ? 'Loading...' : `${stats?.totalUsers ?? '--'} users on platform`}
                            rightText={stats ? formatNumber(stats.totalUsers) : '--'}
                        />
                        <ActivityItem
                            dotColor={COLORS.info}
                            title="Active Match Sessions"
                            sub={loading ? 'Loading...' : `${stats?.activeMatches ?? '--'} matches in progress`}
                            rightText={loading ? '--' : String(stats?.activeMatches ?? '--')}
                            rightColor={COLORS.info}
                        />
                        <ActivityItem
                            dotColor={COLORS.warning}
                            title="Pending Withdrawal Requests"
                            sub={loading ? 'Loading...' : `${stats?.pendingWithdrawals.count ?? 0} requests awaiting approval`}
                            rightText={stats ? formatCurrency(stats.pendingWithdrawals.total) : '--'}
                            rightColor={COLORS.warning}
                            warn={!!(stats && stats.pendingWithdrawals.count > 0)}
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default UsersControlScreenAdmin;

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD = COLORS.surface;
const BORDER = `${COLORS.textMuted}0D`;
const R = 20;

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    scroll: {
        flex: 1,
    },
    glowTop: {
        position: 'absolute',
        top: '-5%',
        right: '-10%',
        width: 320,
        height: 320,
        backgroundColor: `${COLORS.info}1F`,
        borderRadius: 160,
        opacity: 0.5,
    },
    glowBottom: {
        position: 'absolute',
        bottom: '10%',
        left: '-10%',
        width: 320,
        height: 320,
        backgroundColor: `${COLORS.info}12`,
        borderRadius: 160,
        opacity: 0.5,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'FiraCode_700Bold',
        fontStyle: 'italic',
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: -0.5,
        lineHeight: 28,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    statCard: {
        width: (width - 60) / 2,
        backgroundColor: CARD,
        borderRadius: R,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    statCardWarn: {
        borderColor: `${COLORS.warning}33`,
    },
    statLabel: {
        fontSize: 9,
        fontFamily: 'FiraCode_700Bold',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        minHeight: 32,
    },
    statValue: {
        fontSize: 22,
        fontFamily: 'FiraCode_700Bold',
        color: 'white',
    },
    statBadge: {
        fontSize: 10,
        fontFamily: 'FiraCode_700Bold',
        marginBottom: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginBottom: 6,
    },

    // Section
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'FiraCode_700Bold',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: 3,
        marginBottom: 16,
    },

    // Console
    consoleList: {
        gap: 10,
    },
    consoleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: R,
        borderWidth: 1,
        borderColor: BORDER,
    },
    consoleBtnLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    consoleBtnIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${COLORS.info}1A`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    consoleBtnLabel: {
        fontSize: 14,
        fontFamily: 'FiraCode_700Bold',
        color: 'white',
        letterSpacing: -0.2,
    },
    consoleBtnRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badgePill: {
        backgroundColor: COLORS.info,
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgePillText: {
        color: 'white',
        fontSize: 8,
        fontFamily: 'FiraCode_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Activity
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    viewAll: {
        fontSize: 10,
        color: COLORS.info,
        fontFamily: 'FiraCode_700Bold',
        marginBottom: 0,
    },
    activityList: {
        gap: 10,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CARD,
        borderRadius: R,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 16,
    },
    activityItemWarn: {
        borderLeftWidth: 2,
        borderLeftColor: COLORS.warning,
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 12,
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
    },
    activityTitle: {
        fontSize: 12,
        fontFamily: 'FiraCode_700Bold',
        color: 'white',
        lineHeight: 16,
    },
    activitySub: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 1,
    },
    activityRight: {
        fontSize: 10,
        fontFamily: 'FiraCode_700Bold',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        flexShrink: 0,
    },
});
