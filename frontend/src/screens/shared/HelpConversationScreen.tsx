import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supportAPI } from '../../services/api';
import { SafeScreen } from '../../components/SafeScreen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PopupModal } from '../../components/PopupModal';
import { COLORS } from '../../theme/colors';

const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
  PAYMENT_ISSUE: { icon: 'credit-card', color: '#22c55e', label: 'Payment Issue' },
  MATCH_DISPUTE: { icon: 'gavel', color: '#f97316', label: 'Match Dispute' },
  ACCOUNT_ISSUE: { icon: 'account-circle', color: '#3b82f6', label: 'Account Issue' },
  PARTNER_RELATED: { icon: 'handshake', color: '#fbbf24', label: 'Partner Related' },
  TECHNICAL_BUG: { icon: 'bug-report', color: '#ef4444', label: 'Technical Bug' },
  REFUND_REQUEST: { icon: 'undo', color: '#a855f7', label: 'Refund Request' },
  REPORT_PLAYER: { icon: 'flag', color: '#f43f5e', label: 'Report Player' },
  GAME_RULES: { icon: 'sports-esports', color: '#06b6d4', label: 'Game Rules' },
  FEATURE_REQUEST: { icon: 'lightbulb-outline', color: '#eab308', label: 'Feature Request' },
  OTHER: { icon: 'help-outline', color: 'rgba(255,255,255,0.6)', label: 'Other' },
};

const PRIORITY_META: Record<string, { color: string; icon: string }> = {
  LOW: { color: '#3b82f6', icon: 'arrow-downward' },
  MEDIUM: { color: '#fbbf24', icon: 'remove' },
  HIGH: { color: '#f97316', icon: 'arrow-upward' },
  URGENT: { color: '#ef4444', icon: 'priority-high' },
};

const STATUS_META: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  OPEN: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: 'inbox', label: 'Open' },
  IN_PROGRESS: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', icon: 'autorenew', label: 'In Progress' },
  AWAITING_USER: { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: 'hourglass-top', label: 'Awaiting You' },
  RESOLVED: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: 'check-circle', label: 'Resolved' },
  CLOSED: { color: '#9ca3af', bg: 'rgba(107,114,128,0.15)', icon: 'lock', label: 'Closed' },
};

