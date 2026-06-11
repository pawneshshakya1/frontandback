import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Switch,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePopup } from "../../components/PopupModal";

export const TwoFactorAuthScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showConfirm, showSuccess, showInfo, PopupElement } = usePopup();
  const [isEnabled, setIsEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const toggleSwitch = () => {
    if (!isEnabled) {
      setShowSetup(true);
    } else {
      showConfirm(
        "Disable 2FA?",
        "Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.",
        () => {
          setIsEnabled(false);
          setShowSetup(false);
        },
        "Disable"
      );
    }
  };

  const handleVerify = () => {
    setIsEnabled(true);
    setShowSetup(false);
    showSuccess("Success", "Two-Factor Authentication has been enabled!");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Two-Factor Auth</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mainCard}>
          <View style={styles.cardIcon}>
            <MaterialIcons name="verified-user" size={32} color="#f47b25" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
            <Text style={styles.cardDesc}>
              Protect your account by requiring an extra code when logging in on a new device.
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#333", true: "#f47b25" }}
            thumbColor={isEnabled ? "white" : "#f4f3f4"}
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        </View>

        {showSetup && (
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>SETUP INSTRUCTIONS</Text>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepText}>Download Google Authenticator or Authy</Text>
            </View>
            <View style={styles.stepItem}>
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepText}>Scan the QR code below or enter the key manually</Text>
            </View>

            <View style={styles.qrPlaceholder}>
              <MaterialIcons name="qr-code-2" size={100} color="white" />
              <Text style={styles.qrText}>MOCK QR CODE</Text>
            </View>

            <View style={styles.keyContainer}>
              <Text style={styles.keyLabel}>SETUP KEY</Text>
              <Text style={styles.keyValue}>ABCD 1234 EFGH 5678</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  showInfo(
                    "Setup Key",
                    "ABCD 1234 EFGH 5678\n\nPlease write down this key or take a screenshot.",
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel="Copy Setup Key"
              >
                <MaterialIcons name="content-copy" size={16} color="#f47b25" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
              <Text style={styles.verifyButtonText}>I HAVE SCANNED THE CODE</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <PopupElement />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
    marginRight: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mainCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 24,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(244,123,37,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardText: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 18,
  },
  setupContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.2)",
  },
  setupTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#f47b25",
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: "center",
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "white",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 22,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: "black",
    alignSelf: "center",
    borderRadius: 12,
    marginVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  qrText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 8,
    letterSpacing: 1,
  },
  keyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    justifyContent: "space-between",
  },
  keyLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "bold",
  },
  keyValue: {
    color: "white",
    fontSize: 14,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  copyButton: {
    padding: 8,
  },
  verifyButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#f47b25",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(244,123,37,0.15)",
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 150,
    opacity: 0.5,
  },
});
