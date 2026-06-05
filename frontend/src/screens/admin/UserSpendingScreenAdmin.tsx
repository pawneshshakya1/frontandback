import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useFocusEffect } from "@react-navigation/native";
import { analyticsAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

export const UserSpendingScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(useCallback(() => { loadUsers(1, false); }, []));

  const loadUsers = async (pageNum: number, append: boolean) => {
    try {
      if (!append) setLoading(true);
      const res = await analyticsAPI.getAllUsersSpending({ page: pageNum, limit: 20 });
      if (res.data.success) {
        const data = res.data.data?.users || [];
        setUsers(append ? [...users, ...data] : data);
        setHasMore(data.length === 20);
        setPage(pageNum);
      }
    } catch (err) {
      console.error("Error loading spending data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadUsers(1, false); };
  const loadMore = () => { if (hasMore && !loading) loadUsers(page + 1, true); };

  const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString("en-IN")}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: "rgba(168,85,247,0.1)", top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Spending</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          onMomentumScrollEnd={(e) => {
            if (e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height >= e.nativeEvent.contentSize.height - 200) loadMore();
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>USER</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>DEPOSITED</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>ENTRY FEES</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>WON</Text>
          </View>

          {users.map((item, idx) => (
            <TouchableOpacity
              key={item._id || idx}
              style={styles.userRow}
              onPress={() => navigation.navigate("UserDetail", { userId: typeof item.user_id === 'object' ? item.user_id?._id : item.user_id || item._id })}
            >
              <View style={{ flex: 1.5 }}>
                <Text style={styles.userName} numberOfLines={1}>{typeof item.user_id === 'object' ? item.user_id?.username || "Unknown" : typeof item.user_id === 'string' ? item.user_id : "Unknown"}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{typeof item.user_id === 'object' ? item.user_id?.email || "" : ""}</Text>
              </View>
              <Text style={[styles.userAmount, { flex: 1, color: COLORS.success }]}>{formatCurrency(item.total_deposited)}</Text>
              <Text style={[styles.userAmount, { flex: 1, color: COLORS.primary }]}>{formatCurrency(item.total_entry_fees)}</Text>
              <Text style={[styles.userAmount, { flex: 1, color: "#a855f7" }]}>{formatCurrency(item.total_won)}</Text>
            </TouchableOpacity>
          ))}

          {hasMore && users.length > 0 && (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {!loading && users.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="analytics" size={48} color="rgba(255,255,255,0.08)" />
              <Text style={styles.emptyText}>No spending data yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  bgGlow: { position: "absolute", width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white", letterSpacing: -0.5 },

  tableHeader: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, marginBottom: 4 },
  tableHeaderText: { fontSize: 10, fontWeight: "bold", color: "rgba(255,255,255,0.35)", letterSpacing: 1 },

  userRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  userName: { color: "white", fontSize: 13, fontWeight: "bold" },
  userEmail: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  userAmount: { fontSize: 12, fontWeight: "bold", textAlign: "right" },

  loadMoreBtn: { paddingVertical: 20, alignItems: "center" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 12 },
});
