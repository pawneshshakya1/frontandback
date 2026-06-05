import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { matchAPI } from '../../services/api';
import { useMatchPolling } from '../../hooks/useMatchPolling';
import { CountdownTimer } from '../../components/CountdownTimer';
import { RoomCredentialsCard } from '../../components/RoomCredentialsCard';
import { canHostEditCredentials } from '../../utils/matchTime';
import EventSource, { EventSourceListener } from "react-native-sse";

const { width, height } = Dimensions.get('window');

export const MatchDetailScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { matchId } = route.params;
  const { data: match, loading, refetch: fetchMatch } = useMatchPolling(matchId);
  const [showQR, setShowQR] = useState(false);

  const COLORS = {
    primary: "#f47b25",
    bgDark: "#0d0d0d",
    cardDark: "#1a1a1a",
    accentBlue: "#2563eb",
    danger: "#ef4444",
    success: "#f47b25",
  };

  const [user, setUser] = useState<any>(null);

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

  // SSE for real-time match updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    const setupSSE = async () => {
      try {
        const baseURL = api.defaults.baseURL || 'http://192.168.1.4:5000/api';
        const sseURL = `${baseURL}/sse/events`;
        eventSource = new EventSource(sseURL);
        const listener: EventSourceListener = (event) => {
          if (event.type === 'message' && event.data) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'HEARTBEAT') return;
              if (data.type === 'MATCH_UPDATE') {
                fetchMatch();
              }
            } catch (e) { }
          }
        };
        eventSource.addEventListener("message", listener);
      } catch (e) { }
    };
    setupSSE();
    return () => { eventSource?.close(); };
  }, [matchId]);

  const isJoined = match?.participants?.some((p: any) => p.user_id._id === user?._id || p.user_id === user?._id);

  const handleJoin = async () => {
    try {
      await matchAPI.joinMatchById(match._id, { paymentMethod: 'WALLET' });
      Alert.alert('Success!', 'You have successfully joined the match.');
      fetchMatch();
    } catch (error: any) {
      Alert.alert('Join Failed', error.response?.data?.message || 'Error joining match.');
    }
  };

  const isCreator = user && match?.created_by?._id === user._id;
  const isDraft = match && match.isPublished === false;

  const handleDelete = async () => {
    Alert.alert("Delete Match", "Are you sure you want to delete this draft?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await api.delete('/matches/' + match._id);
            navigation.goBack();
          } catch (e: any) { Alert.alert("Error", e.response?.data?.message || e.message); }
        }
      }
    ]);
  };

  const handlePublish = async () => {
    try {
      await api.put('/matches/' + match._id, { isPublished: true });
      Alert.alert("Success", "Match is now live!");
      fetchMatch();
    } catch (e: any) { Alert.alert("Error", e.response?.data?.message || e.message); }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!match) return null;

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
            colors={['rgba(13,13,13,0)', 'rgba(13,13,13,0.8)', '#0d0d0d']}
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
              <View style={[styles.statusBadge, { backgroundColor: match.status === 'OPEN' ? COLORS.success : COLORS.danger }]}>
                <Text style={styles.statusText}>{match.status}</Text>
              </View>
              <Text style={styles.roomId}>ROOM: {match.room_id}</Text>
            </View>
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

        {isCreator && (
          <RoomCredentialsCard match={match} isHost={true} accentColor={COLORS.primary} />
        )}
        {!isCreator && isJoined && (
          <RoomCredentialsCard match={match} isHost={false} accentColor={COLORS.primary} />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTICIPANTS</Text>
          <View style={styles.card}>
            {match.participants?.length > 0 ? (
              match.participants.map((participant: any, index: number) => (
                <View key={index}>
                  <View style={styles.playerRow}>
                    <View style={styles.playerInfo}>
                      <View style={styles.playerAvatar}>
                        <MaterialIcons name="person" size={20} color="rgba(255,255,255,0.2)" />
                      </View>
                      <Text style={styles.playerName}>{participant.user_id?.username || `Player_${index + 1}`}</Text>
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
              // Format key: no_grenades -> No Grenades
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return (
                <View style={styles.ruleItem} key={key}>
                  <MaterialIcons name="block" size={16} color={COLORS.danger} />
                  <Text style={styles.ruleText}>{label}</Text>
                </View>
              );
            })}
            {/* Divider if we have standard restrictions */}
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
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                Verified Organizer
              </Text>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.2)" />
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

      {/* Floating Join Button */}
      <BlurView intensity={20} tint="dark" style={styles.bottomBar}>
        {isCreator && isDraft ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
              <MaterialIcons name="delete" size={24} color="#ef4444" />
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
                <Text style={styles.joinBtnText}>LAUNCH MATCH</Text>
                <MaterialIcons name="rocket-launch" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
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
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
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
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  heroInfoLeft: {
    flex: 1,
  },
  heroInfoRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroStartsIn: {
    color: '#f47b25',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
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
    color: 'rgba(255,255,255,0.6)',
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
    color: '#f47b25',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 4,
  },
  dateText: {
    color: 'rgba(255,255,255,0.8)',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTagText: {
    gap: 2,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.4)',
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
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rankBadge: {
    backgroundColor: 'rgba(244,123,37,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankText: {
    color: '#f47b25',
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  ruleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  emptyPlayers: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
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
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  joinBtn: {
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  qrCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    color: '#f47b25',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  qrHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  timerContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  startsIn: {
    color: '#f47b25',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 40,
  },
  timeVal: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    fontWeight: 'bold',
  },
  timerSep: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: -8,
  },
  timerLive: {
    color: '#f47b25',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(34, 197, 94, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  }
});
