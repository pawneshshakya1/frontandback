import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    TextInput,
    Modal,
    Switch,
    Image,
    Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/Button';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import * as ImagePicker from "expo-image-picker";
import { sseService } from "../../services/sse";
import { useAuth } from "../../context/AuthContext";

export const PromoBannerScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { authData } = useAuth();
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [useUpload, setUseUpload] = useState(false);
    const [bannerPreviewUri, setBannerPreviewUri] = useState("");
    const [bannerForm, setBannerForm] = useState({
        title: "",
        description: "",
        image_url: "",
        link_url: "",
        is_active: true,
        display_order: "0",
    });

    const fetchBanners = async () => {
        try {
            const res = await adminAPI.getBanners();
            setBanners(res.data.data || []);
        } catch (e) {
            console.error("Failed to fetch banners", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBanners();

        sseService.on("BANNER_UPDATE", () => {
            fetchBanners();
        });

        return () => {
            sseService.off("BANNER_UPDATE", () => {});
        };
    }, []);

    const resetBannerForm = () => {
        setBannerForm({
            title: "",
            description: "",
            image_url: "",
            link_url: "",
            is_active: true,
            display_order: "0",
        });
        setBannerPreviewUri("");
        setUseUpload(false);
    };

    const uploadBannerImage = async (asset: ImagePicker.ImagePickerAsset) => {
        const uri = asset.uri;
        const filenameFromUri = uri.split("/").pop() || `banner-${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filenameFromUri);
        const ext = match ? match[1] : "jpg";
        const type = asset.mimeType || `image/${ext}`;

        const form = new FormData();
        form.append("image", {
            uri,
            name: filenameFromUri,
            type,
        } as any);

        const res = await adminAPI.uploadBanner(form);
        return res.data?.data?.url as string;
    };

    const handleCreateBanner = async () => {
        try {
            const hasUrl = Boolean(bannerForm.image_url);
            if (!bannerForm.title || !bannerForm.description || !hasUrl) {
                Alert.alert(
                    "Validation",
                    "Title, description, and image (URL or upload) are required.",
                );
                return;
            }
            setSubmitting(true);
            const payload: any = {
                ...bannerForm,
                display_order: Number(bannerForm.display_order || 0),
            };
            await adminAPI.createBanner(payload);
            Alert.alert("Success", "Promotional banner added.");
            setShowModal(false);
            resetBannerForm();
            fetchBanners();
        } catch (e: any) {
            Alert.alert(
                "Error",
                e?.response?.data?.message || "Failed to upload banner.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBanner = async (id: string) => {
        Alert.alert("Confirm Delete", "Are you sure you want to delete this banner?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await adminAPI.deleteBanner(id);
                        fetchBanners();
                    } catch (e) {
                        Alert.alert("Error", "Failed to delete banner");
                    }
                },
            },
        ]);
    };

    const handleUpdateStatus = async (id: string, currentStatus: boolean) => {
        try {
            setBanners(prev => prev.map(b => b._id === id ? { ...b, is_active: !currentStatus } : b));
            await adminAPI.updateBanner(id, { is_active: !currentStatus });
        } catch (e) {
            Alert.alert("Error", "Failed to update status");
            fetchBanners();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LoadingOverlay visible={loading} />

            <View style={[styles.header, { marginTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Promotional Banners</Text>
                <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
                    <MaterialIcons name="add" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            >
                {banners.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="campaign" size={64} color={`${COLORS.textMuted}33`} />
                        <Text style={styles.emptyText}>No banners found</Text>
                        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.emptyBtn}>
                            <Text style={styles.btnText}>Create First Banner</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    banners.map((banner) => (
                        <View key={banner._id} style={styles.bannerItem}>
                            <Image
                                source={{ uri: banner.image_url }}
                                style={styles.bannerThumb}
                                resizeMode="cover"
                            />
                            <View style={styles.bannerContent}>
                                <View style={styles.bannerRow}>
                                    <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: banner.is_active ? `${COLORS.primary}33` : `${COLORS.error}33` }]}>
                                        <Text style={[styles.statusText, { color: banner.is_active ? COLORS.success : COLORS.error }]}>
                                            {banner.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.bannerDesc} numberOfLines={2}>{banner.description}</Text>

                                <View style={styles.bannerActions}>
                                    <View style={styles.switchWrapper}>
                                        <Text style={styles.actionLabel}>Status</Text>
                                        <Switch
                                            value={banner.is_active}
                                            onValueChange={() => handleUpdateStatus(banner._id, banner.is_active)}
                                            trackColor={{ false: `${COLORS.textMuted}33`, true: `${COLORS.primary}4D` }}
                                            thumbColor={banner.is_active ? COLORS.primary : COLORS.textMuted}
                                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                        />
                                    </View>
                                    <View style={styles.orderBadge}>
                                        <Text style={styles.orderText}>Order: {banner.display_order}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteBanner(banner._id)}
                                    >
                                        <MaterialIcons name="delete-outline" size={20} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* CREATE MODAL */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <LoadingOverlay visible={submitting} />
                    <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Banner</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <MaterialIcons name="close" size={22} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TextInput
                                style={styles.input}
                                placeholder="Title"
                                placeholderTextColor={`${COLORS.textMuted}4D`}
                                value={bannerForm.title}
                                onChangeText={(v) => setBannerForm({ ...bannerForm, title: v })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Description"
                                placeholderTextColor={`${COLORS.textMuted}4D`}
                                value={bannerForm.description}
                                onChangeText={(v) =>
                                    setBannerForm({ ...bannerForm, description: v })
                                }
                            />

                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Use Upload</Text>
                                <Switch
                                    value={useUpload}
                                    onValueChange={(v) => setUseUpload(v)}
                                    trackColor={{ false: `${COLORS.textMuted}33`, true: `${COLORS.primary}4D` }}
                                    thumbColor={useUpload ? COLORS.primary : COLORS.textMuted}
                                />
                            </View>

                            {useUpload ? (
                                <View style={styles.uploadRow}>
                                    <TouchableOpacity
                                        style={styles.browseBtn}
                                        onPress={async () => {
                                            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                                            if (!perm.granted) {
                                                return Alert.alert("Permission needed", "Please allow photo library access.");
                                            }
                                            const result = await ImagePicker.launchImageLibraryAsync({
                                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                                quality: 0.8,
                                            });
                                            if (!result.canceled && result.assets && result.assets[0]) {
                                                const asset = result.assets[0];
                                                try {
                                                    const url = await uploadBannerImage(asset);
                                                    setBannerForm({ ...bannerForm, image_url: url });
                                                    setBannerPreviewUri(asset.uri);
                                                } catch (err) {
                                                    Alert.alert("Error", "Failed to upload image.");
                                                }
                                            }
                                        }}
                                    >
                                        <MaterialIcons name="image" size={20} color={COLORS.textLight} style={{ marginRight: 8 }} />
                                        <Text style={styles.btnText}>Choose Image</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Image URL"
                                    placeholderTextColor={`${COLORS.textMuted}4D`}
                                    value={bannerForm.image_url}
                                    onChangeText={(v) =>
                                        setBannerForm({ ...bannerForm, image_url: v })
                                    }
                                />
                            )}

                            {useUpload && (bannerPreviewUri || bannerForm.image_url) ? (
                                <Image
                                    source={{ uri: bannerPreviewUri || bannerForm.image_url }}
                                    style={styles.preview}
                                />
                            ) : null}

                            <TextInput
                                style={styles.input}
                                placeholder="Link URL (optional)"
                                placeholderTextColor={`${COLORS.textMuted}4D`}
                                value={bannerForm.link_url}
                                onChangeText={(v) =>
                                    setBannerForm({ ...bannerForm, link_url: v })
                                }
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Order"
                                        placeholderTextColor={`${COLORS.textMuted}4D`}
                                        keyboardType="numeric"
                                        value={bannerForm.display_order}
                                        onChangeText={(v) =>
                                            setBannerForm({ ...bannerForm, display_order: v })
                                        }
                                    />
                                </View>
                                <View style={[styles.switchRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                    <Text style={[styles.switchLabel, { marginRight: 8 }]}>Active</Text>
                                    <Switch
                                        value={bannerForm.is_active}
                                        onValueChange={(v) =>
                                            setBannerForm({ ...bannerForm, is_active: v })
                                        }
                                        trackColor={{ false: `${COLORS.textMuted}33`, true: `${COLORS.primary}4D` }}
                                        thumbColor={bannerForm.is_active ? COLORS.primary : COLORS.textMuted}
                                    />
                                </View>
                            </View>

                            <Button
                                title="Save Banner"
                                onPress={handleCreateBanner}
                                loading={submitting}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: `${COLORS.textMuted}0D`,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        color: COLORS.textLight,
        fontSize: 18,
        fontWeight: "bold",
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${COLORS.primary}33`,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: `${COLORS.primary}66`,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        color: `${COLORS.textMuted}66`,
        fontSize: 16,
    },
    emptyBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
    },
    bannerItem: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: `${COLORS.textMuted}0D`,
    },
    bannerThumb: {
        width: "100%",
        height: 120,
        backgroundColor: COLORS.surface,
    },
    bannerContent: {
        padding: 16,
    },
    bannerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    bannerTitle: {
        color: COLORS.textLight,
        fontSize: 16,
        fontWeight: "bold",
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "bold",
    },
    bannerDesc: {
        color: `${COLORS.textMuted}99`,
        fontSize: 12,
        marginBottom: 12,
    },
    bannerActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: `${COLORS.textMuted}0D`,
        paddingTop: 12,
    },
    switchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionLabel: {
        color: `${COLORS.textMuted}66`,
        fontSize: 12,
    },
    orderBadge: {
        backgroundColor: `${COLORS.textMuted}0D`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    orderText: {
        color: `${COLORS.textMuted}99`,
        fontSize: 10,
        fontWeight: "bold",
    },
    deleteBtn: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: `${COLORS.backgroundDark}CC`,
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.lg,
        height: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.lg,
    },
    modalTitle: {
        color: COLORS.textLight,
        fontSize: 18,
        fontWeight: "bold",
    },
    input: {
        backgroundColor: `${COLORS.backgroundDark}E6`,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        height: 50,
        paddingHorizontal: 16,
        color: COLORS.textLight,
        marginBottom: 12,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    switchLabel: {
        color: COLORS.textLight,
        fontSize: 14,
        fontWeight: "500",
        marginRight: 12,
    },
    uploadRow: {
        marginBottom: 12,
    },
    browseBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.border,
        padding: 12,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: "dashed",
    },
    btnText: {
        color: COLORS.textLight,
        fontWeight: "bold",
    },
    preview: {
        width: "100%",
        height: 160,
        borderRadius: RADIUS.md,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
});
