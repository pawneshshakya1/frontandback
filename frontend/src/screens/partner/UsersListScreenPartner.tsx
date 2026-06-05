import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { partnerAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

export const UsersListScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscribers = async () => {
    try {
      const res = await partnerAPI.getSubscribers();
      const data = res.data.data || [];
      setSubscribers(data);
    } catch (err) {
      console.error("Failed to fetch subscribers", err);
      Alert.alert('Error', 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubscribers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscribers();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

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
          <Text style={styles.headerTitle}>Subscribers</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{subscribers.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : subscribers.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <View style={styles.emptyIcon}>
            <MaterialIcons name="people-outline" size={56} color="rgba(255,255,255,0.15)" />
          </View>
          <Text style={styles.emptyTitle}>No Subscribers Yet</Text>
          <Text style={styles.emptySub}>Users can subscribe to your events via your QR code or partner profile.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {subscribers.map((sub: any, idx: number) => {
            const user = sub.subscriber_id || {};
            const isActive = sub.status === 'ACTIVE';
            return (
              <View key={sub._id || idx} style={styles.subscriberCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>
                          {(user.username || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {isActive && <View style={styles.activeDot} />}
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={styles.username} numberOfLines={1}>
                      {user.username || "Unknown User"}
                    </Text>
                    <Text style={styles.email} numberOfLines={1}>
                      {user.email || "—"}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.statusPill, { backgroundColor: isActive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }]}>
                        <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success : COLORS.error }]} />
                        <Text style={[styles.statusText, { color: isActive ? COLORS.success : COLORS.error }]}>
                          {sub.status || "UNKNOWN"}
                        </Text>
                      </View>
                      {sub.notify_new_events && (
                        <View style={styles.notifyPill}>
                          <MaterialIcons name="notifications-active" size={10} color={COLORS.primary} />
                          <Text style={styles.notifyText}>EVENTS</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.statBox}>
                    <MaterialIcons name="event" size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.statLabel}>JOINED</Text>
                    <Text style={styles.statValue}>{formatDate(sub.created_at || sub.subscribed_at)}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <MaterialIcons name="update" size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.statLabel}>UPDATED</Text>
                    <Text style={styles.statValue}>{formatDate(sub.updated_at)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlowTop: {
    position: "absolute",
    top: -80,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(244,123,37,0.10)",
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: 100,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(244,123,37,0.06)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  countPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(244,123,37,0.15)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  countText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    paddingTop: 100,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -0.3,
  },
  emptySub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 280,
  },

  subscriberCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: "relative",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backgroundColor: "rgba(244,123,37,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  activeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  email: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  notifyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(244,123,37,0.12)",
  },
  notifyText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 10,
    padding: 10,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  statValue: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default UsersListScreenPartner;
