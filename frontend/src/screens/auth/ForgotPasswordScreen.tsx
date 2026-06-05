import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TextInput, TouchableOpacity, StatusBar, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import { PopupModal } from '../../components/PopupModal';
import { COLORS } from '../../theme/colors';

const { width } = Dimensions.get('window');

export const ForgotPasswordScreen = ({ navigation }: any) => {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
        visible: false, type: 'info', title: '', message: '',
    });

    const closePopup = () => setPopup((p) => ({ ...p, visible: false }));

    const validateEmail = (): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim() || !emailRegex.test(email.trim())) {
            setPopup({ visible: true, type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address' });
            return false;
        }
        return true;
    };

    const handleSendCode = async () => {
        if (!validateEmail()) return;
        setLoading(true);
        try {
            const response = await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
            if (response.data?.success) {
                setStep('reset');
                setPopup({ visible: true, type: 'success', title: 'Code Sent', message: 'If an account exists for that email, a 6-digit code has been sent.' });
            } else {
                setPopup({ visible: true, type: 'error', title: 'Error', message: response.data?.message || 'Failed to send code' });
            }
        } catch (error: any) {
            setPopup({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || error.message || 'Failed to send code' });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!otp || otp.length < 4) {
            setPopup({ visible: true, type: 'error', title: 'Invalid Code', message: 'Please enter the 6-digit code sent to your email' });
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            setPopup({ visible: true, type: 'error', title: 'Weak Password', message: 'Password must be at least 6 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPopup({ visible: true, type: 'error', title: 'Mismatch', message: 'Passwords do not match' });
            return;
        }
        setLoading(true);
        try {
            const response = await authAPI.resetPassword({
                email: email.trim().toLowerCase(),
                otp: otp.trim(),
                newPassword,
            });
            if (response.data?.success) {
                setPopup({
                    visible: true,
                    type: 'success',
                    title: 'Password Reset',
                    message: 'Your password has been reset successfully. Please log in with your new password.',
                });
                setTimeout(() => {
                    closePopup();
                    navigation.navigate('Login');
                }, 2000);
            } else {
                setPopup({ visible: true, type: 'error', title: 'Reset Failed', message: response.data?.message || 'Could not reset password' });
            }
        } catch (error: any) {
            setPopup({ visible: true, type: 'error', title: 'Reset Failed', message: error.response?.data?.message || error.message || 'Could not reset password' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <View style={styles.absoluteFull}>
                <ImageBackground
                    source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhbx38w-pTf5FjSknnDxymie1fKXFcVF9n1S6sbOysN2pwyfRmP-TE-CTx-APs_0EvQaXM3EupUHDxxSsOac5dkcVhBdXANWtEvNEWXTckfbxW3KjyI9ws4hhzCoG1TMoL8JeVfaxQclBk5ebqfQHIMQA5f5OLBF7dcvUbD-Op_Dt7Ix7VYvfUp197Q9r0LXMIbvlf37NhQT7UflMV7SXZ-ClFTooZfTM1crOBUUYHPRV0RQBcQzYg2CG9vKEThfZ30YRVljfG_i4' }}
                    style={[styles.absoluteFull, styles.heroImage]}
                    resizeMode="cover"
                    blurRadius={8}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.5)']}
                        style={styles.absoluteFull}
                    />
                    <View style={styles.vignette} />
                </ImageBackground>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={[styles.contentContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.topBar}>
                        <View style={styles.regionIndicator}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.regionText}>REGION: INDIA</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.versionText}>v2.105.4.92</Text>
                        </View>
                    </View>

                    <View style={{ flex: 1, justifyContent: 'center', width: '100%', maxWidth: 400, alignItems: 'center' }}>
                        <View style={styles.logoSection}>
                            <MaterialIcons name="lock-reset" size={64} color={COLORS.primary} style={{ textShadowColor: 'rgba(244,123,37,0.6)', textShadowRadius: 15 }} />
                            <Text style={styles.titleText}>{step === 'email' ? 'FORGOT PASSWORD?' : 'RESET PASSWORD'}</Text>
                        </View>

                        <BlurView intensity={30} tint="dark" style={[styles.card, { borderColor: COLORS.glassBorder }]}>
                            <Text style={styles.descriptionText}>
                                {step === 'email'
                                    ? 'Enter your email address to receive a password reset code.'
                                    : `Enter the 6-digit code we sent to ${email} and your new password.`}
                            </Text>

                            <View style={styles.formGap}>
                                {step === 'email' ? (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>EMAIL ADDRESS</Text>
                                        <View style={styles.inputWrapper}>
                                            <MaterialIcons name="mail" size={20} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                                            <TextInput
                                                placeholder="name@example.com"
                                                placeholderTextColor="rgba(255,255,255,0.2)"
                                                value={email}
                                                onChangeText={setEmail}
                                                style={styles.input}
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                                editable={!loading}
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>6-DIGIT CODE</Text>
                                            <View style={styles.inputWrapper}>
                                                <MaterialIcons name="pin" size={20} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                                                <TextInput
                                                    placeholder="123456"
                                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                                    value={otp}
                                                    onChangeText={setOtp}
                                                    style={styles.input}
                                                    keyboardType="number-pad"
                                                    maxLength={6}
                                                    editable={!loading}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>NEW PASSWORD</Text>
                                            <View style={styles.inputWrapper}>
                                                <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                                                <TextInput
                                                    placeholder="••••••••"
                                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                                    value={newPassword}
                                                    onChangeText={setNewPassword}
                                                    style={styles.input}
                                                    secureTextEntry
                                                    editable={!loading}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                                            <View style={styles.inputWrapper}>
                                                <MaterialIcons name="lock-outline" size={20} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />
                                                <TextInput
                                                    placeholder="••••••••"
                                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                                    value={confirmPassword}
                                                    onChangeText={setConfirmPassword}
                                                    style={styles.input}
                                                    secureTextEntry
                                                    editable={!loading}
                                                />
                                            </View>
                                        </View>
                                    </>
                                )}

                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: COLORS.primary }, loading && { opacity: 0.7 }]}
                                    onPress={step === 'email' ? handleSendCode : handleResetPassword}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.buttonText}>
                                            {step === 'email' ? 'SEND CODE' : 'RESET PASSWORD'}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {step === 'reset' && (
                                    <TouchableOpacity onPress={() => setStep('email')} disabled={loading}>
                                        <Text style={styles.changeEmailText}>CHANGE EMAIL</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading} style={{ alignItems: 'center', paddingTop: 8 }}>
                                    <Text style={styles.backLinkText}>BACK TO LOGIN</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <View style={[styles.corner, { top: insets.top + 16, left: 16, borderTopWidth: 1, borderLeftWidth: 1 }]} />
            <View style={[styles.corner, { top: insets.top + 16, right: 16, borderTopWidth: 1, borderRightWidth: 1 }]} />
            <View style={[styles.corner, { bottom: insets.bottom + 16, left: 16, borderBottomWidth: 1, borderLeftWidth: 1 }]} />
            <View style={[styles.corner, { bottom: insets.bottom + 16, right: 16, borderBottomWidth: 1, borderRightWidth: 1 }]} />

            <PopupModal
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onClose={closePopup}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1, width: '100%' },
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    absoluteFull: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    },
    heroImage: {
        transform: [{ scale: 1.1 }],
    },
    vignette: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    regionIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    pulseDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#f47b25',
    },
    regionText: {
        color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase',
    },
    versionText: {
        color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '500',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    titleText: {
        color: 'white', fontSize: 22, fontWeight: 'bold', fontStyle: 'italic', letterSpacing: -1, marginTop: 12, textAlign: 'center'
    },
    card: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        padding: 16,
        backgroundColor: 'rgba(20, 20, 20, 0.75)',
    },
    descriptionText: {
        color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', lineHeight: 18, letterSpacing: 0.5, textAlign: 'center', marginBottom: 16,
    },
    formGap: {
        gap: 14,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginLeft: 4,
    },
    inputWrapper: {
        position: 'relative', justifyContent: 'center',
    },
    inputIcon: {
        position: 'absolute', left: 12, zIndex: 1,
    },
    input: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        height: 46,
        paddingLeft: 44,
        paddingRight: 16,
        color: 'white',
        fontSize: 14,
    },
    button: {
        width: '100%',
        height: 46,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f47b25',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 4,
    },
    buttonText: {
        color: 'white', fontWeight: 'bold', fontSize: 13, letterSpacing: 2,
    },
    backLinkText: {
        color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4
    },
    changeEmailText: {
        color: COLORS.primary, fontSize: 11, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center'
    },
    corner: {
        position: 'absolute', width: 32, height: 32, borderColor: 'rgba(244,123,37,0.3)', pointerEvents: 'none'
    }
});
