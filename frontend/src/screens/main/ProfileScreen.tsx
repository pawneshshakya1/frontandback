import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Share,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import { userAPI, walletAPI } from "../../services/api";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { InfoCard } from "../../components/InfoCard";
import { Button } from "../../components/Button";
import { RoleBadge } from "../../components/RoleBadge";

const { width } = Dimensions.get("window");

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD8SramNZdVi1A8A-J6l2KUxr-hdqaZXJsnAO0_xZjG3BDsC1UQPKiyudff4EEVYR78z4r-WcYTwSWIeDLuOSAVkg_K0mCdOGZZ4N8ot5c04pGmA50sirkGZoW5d3t1ZP536e3ro0c1U0Ooh7LO40NYk2-vUI7Bd2qNVCVykUhwMsQddSGeSwf0XbPrDsuynVt-jEciI8dOHpTgK4QX-aYM9avIdfBTRbYWYBI7CQcp0nwreHu-wZfJK2z5lGUp9DrkpXqlBDqnm4k";
const DEFAULT_COVER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAh5AJVtKymLINB1Rn9KLf0PTMYIkgB3Q5LIzoxYUINBFDPzQKls6ZwkJRVwtMGgSP-izheoxRyYg5y3VnHsRTCrzjABw8IpQlH49m6qQcQgNjaXyQ75nJRP5zicKoCr3_OTd7cXc8wtgyKTK5_WBGmfX56S4sVxbxTwlYRcated-55EhAJOC1lWr1Z3_zIVl8ejuZV5mXk3_pqyBGlU1nma9h1VH3TqElVc3gciyzvzZVe4V02RIOi7r8loAkIU2n5sFgMU7LZ-pI";

