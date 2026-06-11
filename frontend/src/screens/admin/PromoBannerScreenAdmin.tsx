import { useState, useEffect, useRef, useMemo } from "react";
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
    Animated,
    Linking,
} from "react-native";
import { BlurView } from "expo-blur";
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
import { usePopup } from "../../components/PopupModal";
import { BannerCarousel } from "../../components/BannerCarousel";
import { SectionHeader } from "../../components/SectionHeader";

const BlinkingDot = ({ active }: { active: boolean }) => {
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!active) {
            pulse.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [active, pulse]);
    if (!active) {
        return (
            <View style={blinkingDotStyles.outer}>
                <View style={[blinkingDotStyles.inner, { backgroundColor: COLORS.textMuted }]} />
            </View>
        );
    }
    return (
        <Animated.View
            style={[
                blinkingDotStyles.outer,
                { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
            ]}
        >
            <View style={[blinkingDotStyles.inner, { backgroundColor: COLORS.success }]} />
        </Animated.View>
    );
};

const blinkingDotStyles = StyleSheet.create({
    outer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    inner: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
});

type SlidingTab = { key: string; label: string; count: number };

const SlidingTabs = ({
    tabs,
    activeKey,
    onChange,
}: {
    tabs: SlidingTab[];
    activeKey: string;
    onChange: (key: string) => void;
}) => {
    const [width, setWidth] = useState(0);
    const indicatorX = useRef(new Animated.Value(0)).current;
    const activeIndex = Math.max(
        0,
        tabs.findIndex((t) => t.key === activeKey),
    );
    const tabWidth = width / Math.max(1, tabs.length);

    useEffect(() => {
        if (tabWidth <= 0) return;
        Animated.spring(indicatorX, {
            toValue: activeIndex * tabWidth + 3,
            useNativeDriver: false,
            friction: 8,
            tension: 80,
        }).start();
    }, [activeIndex, tabWidth, indicatorX]);

    return (
        <View
            style={slidingTabStyles.wrap}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
            {tabWidth > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        slidingTabStyles.indicator,
                        {
                            width: tabWidth - 6,
                            left: indicatorX,
                        },
                    ]}
                />
            )}
            {tabs.map((t) => {
                const isActive = t.key === activeKey;
                return (
                    <TouchableOpacity
                        key={t.key}
                        activeOpacity={0.85}
                        onPress={() => onChange(t.key)}
                        style={slidingTabStyles.tab}
                    >
                        <Text
                            style={[slidingTabStyles.label, isActive && slidingTabStyles.labelActive]}
                            numberOfLines={1}
                        >
                            {t.label}
                        </Text>
                        <View
                            style={[
                                slidingTabStyles.count,
                                isActive && slidingTabStyles.countActive,
                            ]}
                        >
                            <Text
                                style={[
                                    slidingTabStyles.countText,
                                    isActive && slidingTabStyles.countTextActive,
                                ]}
                            >
                                {t.count}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const slidingTabStyles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 22,
        padding: 3,
        height: 40,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    indicator: {
        position: "absolute",
        top: 3,
        bottom: 3,
        borderRadius: 18,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        gap: 6,
    },
    label: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    labelActive: {
        color: COLORS.primary,
    },
    count: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 6,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
    countActive: {
        backgroundColor: `${COLORS.primary}33`,
    },
    countText: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: "800",
    },
    countTextActive: {
        color: COLORS.primary,
    },
});

export const PromoBannerScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { authData } = useAuth();
    const { showError, showSuccess, showWarning, showConfirm, PopupElement } = usePopup();
    const [banners, setBanners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState<any | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");

    // Form State
    const [useUpload, setUseUpload] = useState(false);
    const [bannerPreviewUri, setBannerPreviewUri] = useState("");
    const [pendingImageAsset, setPendingImageAsset] =
        useState<ImagePicker.ImagePickerAsset | null>(null);
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
            sseService.off("BANNER_UPDATE", () => { });
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
        setPendingImageAsset(null);
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

    const handleDeleteBanner = async (id: string) => {
        try {
            await adminAPI.deleteBanner(id);
            fetchBanners();
            showSuccess("Success", "Banner deleted.");
        } catch (e) {
            showError("Error", "Failed to delete banner");
        }
    };

    const handleUpdateStatus = async (id: string, currentStatus: boolean) => {
        try {
            setBanners(prev => prev.map(b => b._id === id ? { ...b, is_active: !currentStatus } : b));
            await adminAPI.updateBanner(id, { is_active: !currentStatus });
        } catch (e) {
            showError("Error", "Failed to update status");
            fetchBanners();
        }
    };

    const handleOpenEdit = (banner: any) => {
        setEditingBanner(banner);
        setBannerForm({
            title: banner.title || "",
            description: banner.description || "",
            image_url: banner.image_url || "",
            link_url: banner.link_url || "",
            is_active: banner.is_active !== false,
            display_order: String(banner.display_order ?? 0),
        });
        setBannerPreviewUri("");
        setPendingImageAsset(null);
        setUseUpload(false);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!bannerForm.title || !bannerForm.description) {
            showError("Validation", "Title and description are required.");
            return;
        }
        if (!bannerForm.image_url && !pendingImageAsset) {
            showError("Validation", "Please provide an image URL or upload an image.");
            return;
        }
        setSubmitting(true);
        try {
            let imageUrl = bannerForm.image_url;
            if (pendingImageAsset) {
                imageUrl = await uploadBannerImage(pendingImageAsset);
            }
            const payload: any = {
                ...bannerForm,
                image_url: imageUrl,
                display_order: Number(bannerForm.display_order || 0),
            };
            if (editingBanner) {
                await adminAPI.updateBanner(editingBanner._id, payload);
                showSuccess("Success", "Banner updated.");
            } else {
                await adminAPI.createBanner(payload);
                showSuccess("Success", "Promotional banner added.");
            }
            setShowModal(false);
            setEditingBanner(null);
            resetBannerForm();
            fetchBanners();
        } catch (e: any) {
            showError(
                "Error",
                e?.response?.data?.message || "Failed to save banner.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleReorder = async (id: string, direction: "up" | "down") => {
        try {
            await adminAPI.reorderBanner(id, direction);
            fetchBanners();
        } catch {
            // silent: no popup on reorder
        }
    };

    const handleOpenLink = async (url?: string) => {
        if (!url) {
            showWarning("No Link", "This banner has no link URL set.");
            return;
        }
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
            finalUrl = `https://${finalUrl}`;
        }
        try {
            const supported = await Linking.canOpenURL(finalUrl);
            if (supported) await Linking.openURL(finalUrl);
            else showError("Error", "Cannot open this URL.");
        } catch {
            showError("Error", "Failed to open link.");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBanner(null);
        resetBannerForm();
    };

    const activeCount = banners.filter((b) => b.is_active).length;
    const inactiveCount = banners.filter((b) => !b.is_active).length;

    const sortedBanners = useMemo(() => {
        const active: any[] = [];
        const inactive: any[] = [];
        banners.forEach((b) => (b.is_active ? active.push(b) : inactive.push(b)));
        return [...active, ...inactive];
    }, [banners]);

    const activeSortedMap = useMemo(() => {
        const m = new Map<string, number>();
        sortedBanners.forEach((b, i) => {
            if (b.is_active) m.set(b._id, i);
        });
        return m;
    }, [sortedBanners]);

    const filteredBanners = sortedBanners.filter((b) => {
        if (activeTab === "active" && !b.is_active) return false;
        if (activeTab === "inactive" && b.is_active) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const hay = `${b.title || ""} ${b.description || ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LoadingOverlay visible={loading} />

            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />

            <View style={[styles.header, { marginTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Promotional Banners</Text>
                <TouchableOpacity onPress={() => { setEditingBanner(null); resetBannerForm(); setShowModal(true); }} style={styles.addBtn}>
                    <MaterialIcons name="add" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            >
                {banners.filter((b) => b.is_active).length > 0 && (
                    <View style={styles.bannerWrap}>
                        <BannerCarousel
                            data={banners.filter((b) => b.is_active)}
                            autoPlayInterval={3000}
                        />
                    </View>
                )}

                <SectionHeader
                    title="Banners"
                    subtitle={`${banners.length} total`}
                    containerStyle={styles.sectionSpacing}
                />

                <View style={styles.searchWrap}>
                    <MaterialIcons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by title or description..."
                        placeholderTextColor={COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClear}>
                            <MaterialIcons name="close" size={16} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <SlidingTabs
                    tabs={[
                        { key: "all", label: "All", count: banners.length },
                        { key: "active", label: "Active", count: activeCount },
                        { key: "inactive", label: "Inactive", count: inactiveCount },
                    ]}
                    activeKey={activeTab}
                    onChange={(k) => setActiveTab(k as "all" | "active" | "inactive")}
                />

                {banners.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="campaign" size={64} color={`${COLORS.textMuted}33`} />
                        <Text style={styles.emptyText}>No banners found</Text>
                        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.emptyBtn}>
                            <Text style={styles.btnText}>Create First Banner</Text>
                        </TouchableOpacity>
                    </View>
                ) : filteredBanners.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="search-off" size={64} color={`${COLORS.textMuted}33`} />
                        <Text style={styles.emptyText}>
                            {searchQuery
                                ? `No banners match "${searchQuery}"`
                                : activeTab === "active"
                                    ? "No active banners"
                                    : "No inactive banners"}
                        </Text>
                        {searchQuery && (
                            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.emptyBtn}>
                                <Text style={styles.btnText}>Clear Search</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    filteredBanners.map((banner) => {
                        const isActiveBanner = banner.is_active;
                        const activePos = isActiveBanner
                            ? (activeSortedMap.get(banner._id) ?? 0)
                            : -1;
                        const isFirstActive = activePos === 0;
                        const isLastActive =
                            activePos === activeCount - 1 && activeCount > 0;
                        return (
                            <View key={banner._id} style={styles.bannerItem}>
                                <TouchableOpacity
                                    activeOpacity={banner.link_url ? 0.85 : 1}
                                    onPress={() => handleOpenLink(banner.link_url)}
                                    style={styles.imageWrap}
                                >
                                    <Image
                                        source={{ uri: banner.image_url }}
                                        style={styles.bannerImage}
                                        resizeMode="cover"
                                    />
                                </TouchableOpacity>
                                <LinearGradient
                                    colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.9)"]}
                                    style={styles.bannerGradient}
                                    pointerEvents="none"
                                />

                                {/* Top-left: blinking dot + order + delete */}
                                <View style={styles.topLeftRow}>
                                    <BlinkingDot active={banner.is_active} />
                                    {isActiveBanner ? (
                                        <View style={styles.orderPill}>
                                            <Text style={styles.orderPillText}>#{activePos + 1}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.inactivePill}>
                                            <Text style={styles.inactivePillText}>OFF</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.iconBtn}
                                        onPress={() => handleDeleteBanner(banner._id)}
                                    >
                                        <MaterialIcons name="delete-outline" size={18} color={COLORS.error} />
                                    </TouchableOpacity>
                                </View>

                                {/* Top-right: full-height vertical action rail (reorder hidden for inactive) */}
                                <View style={styles.topRightCol}>
                                    {isActiveBanner && (
                                        <View style={styles.rightGroup}>
                                            <TouchableOpacity
                                                style={styles.iconBtn}
                                                onPress={() => handleReorder(banner._id, "up")}
                                                disabled={isFirstActive}
                                            >
                                                <MaterialIcons
                                                    name="keyboard-arrow-up"
                                                    size={22}
                                                    color={isFirstActive ? "rgba(255,255,255,0.3)" : "white"}
                                                />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.iconBtn}
                                                onPress={() => handleReorder(banner._id, "down")}
                                                disabled={isLastActive}
                                            >
                                                <MaterialIcons
                                                    name="keyboard-arrow-down"
                                                    size={22}
                                                    color={isLastActive ? "rgba(255,255,255,0.3)" : "white"}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <View style={styles.switchHolder}>
                                        <Switch
                                            value={banner.is_active}
                                            onValueChange={() => handleUpdateStatus(banner._id, banner.is_active)}
                                            trackColor={{ false: "rgba(255,255,255,0.2)", true: `${COLORS.primary}B3` }}
                                            thumbColor={banner.is_active ? COLORS.primary : "#f4f3f4"}
                                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={styles.iconBtn}
                                        onPress={() => handleOpenEdit(banner)}
                                    >
                                        <MaterialIcons name="edit" size={20} color="white" />
                                    </TouchableOpacity>
                                </View>

                                {/* Bottom overlay: title + description */}
                                <View style={styles.bannerOverlay}>
                                    <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text>
                                    <Text style={styles.bannerDesc} numberOfLines={2}>{banner.description}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* BOTTOM SHEET */}
            <Modal
                visible={showModal}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={closeModal}
            >
                <View style={styles.sheetBackdrop}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={closeModal}
                        style={StyleSheet.absoluteFill}
                    >
                        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    </TouchableOpacity>
                    <LoadingOverlay visible={submitting} />
                    <View style={[styles.sheetCard, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.sheetHandleWrap}>
                            <View style={styles.sheetHandle} />
                        </View>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingBanner ? "Edit Banner" : "New Banner"}</Text>
                            <TouchableOpacity onPress={closeModal}>
                                <MaterialIcons name="close" size={22} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
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
                                                return showWarning("Permission needed", "Please allow photo library access.");
                                            }
                                            const result = await ImagePicker.launchImageLibraryAsync({
                                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                                quality: 0.8,
                                            });
                                            if (!result.canceled && result.assets && result.assets[0]) {
                                                const asset = result.assets[0];
                                                setPendingImageAsset(asset);
                                                setBannerPreviewUri(asset.uri);
                                                setBannerForm((f) => ({ ...f, image_url: "" }));
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

                            {bannerPreviewUri || (bannerForm.image_url && useUpload) ? (
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
                                title={editingBanner ? "Update Banner" : "Save Banner"}
                                onPress={handleSubmit}
                                loading={submitting}
                            />
                        </ScrollView>
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
        height: 200,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        marginBottom: 16,
        backgroundColor: COLORS.surface,
    },
    bannerImage: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    bannerOverlay: {
        position: "absolute",
        left: 0,
        right: 54,
        bottom: 0,
        padding: 14,
    },
    bannerTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "900",
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    bannerDesc: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 12,
        lineHeight: 16,
    },
    topLeftRow: {
        position: "absolute",
        top: 10,
        left: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    topRightCol: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 54,
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 14,
        paddingBottom: 14,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    rightGroup: {
        alignItems: "center",
        gap: 6,
    },
    orderPill: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    orderPillText: {
        color: "white",
        fontSize: 11,
        fontWeight: "900",
        letterSpacing: 0.2,
    },
    inactivePill: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    inactivePillText: {
        color: COLORS.error,
        fontSize: 9,
        fontWeight: "900",
        letterSpacing: 0.6,
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.42)",
        alignItems: "center",
        justifyContent: "center",
    },
    switchHolder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(0,0,0,0.42)",
        alignItems: "center",
        justifyContent: "center",
    },
    imageWrap: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheetCard: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 8,
        maxHeight: "88%",
        minHeight: "60%",
    },
    sheetHandleWrap: {
        alignItems: "center",
        paddingVertical: 8,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: `${COLORS.textMuted}66`,
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
    bgGlowTop: {
        position: "absolute",
        top: "-10%",
        right: "-20%",
        width: 300,
        height: 300,
        backgroundColor: "rgba(244,123,37,0.15)",
        borderRadius: 150,
        opacity: 0.5,
    },
    bgGlowBottom: {
        position: "absolute",
        bottom: "-10%",
        left: "-20%",
        width: 300,
        height: 300,
        backgroundColor: "rgba(37,99,235,0.1)",
        borderRadius: 150,
        opacity: 0.5,
    },
    bannerWrap: {
        marginHorizontal: -16,
        marginBottom: 8,
    },
    sectionSpacing: {
        marginTop: 8,
    },
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        height: 40,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textLight,
        fontSize: 14,
        paddingVertical: 0,
    },
    searchClear: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
    },
});
