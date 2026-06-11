import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import api from '../../services/api';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { EmptyState } from '../../components/EmptyState';
import { usePopup } from '../../components/PopupModal';

const { width } = Dimensions.get('window');

export const MediatorDashboardScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { showSuccess, showError, PopupElement } = usePopup();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300);
    const [timerActive, setTimerActive] = useState(false);

    useEffect(() => {
        fetchMediatorMatches();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    const fetchMediatorMatches = async () => {
        try {
            const res = await api.get('/matches/mediator/all');
            setMatches(res.data.data);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (match: any) => {
        setSelectedMatch(match);
        setModalVisible(true);
        setTimeLeft(300);
        setTimerActive(true);
    };

    const handleApprove = async () => {
        try {
            setLoading(true);
            await api.post(`/matches/${selectedMatch._id}/approve`);
            showSuccess("Success", "Match result approved!");
            setModalVisible(false);
            setTimerActive(false);
            fetchMediatorMatches();
        } catch (err: any) {
            showError("Error", err.message || "Failed to approve");
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const renderMatchItem = ({ item }: any) => {
        const isPending = item.status === 'REVIEW';
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.gameType}>{item.game_type}</Text>
                    <Text style={[styles.status, { color: isPending ? COLORS.warning : COLORS.primary }]}>
                        {item.status.replace(/_/g, ' ')}
                    </Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>{item.match_date} • {item.match_time}</Text>

                {isPending && (
                    <TouchableOpacity style={styles.reviewBtn} onPress={() => handleReview(item)}>
                        <Text style={styles.reviewBtnText}>REVIEW RESULT</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LoadingOverlay visible={loading && matches.length === 0} />
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="chevron-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mediator Dashboard</Text>
            </View>

            {loading && matches.length === 0 ? null : (
                <FlatList
                    data={matches}
                    renderItem={renderMatchItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<EmptyState icon="inbox" title="No matches found." />}
                />
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Result Review</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }}>
                            <View style={styles.timerContainer}>
                                <Text style={styles.timerLabel}>Time remaining to declare:</Text>
                                <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                            </View>

                            <Text style={styles.sectionTitle}>Stats</Text>
                            <View style={styles.statsRow}>
                                <Text style={styles.statText}>Kills: {selectedMatch?.results?.kills}</Text>
                                <Text style={styles.statText}>Damage: {selectedMatch?.results?.damage}</Text>
                            </View>

                            <Text style={styles.sectionTitle}>Screenshots</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {selectedMatch?.results?.screenshot_urls?.map((url: string, index: number) => (
                                    <Image key={index} source={{ uri: url }} style={styles.screenshot} />
                                ))}
                            </ScrollView>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
                                <Text style={styles.approveBtnText}>APPROVE RESULT</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <PopupElement />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    gameType: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 12
    },
    status: {
        fontWeight: 'bold',
        fontSize: 10,
        textTransform: 'uppercase'
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    date: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 12
    },
    reviewBtn: {
        backgroundColor: COLORS.info,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    reviewBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12
    },
    emptyText: {
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 50
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        padding: 16
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        height: '80%',
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold'
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 24,
        padding: 16,
        backgroundColor: `${COLORS.primary}1A`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${COLORS.primary}4D`
    },
    timerLabel: {
        color: COLORS.primary,
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    timerValue: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums']
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16
    },
    statText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    },
    screenshot: {
        width: 200,
        height: 350,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: `${COLORS.textMuted}33`
    },
    modalFooter: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border
    },
    approveBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    approveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    }
});
