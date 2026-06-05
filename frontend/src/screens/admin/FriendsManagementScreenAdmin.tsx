import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../theme/colors';
import api from '../../services/api';

const { width } = Dimensions.get('window');

type TabType = 'all' | 'pending' | 'blocked';

interface FriendData {
  _id: string;
  user_id: { _id: string; username: string; email: string; avatar?: string };
  friend_id: { _id: string; username: string; email: string; avatar?: string };
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  initiated_by: string;
  blocked_by?: string;
  created_at: string;
}

export const FriendsManagementScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, blocked: 0 });
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all friend relationships
      const [friendsRes, pendingRes, blockedRes] = await Promise.allSettled([
        api.get('/admin/users', { params: { page: 1, limit: 1000 } }),
        api.get('/friends/pending'),
        api.get('/friends/blocked'),
      ]);

      // For now, use available data
      let allFriends: FriendData[] = [];
      
      if (friendsRes.status === 'fulfilled' && friendsRes.value.data.success) {
        // Transform user data to friend-like structure for display
        const users = friendsRes.value.data.data?.users || friendsRes.value.data.data || [];
        allFriends = users.map((u: any) => ({
          _id: u._id,
          user_id: { _id: u._id, username: u.username, email: u.email, avatar: u.avatar },
          friend_id: { _id: u._id, username: u.username, email: u.email, avatar: u.avatar },
          status: u.is_blocked ? 'BLOCKED' : 'ACCEPTED',
          initiated_by: u._id,
          created_at: u.created_at || new Date().toISOString(),
        }));
      }

      setFriends(allFriends);
      setStats({
        total: allFriends.length,
        pending: allFriends.filter(f => f.status === 'PENDING').length,
        blocked: allFriends.filter(f => f.status === 'BLOCKED').length,
      });
    } catch (error) {
      console.error('Error fetching friends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const getFilteredFriends = () => {
    let filtered = friends;
    
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(f => f.status === 'PENDING');
        break;
      case 'blocked':
        filtered = filtered.filter(f => f.status === 'BLOCKED');
        break;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => {
        const userName = typeof f.user_id === 'object' ? (f.user_id as any)?.username || '' : '';
        const userEmail = typeof f.user_id === 'object' ? (f.user_id as any)?.email || '' : '';
        const friendName = typeof f.friend_id === 'object' ? (f.friend_id as any)?.username || '' : '';
        return userName.toLowerCase().includes(query) || 
               userEmail.toLowerCase().includes(query) ||
               friendName.toLowerCase().includes(query);
      });
    }

    return filtered;
  };

  const handleBlockUser = async (userId: string) => {
    Alert.alert('Block User', 'Are you sure you want to block this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/friends/block/${userId}`);
            Alert.alert('Success', 'User blocked');
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to block user');
          }
        },
      },
    ]);
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.post(`/friends/unblock/${userId}`);
      Alert.alert('Success', 'User unblocked');
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return COLORS.success;
      case 'PENDING': return '#fbbf24';
      case 'BLOCKED': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'check-circle';
      case 'PENDING': return 'schedule';
      case 'BLOCKED': return 'block';
      default: return 'help-outline';
    }
  };

  const renderStatCard = (label: string, value: number, icon: string, color: string) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderFriendItem = ({ item }: { item: FriendData }) => {
    // Safely extract user info - handle both string and object formats
    const userName = typeof item.user_id === 'object' 
      ? (item.user_id as any)?.username || 'Unknown'
      : 'Unknown';
    const userEmail = typeof item.user_id === 'object'
      ? (item.user_id as any)?.email || ''
      : '';
    
    return (
      <TouchableOpacity
        style={styles.friendCard}
        onPress={() => { setSelectedFriend(item); setDetailModal(true); }}
      >
        <View style={styles.friendAvatar}>
          <MaterialIcons name="person" size={24} color={COLORS.textLight} />
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{userName}</Text>
          <Text style={styles.friendEmail}>{userEmail}</Text>
          <Text style={styles.friendDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      <View style={styles.friendActions}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <MaterialIcons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => { setSelectedFriend(item); setDetailModal(true); }}
        >
          <MaterialIcons name="more-vert" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.bgGlow, { backgroundColor: 'rgba(244,123,37,0.1)', top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends Management</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <MaterialIcons name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {renderStatCard('Total', stats.total, 'people', COLORS.primary)}
        {renderStatCard('Pending', stats.pending, 'schedule', '#fbbf24')}
        {renderStatCard('Blocked', stats.blocked, 'block', COLORS.error)}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['all', 'pending', 'blocked'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Friends List */}
      <FlatList
        data={getFilteredFriends()}
        renderItem={renderFriendItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="people-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No friends found</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={detailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Friend Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            
            {selectedFriend && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>
                    {typeof selectedFriend.user_id === 'object' 
                      ? (selectedFriend.user_id as any)?.username || 'Unknown'
                      : 'Unknown'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>
                    {typeof selectedFriend.user_id === 'object'
                      ? (selectedFriend.user_id as any)?.email || ''
                      : ''}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedFriend.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedFriend.status) }]}>
                      {selectedFriend.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Since</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedFriend.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  {selectedFriend.status === 'BLOCKED' ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                      onPress={() => { 
                        const userId = typeof selectedFriend.user_id === 'object' 
                          ? (selectedFriend.user_id as any)?._id 
                          : selectedFriend.user_id;
                        handleUnblockUser(userId); 
                        setDetailModal(false); 
                      }}
                    >
                      <MaterialIcons name="check" size={18} color="white" />
                      <Text style={styles.actionBtnText}>Unblock</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.error }]}
                      onPress={() => { 
                        const userId = typeof selectedFriend.user_id === 'object' 
                          ? (selectedFriend.user_id as any)?._id 
                          : selectedFriend.user_id;
                        handleBlockUser(userId); 
                        setDetailModal(false); 
                      }}
                    >
                      <MaterialIcons name="block" size={18} color="white" />
                      <Text style={styles.actionBtnText}>Block</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bgGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', letterSpacing: -0.5 },
  refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  searchInput: { flex: 1, color: 'white', fontSize: 14, paddingVertical: 12, marginLeft: 10 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  activeTabText: { color: 'white' },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '600', color: 'white', marginBottom: 2 },
  friendEmail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  friendDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  friendActions: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  moreBtn: { padding: 4 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  modalBody: { padding: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  detailLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  detailValue: { fontSize: 14, color: 'white', fontWeight: '500' },
  modalActions: { marginTop: 20, gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
});
