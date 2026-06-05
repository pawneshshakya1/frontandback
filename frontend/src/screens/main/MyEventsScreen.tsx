import React, { useState, useCallback, useEffect } from "react";
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
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import api, { matchAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { CountdownTimer } from "../../components/CountdownTimer";
import { sseService } from "../../services/sse";
import { EventShareModal } from "../../components/EventShareModal";
import { usePopup } from "../../components/PopupModal";
import {
  canHostEditCredentials,
  getCredentialsEditCutoff,
  isWithinCredentialsRevealWindow,
} from "../../utils/matchTime";

const { width } = Dimensions.get("window");

export const MyEventsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    PopupElement,
  } = usePopup();

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Share modal state
  const [shareModal, setShareModal] = useState({
    visible: false,
    matchId: "",
    matchTitle: "",
  });

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({
    visible: false,
    matchId: "",
    matchTitle: "",
    reason: "",
    cancelling: false,
  });

  // Room credentials modal state
  const [credsModal, setCredsModal] = useState({
    visible: false,
    matchId: "",
    matchTitle: "",
    roomId: "",
    roomPassword: "",
    saving: false,
  });

  const fetchMatches = async () => {
    try {
      const res = await api.get("/matches/created");
      setMatches(res.data.data || res.data);
    } catch (err) {
      console.error("Failed to fetch matches", err);
      showError("Error", "Failed to load your events");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMatches();
    }, []),
  );

  // SSE for real-time updates
  useEffect(() => {
    const handleMatchUpdate = () => fetchMatches();
    sseService.on("MATCH_UPDATE", handleMatchUpdate);
    return () => {
      sseService.off("MATCH_UPDATE", handleMatchUpdate);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const handleDelete = (id: string, title: string) => {
    showConfirm(
      "Delete Event",
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`/matches/${id}`);
          showSuccess("Deleted", `"${title}" has been removed.`);
          fetchMatches();
        } catch (error: any) {
          showError(
            "Error",
            error.response?.data?.message || "Failed to delete",
          );
        }
      },
      "Delete",
    );
  };

  const handlePublish = (id: string, title: string) => {
    showConfirm(
      "Publish Event",
      `Are you sure you want to publish "${title}"?\n\nRoom credentials can be added later using the SET ROOM button (available 10 minutes before match start).`,
      async () => {
        try {
          await matchAPI.updateMatch(id, { isPublished: true });
          showSuccess("Event Live", "Your event is now published and visible to players!");
          fetchMatches();
        } catch (error: any) {
          showError("Error", error.response?.data?.message || "Failed to publish");
        }
      },
      "PUBLISH",
    );
  };

  const handleShare = (id: string, title: string) => {
    setShareModal({ visible: true, matchId: id, matchTitle: title });
  };

  const handleCancelEvent = (id: string, title: string) => {
    setCancelModal({
      visible: true,
      matchId: id,
      matchTitle: title,
      reason: "",
      cancelling: false,
    });
  };

  const confirmCancel = async () => {
    setCancelModal((prev) => ({ ...prev, cancelling: true }));
    try {
      const res = await matchAPI.cancelEvent(cancelModal.matchId, {
        reason: cancelModal.reason || "Cancelled by host",
      });
      setCancelModal((prev) => ({
        ...prev,
        visible: false,
        cancelling: false,
      }));
      const rr = res?.data?.refundResults;
      if (rr && rr.total > 0) {
        if (rr.failed === 0) {
          showSuccess(
            "Cancelled & Refunded",
            `Event cancelled. All ${rr.refunded} participant(s) have been refunded.`,
          );
        } else {
          showWarning(
            "Cancelled (Partial Refund)",
            `Event cancelled. ${rr.refunded}/${rr.total} refunded, ${rr.failed} refund(s) failed — please contact support.`,
          );
        }
      } else {
        showInfo("Cancelled", "Event has been cancelled.");
      }
      fetchMatches();
    } catch (error: any) {
      setCancelModal((prev) => ({ ...prev, cancelling: false }));
      showError(
        "Error",
        error.response?.data?.message || "Failed to cancel event",
      );
    }
  };

  const handleOpenCreds = (item: any) => {
    if (!canHostEditCredentials(item)) {
      const cutoff = getCredentialsEditCutoff(item);
      const start = item.match_time || "TBA";
      showWarning(
        "Not Yet Available",
        `Room credentials can be set from 10 minutes before the match starts (${start}).\n\nEdit window opens at: ${
          cutoff ? cutoff.toLocaleString() : "TBA"
        }`,
      );
      return;
    }
    setCredsModal({
      visible: true,
      matchId: item._id,
      matchTitle: item.title,
      roomId: item.room_id || "",
      roomPassword: item.room_password || "",
      saving: false,
    });
  };

  const confirmSetCreds = async () => {
    if (!credsModal.roomId.trim()) {
      showWarning("Validation", "Please enter a Room ID.");
      return;
    }
    setCredsModal((prev) => ({ ...prev, saving: true }));
    try {
      await matchAPI.setRoomCredentials(credsModal.matchId, {
        room_id: credsModal.roomId.trim(),
        room_password: credsModal.roomPassword.trim() || undefined,
      });
      setCredsModal((prev) => ({ ...prev, visible: false, saving: false }));
      showSuccess(
        "Credentials Saved",
        "Participants will see them 5 minutes before match start.",
      );
      fetchMatches();
    } catch (error: any) {
      setCredsModal((prev) => ({ ...prev, saving: false }));
      showError(
        "Error",
        error.response?.data?.message || "Failed to save room credentials",
      );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

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

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, paddingHorizontal: 16 },
        ]}
      >
        {/* Left Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>

        {/* Center Title */}
        <Text style={styles.headerTitleCenter}>My Events</Text>

        {/* Right Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("CreateMatch")}
        >
          <MaterialIcons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#f47b25" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f47b25"
            />
          }
        >
          {matches.length > 0 ? (
            matches.map((item, index) => {
              const isDraft = !item.isPublished;
              const participantsCount = item.participants?.length || 0;
              const maxPlayers = item.max_players || 100;
              const percent = Math.min(
                100,
                Math.round((participantsCount / maxPlayers) * 100),
              );
              const progressColor = percent >= 100 ? "#f47b25" : "#f47b25";
              const mapImage =
                item.map_image ||
                "https://lh3.googleusercontent.com/aida-public/AB6AXuAwQWNaaBgdOXGVmuHX-vDdsW0B_K4GoKl2GcFXoCxPWPrQZ_yNXFZOV5TpsZC00vfqBOwhnsWVfPwodPRTwwgaukeSR6KstNxSN-kB2RD5o5ZN4Dtx6LRX9NuHKTTC52i8O1H4FEh0YIB2T81bmY0Gty3tZzDUJ_8kNaBqKGtXSoHDqmcZ8rBcGZ4mAEb-uJpfHgfiwd-2a7KZ8XkgHuZp6x3V_wCKtwO3E9IZoW6fvj41ubixnkcdl0NX9KIaqM0_5TRfzNgtXEQ";

              return (
                <View key={item._id || index} style={styles.cardContainer}>
                  {/* Card top: thumbnail + info */}
                  <View style={styles.cardMainRow}>
                    {/* Map thumbnail */}
                    <View style={styles.thumbnailContainer}>
                      <Image
                        source={{ uri: mapImage }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Info section */}
                    <View style={styles.cardInfo}>
                      {/* Title + Prize */}
                      <View style={styles.titlePrizeRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.prizeBlock}>
                          <Text style={styles.prizeLabel}>Prize</Text>
                          <Text style={styles.prizeAmount}>
                            {item.prize_pool}
                          </Text>
                        </View>
                      </View>

                      {/* Subtitle */}
                      <View style={styles.statusRow}>
                        <Text style={styles.cardMeta}>
                          {(item.mode || "Solo").toUpperCase()} •{" "}
                          {(item.game_type || "Battle Royale").toUpperCase()}
                        </Text>
                        <CountdownTimer
                          targetDate={`${item.match_date} ${item.match_time}`}
                          onFinish={() => fetchMatches()}
                          variant="inline"
                        />
                      </View>

                      {/* Progress bar */}
                      <View style={styles.progressSection}>
                        <View style={styles.progressLabels}>
                          <Text style={styles.progressText}>
                            JOINED: {participantsCount}/{maxPlayers}
                          </Text>
                          <Text
                            style={[
                              styles.progressPercent,
                              { color: progressColor },
                            ]}
                          >
                            {percent}%
                          </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${percent}%` as any,
                                backgroundColor: progressColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                  {/* Action buttons — single line, 4 buttons */}
                  <View style={styles.actionGrid}>
                    {item.status === "CANCELLED" ? (
                      <View style={styles.cancelledBadge}>
                        <MaterialIcons
                          name="cancel"
                          size={14}
                          color="#ef4444"
                        />
                        <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                      </View>
                    ) : isDraft ? (
                      <>
                        {/* All 4 in single line */}
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnOrange]}
                          onPress={() =>
                            navigation.navigate("CreateMatch", {
                              initialData: item,
                            })
                          }
                        >
                          <MaterialIcons name="edit" size={14} color="#000" />
                          <Text style={styles.actionBtnTextDark}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDark]}
                          onPress={() =>
                            navigation.navigate("MatchDetail", {
                              matchId: item._id,
                            })
                          }
                        >
                          <MaterialIcons
                            name="visibility"
                            size={14}
                            color="rgba(255,255,255,0.8)"
                          />
                          <Text style={styles.actionBtnTextLight}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnRed]}
                          onPress={() => handleDelete(item._id, item.title)}
                        >
                          <MaterialIcons
                            name="delete-outline"
                            size={14}
                            color="#ef4444"
                          />
                          <Text style={styles.actionBtnTextRed}>Delete</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnPublish]}
                          onPress={() => handlePublish(item._id, item.title)}
                        >
                          <MaterialIcons
                            name="rocket-launch"
                            size={14}
                            color="white"
                          />
                          <Text style={styles.actionBtnTextPublish}>
                            PUBLISH
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {/* Always show: View | Share */}
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDark]}
                          onPress={() =>
                            navigation.navigate("MatchDetail", {
                              matchId: item._id,
                            })
                          }
                        >
                          <MaterialIcons
                            name="visibility"
                            size={14}
                            color="rgba(255,255,255,0.8)"
                          />
                          <Text style={styles.actionBtnTextLight}>View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnBlue]}
                          onPress={() => handleShare(item._id, item.title)}
                        >
                          <MaterialIcons
                            name="share"
                            size={14}
                            color="#3b82f6"
                          />
                          <Text style={styles.actionBtnTextBlue}>Share</Text>
                        </TouchableOpacity>

                        {/* ROOM + Cancel: only if event is active AND room credentials NOT set yet */}
                        {item.status !== "COMPLETED" && !item.room_id ? (
                          <>
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                canHostEditCredentials(item)
                                  ? styles.actionBtnAccent
                                  : styles.actionBtnLocked,
                              ]}
                              onPress={() => handleOpenCreds(item)}
                            >
                              <MaterialIcons
                                name={
                                  canHostEditCredentials(item)
                                    ? "vpn-key-off"
                                    : "lock-clock"
                                }
                                size={14}
                                color={
                                  canHostEditCredentials(item)
                                    ? "#fbbf24"
                                    : "rgba(255,255,255,0.3)"
                                }
                              />
                              <Text
                                style={[
                                  styles.actionBtnTextAccent,
                                  !canHostEditCredentials(item) && {
                                    color: "rgba(255,255,255,0.3)",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                SET ROOM
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnRed]}
                              onPress={() =>
                                handleCancelEvent(item._id, item.title)
                              }
                            >
                              <MaterialIcons
                                name="event-busy"
                                size={14}
                                color="#ef4444"
                              />
                              <Text style={styles.actionBtnTextRed}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : null}
                      </>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.5)" }}>
                You haven't created any events yet.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("CreateMatch")}
                style={{ marginTop: 20 }}
              >
                <Text style={{ color: "#f47b25", fontWeight: "bold" }}>
                  Create First Event
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Share Modal */}
      <EventShareModal
        visible={shareModal.visible}
        matchId={shareModal.matchId}
        matchTitle={shareModal.matchTitle}
        onClose={() =>
          setShareModal({ visible: false, matchId: "", matchTitle: "" })
        }
      />

      {/* Cancel Event Modal */}
      <Modal
        visible={cancelModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCancelModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="cancel" size={22} color="#ef4444" />
              <Text style={styles.modalTitle}>Cancel Event</Text>
            </View>

            <Text style={styles.modalSub} numberOfLines={1}>
              {cancelModal.matchTitle}
            </Text>

            <Text style={styles.modalLabel}>
              REASON{" "}
              <Text
                style={{ color: "rgba(255,255,255,0.3)", fontWeight: "normal" }}
              >
                (optional)
              </Text>
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { height: 80, textAlignVertical: "top", paddingTop: 12 },
              ]}
              placeholder="Why are you cancelling?"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={cancelModal.reason}
              onChangeText={(v) =>
                setCancelModal((prev) => ({ ...prev, reason: v }))
              }
              multiline
            />

            <Text style={styles.modalHint}>
              All participants will be refunded automatically. This action
              cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() =>
                  setCancelModal((prev) => ({ ...prev, visible: false }))
                }
                disabled={cancelModal.cancelling}
              >
                <Text style={styles.modalCancelText}>Keep Event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalCancelConfirmBtn,
                  cancelModal.cancelling && { opacity: 0.7 },
                ]}
                onPress={confirmCancel}
                disabled={cancelModal.cancelling}
              >
                {cancelModal.cancelling ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalCancelConfirmText}>
                    CANCEL EVENT
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Room Credentials Modal */}
      <Modal
        visible={credsModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setCredsModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="vpn-key" size={22} color="#fbbf24" />
              <Text style={styles.modalTitle}>Room Credentials</Text>
            </View>

            <Text style={styles.modalSub} numberOfLines={1}>
              {credsModal.matchTitle}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(251,191,36,0.08)",
                borderWidth: 1,
                borderColor: "rgba(251,191,36,0.2)",
                borderRadius: 10,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <MaterialIcons name="info-outline" size={14} color="#fbbf24" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  flex: 1,
                  lineHeight: 16,
                }}
              >
                Visible to participants 5 min before match start. You can edit
                until 5 min after start.
              </Text>
            </View>

            <Text style={styles.modalLabel}>
              ROOM ID <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter in-game Room ID"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={credsModal.roomId}
              onChangeText={(v) =>
                setCredsModal((prev) => ({ ...prev, roomId: v }))
              }
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>
              ROOM PASSWORD{" "}
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontWeight: "normal",
                }}
              >
                (optional)
              </Text>
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Room Password"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={credsModal.roomPassword}
              onChangeText={(v) =>
                setCredsModal((prev) => ({ ...prev, roomPassword: v }))
              }
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() =>
                  setCredsModal((prev) => ({ ...prev, visible: false }))
                }
                disabled={credsModal.saving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPublishBtn,
                  credsModal.saving && { opacity: 0.7 },
                ]}
                onPress={confirmSetCreds}
                disabled={credsModal.saving}
              >
                {credsModal.saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.modalPublishText}>SAVE CREDENTIALS</Text>
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
    backgroundColor: "#0d0d0d",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
  },
  headerTitleCenter: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f47b25",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginLeft: 16,
  },

  scrollView: {
    flex: 1,
  },
  cardContainer: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  cardMainRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  thumbnailContainer: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  progressSection: {
    marginBottom: 10,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  progressText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  progressPercent: {
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  progressBarBg: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  // --- Card info ---
  cardInfo: {
    flex: 1,
  },
  titlePrizeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  prizeBlock: {
    alignItems: "flex-end",
  },
  prizeLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  prizeAmount: {
    color: "#f47b25",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 22,
  },
  cardMeta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  draftBadge: {
    width: "100%",
    paddingHorizontal: 8,
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  draftBadgeText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(244,123,37,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f47b25",
  },
  liveBadgeText: {
    color: "#f47b25",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  actionGrid: { flexDirection: "row", gap: 6 },
  actionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnOrange: {
    backgroundColor: "#f47b25",
  },
  actionBtnDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionBtnRed: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  actionBtnBlue: {
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  actionBtnAccent: {
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  actionBtnLocked: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  actionBtnPublish: {
    backgroundColor: "#f47b25",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  actionBtnTextDark: {
    color: "#000",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionBtnTextLight: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionBtnTextRed: {
    color: "#ef4444",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionBtnTextBlue: {
    color: "#3b82f6",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionBtnTextAccent: {
    color: "#fbbf24",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionBtnTextPublish: {
    color: "white",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cancelledBadge: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  cancelledBadgeText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  actionBtnTextMuted: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
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

  // --- Publish Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  modalSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  modalInput: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    color: "white",
    fontSize: 14,
    marginBottom: 16,
  },
  modalHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    marginBottom: 20,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "bold",
  },
  modalPublishBtn: {
    flex: 2,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#f47b25",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalPublishText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  modalCancelConfirmBtn: {
    flex: 2,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalCancelConfirmText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
