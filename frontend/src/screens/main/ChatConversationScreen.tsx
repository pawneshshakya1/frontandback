import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { chatAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import { PopupModal } from "../../components/PopupModal";
import { sseService } from "../../services/sse";

type Message = {
  _id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export const ChatConversationScreen = ({ navigation, route }: any) => {
  const { friendId, friendName, friendAvatar } = route.params;
  const insets = useSafeAreaInsets();
  const { authData } = useAuth();
  const myId = authData?.userId || authData?._id;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [iHavePass, setIHavePass] = useState(true);
  const [otherHasPass, setOtherHasPass] = useState(true);
  const [errorPopup, setErrorPopup] = useState({ visible: false, title: "", message: "" });
  const listRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      open();
      const handler = (ev: any) => {
        if (ev?.conversation_id === conversationId) {
          setMessages((prev) => [
            ...prev,
            {
              _id: `tmp-${Date.now()}`,
              sender_id: ev.sender?._id || ev.sender?.id || friendId,
              content: ev.content,
              created_at: ev.created_at,
            },
          ]);
          scrollToEnd();
        }
      };
      sseService.on("CHAT_MESSAGE", handler);
      return () => { sseService.off("CHAT_MESSAGE", handler); };
    }, [conversationId])
  );

  const open = async () => {
    try {
      setLoading(true);
      const convRes = await chatAPI.openOrCreate(friendId);
      if (!convRes.data.success) {
        setErrorPopup({ visible: true, title: "Cannot start chat", message: convRes.data.message || "Failed to open conversation" });
        return;
      }
      const data = convRes.data.data || {};
      setIHavePass(!!data.i_have_pass);
      setOtherHasPass(data.other_has_pass !== false);
      const convId = data.conversation_id;
      setConversationId(convId);
      const msgRes = await chatAPI.listMessages(convId);
      if (msgRes.data.success) {
        setMessages(msgRes.data.data || []);
        setTimeout(scrollToEnd, 100);
      }
    } catch (e: any) {
      setErrorPopup({ visible: true, title: "Cannot start chat", message: e.response?.data?.message || e.message || "Failed to open conversation" });
    } finally {
      setLoading(false);
    }
  };

  const scrollToEnd = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    const optimistic: Message = {
      _id: `local-${Date.now()}`,
      sender_id: myId,
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToEnd();
    try {
      const res = await chatAPI.sendMessage(friendId, trimmed);
      if (res.data.success) {
        setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? { ...m, _id: res.data.data._id } : m)));
      }
    } catch (e: any) {
      setErrorPopup({ visible: true, title: "Send failed", message: e.response?.data?.message || e.message });
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === myId;
    const prev = messages[index - 1];
    const showAvatar = !isMe && (!prev || prev.sender_id !== item.sender_id);
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        {!isMe && (
          showAvatar ? (
            friendAvatar ? (
              <Image source={{ uri: friendAvatar }} style={styles.bubbleAvatar} />
            ) : (
              <View style={[styles.bubbleAvatar, styles.avatarFallback]}>
                <MaterialIcons name="person" size={12} color="rgba(255,255,255,0.5)" />
              </View>
            )
          ) : (
            <View style={styles.bubbleAvatarSpacer} />
          )
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.headerBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {friendAvatar ? (
            <Image source={{ uri: friendAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarFallback]}>
              <MaterialIcons name="person" size={16} color="rgba(255,255,255,0.5)" />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{friendName || "Chat"}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 12, gap: 4 }}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 80 }}>
              <MaterialIcons name="forum" size={48} color="rgba(244,123,37,0.3)" />
              <Text style={styles.emptyHint}>Say hi 👋</Text>
            </View>
          }
        />
      )}

      {!iHavePass && (
        <TouchableOpacity
          style={styles.eligibilityBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("ElitePass")}
        >
          <MaterialIcons name="workspace-premium" size={18} color="#fbbf24" />
          <Text style={styles.eligibilityBannerText} numberOfLines={2}>
            Get an Elite Pass to reply in this conversation
          </Text>
          <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      )}

      {!otherHasPass && iHavePass && (
        <View style={styles.friendNoPassBanner}>
          <MaterialIcons name="info-outline" size={16} color="rgba(244,123,37,0.8)" />
          <Text style={styles.friendNoPassText} numberOfLines={2}>
            {friendName} doesn't have an Elite Pass yet — they can read but not reply.
          </Text>
        </View>
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={[styles.input, !iHavePass && { opacity: 0.5 }]}
          value={text}
          onChangeText={setText}
          placeholder={iHavePass ? "Message" : "Get Elite Pass to reply"}
          placeholderTextColor="rgba(255,255,255,0.3)"
          editable={iHavePass}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending || !iHavePass) && { opacity: 0.4 }]}
          onPress={send}
          disabled={!text.trim() || sending || !iHavePass}
        >
          <MaterialIcons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <PopupModal
        visible={errorPopup.visible}
        type="error"
        title={errorPopup.title}
        message={errorPopup.message}
        confirmText="OK"
        onConfirm={() => {
          setErrorPopup({ visible: false, title: "", message: "" });
          if (!conversationId) navigation.goBack();
        }}
        onClose={() => setErrorPopup({ visible: false, title: "", message: "" })}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#1a1a1a" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "white", fontSize: 16, fontWeight: "900", maxWidth: 200 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginVertical: 2 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowThem: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#1a1a1a", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: "white" },
  bubbleTextThem: { color: "rgba(255,255,255,0.9)" },
  bubbleTime: { fontSize: 10, marginTop: 4, fontWeight: "600" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },
  bubbleTimeThem: { color: "rgba(255,255,255,0.4)" },
  bubbleAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#1a1a1a" },
  bubbleAvatarSpacer: { width: 24 },
  emptyHint: { color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 12 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)", backgroundColor: "#0d0d0d" },
  input: { flex: 1, color: "white", backgroundColor: "#1a1a1a", borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  eligibilityBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(251,191,36,0.1)", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  eligibilityBannerText: { color: "white", fontSize: 12, fontWeight: "700", flex: 1 },
  friendNoPassBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(244,123,37,0.06)", borderWidth: 1, borderColor: "rgba(244,123,37,0.15)" },
  friendNoPassText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "600", flex: 1 },
});
