import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../services/api";

const { width } = Dimensions.get("window");

export const UserProfileScreen = ({ route, navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { userId } = route.params;
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const COLORS = {
        primary: "#f47b25",
        bgDark: "#0d0d0d",
        cardDark: "#1a1a1a",
        accentBlue: "#2563eb",
    };

    useEffect(() => {
        fetchUserProfile();
    }, [userId]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/users/profile/${userId}`);
            setUser(res.data?.data?.user || res.data?.user);
        } catch (err) {
            console.log("Failed to fetch user profile", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!user) {
        return ( // Fallback if user not found
            <View style={[styles.container, styles.center]}>
                <Text style={{ color: 'white' }}>User not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: COLORS.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                translucent
                backgroundColor="transparent"
            />

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

            {/* Back Button */}
            <TouchableOpacity
                style={[styles.backButton, { top: insets.top + 16 }]}
                onPress={() => navigation.goBack()}
            >
                <MaterialIcons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 140 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Header */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{
                            uri: user.background_image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAh5AJVtKymLINB1Rn9KLf0PTMYIkgB3Q5LIzoxYUINBFDPzQKls6ZwkJRVwtMGgSP-izheoxRyYg5y3VnHsRTCrzjABw8IpQlH49m6qQcQgNjaXyQ75nJRP5zicKoCr3_OTd7cXc8wtgyKTK5_WBGmfX56S4sVxbxTwlYRcated-55EhAJOC1lWr1Z3_zIVl8ejuZV5mXk3_pqyBGlU1nma9h1VH3TqElVc3gciyzvzZVe4V02RIOi7r8loAkIU2n5sFgMU7LZ-pI",
                        }}
                        style={styles.heroImage}
                    />
                    <LinearGradient
                        colors={[
                            "rgba(13,13,13,0)",
                            "rgba(13,13,13,0.8)",
                            "rgba(13,13,13,1)",
                        ]}
                        style={styles.heroGradient}
                    />

                    {/* User Profile Section */}
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarBorder}>
                                <Image
                                    source={{
                                        uri: user.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuD8SramNZdVi1A8A-J6l2KUxr-hdqaZXJsnAO0_xZjG3BDsC1UQPKiyudff4EEVYR78z4r-WcYTwSWIeDLuOSAVkg_K0mCdOGZZ4N8ot5c04pGmA50sirkGZoW5d3t1ZP536e3ro0c1U0Ooh7LO40NYk2-vUI7Bd2qNVCVykUhwMsQddSGeSwf0XbPrDsuynVt-jEciI8dOHpTgK4QX-aYM9avIdfBTRbYWYBI7CQcp0nwreHu-wZfJK2z5lGUp9DrkpXqlBDqnm4k",
                                    }}
                                    style={styles.avatar}
                                />
                            </View>
                            <View style={styles.levelBadge}>
                                {/* Random level or from user data if exists */}
                                <Text style={styles.levelText}>LVL {Math.floor(Math.random() * 50) + 1}</Text>
                            </View>
                        </View>

                        <Text style={styles.username}>
                            {user.username}
                        </Text>

                        <View style={styles.badgesRow}>
                            {user.role === 'ADMIN' || user.role === 'MEDIATOR' ? (
                                <View style={styles.badge}>
                                    <MaterialIcons name="admin-panel-settings" size={14} color="#ef4444" />
                                    <Text style={styles.badgeText}>{user.role}</Text>
                                </View>
                            ) : null}
                            {user.is_verified && (
                                <View style={styles.badge}>
                                    <MaterialIcons name="verified" size={14} color={COLORS.accentBlue} />
                                    <Text style={styles.badgeText}>Verified</Text>
                                </View>
                            )}
                            <View style={styles.badge}>
                                <MaterialIcons name="military-tech" size={14} color="#fbbf24" />
                                <Text style={styles.badgeText}>Diamond Tier</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <MaterialIcons
                            name="emoji-events"
                            size={24}
                            color={COLORS.primary}
                        />
                        <Text style={styles.statValue}>{Math.floor(Math.random() * 200)}</Text>
                        <Text style={styles.statLabel}>TOTAL WINS</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialIcons name="star" size={24} color={COLORS.accentBlue} />
                        <Text style={styles.statValue}>{Math.floor(Math.random() * 500)}</Text>
                        <Text style={styles.statLabel}>TOP 10</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialIcons name="whatshot" size={24} color="#ef4444" />
                        <Text style={styles.statValue}>{(Math.random() * 5).toFixed(1)}k</Text>
                        <Text style={styles.statLabel}>TOTAL KILLS</Text>
                    </View>
                </View>

                {/* Bio Section if exists */}
                {user.bio ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>BIO</Text>
                        <View style={styles.bioCard}>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 20 }}>{user.bio}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Recent Achievements */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.achievementsScroll}
                    >
                        <View style={styles.achievementCard}>
                            <View
                                style={[
                                    styles.achievementIcon,
                                    { backgroundColor: "rgba(244,123,37,0.1)" },
                                ]}
                            >
                                <MaterialIcons
                                    name="local-fire-department"
                                    size={24}
                                    color={COLORS.primary}
                                />
                            </View>
                            <Text style={styles.achievementText}>Killstreak Master</Text>
                        </View>
                        <View style={styles.achievementCard}>
                            <View
                                style={[
                                    styles.achievementIcon,
                                    { backgroundColor: "rgba(37,99,235,0.1)" },
                                ]}
                            >
                                <MaterialIcons
                                    name="security"
                                    size={24}
                                    color={COLORS.accentBlue}
                                />
                            </View>
                            <Text style={styles.achievementText}>Survivor Pro</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Game Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>GAME INFO</Text>
                    <View style={styles.settingsCard}>
                        {user.game_uid_name ? (
                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <MaterialIcons name="sports-esports" size={20} color={COLORS.primary} />
                                    <Text style={styles.settingText}>IGN</Text>
                                </View>
                                <Text style={styles.settingValue}>{user.game_uid_name}</Text>
                            </View>
                        ) : null}
                        {user.game_uid_name && user.ff_max_uid && <View style={styles.divider} />}
                        {user.ff_max_uid ? (
                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <MaterialIcons name="tag" size={20} color={COLORS.primary} />
                                    <Text style={styles.settingText}>UID</Text>
                                </View>
                                <Text style={styles.settingValue}>{user.ff_max_uid}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0d0d0d",
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        zIndex: 101,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    heroContainer: {
        width: "100%",
        height: 380,
        position: "relative",
    },
    heroImage: {
        width: "100%",
        height: "100%",
    },
    heroGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "100%",
    },
    profileSection: {
        position: "absolute",
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 16,
    },
    avatarBorder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 4,
        borderColor: "#f47b25",
        padding: 4,
        backgroundColor: "#0d0d0d",
    },
    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 44,
    },
    levelBadge: {
        position: "absolute",
        bottom: -4,
        right: -4,
        backgroundColor: "#f47b25",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#0d0d0d",
    },
    levelText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    username: {
        fontSize: 24,
        fontWeight: "900",
        fontStyle: "italic",
        color: "white",
        letterSpacing: -1,
        textTransform: "uppercase",
    },
    badgesRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "rgba(255,255,255,0.8)",
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        marginTop: -8,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "900",
        fontStyle: "italic",
        color: "white",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: "bold",
        color: "rgba(255,255,255,0.4)",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        marginTop: 4,
        textAlign: "center",
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "rgba(255,255,255,0.6)",
        letterSpacing: 2,
        textTransform: "uppercase",
    },
    achievementsScroll: {
        gap: 12,
    },
    achievementCard: {
        width: 140,
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
        gap: 8,
    },
    achievementIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    achievementText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "white",
        textAlign: "center",
    },
    bioCard: {
        backgroundColor: "#1a1a1a",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        padding: 16,
    },
    settingsCard: {
        backgroundColor: "#1a1a1a",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        borderRadius: 16,
        overflow: "hidden",
    },
    settingItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    settingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    settingText: {
        fontSize: 14,
        fontWeight: "500",
        color: "white",
    },
    settingValue: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 'bold'
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.05)",
    },
});
