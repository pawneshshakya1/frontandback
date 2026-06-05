import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WalletScreenAdmin } from './WalletScreenAdmin';
import api from '../../services/api';

export const WalletContainerAdmin = ({ navigation }: any) => {
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            await api.get('/admin/wallets');
        } catch (err) {
        } finally {
            setChecking(false);
        }
    };

    if (checking) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f47b25" />
            </View>
        );
    }

    return <WalletScreenAdmin navigation={navigation} />;
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