export const ProfileScreen = ({ navigation }: any) => {
  const { authData, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, walletRes] = await Promise.allSettled([
        userAPI.getStats(),
        walletAPI.getMyWallet(),
      ]);
      if (statsRes.status === "fulfilled")
        setUserStats(statsRes.value.data.data);
      if (walletRes.status === "fulfilled")
        setWalletData(walletRes.value.data.data);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setDataLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => setShowLogoutModal(true);

  const isMediator =
    authData?.role === "USER" &&
    (authData?.is_mediator || userStats?.is_mediator);

  return (
    <SafeScreen role="USER" disableBottomSafeArea>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Hero Header */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: authData?.backgroundImage || DEFAULT_COVER }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(2,6,23,0)", "rgba(2,6,23,0.8)", "rgba(2,6,23,1)"]}
            style={styles.heroGradient}
          />

          {/* Top Action Buttons */}
          <View style={[styles.topActions, { top: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                try {
                  await Share.share({
                    message: "Check out my BattleCore profile!",
                  });
                } catch (e) {}
              }}
            >
              <MaterialIcons name="share" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <Image
                  source={{ uri: authData?.avatar || DEFAULT_AVATAR }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>
                  LVL {userStats?.level || 1}
                </Text>
              </View>
            </View>

            <Text style={styles.username} numberOfLines={1}>
              {authData?.username || "PLAYER"}
            </Text>

            <View style={styles.badgesRow}>
              <RoleBadge role={isMediator ? "MEDIATOR" : "USER"} />
              <View style={styles.tierBadge}>
                <MaterialIcons name="military-tech" size={12} color="#fbbf24" />
                <Text style={styles.tierText}>
                  {userStats?.tier || "Bronze"}
                </Text>
              </View>
              <View style={styles.rankBadge}>
                <MaterialIcons
                  name="emoji-events"
                  size={12}
                  color={COLORS.primary}
                />
                <Text style={styles.rankText}>#{userStats?.rank || "--"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        {dataLoading ? (
          <View style={styles.loadingStats}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons
                name="emoji-events"
                size={22}
                color={COLORS.primary}
              />
              <Text style={styles.statValue}>{userStats?.totalWins || 0}</Text>
              <Text style={styles.statLabel}>Total Wins</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="star" size={22} color={COLORS.accentBlue} />
              <Text style={styles.statValue}>
                {userStats?.top10Finishes || 0}
              </Text>
              <Text style={styles.statLabel}>Top 10</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="whatshot" size={22} color="#ef4444" />
              <Text style={styles.statValue}>
                {userStats?.totalKills
                  ? `${(userStats.totalKills / 1000).toFixed(1)}k`
                  : "0"}
              </Text>
              <Text style={styles.statLabel}>Total Kills</Text>
            </View>
          </View>
        )}

        {/* Achievements */}
        <SectionHeader
          title="Recent Achievements"
          actionLabel="See All"
          onActionPress={() => navigation.navigate("Achievements")}
          accentColor="#fbbf24"
          containerStyle={{ paddingHorizontal: 16, marginTop: 8 }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsScroll}
        >
          {[
            {
              name: "Killstreak",
              icon: "local-fire-department",
              bg: "rgba(244,123,37,0.1)",
              color: COLORS.primary,
            },
            {
              name: "Survivor",
              icon: "security",
              bg: "rgba(37,99,235,0.1)",
              color: COLORS.accentBlue,
            },
            {
              name: "First Blood",
              icon: "bolt",
              bg: "rgba(234,179,8,0.1)",
              color: "#eab308",
            },
            {
              name: "Sniper",
              icon: "gps-fixed",
              bg: "rgba(168,85,247,0.1)",
              color: "#a855f7",
            },
          ].map((a, idx) => (
            <View key={idx} style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { backgroundColor: a.bg }]}>
                <MaterialIcons name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={styles.achievementText} numberOfLines={2}>
                {a.name} Master
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Account */}
        <SectionHeader
          title="Account & Settings"
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="person"
            title="Personal Information"
            subtitle="Update your name, email, phone"
            showChevron
            onPress={() => navigation.navigate("PersonalInformation")}
          />
          <InfoCard
            icon="account-balance-wallet"
            iconColor={COLORS.success}
            title="Wallet Settings"
            subtitle="Limits, security, notifications & more"
            showChevron
            onPress={() => navigation.navigate("WalletSettings")}
          />
          <InfoCard
            icon="notifications"
            iconColor="#a855f7"
            title="Notifications"
            subtitle="Push, in-app and email preferences"
            showChevron
            onPress={() =>
              navigation.navigate("Notifications", { showSettings: true })
            }
          />
          <InfoCard
            icon="shield"
            iconColor={COLORS.error}
            title="Security & Privacy"
            subtitle="Password, 2FA, login activity"
            variant="danger"
            showChevron
            onPress={() => navigation.navigate("SecurityPrivacy")}
          />
          <InfoCard
            icon="support-agent"
            iconColor="#f47b25"
            title="Help & Support"
            subtitle="Get help, report issues, contact us"
            showChevron
            onPress={() => navigation.navigate("Help")}
          />
          <InfoCard
            icon="settings"
            title="Settings"
            subtitle="Game, theme, app version"
            showChevron
            onPress={() => navigation.navigate("Settings")}
          />
        </View>

        {/* Mediator Section (visible only if user is mediator) */}
        {(isMediator || authData?.is_mediator) && (
          <>
            <SectionHeader
              title="Mediator Panel"
              accentColor="#a855f7"
              containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
            />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              <InfoCard
                icon="gavel"
                iconColor="#a855f7"
                title="Mediator Dashboard"
                subtitle="Manage assigned matches and disputes"
                variant="default"
                showChevron
                onPress={() => navigation.navigate("MediatorDashboard")}
              />
            </View>
          </>
        )}

        {/* Logout */}
        <View style={{ padding: 16, marginTop: 16 }}>
          <Button
            title="Log Out"
            onPress={handleLogout}
            variant="danger"
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={120}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.glassModal}>
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="logout" size={32} color={COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalSubtitle}>
              You'll need to enter your credentials again to access your wallet,
              matches and friends.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setShowLogoutModal(false);
                  signOut();
                }}
              >
                <Text style={styles.confirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: "100%",
    height: 320,
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
  topActions: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileSection: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: COLORS.primary,
    padding: 3,
    backgroundColor: COLORS.backgroundDark,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  levelText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  username: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251,191,36,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.2)",
  },
  tierText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fbbf24",
    letterSpacing: 0.5,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(244,123,37,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.2)",
  },
  rankText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  loadingStats: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    marginTop: 6,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
    textAlign: "center",
  },
  achievementsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  achievementCard: {
    width: 110,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementText: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  glassModal: {
    width: "100%",
    maxWidth: width - 48,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 32,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(244, 123, 37, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default ProfileScreen;
