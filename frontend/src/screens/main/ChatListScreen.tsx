import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import { chatAPI, friendAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";
import { useAuth } from "../../context/AuthContext";

type Conversation = {
  _id: string;
  other_user: { _id: string; username: string; avatar?: string | null } | null;
  other_has_pass?: boolean;
  last_message: string | null;
  last_message_at: string;
  unread: boolean;
};

type FriendRow = {
  _id: string;
  user?: { _id: string; username: string; avatar?: string | null; email?: string };
  username?: string;
  avatar?: string | null;
};

type SearchUser = {
  _id: string;
  username: string;
  email: string;
  avatar?: string | null;
  friend_status: "none" | "pending_in" | "pending_out" | "accepted" | "blocked";
  friendship_id: string | null;
};

type PendingRequest = {
  _id: string;
  requester: { _id: string; username: string; email: string; avatar?: string | null };
  created_at: string;
};

export const ChatListScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [eligible, setEligible] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [popup, setPopup] = useState({ visible: false, title: "", message: "", type: "warning" as any });
  const [showMyQr, setShowMyQr] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    try {
      const [eligRes, convRes, friendsRes, pendingRes] = await Promise.allSettled([
        chatAPI.getEligibility(),
        chatAPI.listConversations(),
        friendAPI.getFriends(),
        friendAPI.getPendingRequests(),
      ]);
      if (eligRes.status === "fulfilled") {
        setEligible(eligRes.value.data.data?.eligible ?? false);
      }
      if (convRes.status === "fulfilled" && convRes.value.data.success) {
        setConversations(convRes.value.data.data || []);
      }
      if (friendsRes.status === "fulfilled" && friendsRes.value.data.success) {
        setFriends(friendsRes.value.data.data || []);
      }
      if (pendingRes.status === "fulfilled" && pendingRes.value.data.success) {
        setPending(pendingRes.value.data.data || []);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openChat = (otherUserId: string, otherUsername: string, otherAvatar?: string | null) => {
    navigation.navigate("ChatConversation", { friendId: otherUserId, friendName: otherUsername, friendAvatar: otherAvatar });
  };

  const handleAccept = async (requestId: string) => {
    try {
      await friendAPI.acceptRequest(requestId);
      setPending((prev) => prev.filter((r) => r._id !== requestId));
      load();
    } catch (e: any) {
      setPopup({ visible: true, type: "error", title: "Error", message: e.response?.data?.message || "Failed to accept" });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await friendAPI.rejectRequest(requestId);
      setPending((prev) => prev.filter((r) => r._id !== requestId));
    } catch (e: any) {
      setPopup({ visible: true, type: "error", title: "Error", message: e.response?.data?.message || "Failed to reject" });
    }
  };

  const renderRow = ({ item }: { item: Conversation }) => {
    if (!item.other_user) return null;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => openChat(item.other_user!._id, item.other_user!.username, item.other_user!.avatar)}
      >
        {item.other_user.avatar ? (
          <Image source={{ uri: item.other_user.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <MaterialIcons name="person" size={22} color="rgba(255,255,255,0.5)" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>{item.other_user.username}</Text>
              {item.other_has_pass === false && (
                <View style={styles.noPassBadge}>
                  <Text style={styles.noPassBadgeText}>NO PASS</Text>
                </View>
              )}
            </View>
            <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
          </View>
          <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={1}>
            {item.last_message || "Say hi 👋"}
          </Text>
        </View>
        {item.unread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerBar}><View style={{ width: 40 }} /><Text style={styles.headerTitle}>Chats</Text><View style={{ width: 40 }} /></View>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity
          onPress={() => {
            if (!eligible) {
              setPopup({ visible: true, type: "warning", title: "Elite Pass required", message: "Chat is available only with an active Elite Pass (PRO / ELITE / SUPREME)." });
              return;
            }
            setShowAddFriendModal(true);
          }}
          style={[styles.backBtn, { backgroundColor: COLORS.primary + "20", borderColor: COLORS.primary }]}
        >
          <MaterialIcons name="person-add" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {!eligible && (
        <TouchableOpacity
          style={styles.eligibleBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("ElitePass")}
        >
          <MaterialIcons name="workspace-premium" size={20} color="#fbbf24" />
          <Text style={styles.eligibleBannerText}>
            Get an Elite Pass to unlock friend-to-friend chat
          </Text>
          <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      )}

      {/* Pending friend requests */}
      {pending.length > 0 && (
        <View style={styles.pendingBlock}>
          <Text style={styles.pendingHeader}>FRIEND REQUESTS · {pending.length}</Text>
          {pending.map((req) => (
            <View key={req._id} style={styles.pendingCard}>
              {req.requester.avatar ? (
                <Image source={{ uri: req.requester.avatar }} style={styles.pendingAvatar} />
              ) : (
                <View style={[styles.pendingAvatar, styles.avatarFallback]}>
                  <MaterialIcons name="person" size={18} color="rgba(255,255,255,0.5)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingName} numberOfLines={1}>{req.requester.username}</Text>
                <Text style={styles.pendingEmail} numberOfLines={1}>{req.requester.email}</Text>
              </View>
              <TouchableOpacity style={[styles.pendingBtn, styles.pendingAccept]} onPress={() => handleAccept(req._id)}>
                <MaterialIcons name="check" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pendingBtn, styles.pendingReject]} onPress={() => handleReject(req._id)}>
                <MaterialIcons name="close" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={(c) => c._id}
        renderItem={renderRow}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          eligible && conversations.length === 0 && pending.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 }}>
              <MaterialIcons name="forum" size={56} color="rgba(244,123,37,0.3)" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>Tap the + button to add a friend and start chatting.</Text>
            </View>
          ) : null
        }
      />

      {/* Add Friend modal */}
      <AddFriendModal
        visible={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
        onOpenChat={(u) => {
          setShowAddFriendModal(false);
          setTimeout(() => openChat(u._id, u.username, u.avatar), 250);
        }}
        onShowMyQr={() => {
          setShowAddFriendModal(false);
          setTimeout(() => setShowMyQr(true), 250);
        }}
        onPopup={(p) => setPopup(p)}
      />

      {/* My QR modal */}
      <Modal visible={showMyQr} transparent animationType="fade" onRequestClose={() => setShowMyQr(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMyQr(false)}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        <View pointerEvents="box-none" style={styles.modalWrapper}>
          <View style={styles.qrCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Friend Code</Text>
              <TouchableOpacity onPress={() => setShowMyQr(false)}>
                <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.qrHint}>Have a friend scan this code to send you a friend request.</Text>
            <View style={styles.qrBox}>
              <QRCode
                value={JSON.stringify({
                  email: authData?.email || "",
                  username: authData?.username || "",
                  userId: authData?.userId || authData?._id || "",
                })}
                size={200}
                backgroundColor="white"
                color="#0d0d0d"
              />
            </View>
            <Text style={styles.qrEmail}>{authData?.email}</Text>
          </View>
        </View>
      </Modal>

      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        confirmText={popup.type === "warning" ? "GET ELITE PASS" : "OK"}
        cancelText={popup.type === "warning" ? "CANCEL" : undefined}
        onConfirm={() => {
          setPopup({ visible: false, title: "", message: "", type: "warning" });
          if (popup.type === "warning") navigation.navigate("ElitePass");
        }}
        onCancel={() => setPopup({ visible: false, title: "", message: "", type: "warning" })}
        onClose={() => setPopup({ visible: false, title: "", message: "", type: "warning" })}
      />
    </View>
  );
};

const AddFriendModal = ({
  visible,
  onClose,
  onOpenChat,
  onShowMyQr,
  onPopup,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenChat: (u: { _id: string; username: string; avatar?: string | null }) => void;
  onShowMyQr: () => void;
  onPopup: (p: { visible: boolean; title: string; message: string; type: any }) => void;
}) => {
  const [tab, setTab] = useState<"search" | "scan" | "new">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTab("search");
      setQuery("");
      setResults([]);
      setScanned(false);
      setScanError(null);
      friendAPI.getFriends().then((res) => {
        if (res.data.success) setFriends(res.data.data || []);
      }).catch(() => {});
    }
  }, [visible]);

  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await friendAPI.searchUsers(query.trim());
        if (res.data.success) setResults(res.data.data || []);
      } catch (e) {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    setSearchTimer(t);
  }, [query]);

  const sendRequest = async (email: string) => {
    if (sendingId) return;
    setSendingId(email);
    try {
      const res = await friendAPI.sendRequest({ email });
      if (res.data.success) {
        onPopup({ visible: true, type: "success", title: "Request sent", message: res.data.message || "Friend request sent." });
        const r = await friendAPI.searchUsers(query.trim());
        if (r.data.success) setResults(r.data.data || []);
      }
    } catch (e: any) {
      onPopup({ visible: true, type: "error", title: "Failed", message: e.response?.data?.message || "Could not send request" });
    } finally {
      setSendingId(null);
    }
  };

  const handleScanned = async (data: string) => {
    if (scanned || scanBusy) return;
    setScanned(true);
    setScanBusy(true);
    setScanError(null);
    try {
      let email = data;
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && parsed.email) email = parsed.email;
      } catch (_) { /* keep raw */ }
      const res = await friendAPI.sendRequest({ email });
      if (res.data.success) {
        onPopup({ visible: true, type: "success", title: "Friend request sent", message: res.data.message || `Sent to ${email}` });
        onClose();
      }
    } catch (e: any) {
      setScanError(e.response?.data?.message || "Could not parse QR / send request");
    } finally {
      setScanBusy(false);
    }
  };

  const openCamera = async () => {
    setTab("scan");
    if (!cameraPermission || cameraPermission.status !== "granted") {
      await requestCameraPermission();
    }
  };

  const friendById = (id: string) => friends.find((f) => f._id === id || f.user?._id === id);
  const friendName = (f: FriendRow) => f.user?.username || f.username || "Friend";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View pointerEvents="box-none" style={styles.modalWrapper}>
        <View style={[styles.modalCard, { maxHeight: "85%" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.tabBtn, tab === "search" && styles.tabBtnActive]} onPress={() => setTab("search")}>
              <MaterialIcons name="search" size={16} color={tab === "search" ? COLORS.primary : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.tabBtnText, tab === "search" && { color: COLORS.primary }]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, tab === "scan" && styles.tabBtnActive]} onPress={() => openCamera()}>
              <MaterialIcons name="qr-code-scanner" size={16} color={tab === "scan" ? COLORS.primary : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.tabBtnText, tab === "scan" && { color: COLORS.primary }]}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, tab === "new" && styles.tabBtnActive]} onPress={() => setTab("new")}>
              <MaterialIcons name="forum" size={16} color={tab === "new" ? COLORS.primary : "rgba(255,255,255,0.5)"} />
              <Text style={[styles.tabBtnText, tab === "new" && { color: COLORS.primary }]}>Friends</Text>
            </TouchableOpacity>
          </View>

          {tab === "search" && (
            <View>
              <View style={styles.searchInputWrap}>
                <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.4)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by email or username"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                {!!query && (
                  <TouchableOpacity onPress={() => setQuery("")}>
                    <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}
              </View>

              {searching ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(u) => u._id}
                  style={{ maxHeight: 360 }}
                  renderItem={({ item }) => (
                    <View style={styles.userRow}>
                      {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
                      ) : (
                        <View style={[styles.userAvatar, styles.avatarFallback]}>
                          <MaterialIcons name="person" size={18} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{item.username}</Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                      </View>
                      {item.friend_status === "accepted" && (
                        <View style={styles.friendAccepted}>
                          <Text style={styles.friendAcceptedText}>FRIENDS</Text>
                        </View>
                      )}
                      {item.friend_status === "pending_in" && (
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => item.friendship_id && onClose() /* close so they can accept from the list */}
                        >
                          <Text style={styles.acceptBtnText}>ACCEPT</Text>
                        </TouchableOpacity>
                      )}
                      {item.friend_status === "pending_out" && (
                        <View style={styles.pendingBtnSm}>
                          <Text style={styles.pendingBtnSmText}>SENT</Text>
                        </View>
                      )}
                      {item.friend_status === "blocked" && (
                        <View style={styles.blockedBtnSm}>
                          <Text style={styles.blockedBtnSmText}>BLOCKED</Text>
                        </View>
                      )}
                      {item.friend_status === "none" && (
                        <TouchableOpacity
                          style={[styles.sendBtn, sendingId === item.email && { opacity: 0.4 }]}
                          disabled={!!sendingId}
                          onPress={() => sendRequest(item.email)}
                        >
                          {sendingId === item.email ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={styles.sendBtnText}>SEND</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    !!query ? (
                      <View style={{ alignItems: "center", paddingVertical: 24 }}>
                        <MaterialIcons name="person-search" size={40} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptySub}>No users found</Text>
                      </View>
                    ) : (
                      <View style={{ alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, gap: 6 }}>
                        <MaterialIcons name="tips-and-updates" size={28} color="rgba(244,123,37,0.3)" />
                        <Text style={styles.emptyHint}>Type an email or username to find people on BattleCore.</Text>
                        <TouchableOpacity onPress={onShowMyQr} style={styles.showMyQrLink}>
                          <MaterialIcons name="qr-code" size={14} color={COLORS.primary} />
                          <Text style={styles.showMyQrLinkText}>Show my QR code</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  }
                />
              )}
            </View>
          )}

          {tab === "scan" && (
            <View>
              {!cameraPermission ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <ActivityIndicator color={COLORS.primary} />
                </View>
              ) : cameraPermission.status !== "granted" ? (
                <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
                  <MaterialIcons name="camera-alt" size={40} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.scanText}>Camera permission is needed to scan QR codes.</Text>
                  <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
                    <Text style={styles.permissionBtnText}>ALLOW CAMERA</Text>
                  </TouchableOpacity>
                  {cameraPermission.canAskAgain === false && (
                    <TouchableOpacity onPress={() => Linking.openSettings()}>
                      <Text style={styles.settingsLink}>Open Settings</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View>
                  <View style={styles.scanViewport}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      onBarcodeScanned={scanned || scanBusy ? undefined : ({ data }: any) => handleScanned(data)}
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    <View style={styles.scanFrame}>
                      <View style={[styles.scanCorner, styles.cornerTL]} />
                      <View style={[styles.scanCorner, styles.cornerTR]} />
                      <View style={[styles.scanCorner, styles.cornerBL]} />
                      <View style={[styles.scanCorner, styles.cornerBR]} />
                    </View>
                  </View>
                  {scanBusy && (
                    <View style={{ alignItems: "center", paddingVertical: 10 }}>
                      <ActivityIndicator color={COLORS.primary} />
                      <Text style={styles.scanText}>Sending request…</Text>
                    </View>
                  )}
                  {scanError && (
                    <View style={styles.scanErrorBox}>
                      <Text style={styles.scanErrorText}>{scanError}</Text>
                      <TouchableOpacity onPress={() => { setScanned(false); setScanError(null); }}>
                        <Text style={styles.retryText}>TRY AGAIN</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {!scanBusy && !scanError && (
                    <Text style={styles.scanHint}>Point your camera at a friend's QR code.</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {tab === "new" && (
            <FlatList
              data={friends}
              keyExtractor={(f) => f._id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const u = item.user || item;
                return (
                  <TouchableOpacity style={styles.userRow} onPress={() => onOpenChat({ _id: u._id, username: u.username || "Friend", avatar: u.avatar || null })}>
                    {u.avatar ? (
                      <Image source={{ uri: u.avatar }} style={styles.userAvatar} />
                    ) : (
                      <View style={[styles.userAvatar, styles.avatarFallback]}>
                        <MaterialIcons name="person" size={18} color="rgba(255,255,255,0.5)" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{friendName(item)}</Text>
                      <Text style={styles.userEmail}>Tap to chat</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <MaterialIcons name="person-search" size={40} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptySub}>You have no friends yet.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#1a1a1a" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  name: { color: "white", fontSize: 15, fontWeight: "800" },
  time: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 8 },
  preview: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  previewUnread: { color: "white", fontWeight: "700" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  noPassBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  noPassBadgeText: { color: "#ef4444", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  sep: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginLeft: 76 },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  modalWrapper: { flex: 1, justifyContent: "center", paddingHorizontal: 16 },
  modalCard: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8, paddingVertical: 8, marginBottom: 8 },
  modalTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySub: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6, textAlign: "center" },
  emptyHint: { color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center", marginTop: 4 },
  eligibleBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.1)", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  eligibleBannerText: { color: "white", fontSize: 12, fontWeight: "700", flex: 1 },

  pendingBlock: { marginHorizontal: 16, marginBottom: 8, gap: 6 },
  pendingHeader: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginBottom: 4 },
  pendingCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "rgba(244,123,37,0.2)" },
  pendingAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0d0d0d" },
  pendingName: { color: "white", fontSize: 14, fontWeight: "700" },
  pendingEmail: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 },
  pendingBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pendingAccept: { backgroundColor: COLORS.primary },
  pendingReject: { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },

  tabRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  tabBtnActive: { backgroundColor: COLORS.primary + "15", borderColor: COLORS.primary + "50" },
  tabBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "800" },

  searchInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 8 },
  searchInput: { flex: 1, color: "white", fontSize: 14, paddingVertical: 0 },

  userRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0d0d0d" },
  userName: { color: "white", fontSize: 14, fontWeight: "700" },
  userEmail: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 },

  sendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primary },
  sendBtnText: { color: "white", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" },
  acceptBtnText: { color: "#22c55e", fontSize: 10, fontWeight: "900" },
  pendingBtnSm: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)" },
  pendingBtnSmText: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  blockedBtnSm: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "rgba(239,68,68,0.1)" },
  blockedBtnSmText: { color: "#ef4444", fontSize: 9, fontWeight: "900" },
  friendAccepted: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: "rgba(34,197,94,0.15)" },
  friendAcceptedText: { color: "#22c55e", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },

  showMyQrLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  showMyQrLinkText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },

  scanViewport: { width: "100%", height: 260, borderRadius: 12, overflow: "hidden", backgroundColor: "#0d0d0d", position: "relative" },
  scanFrame: { position: "absolute", top: "20%", left: "15%", right: "15%", bottom: "20%", borderColor: "transparent" },
  scanCorner: { position: "absolute", width: 28, height: 28, borderColor: COLORS.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  scanText: { color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center", marginTop: 4 },
  scanHint: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginTop: 10 },
  scanErrorBox: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scanErrorText: { color: "#ef4444", fontSize: 12, flex: 1 },
  retryText: { color: "#ef4444", fontSize: 11, fontWeight: "900", letterSpacing: 0.5, marginLeft: 8 },
  permissionBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary },
  permissionBtnText: { color: "white", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  settingsLink: { color: COLORS.primary, fontSize: 12, fontWeight: "700", marginTop: 4 },

  qrCard: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", alignItems: "center" },
  qrHint: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center", marginBottom: 14, paddingHorizontal: 8 },
  qrBox: { padding: 14, backgroundColor: "white", borderRadius: 12 },
  qrEmail: { color: "white", fontSize: 13, fontWeight: "700", marginTop: 14, textAlign: "center" },
});
