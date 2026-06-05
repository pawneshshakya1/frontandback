import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../../theme/colors';
import { adminAPI } from '../../services/api';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { EmptyState } from '../../components/EmptyState';
import api from '../../services/api';
import { useMatchPolling } from '../../hooks/useMatchPolling';
import { CountdownTimer } from '../../components/CountdownTimer';
import { sseService } from '../../services/sse';
import { useAuthStore } from '../../store/useAuthStore';

const { width, height } = Dimensions.get('window');

export const MatchDetailScreenAdmin = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { matchId } = route.params;
  const { data: match, loading, refetch: fetchMatch } = useMatchPolling(matchId);
  const [showQR, setShowQR] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState<'add' | 'update'>('add');
  const [roomModalData, setRoomModalData] = useState({
    roomId: '',
    roomPassword: '',
    loading: false,
  });

  const [user, setUser] = useState<any>(null);
  const { token } = useAuthStore();

  // SSE integration for live updates
  useEffect(() => {
    if (!token) return;

    const handleMatchUpdate = (data: any) => {
      if (data.matchId === matchId) {
        console.log('[MatchDetailScreenAdmin] SSE match update received:', data.action);
        fetchMatch(true);
      }
    };

    sseService.on('MATCH_UPDATE', handleMatchUpdate);

    return () => {
      sseService.off('MATCH_UPDATE', handleMatchUpdate);
    };
  }, [matchId, token, fetchMatch]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
    } catch (err) {
      console.log("Failed to fetch user data", err);
    }
  };

  const isJoined = match?.participants?.some((p: any) => p.user_id._id === user?._id || p.user_id === user?._id);

  const isMatchUpcoming = (m: any) => {
    if (!m.match_date || !m.match_time) return false;
    try {
      const dateStr = `${m.match_date} ${m.match_time}`;
      let matchTime = Date.parse(dateStr);
      if (isNaN(matchTime)) {
        const parts = dateStr.match(/(\d+)\s+([a-zA-Z]+)\s+(\d+)\s+(\d+):(\d+)/);
        if (parts) {
          const [_, day, monthStr, year, hour, minute] = parts;
          const monthMap: { [key: string]: number } = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
          };
          matchTime = new Date(parseInt(year), monthMap[monthStr], parseInt(day), parseInt(hour), parseInt(minute)).getTime();
        }
      }
      const now = Date.now();
      const diff = matchTime - now;
      const minutesLeft = diff / (1000 * 60);
      return minutesLeft > 0 && minutesLeft <= 10;
    } catch (e) {
      return false;
    }
  };

  const isCreator = user && match?.created_by?._id === user._id;
  
  // Event is in DRAFT status (not published yet)
  const isDraft = match && match.status === 'DRAFT' && !match.isPublished;
  // Event is published and open for joining
  const isOpen = match && match.status === 'OPEN' && match.isPublished;
  // Event is published but not started yet (upcoming within 10 mins)
  const isUpcoming = match && isOpen && isMatchUpcoming(match);
  // Event has room details already
  const hasRoomDetails = match && match.room_id;
  // Can add room details (published but no room ID yet)
  const canAddRoomDetails = isOpen && !hasRoomDetails;
  // Can update room details (published, has room, and is upcoming)
  const canUpdateRoomDetails = isOpen && hasRoomDetails && isUpcoming;

  const handleJoin = async () => {
    try {
      await api.post('/matches/join', { roomId: match.room_id });
      Alert.alert('Success!', 'You have successfully joined the match.');
      fetchMatch();
    } catch (error: any) {
      Alert.alert('Join Failed', error.response?.data?.message || 'Error joining match.');
    }
  };

  const handleOpenAddRoom = () => {
    setRoomModalMode('add');
    setRoomModalData({
      roomId: '',
      roomPassword: '',
      loading: false,
    });
    setShowRoomModal(true);
  };

  const handleOpenUpdateRoom = () => {
    setRoomModalMode('update');
    setRoomModalData({
      roomId: match.room_id || '',
      roomPassword: match.room_password || '',
      loading: false,
    });
    setShowRoomModal(true);
  };

  const handleRoomConfirm = async () => {
    if (!roomModalData.roomId.trim()) {
      Alert.alert("Room ID Required", "Please enter the in-game Room ID.");
      return;
    }
    setRoomModalData(prev => ({ ...prev, loading: true }));
    try {
      const payload: any = {
        room_id: roomModalData.roomId.trim(),
      };
      if (roomModalData.roomPassword.trim()) {
        payload.room_password = roomModalData.roomPassword.trim();
      }
      
      if (roomModalMode === 'add') {
        await adminAPI.addRoomDetails(match._id, payload);
        Alert.alert("Success", "Room details added! Participants have been notified.");
      } else {
        await adminAPI.updateRoomDetails(match._id, payload);
        Alert.alert("Success", "Room details updated! Participants have been notified.");
      }
      setShowRoomModal(false);
      fetchMatch();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || e.message);
    } finally {
      setRoomModalData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = async () => {
    if (match.status !== 'DRAFT') {
      Alert.alert("Error", "Only draft events can be deleted.");
      return;
    }
    Alert.alert("Delete Match", "Are you sure you want to delete this draft?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await adminAPI.deleteMatch(match._id, { force: "true" });
            navigation.goBack();
          } catch (e: any) { Alert.alert("Error", e.response?.data?.message || e.message); }
        }
      }
    ]);
  };

  const handlePublish = async () => {
    try {
      await adminAPI.togglePublish(match._id);
      Alert.alert("Success", "Event is now live! All users have been notified.");
      fetchMatch();
    } catch (e: any) { Alert.alert("Error", e.response?.data?.message || e.message); }
  };

  const handleUnpublish = async () => {
    Alert.alert("Unpublish Event", "This will set the event back to draft. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unpublish", onPress: async () => {
          try {
            await adminAPI.togglePublish(match._id);
            Alert.alert("Success", "Event has been unpublished and set to draft.");
            fetchMatch();
          } catch (e: any) { Alert.alert("Error", e.response?.data?.message || e.message); }
        }
      }
    ]);
  };

  if (loading) {
    return <LoadingOverlay visible={true} message="Loading match details..." />;
  }

  if (!match) return <EmptyState title="Match not found" icon="event-busy" />;

  const InfoTag = ({ icon, label, value, color = "white" }: any) => (
    <View style={styles.infoTag}>
      <MaterialIcons name={icon} size={16} color={COLORS.primary} />
      <View style={styles.infoTagText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  const handleOrganizerClick = () => {
    if (match.created_by?._id) {
      navigation.navigate('UserProfile', { userId: match.created_by._id });
    }
  };

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

      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={{ uri: match.banner_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhbx38w-pTf5FjSknnDxymie1fKXFcVF9n1S6sbOysN2pwyfRmP-TE-CTx-APs_0EvQaXM3EupUHDxxSsOac5dkcVhBdXANWtEvNEWXTckfbxW3KjyI9ws4hhzCoG1TMoL8JeVfaxQclBk5ebqfQHIMQA5f5OLBF7dcvUbD-Op_Dt7Ix7VYvfUp197Q9r0LXMIbvlf37NhQT7UflMV7SXZ-ClFTooZfTM1crOBUUYHPRV0RQBcQzYg2CG9vKEThfZ30YRVljfG_i4' }}
          style={styles.heroImage}
        >
          <LinearGradient
            colors={[`${COLORS.backgroundDark}00`, `${COLORS.backgroundDark}CC`, COLORS.backgroundDark]}
            style={styles.heroGradient}
          />

          {/* Custom Header Overlay */}
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="chevron-left" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Event Details</Text>
            <TouchableOpacity style={styles.circleBtn} onPress={() => setShowQR(true)}>
              <MaterialIcons name="qr-code-2" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: match.status === 'OPEN' ? COLORS.success : COLORS.error }]}>
                <Text style={styles.statusText}>{match.status}</Text>
              </View>
              <Text style={styles.roomId}>ROOM: {match.room_id || 'N/A'}</Text>
              {match.room_password && (
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={18} color={`${COLORS.textLight}80`} />
                </TouchableOpacity>
              )}
            </View>
            {match.room_password && (
              <View style={styles.passwordRow}>
                <Text style={styles.passwordLabel}>PASSWORD: </Text>
                <Text style={styles.passwordValue}>{showPassword ? match.room_password : '••••••••'}</Text>
              </View>
            )}
            {/* Two-column hero info row */}
            <View style={styles.heroInfoRow}>
              {/* Left: Title + Map */}
              <View style={styles.heroInfoLeft}>
                <Text style={styles.matchTitle} numberOfLines={2}>
                  {match.game_type || "PRO LEAGUE"} DUEL
                </Text>
                <Text style={styles.mapName}>MAP: {match.map || "ERANGEL"}</Text>
              </View>

              {/* Right: Countdown */}
              <View style={styles.heroInfoRight}>
                <Text style={styles.heroStartsIn}>STARTS IN</Text>
                <CountdownTimer
                  targetDate={`${match.match_date} ${match.match_time}`}
                  onFinish={() => fetchMatch(true)}
                  variant="hero"
                />
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          <InfoTag icon="payments" label="ENTRY FEE" value={`₹${match.entry_fee}`} />
          <InfoTag icon="military-tech" label="PRIZE POOL" value={`₹${match.prize_pool}`} color={COLORS.primary} />
          <InfoTag icon="groups" label="PLAYERS" value={`${match.participants?.length || 0} / ${match.max_players}`} />
          <InfoTag icon="gamepad" label="MODE" value={match.mode || "TPP"} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTICIPANTS</Text>
          <View style={styles.card}>
            {match.participants?.length > 0 ? (
              match.participants.map((participant: any, index: number) => (
                <View key={index}>
                  <View style={styles.playerRow}>
                    <View style={styles.playerInfo}>
                      <View style={styles.playerAvatar}>
                        <MaterialIcons name="person" size={20} color={`${COLORS.textLight}33`} />
                      </View>
                      <Text style={styles.playerName}>
                        {typeof participant.user_id === 'object' 
                          ? participant.user_id?.username || `Player_${index + 1}`
                          : typeof participant.user_id === 'string'
                            ? participant.user_id
                            : `Player_${index + 1}`}
                      </Text>
                    </View>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>LVL {Math.floor(Math.random() * 50) + 1}</Text>
                    </View>
                  </View>
                  {index < match.participants.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            ) : (
              <View style={styles.emptyPlayers}>
                <Text style={styles.emptyText}>No participants yet. Be the first to join!</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MATCH RULES & RESTRICTIONS</Text>
          <View style={styles.card}>
            {match.standard_restrictions && Object.entries(match.standard_restrictions).map(([key, value]) => {
              if (!value) return null;
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <View style={styles.ruleItem} key={key}>
                  <MaterialIcons name="block" size={16} color={COLORS.error} />
                  <Text style={styles.ruleText}>{label}</Text>
                </View>
              );
            })}
            {match.standard_restrictions && <View style={styles.divider} />}

            {match.additional_rules ? (
              <View style={styles.ruleItem}>
                <MaterialIcons name="info" size={16} color={COLORS.primary} />
                <Text style={styles.ruleText}>{match.additional_rules}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />
            <View style={styles.ruleItem}>
              <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
              <Text style={styles.ruleText}>Participants must join the lobby 10 minutes before start time.</Text>
            </View>
            {match.room_id && (
              <>
                <View style={styles.divider} />
                <View style={styles.ruleItem}>
                  <MaterialIcons name="vpn-key" size={16} color={COLORS.info} />
                  <Text style={styles.ruleText}>Room ID: {match.room_id}</Text>
                </View>
              </>
            )}
            {match.room_password && (
              <>
                <View style={styles.divider} />
                <View style={styles.ruleItem}>
                  <MaterialIcons name="lock" size={16} color={COLORS.info} />
                  <Text style={styles.ruleText}>Room Password: {showPassword ? match.room_password : '••••••••'}</Text>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ marginLeft: 4 }}>
                    <MaterialIcons name={showPassword ? "visibility-off" : "visibility"} size={16} color={`${COLORS.textLight}80`} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HOSTED BY</Text>
          <TouchableOpacity
            style={[styles.card, { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }]}
            onPress={handleOrganizerClick}
          >
            <View style={[styles.playerAvatar, { backgroundColor: COLORS.primary }]}>
              <MaterialIcons name="person" size={20} color="white" />
            </View>
            <View>
              <Text style={[styles.playerName, { fontSize: 16 }]}>
                {match.created_by?.username || "Official Host"}
              </Text>
              <Text style={{ color: `${COLORS.textLight}66`, fontSize: 12 }}>
                Verified Organizer
              </Text>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <MaterialIcons name="chevron-right" size={24} color={`${COLORS.textLight}33`} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Scan to Join</Text>
              <TouchableOpacity onPress={() => setShowQR(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={JSON.stringify({ type: 'match', id: match._id, roomId: match.room_id })}
                size={200}
                color="black"
                backgroundColor="white"
              />
            </View>

            <Text style={styles.qrRoomId}>Room ID: {match.room_id}</Text>
            <Text style={styles.qrHint}>Share this QR code with your friends to invite them to this match.</Text>
          </View>
        </View>
      </Modal>

      {/* Floating Action Bar for Admin */}
      <BlurView intensity={20} tint="dark" style={styles.bottomBar}>
        {isCreator && isDraft ? (
          // DRAFT EVENT: Show Delete, Edit, and Publish buttons
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
              <MaterialIcons name="delete" size={24} color={COLORS.error} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("CreateMatch", { initialData: match })}>
              <MaterialIcons name="edit" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinBtn, { flex: 1 }]}
              onPress={handlePublish}
            >
              <LinearGradient
                colors={[COLORS.primary, '#ff9a52']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.joinBtnText}>PUBLISH EVENT</Text>
                <MaterialIcons name="publish" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : isCreator && isOpen && canAddRoomDetails ? (
          // PUBLISHED but NO ROOM: Show Add Room Details button
          <TouchableOpacity
            style={[styles.joinBtn, { flex: 1 }]}
            onPress={handleOpenAddRoom}
          >
            <LinearGradient
              colors={[COLORS.info, '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.joinBtnText}>ADD ROOM DETAILS</Text>
              <MaterialIcons name="vpn-key" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        ) : isCreator && isOpen && canUpdateRoomDetails ? (
          // PUBLISHED with Room and UPCOMING: Show Update Room button
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.joinBtn, { flex: 1 }]}
              onPress={handleOpenUpdateRoom}
            >
              <LinearGradient
                colors={[COLORS.info, '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.joinBtnText}>UPDATE ROOM</Text>
                <MaterialIcons name="vpn-key" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : isCreator && isOpen ? (
          // PUBLISHED event: Show Unpublish button
          <TouchableOpacity
            style={[styles.joinBtn, { flex: 1 }]}
            onPress={handleUnpublish}
          >
            <LinearGradient
              colors={[COLORS.error, '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.joinBtnText}>UNPUBLISH</Text>
              <MaterialIcons name="undo" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          // Regular user join button (for non-creators or non-admin views)
          <TouchableOpacity
            style={[
              styles.joinBtn,
              (match.status !== 'OPEN' || isJoined) && { backgroundColor: '#333' }
            ]}
            onPress={handleJoin}
            disabled={match.status !== 'OPEN' || isJoined}
          >
            <LinearGradient
              colors={match.status === 'OPEN' && !isJoined ? [COLORS.primary, '#ff9a52'] : ['#333', '#444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.joinBtnText}>
                {match.status === 'OPEN' ? (isJoined ? 'ALREADY JOINED' : 'JOIN MATCH NOW') : 'LOBBY FULL'}
              </Text>
              {isJoined ? <MaterialIcons name="check-circle" size={18} color="white" /> : <Ionicons name="flash" size={18} color="white" />}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </BlurView>

      {/* Room Details Modal (Add/Update) */}
      <Modal
        visible={showRoomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoomModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.qrCard}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>
                {roomModalMode === 'add' ? 'Add Room Details' : 'Update Room Details'}
              </Text>
              <TouchableOpacity onPress={() => setShowRoomModal(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {roomModalMode === 'update' && (
              <Text style={[styles.modalHint, { color: COLORS.primary, marginBottom: 16 }]}>
                Match starts soon! Update room details for players.
              </Text>
            )}

            {roomModalMode === 'add' && (
              <Text style={[styles.modalHint, { color: COLORS.textLight, marginBottom: 16 }]}>
                Add room ID and password so participants can join the match.
              </Text>
            )}

            <Text style={styles.infoLabel}>IN-GAME ROOM ID *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 54321456"
              placeholderTextColor={`${COLORS.textLight}40`}
              value={roomModalData.roomId}
              onChangeText={v => setRoomModalData(prev => ({ ...prev, roomId: v }))}
              autoCapitalize="none"
            />

            <Text style={styles.infoLabel}>ROOM PASSWORD <Text style={{ color: `${COLORS.textLight}4D`, fontWeight: 'normal' }}>(optional)</Text></Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Room Password"
              placeholderTextColor={`${COLORS.textLight}40`}
              value={roomModalData.roomPassword}
              onChangeText={v => setRoomModalData(prev => ({ ...prev, roomPassword: v }))}
              secureTextEntry
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.iconBtn, { flex: 1 }]}
                onPress={() => setShowRoomModal(false)}
                disabled={roomModalData.loading}
              >
                <Text style={{ color: `${COLORS.textLight}99`, fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.joinBtn, { flex: 2 }]}
                onPress={handleRoomConfirm}
                disabled={roomModalData.loading}
              >
                {roomModalData.loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <LinearGradient
                    colors={[COLORS.primary, '#ff9a52']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Text style={styles.joinBtnText}>
                      {roomModalMode === 'add' ? 'ADD DETAILS' : 'UPDATE'}
                    </Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    height: height * 0.45,
    width: '100%',
  },
  heroImage: {
    flex: 1,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: `${COLORS.backgroundDark}80`,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.backgroundDark}80`,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  heroInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 12,
  },
  heroInfoLeft: {
    flex: 1,
  },
  heroInfoRight: {
    alignItems: 'flex-end',
  },
  heroStartsIn: {
    color: COLORS.primary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  roomId: {
    color: `${COLORS.textLight}99`,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  eyeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  passwordLabel: {
    color: `${COLORS.textLight}66`,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  passwordValue: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  matchTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  mapName: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 4,
  },
  dateText: {
    color: `${COLORS.textLight}CC`,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    marginTop: -20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  infoTag: {
    width: (width - 52) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}0D`,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTagText: {
    gap: 2,
  },
  infoLabel: {
    color: `${COLORS.textLight}66`,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: `${COLORS.textLight}66`,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}0D`,
    overflow: "hidden",
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.textMuted}0D`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rankBadge: {
    backgroundColor: `${COLORS.primary}1A`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: `${COLORS.textMuted}0D`,
    marginHorizontal: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  ruleText: {
    color: `${COLORS.textLight}99`,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  emptyPlayers: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: `${COLORS.textLight}4D`,
    fontSize: 13,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  joinBtn: {
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  joinBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: `${COLORS.primary}26`,
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: `${COLORS.info}1A`,
    borderRadius: 150,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${COLORS.backgroundDark}CC`,
    padding: 20,
  },
  qrCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  qrTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 24,
  },
  qrRoomId: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  qrHint: {
    color: `${COLORS.textLight}80`,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalHint: {
    color: `${COLORS.textLight}99`,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 14,
    marginBottom: 16,
  },
});
