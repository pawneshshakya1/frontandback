import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Switch,
    Dimensions,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { partnerAPI } from "../../services/api";
import { COLORS, SPACING, RADIUS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

// Tier color mapping
const TIER_COLORS: Record<string, string> = {
    standard: "#94a3b8",
    sponsored: "#3b82f6",
    premium: "#fbbf24",
};

export const CreateEventScreenPartner = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [eventType, setEventType] = useState<"STANDARD" | "SPONSORED" | "PREMIUM">("STANDARD");
    const [loading, setLoading] = useState(false);
    const [tierLoading, setTierLoading] = useState(true);
    const [tierInfo, setTierInfo] = useState<any>(null);

    // Popup state
    const [popup, setPopup] = useState({ visible: false, type: "info" as "success" | "error" | "warning" | "info" | "confirm", title: "", message: "" });
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

    const showPopup = (type: "success" | "error" | "warning" | "info" | "confirm", title: string, message?: string, onConfirm?: () => void) => {
        setPopup({ visible: true, type, title, message: message || "" });
        setConfirmAction(() => onConfirm || null);
    };

    const hidePopup = () => {
        setPopup({ ...popup, visible: false });
        setConfirmAction(null);
    };

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        game_type: "CS",
        map: "BERMUDA",
        mode: "SQUAD",
        match_date: "",
        match_time: "",
        max_players: "48",
        room_id: "",
        room_password: "",
        entry_fee: "",
        prize_pool: "",
        mediator_email: "",
        additional_rules: "",
        // Sponsor Details
        sponsor_name: "",
        sponsor_logo: "",
        sponsor_website: "",
        sponsor_description: "",
    });

    useEffect(() => {
        loadTierInfo();
    }, []);

    const loadTierInfo = async () => {
        try {
            const response = await partnerAPI.getTierInfo();
            if (response.data.success) {
                setTierInfo(response.data.data);
            }
        } catch (err) {
            console.error("Error loading tier info:", err);
        } finally {
            setTierLoading(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    // ============ TIER-BASED VALIDATIONS ============

    const canCreateEventType = (type: string): boolean => {
        if (!tierInfo) return true;
        switch (type) {
            case "STANDARD": return true;
            case "SPONSORED": return tierInfo?.benefits?.can_create_sponsored ?? false;
            case "PREMIUM": return tierInfo?.benefits?.can_create_premium ?? false;
            default: return true;
        }
    };

    const getEntryFeeLimit = (): number => {
        return tierInfo?.benefits?.max_entry_fee || 100;
    };

    const getPrizePoolLimit = (): number => {
        return tierInfo?.benefits?.max_prize_pool || 5000;
    };

    const getMaxPlayersLimit = (): number => {
        return tierInfo?.benefits?.max_players_per_event || 50;
    };

    const validateForm = () => {
        if (!formData.title || !formData.match_date || !formData.match_time || !formData.room_id) {
            showPopup("error", "Missing Fields", "Please fill in all required fields (Title, Date, Time, Room ID)");
            return false;
        }

        // Check tier permissions for event type
        if (!canCreateEventType(eventType)) {
            const requiredTier = eventType === "SPONSORED" ? "Sponsored" : "Premium";
            showPopup(
                "warning",
                "Tier Restriction",
                `${requiredTier} tier is required to create ${eventType} events. Your current tier: ${tierInfo?.tier_label || "Standard Partner"}`,
                () => navigation.navigate("PartnerTier")
            );
            return false;
        }

        // Check entry fee limit
        const entryFee = parseFloat(formData.entry_fee) || 0;
        if (entryFee > getEntryFeeLimit()) {
            showPopup(
                "warning",
                "Entry Fee Limit",
                `Entry fee ₹${entryFee} exceeds your tier limit of ₹${getEntryFeeLimit()}. Upgrade your tier for higher limits.`,
                () => navigation.navigate("PartnerTier")
            );
            return false;
        }

        // Check prize pool limit
        const prizePool = parseFloat(formData.prize_pool) || 0;
        if (prizePool > getPrizePoolLimit()) {
            showPopup(
                "warning",
                "Prize Pool Limit",
                `Prize pool ₹${prizePool} exceeds your tier limit of ₹${getPrizePoolLimit()}. Upgrade your tier for higher limits.`,
                () => navigation.navigate("PartnerTier")
            );
            return false;
        }

        // Check max players limit
        const maxPlayers = parseInt(formData.max_players) || 48;
        if (maxPlayers > getMaxPlayersLimit()) {
            showPopup(
                "warning",
                "Player Limit",
                `Max players ${maxPlayers} exceeds your tier limit of ${getMaxPlayersLimit()}. Upgrade your tier for more players.`,
                () => navigation.navigate("PartnerTier")
            );
            return false;
        }

        // Sponsored event validation
        if (eventType === "SPONSORED" && !formData.sponsor_name) {
            showPopup("error", "Sponsor Required", "Sponsor Name is required for Sponsored Events");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const payload: any = {
                title: formData.title,
                game_type: formData.game_type,
                mode: formData.mode,
                max_players: parseInt(formData.max_players) || 48,
                map: formData.map,
                entry_fee: parseFloat(formData.entry_fee) || 0,
                prize_pool: parseFloat(formData.prize_pool) || 0,
                match_date: formData.match_date,
                match_time: formData.match_time,
                room_id: formData.room_id || null,
                room_password: formData.room_password || null,
                event_type: "ONLINE",
                status: formData.room_id ? "OPEN" : "DRAFT",
                event_category: eventType.toLowerCase(),
                mediator_email: formData.mediator_email || null,
                additional_rules: formData.additional_rules || null,
            };

            if (eventType === "SPONSORED") {
                payload.sponsor_details = {
                    sponsor_name: formData.sponsor_name,
                    sponsor_logo: formData.sponsor_logo,
                    sponsor_website: formData.sponsor_website,
                    sponsor_description: formData.sponsor_description,
                };
            }

            const response = await partnerAPI.createEvent(payload);

            if (response.data.success) {
                showPopup("success", "Event Created!", "Event Created Successfully!");
                setTimeout(() => navigation.goBack(), 1500);
            } else {
                showPopup("error", "Creation Failed", response.data.message || "Failed to create event");
            }
        } catch (error: any) {
            console.error(error);
            showPopup("error", "Error", error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    // ============ RENDER ============

    const currentTierColor = TIER_COLORS[tierInfo?.current_tier || "standard"] || TIER_COLORS.standard;

    const eventTypes = [
        {
            key: "STANDARD" as const,
            label: "Standard",
            icon: "event",
            description: "Basic tournament",
            allowed: true,
        },
        {
            key: "SPONSORED" as const,
            label: "Sponsored",
            icon: "campaign",
            description: "With sponsors",
            allowed: tierInfo?.benefits?.can_create_sponsored ?? false,
        },
        {
            key: "PREMIUM" as const,
            label: "Premium",
            icon: "workspace-premium",
            description: "Premium tournament",
            allowed: tierInfo?.benefits?.can_create_premium ?? false,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { marginTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Event</Text>
                <TouchableOpacity onPress={() => navigation.navigate("PartnerTier")}>
                    <LinearGradient colors={[currentTierColor + "40", currentTierColor + "20"]} style={styles.tierBadge}>
                        <MaterialIcons name={tierInfo?.current_tier === "premium" ? "workspace-premium" : tierInfo?.current_tier === "sponsored" ? "campaign" : "shield"} size={12} color={currentTierColor} />
                        <Text style={[styles.tierBadgeText, { color: currentTierColor }]}>
                            {tierInfo?.tier_label?.replace(" Partner", "") || "STD"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Tier Limit Info Bar */}
                {!tierLoading && tierInfo && (
                    <View style={[styles.tierInfoBar, { borderColor: currentTierColor + "30" }]}>
                        <MaterialIcons name="info-outline" size={14} color={currentTierColor} />
                        <Text style={styles.tierInfoText}>
                            Events: {tierInfo.stats?.remaining_events === -1 ? "Unlimited" : `${tierInfo.stats?.remaining_events || 0} left`} |
                            Entry: ₹{getEntryFeeLimit()} |
                            Prize: ₹{getPrizePoolLimit().toLocaleString()} |
                            Players: {getMaxPlayersLimit()}
                        </Text>
                    </View>
                )}

                {/* Type Selector - Enhanced with Tier Restrictions */}
                <Text style={styles.sectionTitle}>EVENT TYPE</Text>
                <View style={styles.typeSelector}>
                    {eventTypes.map((type) => {
                        const isDisabled = !type.allowed;
                        return (
                            <TouchableOpacity
                                key={type.key}
                                style={[
                                    styles.typeButton,
                                    eventType === type.key && styles.typeButtonActive,
                                    isDisabled && styles.typeButtonDisabled,
                                ]}
                                onPress={() => {
                                    if (isDisabled) {
                                        const requiredTier = type.key === "SPONSORED" ? "Sponsored" : "Premium";
                                        showPopup(
                                            "warning",
                                            `${requiredTier} Tier Required`,
                                            `You need ${requiredTier} tier to create ${type.label} events. Upgrade your tier to unlock this feature.`,
                                            () => navigation.navigate("PartnerTier")
                                        );
                                        return;
                                    }
                                    setEventType(type.key);
                                }}
                            >
                                <MaterialIcons
                                    name={type.icon as any}
                                    size={16}
                                    color={eventType === type.key ? "white" : isDisabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)"}
                                />
                                <Text
                                    style={[
                                        styles.typeText,
                                        eventType === type.key && styles.typeTextActive,
                                        isDisabled && styles.typeTextDisabled,
                                    ]}
                                >
                                    {type.label}
                                </Text>
                                {!type.allowed && (
                                    <MaterialIcons name="lock" size={10} color="rgba(255,255,255,0.3)" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.sectionTitle}>BASIC DETAILS</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>EVENT TITLE *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Elite Pro Squads"
                        placeholderTextColor={COLORS.textMuted}
                        value={formData.title}
                        onChangeText={(t) => handleChange("title", t)}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>GAME TYPE</Text>
                        <View style={styles.pickerRow}>
                            {["CS", "BR"].map((gt) => (
                                <TouchableOpacity
                                    key={gt}
                                    style={[styles.pickerButton, formData.game_type === gt && styles.pickerButtonActive]}
                                    onPress={() => handleChange("game_type", gt)}
                                >
                                    <Text style={[styles.pickerText, formData.game_type === gt && styles.pickerTextActive]}>{gt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>MAP</Text>
                        <View style={styles.pickerRow}>
                            {["BERMUDA", "KALAHARI", "PARGO"].map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.pickerButton, formData.map === m && styles.pickerButtonActive]}
                                    onPress={() => handleChange("map", m)}
                                >
                                    <Text style={[styles.pickerText, formData.map === m && styles.pickerTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>MODE</Text>
                        <View style={styles.pickerRow}>
                            {["SOLO", "DUO", "SQUAD"].map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.pickerButton, formData.mode === m && styles.pickerButtonActive]}
                                    onPress={() => handleChange("mode", m)}
                                >
                                    <Text style={[styles.pickerText, formData.mode === m && styles.pickerTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>MAX PLAYERS (Max: {getMaxPlayersLimit()})</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={formData.max_players}
                            onChangeText={(t) => handleChange("max_players", t)}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>DATE (YYYY-MM-DD) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-05-20"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.match_date}
                            onChangeText={(t) => handleChange("match_date", t)}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>TIME *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="18:00"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.match_time}
                            onChangeText={(t) => handleChange("match_time", t)}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ROOM ID *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter unique Room ID"
                        placeholderTextColor={COLORS.textMuted}
                        value={formData.room_id}
                        onChangeText={(t) => handleChange("room_id", t)}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ROOM PASSWORD</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter room password"
                        placeholderTextColor={COLORS.textMuted}
                        value={formData.room_password}
                        onChangeText={(t) => handleChange("room_password", t)}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>ENTRY FEE (₹) Max: ₹{getEntryFeeLimit()}</Text>
                        <TextInput
                            style={[styles.input, parseFloat(formData.entry_fee) > getEntryFeeLimit() && styles.inputError]}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.entry_fee}
                            onChangeText={(t) => handleChange("entry_fee", t)}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>PRIZE POOL (₹) Max: ₹{getPrizePoolLimit().toLocaleString()}</Text>
                        <TextInput
                            style={[styles.input, parseFloat(formData.prize_pool) > getPrizePoolLimit() && styles.inputError]}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={COLORS.textMuted}
                            value={formData.prize_pool}
                            onChangeText={(t) => handleChange("prize_pool", t)}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>MEDIATOR EMAIL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="mediator@example.com"
                        placeholderTextColor={COLORS.textMuted}
                        value={formData.mediator_email}
                        onChangeText={(t) => handleChange("mediator_email", t)}
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ADDITIONAL RULES</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 10 }]}
                        placeholder="Any additional rules or instructions..."
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                        value={formData.additional_rules}
                        onChangeText={(t) => handleChange("additional_rules", t)}
                    />
                </View>

                {/* ============ SPONSORED EVENT SECTION ============ */}
                {eventType === "SPONSORED" && (
                    <>
                        <View style={styles.sponsoredHeader}>
                            <MaterialIcons name="campaign" size={20} color={COLORS.info} />
                            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>SPONSOR DETAILS</Text>
                        </View>
                        <View style={styles.sponsorCard}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>SPONSOR NAME *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter sponsor name"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={formData.sponsor_name}
                                    onChangeText={(t) => handleChange("sponsor_name", t)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>LOGO URL</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://example.com/logo.png"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={formData.sponsor_logo}
                                    onChangeText={(t) => handleChange("sponsor_logo", t)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>WEBSITE URL</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://example.com"
                                    placeholderTextColor={COLORS.textMuted}
                                    value={formData.sponsor_website}
                                    onChangeText={(t) => handleChange("sponsor_website", t)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DESCRIPTION</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 10 }]}
                                    placeholder="Describe the sponsorship..."
                                    placeholderTextColor={COLORS.textMuted}
                                    multiline
                                    value={formData.sponsor_description}
                                    onChangeText={(t) => handleChange("sponsor_description", t)}
                                />
                            </View>
                        </View>
                    </>
                )}

                {/* Commission Info */}
                {tierInfo && (
                    <View style={styles.commissionInfo}>
                        <MaterialIcons name="percent" size={16} color={COLORS.warning} />
                        <Text style={styles.commissionInfoText}>
                            {tierInfo.stats?.commission_rate || 1}% admin Platform Fee will be deducted from total entry fees when event completes.
                        </Text>
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitButton, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <MaterialIcons name="rocket-launch" size={18} color="white" />
                            <Text style={styles.submitText}>PUBLISH EVENT</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>

            {/* Custom Popup */}
            <PopupModal
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={hidePopup}
                onConfirm={confirmAction || undefined}
                confirmText="OK"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)" },
    headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
    tierBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
    tierBadgeText: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
    scrollContent: { paddingHorizontal: 16, paddingVertical: SPACING.xl, paddingBottom: 100 },

    // Tier Info Bar
    tierInfoBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: RADIUS.sm, marginBottom: 20, borderWidth: 1 },
    tierInfoText: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },

    // Type Selector
    sectionTitle: { fontSize: 12, fontWeight: "bold", color: COLORS.primary, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" },
    typeSelector: { flexDirection: "row", backgroundColor: COLORS.surface, padding: SPACING.xs, borderRadius: RADIUS.md, marginBottom: SPACING.xxl, borderWidth: 1, borderColor: COLORS.border },
    typeButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8, flexDirection: "row", justifyContent: "center", gap: 4 },
    typeButtonActive: { backgroundColor: COLORS.primary },
    typeButtonDisabled: { opacity: 0.5 },
    typeText: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.5)" },
    typeTextActive: { color: "white" },
    typeTextDisabled: { color: "rgba(255,255,255,0.2)" },

    // Form
    inputGroup: { marginBottom: 16, gap: 8 },
    row: { flexDirection: "row", gap: 16 },
    label: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.4)", letterSpacing: 1 },
    input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, height: 48, color: "white", fontSize: 14 },
    inputError: { borderColor: COLORS.error },

    // Picker Buttons
    pickerRow: { flexDirection: "row", gap: 6 },
    pickerButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    pickerButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    pickerText: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.4)" },
    pickerTextActive: { color: "white" },

    // Sponsor
    sponsoredHeader: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 12 },
    sponsorCard: { backgroundColor: COLORS.infoBg, padding: SPACING.lg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: `${COLORS.info}40`, marginBottom: 16 },

    // Commission Info
    commissionInfo: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "rgba(234,179,8,0.08)", borderRadius: RADIUS.sm, marginBottom: 16, borderWidth: 1, borderColor: "rgba(234,179,8,0.2)" },
    commissionInfoText: { flex: 1, fontSize: 11, color: COLORS.warning, lineHeight: 16 },

    // Submit
    submitButton: { backgroundColor: COLORS.primary, borderRadius: 16, height: 56, alignItems: "center", justifyContent: "center", marginTop: 8, flexDirection: "row", gap: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    submitText: { fontSize: 14, fontWeight: "bold", color: "white", letterSpacing: 1 },
});
