import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Switch,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/Button';

export const CreateEventScreenAdmin = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [eventType, setEventType] = useState<"STANDARD" | "SPONSORED" | "PREMIUM">("STANDARD");
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        game_type: "CS", // Default
        map: "BERMUDA", // Default
        mode: "SQUAD", // Default
        match_date: "",
        match_time: "",
        max_players: "48",
        room_id: "",
        entry_fee: "",
        prize_pool: "",
        mediator_email: "",
        // Sponsor Details
        sponsor_name: "",
        sponsor_logo: "",
        sponsor_website: "",
        sponsor_description: "",
    });

    const handleChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const validateForm = () => {
        if (!formData.title || !formData.match_date || !formData.match_time) {
            Alert.alert("Error", "Please fill in all required fields (Title, Date, Time)");
            return false;
        }
        if (eventType === "SPONSORED" && !formData.sponsor_name) {
            Alert.alert("Error", "Sponsor Name is required for Sponsored Events");
            return false;
        }
        return true;
    };

    const handleSubmit = async (publish: boolean = false) => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const payload: any = {
                ...formData,
                entry_fee: parseFloat(formData.entry_fee) || 0,
                prize_pool: parseFloat(formData.prize_pool) || 0,
                max_players: parseInt(formData.max_players) || 48,
                isPublished: publish,
            };

            let response;
            if (eventType === "SPONSORED") {
                payload.sponsor_details = {
                    sponsor_name: formData.sponsor_name,
                    sponsor_logo: formData.sponsor_logo,
                    sponsor_website: formData.sponsor_website,
                    sponsor_description: formData.sponsor_description,
                };
                response = await adminAPI.createSponsoredEvent(payload);
            } else if (eventType === "PREMIUM") {
                response = await adminAPI.createPremiumEvent(payload);
            } else {
                response = await adminAPI.createStandardEvent(payload);
            }

            console.log("Submitting to:", eventType, payload);
            if (response.data.success) {
                const msg = publish
                    ? "Event created and published! Notifications sent to all users."
                    : "Event saved as DRAFT. You can edit and publish later.";
                Alert.alert("Success", msg, [
                    { text: "OK", onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert("Error", response.data.message || "Failed to create event");
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { marginTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Event</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Type Selector */}
                <View style={styles.typeSelector}>
                    {(["STANDARD", "SPONSORED", "PREMIUM"] as const).map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[styles.typeButton, eventType === type && styles.typeButtonActive]}
                            onPress={() => setEventType(type)}
                        >
                            <Text style={[styles.typeText, eventType === type && styles.typeTextActive]}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>BASIC DETAILS</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>EVENT TITLE</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Elite Pro Squads"
                        placeholderTextColor={`${COLORS.textMuted}4D`}
                        value={formData.title}
                        onChangeText={(t) => handleChange("title", t)}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>GAME TYPE</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.game_type}
                            onChangeText={(t) => handleChange("game_type", t)}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>MAP</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.map}
                            onChangeText={(t) => handleChange("map", t)}
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>MODE</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.mode}
                            onChangeText={(t) => handleChange("mode", t)}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>MAX PLAYERS</Text>
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
                        <Text style={styles.label}>DATE (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-05-20"
                            placeholderTextColor={`${COLORS.textMuted}4D`}
                            value={formData.match_date}
                            onChangeText={(t) => handleChange("match_date", t)}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>TIME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="18:00"
                            placeholderTextColor={`${COLORS.textMuted}4D`}
                            value={formData.match_time}
                            onChangeText={(t) => handleChange("match_time", t)}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ROOM ID <Text style={{ color: `${COLORS.textMuted}4D` }}>(optional — add later)</Text></Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Auto-generated or Enter ID"
                        placeholderTextColor={`${COLORS.textMuted}4D`}
                        value={formData.room_id}
                        onChangeText={(t) => handleChange("room_id", t)}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>ENTRY FEE (₹)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={formData.entry_fee}
                            onChangeText={(t) => handleChange("entry_fee", t)}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>PRIZE POOL (₹)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={formData.prize_pool}
                            onChangeText={(t) => handleChange("prize_pool", t)}
                        />
                    </View>
                </View>

                {eventType === "SPONSORED" && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>SPONSOR DETAILS</Text>
                        <View style={styles.sponsorCard}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>SPONSOR NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.sponsor_name}
                                    onChangeText={(t) => handleChange("sponsor_name", t)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>LOGO URL</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.sponsor_logo}
                                    onChangeText={(t) => handleChange("sponsor_logo", t)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>WEBSITE URL</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.sponsor_website}
                                    onChangeText={(t) => handleChange("sponsor_website", t)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DESCRIPTION</Text>
                                <TextInput
                                    style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                                    multiline
                                    value={formData.sponsor_description}
                                    onChangeText={(t) => handleChange("sponsor_description", t)}
                                />
                            </View>
                        </View>
                    </>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <Button
                        title={loading ? "SAVING..." : "SAVE AS DRAFT"}
                        onPress={() => handleSubmit(false)}
                        loading={loading}
                        disabled={loading}
                        variant="secondary"
                        style={styles.draftButton}
                    />
                    <Button
                        title={loading ? "PUBLISHING..." : "SAVE & PUBLISH"}
                        onPress={() => handleSubmit(true)}
                        loading={loading}
                        disabled={loading}
                        fullWidth={false}
                        style={styles.publishButton}
                    />
                </View>

                <Text style={styles.draftHint}>
                    💡 <Text style={{ color: COLORS.textLight }}>Draft</Text> = Save for later editing. <Text style={{ color: COLORS.primary }}>Publish</Text> = Event goes live, all users notified.
                </Text>

            </ScrollView>
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: `${COLORS.textMuted}0D`
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.textLight,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        padding: 4,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeButtonActive: {
        backgroundColor: COLORS.primary,
    },
    typeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    typeTextActive: {
        color: COLORS.textLight,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    inputGroup: {
        marginBottom: 16,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        color: COLORS.textLight,
        fontSize: 14,
    },
    sponsorCard: {
        backgroundColor: `${COLORS.primary}0D`,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${COLORS.primary}33`,
    },
    submitButton: {
        marginTop: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    draftButton: {
        flex: 1,
    },
    publishButton: {
        flex: 2,
    },
    draftHint: {
        fontSize: 11,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 16,
    },
});
