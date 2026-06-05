import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { WalletScreenPartner } from './WalletScreenPartner';
import { CreateWalletScreenPartner } from './CreateWalletScreenPartner';
import api from '../../services/api';

export const WalletContainerPartner = ({ navigation }: any) => {
    const { authData } = useAuth();
    const [checking, setChecking] = useState(true);
    const [hasWallet, setHasWallet] = useState(false);

    useEffect(() => {
        checkWalletStatus();
    }, []);

    const checkWalletStatus = async () => {
        try {
            // First check if user has is_wallet_initialized flag
            if (authData?.is_wallet_initialized) {
                setHasWallet(true);
            } else {
                // Double-check by trying to fetch wallet
                const res = await api.get('/wallet/my');
                if (res.data.data) {
                    setHasWallet(true);
                } else {
                    setHasWallet(false);
                }
            }
        } catch (err) {
            // If wallet fetch fails, user needs to create wallet
            setHasWallet(false);
        } finally {
            setChecking(false);
        }
    };

    const handleWalletCreated = () => {
        setHasWallet(true);
    };

    if (checking) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f47b25" />
            </View>
        );
    }

    if (!hasWallet) {
        return <CreateWalletScreenPartner navigation={navigation} onWalletCreated={handleWalletCreated} />;
    }

    return <WalletScreenPartner navigation={navigation} />;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
