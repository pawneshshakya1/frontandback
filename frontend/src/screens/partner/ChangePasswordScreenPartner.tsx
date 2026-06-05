import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authAPI } from "../../services/api";
import { usePopup } from "../../components/PopupModal";

export const ChangePasswordScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, PopupElement } = usePopup();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Toggle visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      showError("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        showSuccess("Success", "Your password has been updated successfully");
      } else {
        showError("Error", response.data.message || "Failed to update password");
      }
    } catch (error: any) {
      showError("Error", error.response?.data?.message || "Incorrect current password or something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChangeText, secure, setShow, show }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !show}
          placeholderTextColor="rgba(255,255,255,0.3)"
          placeholder="••••••"
        />
        {secure && (
          <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeIcon}>
            <MaterialIcons
              name={show ? "visibility" : "visibility-off"}
              size={20}
              color="rgba(255,255,255,0.4)"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>

      <View style={styles.content}>
        <InputField
          label="CURRENT PASSWORD"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secure={true}
          show={showCurrent}
          setShow={setShowCurrent}
        />

        <InputField
          label="NEW PASSWORD"
          value={newPassword}
          onChangeText={setNewPassword}
          secure={true}
          show={showNew}
          setShow={setShowNew}
        />

        <InputField
          label="CONFIRM NEW PASSWORD"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secure={true}
          show={showConfirm}
          setShow={setShowConfirm}
        />

        <View style={styles.requirementsContainer}>
          <Text style={styles.reqTitle}>PASSWORD REQUIREMENTS:</Text>
          <View style={styles.reqItem}>
            <MaterialIcons name="check-circle" size={14} color="#f47b25" />
            <Text style={styles.reqText}>Minimum 6 characters</Text>
          </View>
          <View style={styles.reqItem}>
            <MaterialIcons name="check-circle" size={14} color="#f47b25" />
            <Text style={styles.reqText}>Include numbers & symbols</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>UPDATE PASSWORD</Text>
          )}
        </TouchableOpacity>
      </View>
      <PopupElement onClose={() => {
        if (currentPassword && newPassword && newPassword === confirmPassword && !loading) {
          navigation.goBack();
        }
      }} />
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  requirementsContainer: {
    marginTop: 8,
    marginBottom: 40,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
  },
  reqTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 12,
  },
  reqItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  reqText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  button: {
    width: "100%",
    height: 56,
    backgroundColor: "#f47b25",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
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
