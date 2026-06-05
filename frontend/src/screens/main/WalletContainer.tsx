import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { WalletScreen } from './WalletScreen';
import { CreateWalletScreen } from './CreateWalletScreen';
import api from '../../services/api';
import { COLORS } from '../../theme/colors';
import { SafeScreen } from '../../components/SafeScreen';

export const WalletContainer = ({ navigation }: any) => {
  const { authData } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    try {
      if (authData?.is_wallet_initialized) {
        setHasWallet(true);
        return;
      }
      const res = await api.get('/wallet/my');
      if (res.data.data) {
        setHasWallet(true);
      } else {
        setHasWallet(false);
      }
    } catch (err) {
      setHasWallet(false);
    } finally {
      setChecking(false);
    }
  };

  const handleWalletCreated = () => setHasWallet(true);

  if (checking) {
    return (
      <SafeScreen role="USER">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeScreen>
    );
  }

  if (!hasWallet) {
    return (
      <CreateWalletScreen
        navigation={navigation}
        onWalletCreated={handleWalletCreated}
      />
    );
  }

  return <WalletScreen navigation={navigation} />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WalletContainer;
