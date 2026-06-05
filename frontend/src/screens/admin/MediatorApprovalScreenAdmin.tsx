import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Image,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SPACING, RADIUS } from "../../theme/colors";
import { adminAPI } from "../../services/api";
import { Button } from "../../components/Button";
import { LoadingOverlay } from "../../components/LoadingOverlay";

type TabType = "PENDING" | "APPROVED" | "REJECTED";

const MediatorApprovalScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [tab, setTab] = useState<TabType>("PENDING");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Reject modal
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [rejectNote, setRejectNote] = useState("");

    const fetchApplications = async (status = tab) => {
        try {
            const res = await adminAPI.getMediatorApplications({ status });
            if (res.data.success) setUsers(res.data.data);
        } catch (err) {
            console.error("Failed to fetch mediator applications", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchApplications(tab);
        }, [tab])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchApplications(tab);
    };

    const handleApprove = (user: any) => {
        Alert.alert(
            "Approve Mediator",
            `Grant mediator role to @${user.username}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    onPress: async () => {
                        try {
                            setActionLoading(user._id);
                            await adminAPI.approveMediator(user._id);
                            fetchApplications(tab);
                            Alert.alert("Success", `@${user.username} is now a Mediator.`);
                        } catch (err: any) {
                            Alert.alert("Error", err.response?.data?.message || "Failed to approve");
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleRejectConfirm = async () => {
        if (!selectedUser) return;
        try {
            setActionLoading(selectedUser._id);
            await adminAPI.rejectMediator(selectedUser._id, {
                note: rejectNote.trim(),
            });
            setRejectModalVisible(false);
            setRejectNote("");
            setSelectedUser(null);
            fetchApplications(tab);
            Alert.alert("Done", "Application rejected.");
        } catch (err: any) {
            Alert.alert("Error", err.response?.data?.message || "Failed to reject");
        } finally {
            setActionLoading(null);
        }
    };

    const TabBtn = ({ value }: { value: TabType }) => {
        const tabColor = value === "PENDING" ? COLORS.warning : value === "APPROVED" ? COLORS.primary : COLORS.error;
        return (
            <TouchableOpacity
                style={[styles.tabBtn, tab === value && { borderColor: tabColor, backgroundColor: `${tabColor}15` }]}
                onPress={() => { setTab(value); setLoading(true); }}
            >
                <Text style={[styles.tabText, tab === value && { color: tabColor }]}>{value}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />

            <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="chevron-left" size={28} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Mediator Approvals</Text>
                    <Text style={styles.headerSub}>Review & manage applications</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
                <TabBtn value="PENDING" />
                <TabBtn value="APPROVED" />
                <TabBtn value="REJECTED" />
            </View>

            {loading && !refreshing ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                >
                    {users.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="verified-user" size={48} color={COLORS.border} />
                            <Text style={styles.emptyText}>No {tab.toLowerCase()} applications</Text>
                        </View>
                    ) : (
                        users.map((user) => (
                            <View key={user._id} style={styles.card}>
                                {/* User info */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.avatarWrap}>
                                        <Image
                                            source={{ uri: user.avatar || "https://ui-avatars.com/api/?name=" + (user.username || "U") + "&background=f47b25&color=fff" }}
                                            style={styles.avatar}
                                        />
                                        {user.is_verified && (
                                            <View style={styles.verifiedBadge}>
                                                <MaterialIcons name="verified" size={12} color={COLORS.info} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.username}>@{user.username || "Unknown"}</Text>
                                        <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
                                        {user.ff_max_uid && (
                                            <Text style={styles.uid}>FF UID: {user.ff_max_uid}</Text>
                                        )}
                                    </View>
                                    {/* Status pill */}
                                    <View style={[styles.statusPill, { backgroundColor: `${(user.mediator_application_status === "PENDING" ? COLORS.warning : user.mediator_application_status === "APPROVED" ? COLORS.primary : COLORS.error)}20` }]}>
                                        <Text style={[styles.statusPillText, { color: user.mediator_application_status === "PENDING" ? COLORS.warning : user.mediator_application_status === "APPROVED" ? COLORS.primary : COLORS.error }]}>
                                            {user.mediator_application_status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Rejection note if any */}
                                {user.mediator_application_note ? (
                                    <View style={styles.noteBox}>
                                        <MaterialIcons name="info" size={14} color={COLORS.error} />
                                        <Text style={styles.noteText}>{user.mediator_application_note}</Text>
                                    </View>
                                ) : null}

                                {/* Action buttons — only for PENDING */}
                                {user.mediator_application_status === "PENDING" && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.rejectBtn}
                                            onPress={() => { setSelectedUser(user); setRejectModalVisible(true); }}
                                            disabled={actionLoading === user._id}
                                        >
                                            <MaterialIcons name="close" size={16} color={COLORS.error} />
                                            <Text style={styles.rejectBtnText}>REJECT</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.approveBtn}
                                            onPress={() => handleApprove(user)}
                                            disabled={actionLoading === user._id}
                                        >
                                            {actionLoading === user._id ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <>
                                                    <MaterialIcons name="check" size={16} color="white" />
                                                    <Text style={styles.approveBtnText}>APPROVE</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Reject Modal */}
            <Modal visible={rejectModalVisible} transparent animationType="fade">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeaderRow}>
                            <MaterialIcons name="cancel" size={22} color={COLORS.error} />
                            <Text style={styles.modalTitle}>Reject Application</Text>
                        </View>
                        <Text style={styles.modalSub}>
                            Rejecting <Text style={{ color: "white", fontWeight: "bold" }}>@{selectedUser?.username}</Text>. Optionally add a reason:
                        </Text>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Reason for rejection (optional)..."
                            placeholderTextColor={`${COLORS.textMuted}4D`}
                            value={rejectNote}
                            onChangeText={setRejectNote}
                            multiline
                            textAlignVertical="top"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => { setRejectModalVisible(false); setRejectNote(""); setSelectedUser(null); }}
                            >
                                <Text style={styles.modalCancelText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalRejectBtn}
                                onPress={handleRejectConfirm}
                                disabled={!!actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalRejectText}>CONFIRM REJECT</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

export default MediatorApprovalScreenAdmin;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    bgGlowTop: {
        position: "absolute", top: "-10%", right: "-20%",
        width: 300, height: 300,
        backgroundColor: `${COLORS.primary}26`, borderRadius: 150, opacity: 0.5,
    },
    bgGlowBottom: {
        position: "absolute", bottom: "-10%", left: "-20%",
        width: 300, height: 300,
        backgroundColor: `${COLORS.info}1A`, borderRadius: 150, opacity: 0.5,
    },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 20, paddingBottom: 16,
    },
    backButton: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: `${COLORS.textMuted}0D`,
        borderWidth: 1, borderColor: COLORS.border,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
    headerSub: { fontSize: 10, color: `${COLORS.textMuted}66`, marginTop: 2 },
    tabRow: {
        flexDirection: "row", gap: 10, paddingHorizontal: 20,
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, borderColor: COLORS.border,
        backgroundColor: `${COLORS.textMuted}08`,
        alignItems: "center",
    },
    tabText: {
        fontSize: 10, fontWeight: "bold", textTransform: "uppercase",
        letterSpacing: 1, color: `${COLORS.textMuted}66`,
    },
    scroll: { flex: 1 },
    emptyState: {
        flex: 1, alignItems: "center", justifyContent: "center",
        paddingTop: 80, gap: 16,
    },
    emptyText: { color: `${COLORS.textMuted}4D`, fontSize: 14, fontWeight: "500" },
    card: {
        backgroundColor: `${COLORS.textMuted}08`,
        borderRadius: 20, borderWidth: 1,
        borderColor: `${COLORS.textMuted}0F`,
        padding: 16, marginBottom: 14,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatarWrap: { position: "relative" },
    avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: `${COLORS.primary}66` },
    verifiedBadge: {
        position: "absolute", bottom: -2, right: -2,
        backgroundColor: COLORS.backgroundDark, borderRadius: 8, padding: 2,
    },
    username: { fontSize: 15, fontWeight: "bold", color: "white" },
    email: { fontSize: 11, color: `${COLORS.textMuted}66`, marginTop: 2 },
    uid: { fontSize: 10, color: COLORS.primary, marginTop: 2, fontWeight: "600" },
    statusPill: {
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    statusPillText: { fontSize: 9, fontWeight: "bold", letterSpacing: 0.5 },
    noteBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: `${COLORS.error}14`,
        borderRadius: 10, padding: 10, marginTop: 12,
    },
    noteText: { fontSize: 11, color: `${COLORS.textMuted}80`, flex: 1 },
    actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
    rejectBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 12, borderRadius: 14,
        borderWidth: 1, borderColor: `${COLORS.error}4D`,
        backgroundColor: `${COLORS.error}14`,
    },
    rejectBtnText: { fontSize: 11, fontWeight: "bold", color: COLORS.error, letterSpacing: 0.5 },
    approveBtn: {
        flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 12, borderRadius: 14,
        backgroundColor: COLORS.primary,
    },
    approveBtnText: { fontSize: 11, fontWeight: "bold", color: "white", letterSpacing: 0.5 },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: `${COLORS.backgroundDark}B3`,
        justifyContent: "center", alignItems: "center", padding: 24,
    },
    modalContent: {
        backgroundColor: COLORS.surface, width: "100%",
        borderRadius: 24, padding: 24,
        borderWidth: 1, borderColor: COLORS.border,
    },
    modalHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
    modalSub: { color: `${COLORS.textMuted}80`, fontSize: 13, lineHeight: 20, marginBottom: 16 },
    noteInput: {
        backgroundColor: `${COLORS.backgroundDark}4D`, borderRadius: 12,
        borderWidth: 1, borderColor: COLORS.border,
        color: "white", padding: 14, minHeight: 90, fontSize: 14, marginBottom: 20,
    },
    modalActions: { flexDirection: "row", gap: 12 },
    modalCancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        backgroundColor: `${COLORS.textMuted}0D`, alignItems: "center",
    },
    modalCancelText: { color: "white", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5 },
    modalRejectBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        backgroundColor: COLORS.error, alignItems: "center",
    },
    modalRejectText: { color: "white", fontWeight: "bold", fontSize: 12, letterSpacing: 0.5 },
});
