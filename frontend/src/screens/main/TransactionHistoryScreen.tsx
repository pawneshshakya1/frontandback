import React, { useState, useEffect, useCallback } from "react";
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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import api, { walletAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const TRANSACTION_ICONS: Record<string, { icon: string; color: string }> = {
  DEPOSIT: { icon: "arrow-downward", color: "#4caf50" },
  WITHDRAW: { icon: "arrow-upward", color: "#ef4444" },
  LOCK: { icon: "lock", color: "#f59e0b" },
  UNLOCK: { icon: "lock-open", color: "#10b981" },
  ENTRY_FEE: { icon: "sports-esports", color: "#8b5cf6" },
  PRIZE_WON: { icon: "emoji-events", color: "#f47b25" },
  GIFT_SENT: { icon: "card-giftcard", color: "#ec4899" },
  GIFT_RECEIVED: { icon: "card-giftcard", color: "#ec4899" },
  REDEEM: { icon: "redeem", color: "#06b6d4" },
  REFUND: { icon: "undo", color: "#f59e0b" },
};

const TABS: { key: string; label: string; types?: string[] }[] = [
  { key: "All", label: "All" },
  { key: "Deposits", label: "Deposits", types: ["DEPOSIT"] },
  { key: "Withdrawals", label: "Withdrawals", types: ["WITHDRAW"] },
  { key: "Games", label: "Games", types: ["ENTRY_FEE", "PRIZE_WON", "LOCK", "UNLOCK", "REDEEM"] },
  { key: "Gifts", label: "Gifts", types: ["GIFT_SENT", "GIFT_RECEIVED"] },
];

const QUICK_RANGES: { key: string; label: string; days?: number }[] = [
  { key: "all", label: "All Time" },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "custom", label: "Custom Range" },
];

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

