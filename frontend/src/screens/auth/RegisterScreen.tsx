import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

export const RegisterScreen = ({ navigation }: any) => {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return false;
    }
    if (username.trim().length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return false;
    }
    if (username.trim().length > 30) {
      Alert.alert("Error", "Username must be less than 30 characters");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      Alert.alert("Success", "Account created successfully!");
    } catch (error: any) {
      Alert.alert(
        "Registration Failed",
        error.response?.data?.message || error.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
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

      <View
        style={[
          styles.contentContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
            <Text style={styles.backText}>BACK</Text>
          </TouchableOpacity>
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
              name="person-add"
              size={50}
              color={COLORS.primary}
              style={{
                textShadowColor: "rgba(244,123,37,0.6)",
                textShadowRadius: 15,
              }}
            />
            <Text style={styles.titleText}>CREATE ACCOUNT</Text>
            <Text style={[styles.subtitleText, { color: COLORS.primary }]}>
              JOIN THE FIGHT
            </Text>
          </View>

          <BlurView
            intensity={30}
            tint="dark"
            style={[styles.loginCard, { borderColor: COLORS.glassBorder }]}
          >
            <View style={styles.formGap}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>USERNAME</Text>
                <TextInput
                  placeholder="SoldierName"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.signInButton,
                  { backgroundColor: COLORS.primary },
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.signInText}>CONFIRM REGISTRATION</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                  <Text
                    style={[
                      styles.createAccountText,
                      { color: COLORS.primary },
                    ]}
                  >
                    SIGN IN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
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
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
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
    letterSpacing: 4,
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
    gap: 16,
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
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 16,
    color: "white",
    fontSize: 14,
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
