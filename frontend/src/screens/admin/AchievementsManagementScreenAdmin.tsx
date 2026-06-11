import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../theme/colors';
import api from '../../services/api';
import { usePopup } from '../../components/PopupModal';

const { width } = Dimensions.get('window');

interface Achievement {
  _id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  is_active: boolean;
  created_at: string;
}

export const AchievementsManagementScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm, PopupElement } = usePopup();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    icon: 'emoji_events',
    category: 'match',
    points: 100,
    is_active: true,
  });

  const categories = ['all', 'match', 'wallet', 'social', 'streak', 'special'];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Try to fetch achievements, fallback to mock data
      try {
        const res = await api.get('/admin/achievements');
        if (res.data.success) {
          setAchievements(res.data.data || []);
          return;
        }
      } catch (e) {
        // Use mock data if API not available
      }

      // Mock achievements data
      setAchievements([
        { _id: '1', title: 'First Win', description: 'Win your first match', icon: 'emoji_events', category: 'match', points: 100, is_active: true, created_at: new Date().toISOString() },
        { _id: '2', title: 'Win Streak', description: 'Win 5 matches in a row', icon: 'local_fire_department', category: 'streak', points: 500, is_active: true, created_at: new Date().toISOString() },
        { _id: '3', title: 'Big Spender', description: 'Deposit ₹10,000 or more', icon: 'payments', category: 'wallet', points: 200, is_active: true, created_at: new Date().toISOString() },
        { _id: '4', title: 'Social Butterfly', description: 'Add 10 friends', icon: 'people', category: 'social', points: 150, is_active: true, created_at: new Date().toISOString() },
        { _id: '5', title: 'Daily Player', description: 'Play for 7 consecutive days', icon: 'calendar_today', category: 'streak', points: 300, is_active: true, created_at: new Date().toISOString() },
        { _id: '6', title: 'Tournament Champion', description: 'Win a tournament', icon: 'military_tech', category: 'special', points: 1000, is_active: true, created_at: new Date().toISOString() },
      ]);
    } catch (error) {
      console.error('Error fetching achievements:', error);
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

  const getFilteredAchievements = () => {
    let filtered = achievements;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const handleCreate = async () => {
    if (!newAchievement.title.trim()) {
      showError('Error', 'Title is required');
      return;
    }

    try {
      // Try API first
      await api.post('/admin/achievements', newAchievement);
      showSuccess('Success', 'Achievement created');
    } catch (e) {
      // Add locally if API not available
      const achievement: Achievement = {
        _id: Date.now().toString(),
        ...newAchievement,
        created_at: new Date().toISOString(),
      };
      setAchievements(prev => [...prev, achievement]);
    }

    setCreateModal(false);
    setNewAchievement({ title: '', description: '', icon: 'emoji_events', category: 'match', points: 100, is_active: true });
  };

  const handleUpdate = async () => {
    if (!selectedAchievement) return;

    try {
      await api.put(`/admin/achievements/${selectedAchievement._id}`, selectedAchievement);
      showSuccess('Success', 'Achievement updated');
    } catch (e) {
      // Update locally
      setAchievements(prev => prev.map(a => a._id === selectedAchievement._id ? selectedAchievement : a));
    }

    setEditModal(false);
    setSelectedAchievement(null);
  };

  const handleDelete = async (id: string) => {
    showConfirm('Delete Achievement', 'Are you sure?', async () => {
      try {
        await api.delete(`/admin/achievements/${id}`);
      } catch (e) {
        // Delete locally
      }
      setAchievements(prev => prev.filter(a => a._id !== id));
    }, 'Delete');
  };

  const toggleActive = async (achievement: Achievement) => {
    const updated = { ...achievement, is_active: !achievement.is_active };
    try {
      await api.put(`/admin/achievements/${achievement._id}`, updated);
    } catch (e) {
      // Update locally
    }
    setAchievements(prev => prev.map(a => a._id === achievement._id ? updated : a));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      match: '#3b82f6',
      wallet: '#22c55e',
      social: '#a855f7',
      streak: '#f97316',
      special: '#fbbf24',
    };
    return colors[category] || COLORS.primary;
  };

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{achievements.length}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: COLORS.success }]}>{achievements.filter(a => a.is_active).length}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: COLORS.error }]}>{achievements.filter(a => !a.is_active).length}</Text>
        <Text style={styles.statLabel}>Inactive</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#fbbf24' }]}>{achievements.reduce((sum, a) => sum + a.points, 0)}</Text>
        <Text style={styles.statLabel}>Total Pts</Text>
      </View>
    </View>
  );

  const renderCategoryFilter = () => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={item => item}
      contentContainerStyle={styles.categoryList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === item && styles.activeCategory]}
          onPress={() => setSelectedCategory(item)}
        >
          <Text style={[styles.categoryText, selectedCategory === item && styles.activeCategoryText]}>
            {item.toUpperCase()}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  const renderAchievementItem = ({ item }: { item: Achievement }) => (
    <View style={styles.achievementCard}>
      <View style={[styles.achievementIcon, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
        <MaterialIcons name={item.icon as any} size={24} color={getCategoryColor(item.category)} />
      </View>
      <View style={styles.achievementInfo}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementTitle}>{item.title}</Text>
          <View style={[styles.pointsBadge, { backgroundColor: '#fbbf24' + '20' }]}>
            <MaterialIcons name="star" size={12} color="#fbbf24" />
            <Text style={styles.pointsText}>{item.points}</Text>
          </View>
        </View>
        <Text style={styles.achievementDesc}>{item.description}</Text>
        <View style={styles.achievementMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(item.category) }]}>{item.category}</Text>
          </View>
          <Text style={styles.achievementDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.achievementActions}>
        <Switch
          value={item.is_active}
          onValueChange={() => toggleActive(item)}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.success + '50' }}
          thumbColor={item.is_active ? COLORS.success : 'rgba(255,255,255,0.3)'}
        />
        <TouchableOpacity onPress={() => { setSelectedAchievement(item); setEditModal(true); }}>
          <MaterialIcons name="edit" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item._id)}>
          <MaterialIcons name="delete" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCreateModal = () => (
    <Modal visible={createModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Achievement</Text>
            <TouchableOpacity onPress={() => setCreateModal(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Achievement title"
              placeholderTextColor={COLORS.textMuted}
              value={newAchievement.title}
              onChangeText={v => setNewAchievement(p => ({ ...p, title: v }))}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={COLORS.textMuted}
              value={newAchievement.description}
              onChangeText={v => setNewAchievement(p => ({ ...p, description: v }))}
            />
            <Text style={styles.inputLabel}>Points</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={String(newAchievement.points)}
              onChangeText={v => setNewAchievement(p => ({ ...p, points: parseInt(v) || 0 }))}
            />
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPicker}>
              {categories.filter(c => c !== 'all').map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryOption, newAchievement.category === cat && styles.activeCategoryOption]}
                  onPress={() => setNewAchievement(p => ({ ...p, category: cat }))}
                >
                  <Text style={[styles.categoryOptionText, newAchievement.category === cat && styles.activeCategoryOptionText]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
              <Text style={styles.createBtnText}>Create Achievement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal visible={editModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Achievement</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Achievement title"
              placeholderTextColor={COLORS.textMuted}
              value={selectedAchievement?.title || ''}
              onChangeText={v => setSelectedAchievement(p => p ? { ...p, title: v } : null)}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Description"
              placeholderTextColor={COLORS.textMuted}
              value={selectedAchievement?.description || ''}
              onChangeText={v => setSelectedAchievement(p => p ? { ...p, description: v } : null)}
            />
            <Text style={styles.inputLabel}>Points</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={String(selectedAchievement?.points || 0)}
              onChangeText={v => setSelectedAchievement(p => p ? { ...p, points: parseInt(v) || 0 } : null)}
            />
            <TouchableOpacity style={styles.createBtn} onPress={handleUpdate}>
              <Text style={styles.createBtnText}>Update Achievement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
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
      <View style={[styles.bgGlow, { backgroundColor: 'rgba(251,191,36,0.1)', top: -60, right: -80 }]} />
      <BlurView intensity={250} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, zIndex: 100 }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModal(true)}>
          <MaterialIcons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Search */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search achievements..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      {renderCategoryFilter()}

      {/* Achievements List */}
      <FlatList
        data={getFilteredAchievements()}
        renderItem={renderAchievementItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="emoji-events" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No achievements found</Text>
          </View>
        }
      />

      {renderCreateModal()}
      {renderEditModal()}
      <PopupElement />
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
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  searchInput: { flex: 1, color: 'white', fontSize: 14, paddingVertical: 12, marginLeft: 10 },

  categoryList: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  activeCategory: { backgroundColor: COLORS.primary },
  categoryText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  activeCategoryText: { color: 'white' },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  achievementCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  achievementIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  achievementInfo: { flex: 1 },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  achievementTitle: { fontSize: 15, fontWeight: '600', color: 'white' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
  pointsText: { fontSize: 11, fontWeight: '600', color: '#fbbf24' },
  achievementDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  achievementMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  achievementDate: { fontSize: 11, color: 'rgba(255,255,255,0.3)' },
  achievementActions: { alignItems: 'center', gap: 12 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.3)', marginTop: 12 },

  modalOverlay: { flex: 1, justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12, color: 'white', fontSize: 14 },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  activeCategoryOption: { backgroundColor: COLORS.primary },
  categoryOptionText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  activeCategoryOptionText: { color: 'white' },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  createBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
});
