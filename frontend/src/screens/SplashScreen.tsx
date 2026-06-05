import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
const { width, height } = Dimensions.get('window');

export const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;



  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 100, // Target 100% as per design
      duration: 2000,
      useNativeDriver: false // Width animation
    }).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={[styles.container, { backgroundColor: COLORS.backgroundDark }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Layer */}
      <View style={styles.absoluteFull}>
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhbx38w-pTf5FjSknnDxymie1fKXFcVF9n1S6sbOysN2pwyfRmP-TE-CTx-APs_0EvQaXM3EupUHDxxSsOac5dkcVhBdXANWtEvNEWXTckfbxW3KjyI9ws4hhzCoG1TMoL8JeVfaxQclBk5ebqfQHIMQA5f5OLBF7dcvUbD-Op_Dt7Ix7VYvfUp197Q9r0LXMIbvlf37NhQT7UflMV7SXZ-ClFTooZfTM1crOBUUYHPRV0RQBcQzYg2CG9vKEThfZ30YRVljfG_i4' }}
          style={[styles.absoluteFull, styles.heroImage]}
          resizeMode="cover"
        />
        {/* Overlay Gradients */}
        <LinearGradient
          colors={['transparent', COLORS.backgroundDark]}
          style={styles.absoluteFull}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={[styles.absoluteFull, styles.vignette]} />
      </View>

      {/* Top Section: Logo */}
      <Animated.View style={[styles.topSection, { opacity: fadeAnim, marginTop: insets.top + 32 }]}>
        <View style={[styles.logoBorder, { shadowColor: COLORS.primary }]}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="military-tech" size={48} color={COLORS.primary} />
            <View>
              <Text style={styles.logoTitle}>BATTLECORE</Text>
              <Text style={[styles.logoSubtitle, { color: COLORS.primary }]}>MAX</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Middle Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom Section: UI */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Loading Bar */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.loadingText}>LOADING RESOURCES...</Text>
            </View>
            <Text style={[styles.percentText, { color: COLORS.primary }]}>100%</Text>
          </View>

          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: COLORS.primary, shadowColor: COLORS.primary }]}>
              <LinearGradient colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.absoluteFull} />
            </Animated.View>
          </View>

          <View style={styles.serverInfo}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={styles.infoItem}>
                <MaterialIcons name="settings-input-antenna" size={14} color={COLORS.accentBlue} />
                <Text style={styles.infoText}>SERVER: INDIA</Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialIcons name="security" size={14} color={COLORS.primary} />
                <Text style={styles.infoText}>PROTECTED BY VANGUARD</Text>
              </View>
            </View>
            <Text style={styles.versionText}>v2.105.4.92</Text>
          </View>
        </View>
      </View>

      {/* Decorative Corners */}
      <View style={[styles.corner, { top: insets.top + 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(244,123,37,0.4)' }]} />
      <View style={[styles.corner, { top: insets.top + 16, right: 16, borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(244,123,37,0.4)' }]} />
      <View style={[styles.corner, { bottom: insets.bottom + 16, left: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(244,123,37,0.4)' }]} />
      <View style={[styles.corner, { bottom: insets.bottom + 16, right: 16, borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'rgba(244,123,37,0.4)' }]} />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  absoluteFull: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  heroImage: {
    opacity: 0.8,
  },
  vignette: {
    backgroundColor: 'transparent', // Radial gradient difficult in pure RN StyleSheet without SVG. Linear approximate used above.
  },
  topSection: {
    marginTop: 80,
    alignItems: 'center',
    zIndex: 10,
  },
  logoBorder: {
    padding: 2,
    borderRadius: 12,
    // Gradient border simulated or just bg
    backgroundColor: '#9ca3af', // Gray-400 equivalent approx
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#221710',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  logoTitle: {
    color: 'white',
    fontSize: 28,
    fontFamily: 'RussoOne_400Regular',
    lineHeight: 28,
  },
  logoSubtitle: {
    fontSize: 16,
    fontFamily: 'ChakraPetch_700Bold',
    letterSpacing: 4,
    textAlign: 'right',
    lineHeight: 16,
  },
  seasonText: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomSection: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 32,
    paddingBottom: 64,
    gap: 24,
    zIndex: 10,
  },
  loadingContainer: {
    gap: 12,
  },
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  loadingText: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'ChakraPetch_700Bold',
    letterSpacing: 2,
  },
  percentText: {
    fontSize: 16,
    fontFamily: 'ChakraPetch_700Bold',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressBarFill: {
    height: '100%',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  serverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    fontFamily: 'ChakraPetch_500Medium',
    textTransform: 'uppercase',
  },
  versionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontFamily: 'ChakraPetch_500Medium',
    letterSpacing: 1,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  iconItem: {
    alignItems: 'center',
    opacity: 0.6,
  },
  iconLabel: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
  }
});
