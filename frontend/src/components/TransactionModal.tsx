import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import api from '../services/api';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransactionModal = ({ visible, onClose, onSuccess }: TransactionModalProps) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('DEPOSIT');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const types = ['DEPOSIT', 'WITHDRAW', 'LOCK', 'UNLOCK', 'ENTRY_FEE', 'PRIZE_WON', 'GIFT_SENT', 'REDEEM'];

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/wallet/transactions/record', {
        amount: Number(amount),
        type,
        description: description || `Manual ${type}`,
      });

      if (res.data.success) {
        Alert.alert('Success', 'Transaction recorded successfully');
        onSuccess();
        onClose();
        // Reset form
        setAmount('');
        setDescription('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Record Transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.label}>AMOUNT (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>TRANSACTION TYPE</Text>
            <View style={styles.typeGrid}>
              {types.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.activeTypeBtn]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeText, type === t && styles.activeTypeText]}>
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this for?"
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>{loading ? 'SAVING...' : 'SAVE TRANSACTION'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'RussoOne_400Regular',
  },
  body: {
    marginBottom: 24,
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'ChakraPetch_700Bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    color: 'white',
    fontSize: 16,
    fontFamily: 'ChakraPetch_400Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeTypeBtn: {
    backgroundColor: '#f47b25',
    borderColor: '#f47b25',
  },
  typeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'ChakraPetch_700Bold',
  },
  activeTypeText: {
    color: 'white',
  },
  saveBtn: {
    backgroundColor: '#f47b25',
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'RussoOne_400Regular',
    letterSpacing: 1,
  },
});
