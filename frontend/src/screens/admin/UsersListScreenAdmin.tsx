import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from "../../theme/colors";
import api from "../../services/api";
import { EmptyState } from "../../components/EmptyState";
import { FilterBottomSheet, FilterSection } from "../../components/FilterBottomSheet";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const UsersListScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm, PopupElement } = usePopup();
  const [roleFilter, setRoleFilter] = useState("All");
  const [blockFilter, setBlockFilter] = useState("All");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Modal states for blocking a user
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedUserToBlock, setSelectedUserToBlock] = useState<any>(null);
  const [blockReason, setBlockReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const applyFilters = (values: Record<string, string>) => {
    setRoleFilter(values.role || "All");
    setBlockFilter(values.status || "All");
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setRoleFilter("All");
    setBlockFilter("All");
    setFilterModalVisible(false);
  };

  const filterSections: FilterSection[] = [
    {
      key: "role",
      label: "Role / Verification",
      value: roleFilter,
      options: [
        { key: "All", label: "All Roles", icon: "apps" },
        { key: "ADMIN", label: "Admin", icon: "admin-panel-settings" },
        { key: "USER", label: "User", icon: "person" },
        { key: "VERIFIED", label: "Verified", icon: "verified" },
      ],
    },
    {
      key: "status",
      label: "Account Status",
      value: blockFilter,
      options: [
        { key: "All", label: "All Status", icon: "apps" },
        { key: "Blocked", label: "Blocked", icon: "block" },
        { key: "Unblocked", label: "Unblocked", icon: "check-circle" },
      ],
    },
  ];

  const fetchUsers = async () => {
    try {
      setError(null);
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError("Failed to load users. Please try again.");
      showError("Error", "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return '#ef4444';
      case 'MEDIATOR': return '#3b82f6';
      case 'USER': return '#f47b25';
      default: return '#9ca3af';
    }
  };

  const handleBlockAction = async () => {
    if (!selectedUserToBlock) return;
    if (!blockReason.trim()) {
      showError("Error", "Please provide a reason for blocking the user.");
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/admin/users/${selectedUserToBlock._id}/block`, {
        action: 'BLOCK',
        reason: blockReason.trim(),
      });
      setBlockModalVisible(false);
      setBlockReason("");
      setSelectedUserToBlock(null);
      fetchUsers(); // Refresh the list
      showSuccess("Success", "User has been blocked successfully.");
    } catch (err: any) {
      showError("Error", err.response?.data?.message || 'Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async (user: any) => {
    showConfirm(
      "Unblock User",
      `Are you sure you want to unblock ${user.username || 'this user'}?`,
      async () => {
        try {
          setActionLoading(true);
          await api.post(`/admin/users/${user._id}/block`, {
            action: 'UNBLOCK'
          });
          fetchUsers();
          showSuccess("Success", "User unblocked successfully.");
        } catch (err: any) {
          showError("Error", err.response?.data?.message || 'Failed to unblock user');
        } finally {
          setActionLoading(false);
        }
      },
      "Unblock",
    );
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === "" ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.ff_max_uid && String(u.ff_max_uid).includes(searchQuery)) ||
      (u.game_uid_name && u.game_uid_name.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesRole = true;
    if (roleFilter === 'VERIFIED') {
      matchesRole = u.is_verified;
    } else if (roleFilter !== 'All') {
      matchesRole = u.role === roleFilter;
    }

    let matchesBlock = true;
    if (blockFilter === 'Blocked') {
      matchesBlock = u.is_blocked === true;
    } else if (blockFilter === 'Unblocked') {
      matchesBlock = !u.is_blocked;
    }

    return matchesSearch && matchesRole && matchesBlock;
  });

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

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Users List</Text>
        </View>
        <TouchableOpacity
          style={styles.filterIconButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={24} color={(roleFilter !== "All" || blockFilter !== "All") ? "#f47b25" : "white"} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username, email, UID..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
            <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Modal */}
      <FilterBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title="Filter Users"
        subtitle="Refine results"
        accentColor="#ef4444"
        sections={filterSections}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#f47b25" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f47b25" />}
        >
          {filteredUsers.length > 0 ? filteredUsers.map((item, index) => (
            <TouchableOpacity
              key={item._id || index}
              style={styles.userCard}
              onPress={() => navigation.navigate("UserDetail", { userId: item._id })}
              accessibilityRole="button"
              accessibilityLabel={`View profile of ${item.username || "user"}`}
            >
              {/* Top Row: Avatar & Info */}
              <View style={styles.cardHeader}>
                <View style={styles.userInfoWrapper}>
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{ uri: item.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuD8SramNZdVi1A8A-J6l2KUxr-hdqaZXJsnAO0_xZjG3BDsC1UQPKiyudff4EEVYR78z4r-WcYTwSWIeDLuOSAVkg_K0mCdOGZZ4N8ot5c04pGmA50sirkGZoW5d3t1ZP536e3ro0c1U0Ooh7LO40NYk2-vUI7Bd2qNVCVykUhwMsQddSGeSwf0XbPrDsuynVt-jEciI8dOHpTgK4QX-aYM9avIdfBTRbYWYBI7CQcp0nwreHu-wZfJK2z5lGUp9DrkpXqlBDqnm4k" }}
                      style={styles.avatar}
                      accessibilityLabel={`Avatar of ${item.username || "user"}`}
                    />
                    {item.is_verified && (
                      <View style={styles.verifiedBadgeFloat}>
                        <MaterialIcons name="verified" size={14} color="#2563eb" />
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfoText}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={styles.userName} numberOfLines={1}>{item.username || "Unknown"}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getRoleColor(item.role)}20` }]}>
                        <Text style={[styles.statusText, { color: getRoleColor(item.role) }]}>{item.role || "USER"}</Text>
                      </View>
                      {item.is_blocked && (
                        <View style={[styles.statusBadge, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
                          <Text style={[styles.statusText, { color: '#ef4444' }]}>BLOCKED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                  </View>
                </View>

                {/* Block/Unblock Icon Button */}
                {item.role !== 'ADMIN' && (
                  <TouchableOpacity
                    style={[
                      styles.iconActionBtn,
                      item.is_blocked ? styles.unblockBtn : styles.blockBtn
                    ]}
                    onPress={() => item.is_blocked ? handleUnblock(item) : (setSelectedUserToBlock(item), setBlockModalVisible(true))}
                    disabled={actionLoading}
                    accessibilityRole="button"
                    accessibilityLabel={item.is_blocked ? `Unblock ${item.username}` : `Block ${item.username}`}
                  >
                    <MaterialIcons
                      name={item.is_blocked ? "lock-open" : "block"}
                      size={20}
                      color={item.is_blocked ? "#f47b25" : "rgba(255,255,255,0.4)"}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom Row: Stats */}
              <View style={styles.cardFooter}>
                <View style={styles.statBox}>
                  <MaterialIcons name="event" size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.statValue}>{new Date(item.created_at || item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <MaterialIcons name="sports-esports" size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={[styles.statValue, { color: '#f47b25' }]} numberOfLines={1}>{item.ff_max_uid || 'N/A'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <MaterialIcons name="badge" size={14} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.statValue} numberOfLines={1}>{item.game_uid_name || 'N/A'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )          ) : error ? (
            <EmptyState
              icon="error-outline"
              title="Error Loading Users"
              description={error || 'An error occurred'}
            />
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>No users found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Block Reason Modal */}
      <Modal
        visible={blockModalVisible}
        transparent={true}
        animationType="fade"
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="block" size={24} color="#ef4444" />
              <Text style={styles.modalTitle}>Block User</Text>
            </View>

            <Text style={styles.modalSub}>
              Blocking <Text style={{ color: 'white', fontWeight: 'bold' }}>{selectedUserToBlock?.username}</Text> will prevent them from logging in. They will receive an email stating the reason.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for blocking..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={blockReason}
              onChangeText={setBlockReason}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setBlockModalVisible(false);
                  setBlockReason("");
                  setSelectedUserToBlock(null);
                }}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBlockBtn}
                onPress={handleBlockAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalBlockText}>CONFIRM BLOCK</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  reasonInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    padding: 16,
    minHeight: 100,
    fontSize: 14,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalBlockBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalBlockText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 16,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
  },
  clearSearchBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  userInfoWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgba(244,123,37,0.5)",
  },
  verifiedBadgeFloat: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0d0d0d',
    borderRadius: 10,
    padding: 2,
  },
  userInfoText: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  userEmail: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center"
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  blockBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unblockBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statValue: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
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
});
