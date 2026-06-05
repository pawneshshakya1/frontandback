import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { matchAPI } from "../services/api";

interface EventShareModalProps {
  visible: boolean;
  matchId: string;
  matchTitle: string;
  onClose: () => void;
}

export const EventShareModal: React.FC<EventShareModalProps> = ({
  visible,
  matchId,
  matchTitle,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState<{
    share_token: string;
    invite_code: string;
    share_url: string;
    web_url: string;
    share_count: number;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && matchId) {
      generateShare();
    }
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [visible, matchId]);

  const generateShare = async () => {
    setLoading(true);
    try {
      const res = await matchAPI.shareEvent(matchId);
      if (res.data.success) {
        setShareData(res.data.data);
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to generate share link");
    } finally {
      setLoading(false);
    }
  };

  const handleNativeShare = async () => {
    if (!shareData) return;
    try {
      await Share.share({
        message: `Join my BattleCore event "${matchTitle}"!\n\nInvite Code: ${shareData.invite_code}\nLink: ${shareData.share_url}`,
        title: `Join "${matchTitle}" on BattleCore`,
      });
    } catch (err: any) {
      console.error("Share error:", err);
    }
  };

  const handleCopy = (text: string, label: string) => {
    try {
      const Clipboard = require("expo-clipboard");
      Clipboard.setStringAsync(text);
      Alert.alert("Copied", `${label} copied to clipboard`);
    } catch (err) {
      Alert.alert("Copy", text);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <MaterialIcons name="share" size={20} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Share Event</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {matchTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={styles.loadingText}>Generating share link…</Text>
            </View>
          ) : shareData ? (
            <>
              {/* QR Code visual (using styled box) */}
              <View style={styles.qrContainer}>
                <View style={styles.qrBox}>
                  <View style={styles.qrPlaceholder}>
                    <MaterialIcons name="qr-code-2" size={120} color="#0d0d0d" />
                    <Text style={styles.qrCodeText}>{shareData.invite_code}</Text>
                  </View>
                </View>
                <Text style={styles.qrHint}>Scan QR or share invite code</Text>
              </View>

              {/* Invite Code */}
              <View style={styles.codeSection}>
                <Text style={styles.codeLabel}>INVITE CODE</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>{shareData.invite_code}</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopy(shareData.invite_code, "Invite code")}
                  >
                    <MaterialIcons name="content-copy" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Deep Link */}
              <View style={styles.codeSection}>
                <Text style={styles.codeLabel}>APP LINK</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.linkText} numberOfLines={1}>
                    {shareData.share_url}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopy(shareData.share_url, "App link")}
                  >
                    <MaterialIcons name="content-copy" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Share count */}
              <View style={styles.shareCountRow}>
                <MaterialIcons name="people" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.shareCountText}>
                  {shareData.share_count || 0} share{shareData.share_count === 1 ? "" : "s"}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={generateShare}
                  disabled={loading}
                >
                  <MaterialIcons name="refresh" size={16} color="white" />
                  <Text style={styles.actionBtnTextSecondary}>Regenerate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={handleNativeShare}
                >
                  <MaterialIcons name="send" size={16} color="white" />
                  <Text style={styles.actionBtnTextPrimary}>SHARE NOW</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrBox: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: "white",
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  qrCodeText: {
    color: "#0d0d0d",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: 2,
  },
  qrHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    marginTop: 10,
  },
  codeSection: {
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  codeText: {
    flex: 1,
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  linkText: {
    flex: 1,
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(59,130,246,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 20,
    justifyContent: "center",
  },
  shareCountText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  actionBtnTextPrimary: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionBtnTextSecondary: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
