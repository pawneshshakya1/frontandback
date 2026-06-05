import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api, { matchAPI } from '../../services/api';

export const UploadScreenshotScreen = ({ navigation, route }: any) => {
    const insets = useSafeAreaInsets();
    const initialMatch = route?.params?.match;
    const [matches, setMatches] = useState<any[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<any>(initialMatch || null);
    const [image, setImage] = useState<string | null>(null);
    const [kills, setKills] = useState('');
    const [damage, setDamage] = useState('');
    const [placement, setPlacement] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(!initialMatch);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [mode, setMode] = useState<'participant' | 'host'>(initialMatch ? 'participant' : 'host');

    const COLORS = {
        primary: "#f47b25",
        bgDark: "#0d0d0d",
        cardDark: "#1a1a1a",
    };

    useEffect(() => {
        if (!initialMatch) {
            fetchPendingMatches();
        } else {
            // Start countdown if deadline set
            if (initialMatch.ss_upload_expires_at) {
                startCountdown(new Date(initialMatch.ss_upload_expires_at));
            } else {
                // Default 2-min countdown from now
                startCountdown(new Date(Date.now() + 2 * 60 * 1000));
            }
        }
    }, []);

    const startCountdown = (deadline: Date) => {
        const updateTimer = () => {
            const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                Alert.alert("Time's Up!", "The 2-minute upload window has closed. You can no longer submit results.");
                setTimeout(() => navigation.goBack(), 1500);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    };

    const fetchPendingMatches = async () => {
        try {
            const res = await api.get('/matches/my-matches');
            // Filter to matches that are ONGOING or in REVIEW (not yet finalized)
            const joined = (res.data.data || []).filter((m: any) =>
                m.status === 'ONGOING' || m.status === 'OPEN' || m.status === 'REVIEW'
            );
            setMatches(joined);
        } catch (err) {
            console.log('Error fetching matches:', err);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!selectedMatch) return Alert.alert("Required", "Please select a match.");
        if (!image) return Alert.alert("Required", "Please upload a screenshot.");
        if (!kills) return Alert.alert("Required", "Please enter your kill count.");

        try {
            setSubmitting(true);
            // Real image URI is sent to the backend (it can be uploaded to S3/storage later)
            const screenshotUrl = image;

            await matchAPI.submitParticipantResult(selectedMatch._id, {
                kills: parseInt(kills) || 0,
                damage: parseInt(damage) || 0,
                placement: parseInt(placement) || 0,
                screenshot_urls: [screenshotUrl],
            });

            Alert.alert("Submitted!", "Your result has been submitted. The mediator will review and declare the winner.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.response?.data?.message || "Failed to submit result.");
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isUrgent = timeLeft !== null && timeLeft < 30;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Decorative Glows */}
            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />

            {/* Top Status Bar Blur */}
            <BlurView
                intensity={250}
                tint="dark"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: insets.top,
                    zIndex: 100,
                }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Header */}
                    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <MaterialIcons name="chevron-left" size={28} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Submit Result</Text>
                    </View>

                    <View style={styles.content}>
                        {/* 2-min countdown timer banner */}
                        {timeLeft !== null && (
                            <View style={[
                                styles.timerBanner,
                                isUrgent && styles.timerBannerUrgent
                            ]}>
                                <MaterialIcons
                                    name={isUrgent ? "timer-off" : "timer"}
                                    size={20}
                                    color={isUrgent ? "#ef4444" : COLORS.primary}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.timerLabel}>
                                        {isUrgent ? "⚠️ HURRY! UPLOAD WINDOW CLOSING" : "UPLOAD WINDOW"}
                                    </Text>
                                    <Text style={[
                                        styles.timerValue,
                                        isUrgent && { color: "#ef4444" }
                                    ]}>
                                        {formatTime(timeLeft)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {selectedMatch && (
                            <View style={styles.matchInfoCard}>
                                <MaterialIcons name="sports-esports" size={18} color={COLORS.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.matchInfoTitle}>{selectedMatch.title}</Text>
                                    <Text style={styles.matchInfoMeta}>
                                        {selectedMatch.match_date} • {selectedMatch.match_time || 'TBA'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {!initialMatch && (
                            <>
                                <Text style={styles.sectionTitle}>SELECT MATCH</Text>
                                {loading ? (
                                    <ActivityIndicator color={COLORS.primary} />
                                ) : matches.length > 0 ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matchSelector}>
                                        {matches.map(m => (
                                            <TouchableOpacity
                                                key={m._id}
                                                style={[styles.matchOption, selectedMatch?._id === m._id && styles.activeMatchOption]}
                                                onPress={() => {
                                                    setSelectedMatch(m);
                                                    if (m.ss_upload_expires_at) {
                                                        startCountdown(new Date(m.ss_upload_expires_at));
                                                    } else {
                                                        startCountdown(new Date(Date.now() + 2 * 60 * 1000));
                                                    }
                                                }}
                                            >
                                                <Text style={[styles.matchOptionTitle, selectedMatch?._id === m._id && { color: 'white' }]}>{m.title}</Text>
                                                <Text style={styles.matchOptionDate}>{m.match_date}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <Text style={styles.emptyText}>No active matches to submit results for.</Text>
                                )}
                            </>
                        )}

                        {selectedMatch && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>YOUR STATS</Text>
                                <View style={styles.formRow}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>KILLS</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            value={kills}
                                            onChangeText={setKills}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>DAMAGE</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            value={damage}
                                            onChangeText={setDamage}
                                        />
                                    </View>
                                </View>

                                {selectedMatch.game_type === 'BR' && (
                                    <View style={[styles.inputGroup, { marginTop: 12 }]}>
                                        <Text style={styles.label}>PLACEMENT (BR)</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            placeholder="1 (winner) - 52"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            value={placement}
                                            onChangeText={setPlacement}
                                        />
                                    </View>
                                )}

                                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>SCREENSHOT</Text>
                                <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                                    {image ? (
                                        <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
                                    ) : (
                                        <>
                                            <View style={styles.uploadIcon}>
                                                <MaterialIcons name="cloud-upload" size={32} color={COLORS.primary} />
                                            </View>
                                            <Text style={styles.uploadText}>Tap to select screenshot</Text>
                                            <Text style={styles.uploadHint}>Make sure stats are visible</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                {image && (
                                    <TouchableOpacity onPress={() => setImage(null)} style={styles.removeBtn}>
                                        <Text style={styles.removeText}>Remove Image</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>

                {/* Submit Footer */}
                <BlurView intensity={20} tint="dark" style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                    <TouchableOpacity
                        style={[styles.submitBtn, (!selectedMatch || !image || (timeLeft !== null && timeLeft <= 0)) && styles.disabledBtn]}
                        onPress={handleSubmit}
                        disabled={!selectedMatch || !image || submitting || (timeLeft !== null && timeLeft <= 0)}
                    >
                        <LinearGradient
                            colors={(!selectedMatch || !image) ? ['#333', '#333'] : [COLORS.primary, '#ff9a52']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradientBtn}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitBtnText}>
                                    {timeLeft !== null && timeLeft <= 0 ? "TIME EXPIRED" : "SUBMIT RESULT"}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </BlurView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0d0d0d",
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "white",
    },
    content: {
        padding: 24,
    },
    sectionTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 1,
    },
    matchSelector: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    matchOption: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: 140,
    },
    activeMatchOption: {
        borderColor: '#f47b25',
        backgroundColor: '#2a1a10',
    },
    matchOptionTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    matchOptionDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
    },
    emptyText: {
        color: '#666',
        fontStyle: 'italic',
    },
    formRow: {
        flexDirection: 'row',
        gap: 16,
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: "bold",
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    uploadBox: {
        height: 200,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    uploadIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(244,123,37,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploadText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    uploadHint: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 4,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeBtn: {
        alignSelf: 'center',
        marginTop: 12,
        padding: 8,
    },
    removeText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    submitBtn: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    disabledBtn: {
        opacity: 0.5,
    },
    gradientBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },

    // Timer Banner
    timerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(244,123,37,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(244,123,37,0.2)',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    timerBannerUrgent: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderColor: 'rgba(239,68,68,0.4)',
    },
    timerLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    timerValue: {
        color: '#f47b25',
        fontSize: 22,
        fontWeight: '900',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    // Match Info Card
    matchInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1a1a1a',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    matchInfoTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    matchInfoMeta: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        marginTop: 2,
    },
});