export const HelpConversationScreen = ({ navigation, route }: any) => {
  const { ticketId, isAdmin } = route.params || {};
  const insets = useSafeAreaInsets();
  const [ticket, setTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{ uri: string; name: string; type: string; size?: number; mime?: string }[]>([]);
  const [pickingFile, setPickingFile] = useState(false);
  const [attachVisible, setAttachVisible] = useState(false);
  const [popup, setPopup] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    visible: false, type: 'info', title: '', message: '',
  });
  const scrollRef = useRef<ScrollView>(null);
  const closePopup = () => setPopup((p) => ({ ...p, visible: false }));

  const loadTicket = useCallback(async () => {
    try {
      const res = await supportAPI.getTicket(ticketId);
      if (res.data?.success) {
        setTicket(res.data.data);
        setReplies(res.data.data.replies || []);
      }
    } catch (error: any) {
      setPopup({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Could not load ticket' });
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket().finally(() => setLoading(false));
  }, [loadTicket]);

  useEffect(() => {
    if (replies.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [replies.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTicket();
    setRefreshing(false);
  };

  const handleSend = async () => {
    if (!message.trim() && pendingAttachments.length === 0) return;
    setSending(true);
    try {
      let uploadedUrls: string[] = [];
      if (pendingAttachments.length > 0) {
        const upRes = await supportAPI.uploadFiles(
          pendingAttachments.map((a) => ({ uri: a.uri, name: a.name, type: a.type }))
        );
        if (upRes.data?.success) {
          uploadedUrls = upRes.data.data.urls || [];
        } else {
          throw new Error(upRes.data?.message || 'Upload failed');
        }
      }
      const res = await supportAPI.replyToTicket(ticketId, {
        message: message.trim() || (uploadedUrls.length ? '(attachment)' : ''),
        attachments: uploadedUrls,
        is_internal_note: isInternalNote,
      });
      if (res.data?.success) {
        setMessage('');
        setIsInternalNote(false);
        setPendingAttachments([]);
        await loadTicket();
      }
    } catch (error: any) {
      setPopup({ visible: true, type: 'error', title: 'Send Failed', message: error.response?.data?.message || error.message || 'Could not send reply' });
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async (useCamera: boolean) => {
    if (pendingAttachments.length >= 5) {
      setPopup({ visible: true, type: 'info', title: 'Limit reached', message: 'You can attach up to 5 files per message.' });
      return;
    }
    setPickingFile(true);
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPopup({ visible: true, type: 'error', title: 'Permission needed', message: `Please allow ${useCamera ? 'camera' : 'photo library'} access in settings.` });
        return;
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 - pendingAttachments.length });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const newOnes = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `image-${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
        size: a.fileSize,
        mime: a.mimeType || 'image/jpeg',
      }));
      const oversize = newOnes.find((a) => (a.size || 0) > 1024 * 1024);
      if (oversize) {
        setPopup({ visible: true, type: 'error', title: 'File too large', message: `"${oversize.name}" is larger than 1 MB. Please pick a smaller file.` });
        return;
      }
      setPendingAttachments((prev) => [...prev, ...newOnes].slice(0, 5));
    } catch (err: any) {
      setPopup({ visible: true, type: 'error', title: 'Error', message: err.message || 'Could not pick image' });
    } finally {
      setPickingFile(false);
    }
  };

  const handlePickDocument = async () => {
    if (pendingAttachments.length >= 5) {
      setPopup({ visible: true, type: 'info', title: 'Limit reached', message: 'You can attach up to 5 files per message.' });
      return;
    }
    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/zip', 'application/json'],
      });
      if (result.canceled) return;
      const assets = (result as any).assets || [];
      if (assets.length === 0) return;
      const newOnes = assets.map((a: any) => ({
        uri: a.uri,
        name: a.name || 'document',
        type: a.mimeType || 'application/octet-stream',
        size: a.size,
        mime: a.mimeType || 'application/octet-stream',
      }));
      const oversize = newOnes.find((a: any) => (a.size || 0) > 1024 * 1024);
      if (oversize) {
        setPopup({ visible: true, type: 'error', title: 'File too large', message: `"${oversize.name}" is larger than 1 MB. Please pick a smaller file.` });
        return;
      }
      setPendingAttachments((prev) => [...prev, ...newOnes].slice(0, 5));
    } catch (err: any) {
      // expo-document-picker throws on user cancel; only show if it's a real error
      if (err?.code !== 'ERR_CANCELED' && !String(err?.message || '').toLowerCase().includes('cancel')) {
        setPopup({ visible: true, type: 'error', title: 'Error', message: err.message || 'Could not pick document' });
      }
    } finally {
      setPickingFile(false);
    }
  };

  const handleAttach = () => {
    setAttachVisible(true);
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const isImageAttachment = (mime?: string) => !!mime && mime.startsWith('image/');

  const handleClose = async () => {
    try {
      const res = await supportAPI.closeTicket(ticketId);
      if (res.data?.success) {
        setPopup({ visible: true, type: 'success', title: 'Ticket Closed', message: 'Thanks for using support!' });
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error: any) {
      setPopup({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Could not close ticket' });
    }
  };

  const handleReopen = async () => {
    try {
      const res = await supportAPI.reopenTicket(ticketId);
      if (res.data?.success) await loadTicket();
    } catch (error: any) {
      setPopup({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Could not reopen' });
    }
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeScreen>
    );
  }

  if (!ticket) {
    return (
      <SafeScreen>
        <ScreenHeader title="Ticket" showBack onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyText}>Ticket not found</Text>
        </View>
      </SafeScreen>
    );
  }

  const statusMeta = STATUS_META[ticket.status] || STATUS_META.OPEN;
  const catMeta = CATEGORY_META[ticket.category] || CATEGORY_META.OTHER;
  const priMeta = PRIORITY_META[ticket.priority] || PRIORITY_META.MEDIUM;
  const isClosed = ['CLOSED', 'RESOLVED'].includes(ticket.status);
  const canReply = isAdmin || !isClosed;

  return (
    <>
      <ScreenHeader
        title={ticket.ticket_number}
        subtitle={ticket.subject}
        centerTitle
        showBack
        onBack={() => navigation.goBack()}
        rightIcon={isAdmin ? undefined : isClosed ? 'refresh' : 'check-circle'}
        onRightPress={isAdmin ? undefined : isClosed ? handleReopen : handleClose}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Ticket info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoBarLeft}>
            <View style={[styles.catIcon, { backgroundColor: catMeta.color + '20' }]}>
              <MaterialIcons name={catMeta.icon as any} size={16} color={catMeta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.catLabel}>{catMeta.label}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
                <Text style={[styles.statusLabel, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                <View style={styles.dot} />
                <MaterialIcons name={priMeta.icon as any} size={10} color={priMeta.color} />
                <Text style={[styles.priorityLabel, { color: priMeta.color }]}>{ticket.priority}</Text>
              </View>
            </View>
          </View>
          <View style={styles.ticketMetaRight}>
            <Text style={styles.metaLabel}>#{(replies.length + 1)}</Text>
            <Text style={styles.metaSubLabel}>messages</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
        >
          {/* Original message - user bubble */}
          <MessageBubble
            sender={ticket.user_id?.username || 'You'}
            role={ticket.user_role}
            timestamp={ticket.createdAt}
            message={ticket.description}
            isMine={!isAdmin}
            isInternal={false}
            isOriginal
            attachments={ticket.attachments}
          />

          {/* Replies */}
          {replies.map((reply, idx) => {
            const isFromAdmin = reply.sender_role === 'ADMIN';
            const isInternal = reply.is_internal_note;
            // For admin viewing: own replies = right, user replies = left
            // For user viewing: own replies (USER/PARTNER) = right, admin replies = left
            const isMine = isAdmin ? isFromAdmin : !isFromAdmin;
            return (
              <MessageBubble
                key={reply._id}
                sender={reply.sender_id?.username || 'Unknown'}
                role={reply.sender_role}
                timestamp={reply.createdAt}
                message={reply.message}
                isMine={isMine}
                isInternal={isInternal}
                attachments={reply.attachments}
              />
            );
          })}

          {isClosed && !isAdmin && (
            <View style={styles.closedBanner}>
              <View style={styles.closedBannerIcon}>
                <MaterialIcons name="lock" size={20} color="#9ca3af" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.closedBannerTitle}>This ticket is closed</Text>
                <Text style={styles.closedBannerText}>
                  Tap the refresh icon in the header to reopen it.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {canReply && (
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.internalToggle,
                  isInternalNote && styles.internalToggleActive,
                ]}
                onPress={() => setIsInternalNote(!isInternalNote)}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isInternalNote ? 'visibility' : 'visibility-off'}
                  size={12}
                  color={isInternalNote ? '#a855f7' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[
                  styles.internalToggleText,
                  isInternalNote && { color: '#a855f7' },
                ]}>
                  {isInternalNote ? 'Internal note' : 'Public reply'}
                </Text>
              </TouchableOpacity>
            )}

            {pendingAttachments.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attachPreviewRow}
              >
                {pendingAttachments.map((a, idx) => (
                  <View key={idx} style={styles.attachChip}>
                    {isImageAttachment(a.mime) ? (
                      <Image source={{ uri: a.uri }} style={styles.attachImageThumb} />
                    ) : (
                      <View style={styles.attachDocIcon}>
                        <MaterialIcons name="insert-drive-file" size={18} color={COLORS.primary} />
                      </View>
                    )}
                    <View style={styles.attachChipInfo}>
                      <Text style={styles.attachChipName} numberOfLines={1}>{a.name}</Text>
                      <Text style={styles.attachChipSize}>{a.size ? `${Math.round((a.size / 1024))} KB` : ''}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.attachChipClose}
                      onPress={() => removeAttachment(idx)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <MaterialIcons name="close" size={12} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.inputBar}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handleAttach}
                disabled={pickingFile || sending}
                activeOpacity={0.85}
              >
                {pickingFile ? (
                  <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
                ) : (
                  <MaterialIcons name="attach-file" size={20} color="rgba(255,255,255,0.6)" />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                placeholder={isInternalNote ? 'Add internal note (admin only)…' : 'Type your message…'}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={5000}
                editable={!sending}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!message.trim() && pendingAttachments.length === 0) || sending ? { opacity: 0.4 } : null,
                  isInternalNote && { backgroundColor: '#a855f7' },
                ]}
                onPress={handleSend}
                disabled={(!message.trim() && pendingAttachments.length === 0) || sending}
                activeOpacity={0.85}
              >
                {sending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <MaterialIcons
                    name={isInternalNote ? 'visibility' : 'send'}
                    size={16}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={attachVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ATTACH FILE</Text>
            <Text style={styles.modalSubtitle}>Choose a source for your attachment</Text>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setAttachVisible(false);
                  handlePickImage(true);
                }}
              >
                <MaterialIcons name="photo-camera" size={24} color={COLORS.primary} />
                <Text style={styles.modalButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setAttachVisible(false);
                  handlePickImage(false);
                }}
              >
                <MaterialIcons name="photo-library" size={24} color={COLORS.primary} />
                <Text style={styles.modalButtonText}>Photo Library</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setAttachVisible(false);
                  handlePickDocument();
                }}
              >
                <MaterialIcons name="insert-drive-file" size={24} color={COLORS.primary} />
                <Text style={styles.modalButtonText}>Document</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setAttachVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
      />
    </>
  );
};

// ============== MESSAGE BUBBLE ==============
const MessageBubble = ({ sender, role, timestamp, message, isMine, isInternal, isOriginal, attachments }: any) => {
  const time = new Date(timestamp);
  const isAdminMsg = role === 'ADMIN';
  const bubbleColor = isInternal
    ? 'rgba(168,85,247,0.15)'
    : isAdminMsg
      ? '#0F172A'
      : isMine
        ? '#f47b25'
        : '#0F172A';
  const textColor = isInternal
    ? 'rgba(255,255,255,0.9)'
    : 'white';
  const borderColor = isInternal
    ? 'rgba(168,85,247,0.4)'
    : isAdminMsg
      ? 'rgba(59,130,246,0.3)'
      : isMine
        ? 'rgba(244,123,37,0.3)'
        : 'rgba(255,255,255,0.08)';

  const attachList: { url: string; name?: string; mime?: string }[] = Array.isArray(attachments)
    ? attachments.map((a: any) => (typeof a === 'string' ? { url: a } : a))
    : [];
  const isImage = (url: string) => /\.(jpe?g|png|gif|webp|heic|heif)(\?|$)/i.test(url);

  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      {!isMine && (
        <View style={[styles.bubbleAvatar, isAdminMsg ? styles.avatarAdmin : styles.avatarUser]}>
          <Text style={[styles.bubbleAvatarText, isAdminMsg ? { color: '#ef4444' } : { color: '#f47b25' }]}>
            {sender.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ maxWidth: '78%' }}>
        <View style={styles.bubbleHeader}>
          {!isMine && <Text style={styles.bubbleSender}>{sender}</Text>}
          {isInternal && (
            <View style={styles.internalChip}>
              <MaterialIcons name="lock" size={9} color="#a855f7" />
              <Text style={styles.internalChipText}>INTERNAL</Text>
            </View>
          )}
          {isOriginal && !isInternal && (
            <View style={styles.originalChip}>
              <MaterialIcons name="flag" size={9} color="#f47b25" />
              <Text style={styles.originalChipText}>ORIGINAL</Text>
            </View>
          )}
        </View>
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            isInternal && styles.bubbleInternal,
            { borderColor },
          ]}
        >
          {isInternal ? (
            <View style={styles.bubbleDark}>
              <Text style={[styles.bubbleText, { color: textColor }]}>{message}</Text>
            </View>
          ) : isMine ? (
            <LinearGradient
              colors={isAdminMsg ? ['#3b82f6', '#2563eb'] : ['#f47b25', '#ea580c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubbleGradient}
            >
              <Text style={[styles.bubbleText, { color: 'white' }]}>{message}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubbleDark, { backgroundColor: bubbleColor }]}>
              <Text style={[styles.bubbleText, { color: textColor }]}>{message}</Text>
            </View>
          )}
        </View>

        {attachList.length > 0 && (
          <View style={styles.bubbleAttachments}>
            {attachList.map((att, i) => {
              const url = att.url;
              if (isImage(url)) {
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.85}
                    onPress={() => Linking.openURL(url)}
                    style={styles.bubbleImageWrap}
                  >
                    <Image source={{ uri: url }} style={styles.bubbleImage} resizeMode="cover" />
                  </TouchableOpacity>
                );
              }
              const fileName = att.name || url.split('/').pop() || 'file';
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL(url)}
                  style={styles.bubbleFileRow}
                >
                  <View style={styles.bubbleFileIcon}>
                    <MaterialIcons name="insert-drive-file" size={16} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bubbleFileName} numberOfLines={1}>{fileName}</Text>
                    <Text style={styles.bubbleFileAction}>Tap to open</Text>
                  </View>
                  <MaterialIcons name="download" size={14} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={[styles.bubbleFooter, isMine ? styles.bubbleFooterMine : styles.bubbleFooterTheirs]}>
          <Text style={styles.bubbleRole}>{role}</Text>
          <View style={styles.dot} />
          <Text style={styles.bubbleTime}>{formatTime(time)}</Text>
        </View>
      </View>
    </View>
  );
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday • ${time}`;
  if (diffDays < 7) return `${diffDays}d ago • ${time}`;
  return `${date.toLocaleDateString()} • ${time}`;
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  // Info bar (ticket meta)
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  infoBarLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { color: 'white', fontSize: 12, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  priorityLabel: { fontSize: 10, fontWeight: '800' },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  ticketMetaRight: { alignItems: 'flex-end' },
  metaLabel: { color: 'white', fontSize: 16, fontWeight: '900' },
  metaSubLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Bubble
  bubbleRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAdmin: { backgroundColor: 'rgba(239,68,68,0.2)' },
  avatarUser: { backgroundColor: 'rgba(244,123,37,0.2)' },
  bubbleAvatarText: { fontSize: 13, fontWeight: '900' },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  bubbleSender: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
  internalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  internalChipText: { color: '#a855f7', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  originalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(244,123,37,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  originalChipText: { color: '#f47b25', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  bubble: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: { borderBottomLeftRadius: 6 },
  bubbleInternal: { borderStyle: 'dashed' },
  bubbleGradient: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleDark: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  bubbleFooterMine: { justifyContent: 'flex-end' },
  bubbleFooterTheirs: { justifyContent: 'flex-start' },
  bubbleRole: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  bubbleTime: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '600' },

  // Closed banner
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(156,163,175,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.2)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  closedBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(156,163,175,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedBannerTitle: { color: 'white', fontSize: 13, fontWeight: '800' },
  closedBannerText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2, lineHeight: 16 },

  // Input
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  internalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 6,
  },
  internalToggleActive: { backgroundColor: 'rgba(168,85,247,0.15)' },
  internalToggleText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },

  // Attach button + previews
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachPreviewRow: {
    gap: 8,
    paddingBottom: 8,
    paddingRight: 4,
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    maxWidth: 220,
  },
  attachImageThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  attachDocIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(244,123,37,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachChipInfo: { flex: 1, minWidth: 0 },
  attachChipName: { color: 'white', fontSize: 11, fontWeight: '700' },
  attachChipSize: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', marginTop: 1 },
  attachChipClose: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bubble attachments
  bubbleAttachments: {
    marginTop: 6,
    gap: 6,
  },
  bubbleImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  bubbleImage: {
    width: 200,
    height: 140,
    backgroundColor: '#000',
  },
  bubbleFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  bubbleFileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244,123,37,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleFileName: { color: 'white', fontSize: 12, fontWeight: '700' },
  bubbleFileAction: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Custom modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalCancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
