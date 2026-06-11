import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    StatusBar
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from '../../services/api';

export const JoinedMatchScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'ONGOING' | 'COMPLETED'>('ALL');

    const COLORS = {
        primary: "#f47b25",
        bgDark: "#0d0d0d",
        cardDark: "#1a1a1a",
        success: "#f47b25",
        danger: "#ef4444",
    };

    const fetchJoinedMatches = async () => {
        try {
            // Assuming backend has an endpoint for my-matches or we filter from all
            // For now, using /matches/my-matches if exists, or filtering client side if needed
            // Based on typical patterns, let's try a specific endpoint usually available
            const res = await api.get('/matches/my-matches');
            setMatches(res.data.data || []);
        } catch (err) {
            console.log('Error fetching joined matches:', err);
            // Fallback: mock data or empty if endpoint fails
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJoinedMatches();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchJoinedMatches();
    };

    const filteredMatches = matches.filter(m => filter === 'ALL' || m.status === filter);

    const renderMatchItem = ({ item }: any) => (
        <TouchableOpacity
            style={styles.matchCard}
            onPress={() => navigation.navigate("MatchDetail", { matchId: item._id })}
        >
            <Image
                source={{ uri: item.banner_url || "https://via.placeholder.com/150" }}
                style={styles.matchThumb}
            />
            <View style={styles.matchInfo}>
                <View style={styles.headerRow}>
                    <Text style={styles.gameType}>{item.game_type} DUEL</Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'OPEN' ? 'rgba(244,123,37,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'OPEN' ? COLORS.success : COLORS.danger }]}>{item.status}</Text>
                    </View>
                </View>

                <Text style={styles.matchTitle}>{item.title}</Text>
                <Text style={styles.dateText}>{item.match_date} • {item.match_time}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>ENTRY</Text>
                        <Text style={styles.statValue}>₹{item.entry_fee}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.stat}>
                        <Text style={styles.statLabel}>PRIZE</Text>
                        <Text style={styles.statValue}>₹{item.prize_pool}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.bgGlowTop} />

            {/* Header */}
            <BlurView intensity={250} tint="dark" style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Matches</Text>
            </BlurView>

            {/* Filter Tabs */}
            <View style={[styles.filterContainer, { marginTop: insets.top + 70 }]}>
                {['ALL', 'OPEN', 'ONGOING', 'COMPLETED'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.activeFilter]}
                        onPress={() => setFilter(f as any)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredMatches}
                    renderItem={renderMatchItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="event-busy" size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No matches found</Text>
                            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate("Home")}>
                                <Text style={styles.browseBtnText}>BROWSE MATCHES</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0d0d0d",
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bgGlowTop: {
        position: "absolute",
        top: "-20%",
        left: "-10%",
        width: 400,
        height: 400,
        backgroundColor: "rgba(244,123,37,0.1)",
        borderRadius: 200,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 20,
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backBtn: {
        padding: 8,
        marginRight: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 10,
        gap: 10,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    activeFilter: {
        backgroundColor: '#f47b25',
        borderColor: '#f47b25',
    },
    filterText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: 'bold',
    },
    activeFilterText: {
        color: 'white',
    },
    listContent: {
        padding: 20,
        paddingTop: 10,
        paddingBottom: 100,
    },
    matchCard: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    matchThumb: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#333',
    },
    matchInfo: {
        flex: 1,
        marginLeft: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    gameType: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    matchTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    dateText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statLabel: {
        color: '#f47b25',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statValue: {
        color: 'white',
        fontSize: 12,
        fontWeight: '900',
    },
    divider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        gap: 16,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
    browseBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    browseBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
