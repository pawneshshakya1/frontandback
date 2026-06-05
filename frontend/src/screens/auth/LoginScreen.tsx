import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, useAuthRequest, ResponseType } from "expo-auth-session";
import { authAPI } from "../../services/api";
import { PopupModal } from "../../components/PopupModal";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

const GOOGLE_CONFIG = {
  androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
  iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
};

export const LoginScreen = ({ navigation }: any) => {
  const { signIn, googleSignIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [popup, setPopup] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    visible: false, type: 'info', title: '', message: '',
  });
  const closePopup = () => setPopup((p) => ({ ...p, visible: false }));

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_CONFIG.androidClientId,
      redirectUri: makeRedirectUri({
        scheme: "com.esports.battlecore",
        path: "auth/callback",
      }),
      responseType: ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      extraParams: {
        nonce: "battlecore-nonce",
      },
    },
    discovery
  );

  React.useEffect(() => {
    if (response?.type === "success") {
      const { idToken } = response.params || {};
      if (idToken) {
        handleGoogleIdToken(idToken);
      }
    }
  }, [response]);

  const validateLogin = (): boolean => {
    if (!email.trim() || !password) {
      setPopup({ visible: true, type: 'error', title: 'Error', message: 'Please enter email and password' });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setPopup({ visible: true, type: 'error', title: 'Error', message: 'Please enter a valid email address' });
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: email.trim().toLowerCase(),
        password,
      });
      if (response.data?.success) {
        await signIn(response.data.data);
      } else {
        setPopup({ visible: true, type: 'error', title: 'Login Failed', message: response.data?.message || 'Login failed' });
      }
    } catch (error: any) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Login Error',
        message: error.response?.data?.message || error.message || 'Login failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleIdToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      await googleSignIn(idToken);
    } catch (error: any) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Google Login Error',
        message: error.response?.data?.message || error.message || 'Google login failed',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (GOOGLE_CONFIG.androidClientId.includes('YOUR_') || GOOGLE_CONFIG.webClientId.includes('YOUR_')) {
      setPopup({ visible: true, type: 'error', title: 'Setup Required', message: 'Google login is not configured. Please contact support.' });
      return;
    }
    try {
      const result = await promptAsync();
      if (result.type === "success") {
        const { idToken } = result.params || {};
        if (idToken) {
          await handleGoogleIdToken(idToken);
        }
      }
    } catch (error: any) {
      setPopup({ visible: true, type: 'error', title: 'Google Login Error', message: error.message || 'Google login failed' });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View style={styles.absoluteFull}>
        <ImageBackground
          source={{
            uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDhbx38w-pTf5FjSknnDxymie1fKXFcVF9n1S6sbOysN2pwyfRmP-TE-CTx-APs_0EvQaXM3EupUHDxxSsOac5dkcVhBdXANWtEvNEWXTckfbxW3KjyI9ws4hhzCoG1TMoL8JeVfaxQclBk5ebqfQHIMQA5f5OLBF7dcvUbD-Op_Dt7Ix7VYvfUp197Q9r0LXMIbvlf37NhQT7UflMV7SXZ-ClFTooZfTM1crOBUUYHPRV0RQBcQzYg2CG9vKEThfZ30YRVljfG_i4",
          }}
          style={[styles.absoluteFull, styles.heroImage]}
          resizeMode="cover"
          blurRadius={8}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)"]}
            style={styles.absoluteFull}
          />
          <View style={styles.vignette} />
        </ImageBackground>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View
          style={[
            styles.contentContainer,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
        <View style={styles.topBar}>
          <View style={styles.regionIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.regionText}>REGION: INDIA</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.versionText}>v2.105.4.92</Text>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            width: "100%",
            maxWidth: 400,
            alignItems: "center",
          }}
        >
          <View style={styles.logoSection}>
            <MaterialIcons
              name="military-tech"
              size={64}
              color={COLORS.primary}
              style={{
                textShadowColor: "rgba(244,123,37,0.6)",
                textShadowRadius: 15,
              }}
            />
            <Text style={styles.titleText}>BATTLE CORE</Text>
            <Text style={[styles.subtitleText, { color: COLORS.primary }]}>
              MAX
            </Text>
          </View>

          <BlurView
            intensity={30}
            tint="dark"
            style={[styles.loginCard, { borderColor: COLORS.glassBorder }]}
          >
            <View style={styles.formGap}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons
                    name="mail"
                    size={20}
                    color="rgba(255,255,255,0.3)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="name@example.com"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.label}>PASSWORD</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("ForgotPassword")}
                  >
                    <Text style={styles.forgotText}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialIcons
                    name="lock"
                    size={20}
                    color="rgba(255,255,255,0.3)"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.signInButton,
                  { backgroundColor: COLORS.primary },
                  (loading || googleLoading) && { opacity: 0.7 },
                ]}
                onPress={handleLogin}
                disabled={loading || googleLoading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.signInText}>SIGN IN</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    googleLoading && { opacity: 0.5 },
                  ]}
                  onPress={handleGoogleLogin}
                  disabled={googleLoading || !request}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <FontAwesome5 name="google" size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text
                    style={[
                      styles.createAccountText,
                      { color: COLORS.primary },
                    ]}
                  >
                    CREATE ACCOUNT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
        </View>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.corner,
          {
            top: insets.top + 16,
            left: 16,
            borderTopWidth: 1,
            borderLeftWidth: 1,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            top: insets.top + 16,
            right: 16,
            borderTopWidth: 1,
            borderRightWidth: 1,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: insets.bottom + 16,
            left: 16,
            borderBottomWidth: 1,
            borderLeftWidth: 1,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            bottom: insets.bottom + 16,
            right: 16,
            borderBottomWidth: 1,
            borderRightWidth: 1,
          },
        ]}
      />

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
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  flex: {
    flex: 1,
    width: '100%',
  },
  absoluteFull: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroImage: {
    transform: [{ scale: 1.1 }],
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  regionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  regionText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  versionText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "500",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  titleText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "italic",
    letterSpacing: -1,
    marginTop: 8,
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 6,
    marginTop: 4,
  },
  loginCard: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    padding: 24,
    backgroundColor: "rgba(20, 20, 20, 0.75)",
  },
  formGap: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    marginLeft: 4,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    height: 46,
    paddingLeft: 44,
    paddingRight: 16,
    color: "white",
    fontSize: 14,
  },
  forgotText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: "500",
    opacity: 0.8,
  },
  signInButton: {
    width: "100%",
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  signInText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    flexDirection: "column",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 16,
    marginTop: 0,
  },
  footerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  createAccountText: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "rgba(244,123,37,0.3)",
    pointerEvents: "none",
  },
});
