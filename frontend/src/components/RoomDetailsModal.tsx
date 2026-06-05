import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme/colors';

interface RoomDetailsModalProps {
  visible: boolean;
  eventTitle: string;
  onSubmit: (roomId: string, roomPassword: string) => void;
  onCancel: () => void;
  loading?: boolean;
  mode?: 'publish' | 'update';
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({ visible, eventTitle, onSubmit, onCancel, loading = false, mode = 'publish' }) => {
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  const handleSubmit = () => {
    if (!roomId.trim()) return;
    onSubmit(roomId.trim(), roomPassword.trim());
    setRoomId('');
    setRoomPassword('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <MaterialIcons name={mode === 'publish' ? 'sports-esports' : 'vpn-key'} size={22} color={COLORS.primary} />
            <Text style={styles.title}>{mode === 'publish' ? 'Enter Room Details' : 'Add Room Details'}</Text>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>{eventTitle}</Text>

          <Text style={styles.label}>ROOM ID <Text style={{ color: COLORS.error }}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter in-game Room ID"
            placeholderTextColor={COLORS.textMuted}
            value={roomId}
            onChangeText={setRoomId}
            autoCapitalize="none"
          />

          <Text style={styles.label}>ROOM PASSWORD <Text style={{ color: COLORS.textMuted, fontWeight: 'normal' }}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Room Password"
            placeholderTextColor={COLORS.textMuted}
            value={roomPassword}
            onChangeText={setRoomPassword}
            autoCapitalize="none"
          />

          <Text style={styles.hint}>These will be shared with participants once they join the match.</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.submitText}>{mode === 'publish' ? 'PUBLISH NOW' : 'SAVE & PUBLISH'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
  card: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xxl, borderWidth: 1, borderColor: COLORS.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.textLight },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.lg },
  label: { fontSize: 10, fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.xs, marginLeft: SPACING.xs },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, height: 48, paddingHorizontal: SPACING.lg, color: COLORS.textLight, fontSize: 14, marginBottom: SPACING.md },
  hint: { fontSize: 11, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 16, paddingHorizontal: SPACING.xs },
  actions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, height: 46, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: 'bold' },
  submitBtn: { flex: 2, height: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
});
