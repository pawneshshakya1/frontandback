import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import api from "../../services/api";
import { COLORS } from "../../theme/colors";
import { EmptyState } from "../../components/EmptyState";
import { usePopup } from "../../components/PopupModal";

export const PaymentDashboardAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showError, PopupElement } = usePopup();

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        api.get("/payments/admin/payments/stats"),
        api.get("/payments/admin/payments", {
          params: statusFilter !== "All" ? { status: statusFilter } : {},
        }),
      ]);
      setStats(statsRes.data.data);
      setPayments(paymentsRes.data.data?.payments || []);
    } catch (error) {
      console.error("Failed to load payment data:", error);
      setError("Failed to load payment data. Please try again.");
      showError("Error", "Failed to load payment data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const formatMoney = (val: number) => `₹ ${Number(val).toLocaleString()}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS": return COLORS.success;
      case "PENDING": return COLORS.warning;
      case "FAILED": return COLORS.error;
      case "REFUNDED": return COLORS.completed;
      default: return COLORS.textMuted;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <BlurView
        intensity={250}
        tint="dark"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {stats && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Revenue</Text>
                <Text style={styles.statValue}>{formatMoney(stats.totalRevenue)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Today</Text>
                <Text style={styles.statValue}>{formatMoney(stats.todayRevenue)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Success Rate</Text>
                  <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.successRate}%</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pending</Text>
                  <Text style={[styles.statValue, { color: COLORS.warning }]}>
                  {stats.pendingWithdrawals?.count || 0}
                </Text>
              </View>
            </View>

            <View style={styles.methodBreakdown}>
              <Text style={styles.sectionTitle}>Payment Methods</Text>
              <View style={styles.methodRow}>
                <View style={styles.methodItem}>
                  <View style={[styles.methodIcon, { backgroundColor: "rgba(244,123,37,0.1)" }]}>
                    <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.methodName}>Wallet</Text>
                  <Text style={styles.methodCount}>{stats.walletDeposits || 0}</Text>
                </View>
                <View style={styles.methodItem}>
                  <View style={[styles.methodIcon, { backgroundColor: "rgba(37,99,235,0.1)" }]}>
                    <MaterialIcons name="payment" size={20} color={COLORS.accentBlue} />
                  </View>
                  <Text style={styles.methodName}>Cashfree</Text>
                  <Text style={styles.methodCount}>{stats.cashfreePayments || 0}</Text>
                </View>
                <View style={styles.methodItem}>
                  <View style={[styles.methodIcon, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
                    <MaterialIcons name="cancel" size={20} color="#ef4444" />
                  </View>
                  <Text style={styles.methodName}>Failed</Text>
                  <Text style={styles.methodCount}>{stats.failedPayments || 0}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {["All", "SUCCESS", "PENDING", "FAILED"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {payments.length > 0 ? (
            payments.map((payment) => (
              <TouchableOpacity
                key={payment._id}
                style={styles.paymentItem}
                onPress={() => {
                  setSelectedPayment(payment);
                  setIsModalVisible(true);
                }}
              >
                <View style={styles.paymentLeft}>
                  <View
                    style={[
                      styles.paymentIcon,
                      {
                        backgroundColor:
                          payment.type === "DEPOSIT"
                            ? COLORS.successBg
                            : payment.type === "ENTRY_FEE"
                            ? "rgba(139,92,246,0.1)"
                            : COLORS.warningBg,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        payment.type === "DEPOSIT"
                          ? "add-circle"
                          : payment.type === "ENTRY_FEE"
                          ? "sports-esports"
                          : "receipt"
                      }
                      size={20}
                      color={
                        payment.type === "DEPOSIT"
                          ? COLORS.success
                          : payment.type === "ENTRY_FEE"
                          ? COLORS.completed
                          : COLORS.primary
                      }
                    />
                  </View>
                  <View>
                    <Text style={styles.paymentUser}>
                      {typeof payment.user_id === 'object' 
                        ? payment.user_id?.username || payment.user_id?.email || "Unknown"
                        : typeof payment.user_id === 'string'
                          ? payment.user_id
                          : "Unknown"}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {payment.type} • {payment.method?.replace("CASHFREE_", "") || "WALLET"} •{" "}
                      {formatDate(payment.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(payment.status)}20` },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: getStatusColor(payment.status) }]}
                    >
                      {payment.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : error ? (
            <EmptyState
              icon="error-outline"
              title="Error Loading Payments"
              description={error || 'An error occurred'}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="receipt-long" size={48} color="rgba(255,255,255,0.1)" />
              <Text style={styles.emptyText}>No payments found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {selectedPayment && (
              <>
                <Text style={styles.modalTitle}>Payment Details</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order ID</Text>
                  <Text style={styles.detailValue}>{selectedPayment.order_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>₹{selectedPayment.amount}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedPayment.status) }]}>
                    {selectedPayment.status}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Method</Text>
                  <Text style={styles.detailValue}>{selectedPayment.method}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{selectedPayment.type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedPayment.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
      <PopupElement />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  centerContent: { justifyContent: "center", alignItems: "center" },
  bgGlowTop: { position: "absolute", top: "-10%", right: "-20%", width: 300, height: 300, backgroundColor: "rgba(244,123,37,0.15)", borderRadius: 150, opacity: 0.5 },
  bgGlowBottom: { position: "absolute", bottom: "-10%", left: "-20%", width: 300, height: 300, backgroundColor: "rgba(37,99,235,0.1)", borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  scrollView: { flex: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  statCard: { width: "47%", backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  statLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 },
  statValue: { color: "white", fontSize: 18, fontWeight: "bold" },
  methodBreakdown: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "bold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  methodRow: { flexDirection: "row", gap: 12 },
  methodItem: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  methodIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  methodName: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  methodCount: { color: "white", fontSize: 16, fontWeight: "bold", marginTop: 4 },
  section: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  filterScroll: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", marginRight: 8 },
  filterChipActive: { backgroundColor: "rgba(244,123,37,0.1)", borderWidth: 1, borderColor: "rgba(244,123,37,0.3)" },
  filterChipText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "bold" },
  filterChipTextActive: { color: COLORS.primary },
  paymentItem: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  paymentLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  paymentIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  paymentUser: { color: "white", fontSize: 14, fontWeight: "bold" },
  paymentMeta: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  paymentRight: { alignItems: "flex-end" },
  paymentAmount: { color: "white", fontSize: 16, fontWeight: "bold" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  statusText: { fontSize: 9, fontWeight: "bold" },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  detailLabel: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  detailValue: { color: "white", fontSize: 13, fontWeight: "bold" },
  closeButton: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
  closeButtonText: { color: "white", fontSize: 14, fontWeight: "bold" },
});
