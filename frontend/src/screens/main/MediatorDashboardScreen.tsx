import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Modal, ScrollView, Dimensions, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import api, { matchAPI } from '../../services/api';
import { PopupModal } from '../../components/PopupModal';

const { width } = Dimensions.get('window');

export const MediatorDashboardScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 mins default
    const [timerActive, setTimerActive] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [rejectModal, setRejectModal] = useState({ visible: false, reason: '' });
    const [popup, setPopup] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        title: string;
        message: string;
        buttons?: any[];
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
    });

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
            const res = await matchAPI.getMediatorMatches();
            setMatches(res.data.data || []);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (match: any) => {
        setSelectedMatch(match);
        setModalVisible(true);
        // Calculate remaining time from result_declaration_expires_at
        if (match.result_declaration_expires_at) {
            const remaining = Math.max(0, Math.floor((new Date(match.result_declaration_expires_at).getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
        } else {
            setTimeLeft(300);
        }
        setTimerActive(true);
    };

    const handleApprove = async () => {
        if (!selectedMatch) return;
        try {
            setActionLoading(true);
            await matchAPI.approveResult(selectedMatch._id);
            setPopup({
                visible: true,
                type: 'success',
                title: 'Success',
                message: 'Match result approved! Prize distributed to winner.',
            });
            setModalVisible(false);
            setTimerActive(false);
            fetchMediatorMatches();
        } catch (err: any) {
            setPopup({
                visible: true,
                type: 'error',
                title: 'Error',
                message: err.response?.data?.message || 'Failed to approve',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAIDeclare = async () => {
        if (!selectedMatch) return;
        setPopup({
            visible: true,
            type: 'confirm',
            title: 'AI Auto-Declare Winner',
            message: 'AI will analyze all submitted screenshots and stats to determine the winner. You can override this decision afterwards. Continue?',
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setPopup(p => ({ ...p, visible: false })) },
                {
                    text: 'Run AI', onPress: async () => {
                        try {
                            setPopup(p => ({ ...p, visible: false }));
                            setActionLoading(true);
                            const res = await matchAPI.aiAnalyze(selectedMatch._id);
                            if (res.data.success) {
                                setPopup({
                                    visible: true,
                                    type: 'success',
                                    title: 'AI Verdict Ready',
                                    message: `Winner: ${res.data.data.ai_verdict?.winner_user_id || 'TBD'}\n\nConfidence: ${Math.round((res.data.data.ai_verdict?.confidence || 0) * 100)}%\n\n${res.data.data.ai_verdict?.reasoning || ''}`,
                                });
                                fetchMediatorMatches();
                            }
                        } catch (err: any) {
                            setPopup({
                                visible: true,
                                type: 'error',
                                title: 'Error',
                                message: err.response?.data?.message || 'AI analysis failed',
                            });
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        });
    };

    const handleRejectResult = async () => {
        if (!selectedMatch) return;
        try {
            setActionLoading(true);
            await matchAPI.rejectResult(selectedMatch._id, { reason: rejectModal.reason || 'Rejected by mediator' });
            setPopup({
                visible: true,
                type: 'success',
                title: 'Rejected',
                message: 'All submissions have been cleared. Participants can re-upload.',
            });
            setRejectModal({ visible: false, reason: '' });
            setModalVisible(false);
            setTimerActive(false);
            fetchMediatorMatches();
        } catch (err: any) {
            setPopup({
                visible: true,
                type: 'error',
                title: 'Error',
                message: err.response?.data?.message || 'Failed to reject',
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelectWinner = (userId: string, username?: string) => {
        if (!selectedMatch) return;
        setPopup({
            visible: true,
            type: 'confirm',
            title: 'Declare Winner',
            message: `Select ${username || 'this user'} as the winner? Prize will be awarded on approval.`,
            buttons: [
                { text: 'Cancel', style: 'cancel', onPress: () => setPopup(p => ({ ...p, visible: false })) },
                {
                    text: 'Select', onPress: async () => {
                        try {
                            setPopup(p => ({ ...p, visible: false }));
                            setActionLoading(true);
                            await matchAPI.selectWinner(selectedMatch._id, userId);
                            setPopup({
                                visible: true,
                                type: 'success',
                                title: 'Winner Selected',
                                message: 'Now tap APPROVE to distribute the prize.',
                            });
                            fetchMediatorMatches();
                            setSelectedMatch({ ...selectedMatch, winner_id: userId });
                        } catch (err: any) {
                            setPopup({
                                visible: true,
                                type: 'error',
                                title: 'Error',
                                message: err.response?.data?.message || 'Failed to select winner',
                            });
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        });
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const renderMatchItem = ({ item }: any) => {
        const isPending = item.status === 'REVIEW';
        const submissions = item.participant_results || [];
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.gameType}>{item.game_type}</Text>
                    <Text style={[styles.status, { color: isPending ? '#fbbf24' : '#f47b25' }]}>
                        {item.status.replace(/_/g, ' ')}
                    </Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.date}>{item.match_date} • {item.match_time}</Text>

                {submissions.length > 0 && (
                    <View style={styles.submissionsRow}>
                        <MaterialIcons name="people" size={12} color="rgba(255,255,255,0.5)" />
                        <Text style={styles.submissionsText}>
                            {submissions.length} submission{submissions.length === 1 ? '' : 's'} received
                        </Text>
                    </View>
                )}

                {isPending && (
                    <TouchableOpacity style={styles.reviewBtn} onPress={() => handleReview(item)}>
                        <Text style={styles.reviewBtnText}>REVIEW & DECLARE</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="chevron-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mediator Dashboard</Text>
            </View>

            {loading && matches.length === 0 ? (
                <ActivityIndicator color="#f47b25" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={matches}
                    renderItem={renderMatchItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
                />
            )}

            {/* Review Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Result Review</Text>
                                <Text style={styles.modalSubtitle}>{selectedMatch?.title}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                            {/* Timer */}
                            <View style={[styles.timerContainer, timeLeft < 60 && { borderColor: '#ef4444' }]}>
                                <Text style={styles.timerLabel}>Time remaining to declare</Text>
                                <Text style={[styles.timerValue, timeLeft < 60 && { color: '#ef4444' }]}>
                                    {formatTime(timeLeft)}
                                </Text>
                            </View>

                            {/* AI Verdict (if exists) */}
                            {selectedMatch?.ai_verdict?.winner_user_id && (
                                <View style={styles.aiVerdictCard}>
                                    <View style={styles.aiVerdictHeader}>
                                        <MaterialIcons name="auto-awesome" size={16} color="#a855f7" />
                                        <Text style={styles.aiVerdictTitle}>AI Verdict</Text>
                                    </View>
                                    <Text style={styles.aiVerdictText}>
                                        Winner: {selectedMatch.winner_id === selectedMatch.ai_verdict.winner_user_id ? '✓ Selected' : 'Pending approval'}
                                    </Text>
                                    <Text style={styles.aiVerdictSubtext}>
                                        Confidence: {Math.round((selectedMatch.ai_verdict.confidence || 0) * 100)}%
                                    </Text>
                                    {selectedMatch.ai_verdict.reasoning && (
                                        <Text style={styles.aiVerdictReasoning}>{selectedMatch.ai_verdict.reasoning}</Text>
                                    )}
                                </View>
                            )}

                            {/* All Submissions */}
                            <Text style={styles.sectionTitle}>SUBMISSIONS ({selectedMatch?.participant_results?.length || 0})</Text>
                            {(selectedMatch?.participant_results || []).map((sub: any, idx: number) => {
                                const isWinner = selectedMatch?.winner_id && (
                                    selectedMatch.winner_id === sub.user_id ||
                                    selectedMatch.winner_id === sub.user_id?._id
                                );
                                return (
                                    <View key={idx} style={[styles.participantCard, isWinner && styles.participantCardWinner]}>
                                        <View style={styles.participantHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.participantName}>
                                                    {sub.user_id?.username || `Player ${idx + 1}`}
                                                </Text>
                                                <View style={styles.participantStats}>
                                                    <Text style={styles.participantStat}>K: {sub.kills || 0}</Text>
                                                    <Text style={styles.participantStat}>D: {sub.damage || 0}</Text>
                                                    {sub.placement ? <Text style={styles.participantStat}>#{sub.placement}</Text> : null}
                                                </View>
                                            </View>
                                            {!isWinner && selectedMatch?.status === 'REVIEW' && (
                                                <TouchableOpacity
                                                    style={styles.selectWinnerBtn}
                                                    onPress={() => handleSelectWinner(sub.user_id?._id || sub.user_id, sub.user_id?.username)}
                                                    disabled={actionLoading}
                                                >
                                                    <MaterialIcons name="emoji-events" size={14} color="#f47b25" />
                                                    <Text style={styles.selectWinnerText}>PICK</Text>
                                                </TouchableOpacity>
                                            )}
                                            {isWinner && (
                                                <View style={styles.winnerBadge}>
                                                    <MaterialIcons name="emoji-events" size={12} color="#f47b25" />
                                                    <Text style={styles.winnerBadgeText}>WINNER</Text>
                                                </View>
                                            )}
                                        </View>
                                        {sub.screenshot_urls?.length > 0 && (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                                                {sub.screenshot_urls.map((url: string, i: number) => (
                                                    <Image key={i} source={{ uri: url }} style={styles.screenshotThumb} />
                                                ))}
                                            </ScrollView>
                                        )}
                                    </View>
                                );
                            })}

                            {(!selectedMatch?.participant_results || selectedMatch.participant_results.length === 0) && (
                                <Text style={styles.emptyText}>No submissions yet.</Text>
                            )}

                            {/* Reject reason (if any) */}
                            {selectedMatch?.mediator_reject_reason && (
                                <View style={styles.rejectBanner}>
                                    <MaterialIcons name="info" size={14} color="#ef4444" />
                                    <Text style={styles.rejectText}>{selectedMatch.mediator_reject_reason}</Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Footer Actions */}
                        <View style={styles.modalFooter}>
                            <View style={styles.modalActionRow}>
                                <TouchableOpacity
                                    style={[styles.modalActionBtn, styles.btnReject]}
                                    onPress={() => setRejectModal({ visible: true, reason: '' })}
                                    disabled={actionLoading}
                                >
                                    <MaterialIcons name="block" size={16} color="#ef4444" />
                                    <Text style={styles.btnRejectText}>REJECT</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalActionBtn, styles.btnAI]}
                                    onPress={handleAIDeclare}
                                    disabled={actionLoading}
                                >
                                    <MaterialIcons name="auto-awesome" size={16} color="#a855f7" />
                                    <Text style={styles.btnAIText}>AI DECLARE</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.approveBtn, (actionLoading || !selectedMatch?.winner_id) && { opacity: 0.5 }]}
                                onPress={handleApprove}
                                disabled={actionLoading || !selectedMatch?.winner_id}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <MaterialIcons name="check-circle" size={16} color="white" />
                                        <Text style={styles.approveBtnText}>
                                            {selectedMatch?.winner_id ? 'APPROVE & PAYOUT' : 'SELECT WINNER FIRST'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </BlurView>
        </Modal>

            {/* Reject Reason Modal */}
            <Modal
                visible={rejectModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setRejectModal({ visible: false, reason: '' })}
            >
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.rejectCard}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <MaterialIcons name="block" size={20} color="#ef4444" />
                                <Text style={styles.modalTitle}>Reject Result</Text>
                            </View>
                        </View>
                        <Text style={styles.modalSubtitle}>
                            All current submissions will be cleared. Participants can re-upload with 2-minute deadline.
                        </Text>

                        <Text style={styles.inputLabel}>REASON (optional)</Text>
                        <TextInput
                            style={styles.rejectInput}
                            placeholder="e.g. Screenshots not clear, scores don't match"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={rejectModal.reason}
                            onChangeText={(t) => setRejectModal({ ...rejectModal, reason: t })}
                            multiline
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity
                                style={[styles.modalActionBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}
                                onPress={() => setRejectModal({ visible: false, reason: '' })}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalActionBtn, styles.btnReject, { flex: 2 }]}
                                onPress={handleRejectResult}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#ef4444" size="small" />
                                ) : (
                                    <Text style={styles.btnRejectText}>CONFIRM REJECT</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </BlurView>
        </Modal>

            <PopupModal
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                buttons={popup.buttons}
                onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d0d0d',
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
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    gameType: {
        color: '#f47b25',
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
        color: '#999',
        fontSize: 12,
        marginBottom: 12
    },
    reviewBtn: {
        backgroundColor: '#2563eb',
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
        color: '#666',
        textAlign: 'center',
        marginTop: 50
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 16
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        height: '80%',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
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
    modalSubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginTop: 2
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 16,
        padding: 14,
        backgroundColor: 'rgba(244,123,37,0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(244,123,37,0.3)'
    },
    timerLabel: {
        color: '#f47b25',
        fontSize: 11,
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: 'bold',
        letterSpacing: 1
    },
    timerValue: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums']
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        textTransform: 'uppercase',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 12,
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
        backgroundColor: '#333'
    },
    screenshotThumb: {
        width: 80,
        height: 140,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: '#333'
    },
    modalFooter: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        gap: 10
    },
    modalActionRow: {
        flexDirection: 'row',
        gap: 8
    },
    modalActionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    btnReject: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.4)'
    },
    btnRejectText: {
        color: '#ef4444',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.5
    },
    btnAI: {
        backgroundColor: 'rgba(168,85,247,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.4)'
    },
    btnAIText: {
        color: '#a855f7',
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 0.5
    },
    approveBtn: {
        backgroundColor: '#f47b25',
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },
    approveBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 0.5
    },

    // AI Verdict Card
    aiVerdictCard: {
        backgroundColor: 'rgba(168,85,247,0.08)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.3)'
    },
    aiVerdictHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    aiVerdictTitle: {
        color: '#a855f7',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    aiVerdictText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 2
    },
    aiVerdictSubtext: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11
    },
    aiVerdictReasoning: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginTop: 6,
        fontStyle: 'italic',
        lineHeight: 16
    },

    // Participant Card
    participantCard: {
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    participantCardWinner: {
        borderColor: 'rgba(244,123,37,0.5)',
        backgroundColor: 'rgba(244,123,37,0.05)'
    },
    participantHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    participantName: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold'
    },
    participantStats: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4
    },
    participantStat: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontWeight: 'bold'
    },
    selectWinnerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(244,123,37,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(244,123,37,0.3)'
    },
    selectWinnerText: {
        color: '#f47b25',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    winnerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(244,123,37,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    winnerBadgeText: {
        color: '#f47b25',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    submissionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8
    },
    submissionsText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: 'bold'
    },
    rejectBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderRadius: 10,
        padding: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)'
    },
    rejectText: {
        color: '#ef4444',
        fontSize: 11,
        flex: 1
    },

    // Reject Modal
    rejectCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    inputLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 6,
        marginTop: 8
    },
    rejectInput: {
        backgroundColor: '#111111',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        height: 80,
        padding: 12,
        color: 'white',
        fontSize: 14,
        textAlignVertical: 'top',
        marginBottom: 16
    }
});