export const TransactionHistoryScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletData, setWalletData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [activeRangeKey, setActiveRangeKey] = useState<string>("all");

  const [showDateModal, setShowDateModal] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [tempFrom, setTempFrom] = useState<Date>(startOfDay(new Date()));
  const [tempTo, setTempTo] = useState<Date>(endOfDay(new Date()));

  const fetchData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setIsLoading(true);
      try {
        const tab = TABS.find((t) => t.key === activeTab);
        const params: any = { limit: 200 };
        if (tab?.types?.length) {
          params.type = tab.types.join(",");
        }
        if (fromDate) params.from = fromDate.toISOString();
        if (toDate) params.to = toDate.toISOString();

        const [txRes, walletRes] = await Promise.all([
          walletAPI.getTransactions(params),
          api.get("/wallet/my"),
        ]);
        setTransactions(txRes.data?.data || []);
        setWalletData(walletRes.data?.data);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, fromDate, toDate]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setIsRefreshing(true);
      fetchData(false);
    });
    return unsubscribe;
  }, [navigation, fetchData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData(false);
  };

  const applyQuickRange = (key: string, days?: number) => {
    setActiveRangeKey(key);
    if (key === "all" || !days) {
      setFromDate(null);
      setToDate(null);
      return;
    }
    const now = new Date();
    setToDate(endOfDay(now));
    setFromDate(startOfDay(new Date(now.getTime() - days * 24 * 60 * 60 * 1000)));
  };

  const openDateModal = () => {
    setTempFrom(fromDate ?? startOfDay(new Date()));
    setTempTo(toDate ?? endOfDay(new Date()));
    setShowDateModal(true);
  };

  const openCustomPicker = (target: "from" | "to") => {
    setPickerTarget(target);
    setPickerMode("date");
  };

  const onPickerChange = (_: any, value?: Date) => {
    if (Platform.OS === "android") setPickerMode(null);
    if (!value) return;
    if (pickerTarget === "from") {
      setTempFrom(startOfDay(value));
    } else if (pickerTarget === "to") {
      setTempTo(endOfDay(value));
    }
  };

  const applyCustomRange = () => {
    if (tempFrom.getTime() > tempTo.getTime()) {
      return;
    }
    setFromDate(tempFrom);
    setToDate(tempTo);
    setActiveRangeKey("custom");
    setShowDateModal(false);
  };

  const clearDateRange = () => {
    setFromDate(null);
    setToDate(null);
    setActiveRangeKey("all");
  };

  const formatAmount = (amount: number, type: string) => {
    const isCredit = ["DEPOSIT", "UNLOCK", "PRIZE_WON", "GIFT_RECEIVED", "REFUND"].includes(type);
    return `${isCredit ? "+" : "-"}₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRangeLabel = () => {
    if (activeRangeKey === "all" && !fromDate && !toDate) return "All Time";
    if (fromDate && toDate) {
      return `${fromDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} → ${toDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`;
    }
    if (fromDate) return `From ${fromDate.toLocaleDateString("en-IN")}`;
    if (toDate) return `Until ${toDate.toLocaleDateString("en-IN")}`;
    return "All Time";
  };

  const groupedTransactions = transactions.reduce((groups: any, tx) => {
    const date = formatDate(tx.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  const totalCredit = transactions
    .filter((t) => ["DEPOSIT", "UNLOCK", "PRIZE_WON", "GIFT_RECEIVED", "REFUND"].includes(t.type))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalDebit = transactions
    .filter((t) => ["WITHDRAW", "ENTRY_FEE", "GIFT_SENT", "LOCK", "REDEEM"].includes(t.type))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

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
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
          <MaterialIcons name="refresh" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {walletData && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryValue}>
              ₹{Number(walletData.available_balance || 0).toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Locked</Text>
            <Text style={styles.summaryValue}>
              ₹{Number(walletData.locked_balance || 0).toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: totalCredit - totalDebit >= 0 ? "#4caf50" : "#ef4444" },
              ]}
            >
              {totalCredit - totalDebit >= 0 ? "+" : ""}₹
              {(totalCredit - totalDebit).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.filtersRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateFilterBtn} onPress={openDateModal}>
          <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
          <Text style={styles.dateFilterText}>{formatRangeLabel()}</Text>
          {(fromDate || toDate) && (
            <TouchableOpacity onPress={clearDateRange} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        <Text style={styles.txnCount}>
          {transactions.length} {transactions.length === 1 ? "result" : "results"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {Object.keys(groupedTransactions).length > 0 ? (
          Object.entries(groupedTransactions).map(([date, txs]: [string, any]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{date}</Text>
              {txs.map((tx: any) => {
                const iconConfig = TRANSACTION_ICONS[tx.type] || { icon: "receipt", color: "#888" };
                const isCredit = ["DEPOSIT", "UNLOCK", "PRIZE_WON", "GIFT_RECEIVED", "REFUND"].includes(tx.type);

                return (
                  <View key={tx._id} style={styles.transactionItem}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconConfig.color}20` }]}>
                      <MaterialIcons name={iconConfig.icon as any} size={20} color={iconConfig.color} />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={styles.txDescription} numberOfLines={1}>
                        {tx.description || tx.type}
                      </Text>
                      <Text style={styles.txTime}>{formatTime(tx.createdAt)}</Text>
                    </View>
                    <View style={styles.txAmountContainer}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: isCredit ? "#4caf50" : "#ef4444" },
                        ]}
                      >
                        {formatAmount(tx.amount, tx.type)}
                      </Text>
                      {tx.status && (
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                tx.status === "SUCCESS"
                                  ? "rgba(76,175,80,0.1)"
                                  : tx.status === "PENDING"
                                  ? "rgba(245,158,11,0.1)"
                                  : "rgba(239,68,68,0.1)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  tx.status === "SUCCESS"
                                    ? "#4caf50"
                                    : tx.status === "PENDING"
                                    ? "#f59e0b"
                                    : "#ef4444",
                              },
                            ]}
                          >
                            {tx.status}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={48} color="rgba(255,255,255,0.1)" />
            <Text style={styles.emptyText}>No transactions found</Text>
            {(fromDate || toDate) && (
              <TouchableOpacity style={styles.emptyAction} onPress={clearDateRange}>
                <Text style={styles.emptyActionText}>Clear date filter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <MaterialIcons name="close" size={22} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickRangeGrid}>
              {QUICK_RANGES.map((range) => (
                <TouchableOpacity
                  key={range.key}
                  style={[
                    styles.quickRangeBtn,
                    activeRangeKey === range.key && styles.quickRangeBtnActive,
                  ]}
                  onPress={() => {
                    if (range.key === "custom") {
                      setActiveRangeKey("custom");
                    } else {
                      applyQuickRange(range.key, range.days);
                      setShowDateModal(false);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.quickRangeText,
                      activeRangeKey === range.key && styles.quickRangeTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customRangeBlock}>
              <Text style={styles.customRangeLabel}>CUSTOM RANGE</Text>
              <View style={styles.dateInputsRow}>
                <TouchableOpacity
                  style={styles.dateInputBtn}
                  onPress={() => openCustomPicker("from")}
                >
                  <MaterialIcons name="calendar-today" size={16} color={COLORS.primary} />
                  <View>
                    <Text style={styles.dateInputLabel}>From</Text>
                    <Text style={styles.dateInputValue}>
                      {tempFrom.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateInputBtn}
                  onPress={() => openCustomPicker("to")}
                >
                  <MaterialIcons name="event" size={16} color={COLORS.primary} />
                  <View>
                    <Text style={styles.dateInputLabel}>To</Text>
                    <Text style={styles.dateInputValue}>
                      {tempTo.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setShowDateModal(false);
                }}
              >
                <Text style={styles.modalBtnTextSecondary}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={applyCustomRange}
              >
                <Text style={styles.modalBtnTextPrimary}>APPLY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {pickerMode === "date" && pickerTarget && (
        <DateTimePicker
          value={pickerTarget === "from" ? tempFrom : tempTo}
          mode="date"
          maximumDate={pickerTarget === "from" ? tempTo : new Date()}
          onChange={onPickerChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  centerContent: { justifyContent: "center", alignItems: "center" },
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 4 },
  summaryValue: { color: "white", fontSize: 16, fontWeight: "bold" },
  summaryDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 8,
  },
  filtersRow: { marginBottom: 12 },
  tabContainer: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  activeTab: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  tabText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "bold" },
  activeTabText: { color: COLORS.primary },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dateFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(244,123,37,0.08)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dateFilterText: { color: "white", fontSize: 12, fontWeight: "600" },
  txnCount: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600" },
  scrollView: { flex: 1 },
  dateGroup: { marginBottom: 20 },
  dateHeader: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  transactionItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txDetails: { flex: 1 },
  txDescription: { color: "white", fontSize: 14, fontWeight: "bold" },
  txTime: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  txAmountContainer: { alignItems: "flex-end" },
  txAmount: { fontSize: 14, fontWeight: "bold" },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: { fontSize: 9, fontWeight: "bold" },
  emptyContainer: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 14 },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(244,123,37,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  emptyActionText: { color: COLORS.primary, fontSize: 12, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "white", fontSize: 17, fontWeight: "bold" },
  quickRangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  quickRangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickRangeBtnActive: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderColor: "rgba(244,123,37,0.4)",
  },
  quickRangeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  quickRangeTextActive: { color: COLORS.primary, fontWeight: "bold" },
  customRangeBlock: { marginBottom: 16 },
  customRangeLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  dateInputsRow: { flexDirection: "row", gap: 10 },
  dateInputBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dateInputLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  dateInputValue: { color: "white", fontSize: 12, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalBtnPrimary: { backgroundColor: COLORS.primary },
  modalBtnTextSecondary: { color: "white", fontSize: 13, fontWeight: "bold", letterSpacing: 1 },
  modalBtnTextPrimary: { color: "white", fontSize: 13, fontWeight: "bold", letterSpacing: 1 },
});

export default TransactionHistoryScreen;
