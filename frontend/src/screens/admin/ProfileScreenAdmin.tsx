import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
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
import { adminAPI } from "../../services/api";
import { SafeScreen } from "../../components/SafeScreen";
import { SectionHeader } from "../../components/SectionHeader";
import { InfoCard } from "../../components/InfoCard";
import { Button } from "../../components/Button";
import { RoleBadge } from "../../components/RoleBadge";
import { StatCard } from "../../components/StatCard";

const { width } = Dimensions.get("window");

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD8SramNZdVi1A8A-J6l2KUxr-hdqaZXJsnAO0_xZjG3BDsC1UQPKiyudff4EEVYR78z4r-WcYTwSWIeDLuOSAVkg_K0mCdOGZZ4N8ot5c04pGmA50sirkGZoW5d3t1ZP536e3ro0c1U0Ooh7LO40NYk2-vUI7Bd2qNVCVykUhwMsQddSGeSwf0XbPrDsuynVt-jEciI8dOHpTgK4QX-aYM9avIdfBTRbYWYBI7CQcp0nwreHu-wZfJK2z5lGUp9DrkpXqlBDqnm4k";
const DEFAULT_COVER =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAh5AJVtKymLINB1Rn9KLf0PTMYIkgB3Q5LIzoxYUINBFDPzQKls6ZwkJRVwtMGgSP-izheoxRyYg5y3VnHsRTCrzjABw8IpQlH49m6qQcQgNjaXyQ75nJRP5zicKoCr3_OTd7cXc8wtgyKTK5_WBGmfX56S4sVxbxTwlYRcated-55EhAJOC1lWr1Z3_zIVl8ejuZV5mXk3_pqyBGlU1nma9h1VH3TqElVc3gciyzvzZVe4V02RIOi7r8loAkIU2n5sFgMU7LZ-pI";

