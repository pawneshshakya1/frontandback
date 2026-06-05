import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  StatusBar,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { authAPI, adminAPI } from "../../services/api";
import { COLORS } from "../../theme/colors";

const { width } = Dimensions.get("window");

export const SettingsScreenPartner = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const SettingItem = ({ icon, title, value, onPress, iconBg = "rgba(244,123,37,0.1)", iconColor = COLORS.primary, rightElement = "chevron" }: any) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {rightElement === "chevron" && (
          <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.2)" />
        )}
        {rightElement === "toggle" && (
          <Switch
            value={pushNotifications}
            onValueChange={setPushNotifications}
            trackColor={{ false: "#333", true: COLORS.primary }}
            thumbColor={"#fff"}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const Section = ({ title, children, isDanger = false }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isDanger && { color: "rgba(239,68,68,0.6)" }]}>{title}</Text>
      <View style={[styles.sectionCard, isDanger && { backgroundColor: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.1)" }]}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Decorative Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Settings */}
        <Section title="ACCOUNT SETTINGS">
          <SettingItem 
            icon="lock" 
            title="Change Password" 
            onPress={() => navigation.navigate("SecurityPrivacy")} 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="verified-user" 
            title="Two-Factor Authentication" 
            value="ON"
            onPress={() => navigation.navigate("SecurityPrivacy")} 
          />
        </Section>

        {/* Game Settings */}
        <Section title="GAME SETTINGS">
          <SettingItem
            icon="volume-up"
            title="Sound & Music"
            iconBg="rgba(37,99,235,0.1)"
            iconColor={COLORS.accentBlue}
            onPress={() => Alert.alert("Sound Settings", "Adjust SFX and Music volume.")}
          />
          <View style={styles.divider} />
          <SettingItem
            icon="notifications-active"
            title="Push Notifications"
            iconBg="rgba(37,99,235,0.1)"
            iconColor={COLORS.accentBlue}
            rightElement="toggle"
          />
        </Section>

        {/* Legal & About */}
        <Section title="LEGAL & ABOUT">
          <SettingItem 
            icon="description" 
            title="Terms of Service" 
            iconBg="rgba(255,255,255,0.05)"
            iconColor="rgba(255,255,255,0.6)"
            onPress={() => navigation.navigate("TermsOfService")} 
          />
          <View style={styles.divider} />
          <SettingItem 
            icon="policy" 
            title="Privacy Policy" 
            iconBg="rgba(255,255,255,0.05)"
            iconColor="rgba(255,255,255,0.6)"
            onPress={() => navigation.navigate("PrivacyPolicy")} 
          />
        </Section>

        {/* Danger Zone */}
        <Section title="DANGER ZONE" isDanger={true}>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: `${COLORS.error}33` }]}>
                <MaterialIcons name="delete-forever" size={20} color={COLORS.error} />
              </View>
              <Text style={styles.settingTitleDanger}>Delete Account</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={`${COLORS.error}66`} />
          </TouchableOpacity>
        </Section>
        <Text style={styles.dangerDesc}>
          Once you delete your account, there is no going back. All tournament history and wallet balance will be permanently lost.
        </Text>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <MaterialIcons name="warning" size={40} color={COLORS.error} />
            </View>
            
            <Text style={styles.modalTitle}>DELETE ACCOUNT?</Text>
            <Text style={styles.modalSubtitle}>
              This action is permanent and cannot be undone. All your match history, winnings, and skins will be lost forever.
            </Text>

            <View style={styles.confirmInputContainer}>
              <Text style={styles.inputLabel}>TYPE 'DELETE' TO CONFIRM</Text>
              <TextInput
                style={styles.confirmInput}
                placeholder="DELETE"
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={deleteConfirmation}
                onChangeText={setDeleteConfirmation}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  deleteConfirmation !== "DELETE" && { opacity: 0.5 }
                ]}
                disabled={deleteConfirmation !== "DELETE" || isDeleting}
                onPress={async () => {
                  setIsDeleting(true);
                  try {
                    await adminAPI.deleteUser(authData?._id || 'me');
                    signOut();
                    setShowDeleteModal(false);
                    setDeleteConfirmation("");
                    Alert.alert("Account Deleted", "Your account has been permanently removed.", [
                      { text: "OK", onPress: () => navigation.navigate("Login") }
                    ]);
                  } catch (error) {
                    Alert.alert("Error", "Failed to delete account. Please try again.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.deleteButtonText}>PERMANENTLY DELETE</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                }}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
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
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 20,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "white",
  },
  settingTitleDanger: {
    fontSize: 15,
    fontWeight: "900",
    fontStyle: "italic",
    textTransform: "uppercase",
    color: COLORS.error,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 16,
  },
  dangerDesc: {
    marginTop: 12,
    paddingHorizontal: 28,
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.error}1A`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    color: "white",
    textTransform: "uppercase",
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  confirmInputContainer: {
    width: "100%",
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
  },
  confirmInput: {
    width: "100%",
    height: 56,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingHorizontal: 20,
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  modalButtons: {
    width: "100%",
    gap: 12,
  },
  deleteButton: {
    width: "100%",
    height: 60,
    backgroundColor: COLORS.error,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cancelButton: {
    width: "100%",
    height: 56,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bgGlowTop: {
    position: "absolute",
    top: "-10%",
    right: "-20%",
    width: 300,
    height: 300,
    backgroundColor: `${COLORS.primary}26`,
    borderRadius: 150,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-10%",
    left: "-20%",
    width: 300,
    height: 300,
    backgroundColor: `${COLORS.accentBlue}1A`,
    borderRadius: 150,
    opacity: 0.5,
  },
});
