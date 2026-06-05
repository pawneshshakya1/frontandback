import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { adminAPI } from '../../services/api';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { EmptyState } from '../../components/EmptyState';

const { width } = Dimensions.get('window');

export const WalletScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPlatformVolume: 0,
        totalWalletBalance: 0,
        pendingWithdrawals: { count: 0, total: 0 },
    });
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, txRes] = await Promise.all([
                adminAPI.getStats(),
                adminAPI.getTransactions({ limit: 10 }),
            ]);

            const data = statsRes.data.data || {};
            setStats({
                totalPlatformVolume: data.totalPlatformVolume || 0,
                totalWalletBalance: data.totalWalletBalance || 0,
                pendingWithdrawals: typeof data.pendingWithdrawals === 'object' 
                    ? data.pendingWithdrawals 
                    : { count: data.pendingWithdrawals || 0, total: 0 },
            });

            setTransactions(txRes.data.data || []);
        } catch (e) {
            console.error("Failed to fetch admin wallet data", e);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return "₹" + amount.toLocaleString('en-IN');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />

            <BlurView
                intensity={100}
                tint="dark"
                style={[StyleSheet.absoluteFill, { zIndex: 0, opacity: 0.5 }]}
            />

            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="chevron-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.title}>Financial Overview</Text>
            </View>

            <LoadingOverlay visible={loading} />

            {!loading && (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Total Platform Volume Card */}
                    <LinearGradient
                        colors={[COLORS.surface, COLORS.backgroundDark]}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroRow}>
                            <View>
                                <Text style={styles.heroLabel}>TOTAL PLATFORM VOLUME</Text>
                                <Text style={styles.heroValue}>{formatCurrency(stats.totalPlatformVolume)}</Text>
                            </View>
                            <View style={styles.iconWrapper}>
                                <MaterialIcons name="account-balance" size={28} color={COLORS.primary} />
                            </View>
                        </View>
                        <View style={styles.heroFooter}>
                            <Text style={styles.heroSubtext}>All-time total deposits & transactions</Text>
                        </View>
                    </LinearGradient>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() =>
                            Alert.alert(
                              "Pending Withdrawals",
                              stats.pendingWithdrawals.count > 0
                                ? `${stats.pendingWithdrawals.count} withdrawal(s) totaling ${formatCurrency(stats.pendingWithdrawals.total)} pending review.`
                                : "No pending withdrawals at this time.",
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel="Pending Withdrawals"
                        >
                            <MaterialCommunityIcons name="bank-transfer" size={24} color="white" />
                            <Text style={styles.actionBtnText}>Pending Withdrawals</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{stats.pendingWithdrawals.count}</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: `${COLORS.textMuted}0D`, borderColor: COLORS.border }]}
                          onPress={() =>
                            Alert.alert(
                              "Coming Soon",
                              "Fee settings will be available soon",
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel="Fee Settings"
                        >
                            <MaterialIcons name="settings" size={24} color={COLORS.primary} />
                            <Text style={styles.actionBtnText}>Fee Settings</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Grid */}
                    <Text style={styles.sectionTitle}>SYSTEM STATS</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <MaterialIcons name="trending-up" size={20} color={COLORS.success} />
                            <Text style={styles.statLabel}>Total Wallet Balance</Text>
                            <Text style={styles.statValue}>{formatCurrency(stats.totalWalletBalance)}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <MaterialIcons name="security" size={20} color={COLORS.info} />
                            <Text style={styles.statLabel}>Pending Withdrawals</Text>
                            <Text style={styles.statValue}>{formatCurrency(stats.pendingWithdrawals.total)}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <MaterialIcons name="outbox" size={20} color={COLORS.primary} />
                            <Text style={styles.statLabel}>Platform Volume</Text>
                            <Text style={styles.statValue}>{formatCurrency(stats.totalPlatformVolume)}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <MaterialIcons name="pie-chart" size={20} color={COLORS.completed} />
                            <Text style={styles.statLabel}>Avg Yield</Text>
                            <Text style={styles.statValue}>12.4%</Text>
                        </View>
                    </View>

                    {/* Recent Transactions */}
                    <View style={styles.txHeader}>
                        <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
                        <TouchableOpacity
                          onPress={() => navigation.navigate("WalletControl")}
                          accessibilityRole="button"
                          accessibilityLabel="View All Transactions"
                        >
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {transactions.length === 0 ? (
                        <EmptyState
                            icon="receipt-long"
                            title="No Transactions"
                            description="No transactions found yet."
                        />
                    ) : (
                        <View style={styles.txList}>
                            {transactions.map((tx, idx) => (
                                <View key={tx._id || idx} style={styles.txItem}>
                                    <View style={[styles.txIconBox, { backgroundColor: `${COLORS.primary}1A` }]}>
                                        <MaterialIcons
                                            name={tx.type === 'DEPOSIT' ? 'arrow-downward' : tx.type === 'FEE' ? 'account-balance-wallet' : 'arrow-upward'}
                                            size={20}
                                            color={tx.type === 'DEPOSIT' || tx.type === 'FEE' ? COLORS.success : COLORS.primary}
                                        />
                                    </View>
                                    <View style={styles.txInfo}>
                                        <View style={styles.txRow}>
                                            <Text style={styles.txType}>{tx.type}</Text>
                                            <Text style={[styles.txAmount, { color: tx.type === 'DEPOSIT' || tx.type === 'FEE' ? COLORS.success : 'white' }]}>
                                                {tx.type === 'DEPOSIT' || tx.type === 'FEE' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </Text>
                                        </View>
                                        <View style={styles.txRow}>
                                            <Text style={styles.txUser}>User: {tx.user}</Text>
                                            <Text style={styles.txStatus}>{tx.status}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    bgGlowTop: {
        position: "absolute",
        top: "-10%",
        right: "-20%",
        width: 300,
        height: 300,
        backgroundColor: `${COLORS.primary}26`,
        borderRadius: 150,
        opacity: 0.5,
    },
    bgGlowBottom: {
        position: "absolute",
        bottom: "-10%",
        left: "-20%",
        width: 300,
        height: 300,
        backgroundColor: `${COLORS.info}1A`,
        borderRadius: 150,
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${COLORS.textMuted}0D`,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    title: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    heroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    heroLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    heroValue: {
        color: 'white',
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
    },
    iconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: `${COLORS.primary}1A`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroFooter: {
        borderTopWidth: 1,
        borderTopColor: `${COLORS.textMuted}0D`,
        paddingTop: 12,
    },
    heroSubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${COLORS.primary}33`,
        borderWidth: 1,
        borderColor: `${COLORS.primary}66`,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        gap: 8,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    badge: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        width: (width - 52) / 2,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: `${COLORS.textMuted}0D`,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 4,
    },
    statValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    txHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    viewAllText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    txList: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${COLORS.textMuted}0D`,
        overflow: 'hidden',
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    txIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txInfo: {
        flex: 1,
    },
    txRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    txType: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    txAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    txUser: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
    },
    txStatus: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
});