export const ProfileScreenAdmin = ({ navigation }: any) => {
  const { authData, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      if (res.data.success) setStats(res.data.data);
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

  return (
    <SafeScreen role="ADMIN" disableBottomSafeArea>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
            colors={["#ef4444"]}
          />
        }
      >
        {/* Hero */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: authData?.backgroundImage || DEFAULT_COVER }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["rgba(2,6,23,0)", "rgba(2,6,23,0.8)", "rgba(2,6,23,1)"]}
            style={styles.heroGradient}
          />
          <View style={[styles.topActions, { top: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                try {
                  await Share.share({ message: "Check out BattleCore Admin!" });
                } catch (e) {}
              }}
            >
              <MaterialIcons name="share" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <Image
                  source={{ uri: authData?.avatar || DEFAULT_AVATAR }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.roleBadge}>
                <MaterialIcons
                  name="admin-panel-settings"
                  size={12}
                  color="white"
                />
              </View>
            </View>
            <Text style={styles.username}>{authData?.username || "ADMIN"}</Text>
            <View style={styles.badgeRow}>
              <RoleBadge role="ADMIN" label="Super Admin" />
            </View>
          </View>
        </View>

        {/* Stats */}
        {!dataLoading && stats && (
          <>
            <SectionHeader
              title="Platform Overview"
              accentColor="#ef4444"
              containerStyle={{ paddingHorizontal: 16, marginTop: 8 }}
            />
            <View style={styles.statsRow}>
              <StatCard
                icon="people"
                iconColor={COLORS.success}
                value={(stats.totalUsers ?? 0).toLocaleString()}
                label="Total Users"
              />
              <View style={{ width: 8 }} />
              <StatCard
                icon="sports-esports"
                iconColor={COLORS.accentBlue}
                value={(stats.totalMatches ?? 0).toLocaleString()}
                label="Total Matches"
              />
            </View>
            <View style={[styles.statsRow, { marginTop: 8 }]}>
              <StatCard
                icon="account-balance-wallet"
                iconColor="#fbbf24"
                value={`₹${((stats.totalWalletBalance ?? 0) / 1000).toFixed(1)}K`}
                label="Wallet Balance"
              />
              <View style={{ width: 8 }} />
              <StatCard
                icon="trending-up"
                iconColor={COLORS.primary}
                value={`₹${((stats.totalRevenue ?? 0) / 1000).toFixed(1)}K`}
                label="Total Revenue"
              />
            </View>
          </>
        )}

        {/* Admin Quick Links */}
        <SectionHeader
          title="Admin Tools"
          accentColor="#ef4444"
          containerStyle={{ paddingHorizontal: 16, marginTop: 16 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="dashboard"
            iconColor="#ef4444"
            title="Admin Dashboard"
            subtitle="View platform KPIs and analytics"
            showChevron
            onPress={() => navigation.navigate("AdminTabs")}
          />
          <InfoCard
            icon="people"
            iconColor="#3b82f6"
            title="User Management"
            subtitle="Search, block, edit user accounts"
            showChevron
            onPress={() => navigation.navigate("UsersList")}
          />
          <InfoCard
            icon="handshake"
            iconColor="#fbbf24"
            title="Partner Management"
            subtitle="Approve, suspend, manage partners"
            showChevron
            onPress={() => navigation.navigate("PartnerManagement")}
          />
          <InfoCard
            icon="gavel"
            iconColor="#a855f7"
            title="Mediator Approvals"
            subtitle="Review mediator applications"
            showChevron
            onPress={() => navigation.navigate("MediatorApproval")}
          />
          <InfoCard
            icon="payments"
            iconColor={COLORS.success}
            title="Payment & Revenue"
            subtitle="Track transactions, approve payouts"
            showChevron
            onPress={() => navigation.navigate("PaymentDashboard")}
          />
          <InfoCard
            icon="security"
            iconColor={COLORS.error}
            title="Security & Audit"
            subtitle="View security events and audit logs"
            variant="danger"
            showChevron
            onPress={() => navigation.navigate("SecurityAuditLog")}
          />
        </View>

        {/* Personal */}
        <SectionHeader
          title="Account & Settings"
          containerStyle={{ paddingHorizontal: 16, marginTop: 24 }}
        />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <InfoCard
            icon="person"
            title="Personal Information"
            subtitle="Update your admin profile"
            showChevron
            onPress={() => navigation.navigate("PersonalInformation")}
          />
          <InfoCard
            icon="shield"
            iconColor={COLORS.error}
            title="Security & Privacy"
            subtitle="2FA, login activity, password"
            variant="danger"
            showChevron
            onPress={() => navigation.navigate("SecurityPrivacy")}
          />
          <InfoCard
            icon="settings"
            title="App Settings"
            subtitle="App version, maintenance, configuration"
            showChevron
            onPress={() => navigation.navigate("AppSettings")}
          />
          <InfoCard
            icon="support-agent"
            iconColor="#f47b25"
            title="Help & Support"
            subtitle="Manage user support tickets"
            showChevron
            onPress={() => navigation.navigate("HelpManagement")}
          />
          <InfoCard
            icon="notifications"
            iconColor="#a855f7"
            title="Notifications"
            subtitle="Push, in-app and email preferences"
            showChevron
            onPress={() => navigation.navigate("Notifications")}
          />
        </View>

        <View style={{ padding: 16, marginTop: 16 }}>
          <Button
            title="Log Out"
            onPress={() => setShowLogoutModal(true)}
            variant="danger"
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
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
              <MaterialIcons name="logout" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Log Out?</Text>
            <Text style={styles.modalSubtitle}>
              You will be signed out of the admin panel. Active sessions will
              remain valid until expiry.
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
    height: 280,
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
    borderColor: "#ef4444",
    padding: 3,
    backgroundColor: COLORS.backgroundDark,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  roleBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  username: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
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
    backgroundColor: "rgba(239,68,68,0.1)",
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
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
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
  },
  cancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  confirmButton: {
    flex: 1,
    height: 48,
    backgroundColor: "#ef4444",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});

export default ProfileScreenAdmin;
