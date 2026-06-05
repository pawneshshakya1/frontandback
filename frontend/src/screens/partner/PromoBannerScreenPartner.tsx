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
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../services/api";
import * as ImagePicker from "expo-image-picker";
import EventSource, { EventSourceListener } from "react-native-sse";

const COLORS = {
    primary: "#f47b25",
    backgroundDark: "#0d0d0d",
    cardDark: "#1a1a1a",
    accentBlue: "#2563eb",
    success: "#f47b25",
    danger: "#ef4444",
    white: "#ffffff",
};

export const PromoBannerScreenPartner = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);

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
            const res = await api.get("/admin/banners");
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

        let eventSource: EventSource | null = null;
        try {
            const baseURL = api.defaults.baseURL || 'http://192.168.29.27:5000/api';
            const sseURL = `${baseURL}/sse/events`;
            console.log("Partner Connecting to SSE:", sseURL);

            eventSource = new EventSource(sseURL);

            const listener: EventSourceListener = (event) => {
                if (event.type === 'message' && event.data) {
                    try {
                        const data = JSON.parse(event.data);
                        // Ignore heartbeat messages
                        if (data.type === 'HEARTBEAT') return;

                        console.log("Partner SSE Message:", data);
                        if (data.type === 'BANNER_UPDATE') {
                            fetchBanners();
                        }
                    } catch (e) {
                        console.error("Partner SSE Parse Error", e);
                    }
                } else if (event.type === 'error') {
                    console.error("Partner SSE Error:", event);
                    // Silently attempt reconnect for normal connection drops
                    if (eventSource) {
                        eventSource.close();
                        setTimeout(() => {
                            fetchBanners(); // Fallback fetch just in case
                        }, 5000);
                    }
                }
            };

            eventSource.addEventListener("message", listener);
            eventSource.addEventListener("error", listener);

        } catch (e) {
            console.error("Partner SSE Setup Failed", e);
        }

        return () => {
            if (eventSource) {
                eventSource.removeAllEventListeners();
                eventSource.close();
            }
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

        const res = await api.post("/admin/banners/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
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
            const payload: any = {
                ...bannerForm,
                display_order: Number(bannerForm.display_order || 0),
            };
            await api.post("/admin/banners", payload);
            Alert.alert("Success", "Promotional banner added.");
            setShowModal(false);
            resetBannerForm();
            fetchBanners();
        } catch (e: any) {
            Alert.alert(
                "Error",
                e?.response?.data?.message || "Failed to upload banner.",
            );
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
                        await api.delete(`/admin/banners/${id}`);
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
            // Optimistically update
            setBanners(prev => prev.map(b => b._id === id ? { ...b, is_active: !currentStatus } : b));
            await api.put(`/admin/banners/${id}`, { is_active: !currentStatus });
        } catch (e) {
            Alert.alert("Error", "Failed to update status");
            fetchBanners(); // revert on error
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <View style={[styles.header, { marginTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Promotional Banners</Text>
                <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
                    <MaterialIcons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
                ) : banners.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="campaign" size={64} color="rgba(255,255,255,0.2)" />
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
                                    <View style={[styles.statusBadge, { backgroundColor: banner.is_active ? 'rgba(244,123,37,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                                        <Text style={[styles.statusText, { color: banner.is_active ? COLORS.success : COLORS.danger }]}>
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
                                            trackColor={{ false: "#333", true: "rgba(244,123,37,0.3)" }}
                                            thumbColor={banner.is_active ? COLORS.primary : "#f4f3f4"}
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
                                        <MaterialIcons name="delete-outline" size={20} color={COLORS.danger} />
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
                    <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Banner</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <MaterialIcons name="close" size={22} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <TextInput
                                style={styles.input}
                                placeholder="Title"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={bannerForm.title}
                                onChangeText={(v) => setBannerForm({ ...bannerForm, title: v })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Description"
                                placeholderTextColor="rgba(255,255,255,0.3)"
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
                                    trackColor={{ false: "#333", true: "rgba(244,123,37,0.3)" }}
                                    thumbColor={useUpload ? COLORS.primary : "#f4f3f4"}
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
                                        <MaterialIcons name="image" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.btnText}>Choose Image</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Image URL"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
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
                                placeholderTextColor="rgba(255,255,255,0.3)"
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
                                        placeholderTextColor="rgba(255,255,255,0.3)"
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
                                        trackColor={{ false: "#333", true: "rgba(244,123,37,0.3)" }}
                                        thumbColor={bannerForm.is_active ? COLORS.primary : "#f4f3f4"}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleCreateBanner}
                            >
                                <Text style={styles.saveBtnText}>Save Banner</Text>
                            </TouchableOpacity>
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
        borderBottomColor: "rgba(255,255,255,0.05)",
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(244,123,37,0.2)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(244,123,37,0.4)",
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
        color: "rgba(255,255,255,0.4)",
        fontSize: 16,
    },
    emptyBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    bannerItem: {
        backgroundColor: COLORS.cardDark,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    bannerThumb: {
        width: "100%",
        height: 120,
        backgroundColor: "#111",
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
        color: "white",
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
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        marginBottom: 12,
    },
    bannerActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.05)",
        paddingTop: 12,
    },
    switchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    actionLabel: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 12,
    },
    orderBadge: {
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    orderText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 10,
        fontWeight: "bold",
    },
    deleteBtn: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: "#1a1a1a",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        height: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
    input: {
        backgroundColor: "#0f0f0f",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 16,
        color: "white",
        marginBottom: 12,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    switchLabel: {
        color: "white",
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
        backgroundColor: "rgba(255,255,255,0.1)",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        borderStyle: "dashed",
    },
    btnText: {
        color: "white",
        fontWeight: "bold",
    },
    preview: {
        width: "100%",
        height: 160,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
    },
    saveBtnText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});
