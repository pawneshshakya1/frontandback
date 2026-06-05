import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export const SecurityPrivacyScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const COLORS = {
    primary: "#f47b25",
    danger: "#ef4444",
  };

  const MenuItem = ({ title, desc, icon, onPress }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={20} color="#f47b25" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemDesc}>{desc}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.2)" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Decorative Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security & Privacy</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <Text style={styles.sectionTitle}>ACCOUNT PROTECTION</Text>
        <View style={styles.card}>
          <MenuItem
            title="Change Password"
            desc="Last changed 3 months ago"
            icon="lock"
            onPress={() => navigation.navigate("ChangePassword")}
          />
          <View style={styles.divider} />
          <MenuItem
            title="Two-Factor Authentication"
            desc="Highly recommended for protection"
            icon="verified-user"
            onPress={() => navigation.navigate("TwoFactorAuth")}
          />
          <View style={styles.divider} />
          <MenuItem
            title="Login Activity"
            desc="Check where you are logged in"
            icon="devices"
            onPress={() => navigation.navigate("LoginActivity")}
          />
        </View>

        <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
        <View style={styles.card}>
          <MenuItem
            title="Account Visibility"
            desc="Public profile and matchmaking"
            icon="visibility"
            onPress={() => navigation.navigate("AccountVisibility")}
          />
          <View style={styles.divider} />
          <MenuItem
            title="Personalization"
            desc="Manage how we use your data"
            icon="insights"
            onPress={() => navigation.navigate("Personalization")}
          />
          <View style={styles.divider} />
          <MenuItem
            title="Blocked Players"
            desc="Manage your block list"
            icon="block"
            onPress={() => navigation.navigate("BlockedPlayers")}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>DANGER ZONE</Text>
        <View style={[styles.card, { borderColor: "rgba(239, 68, 68, 0.1)" }]}>
          <TouchableOpacity
            style={styles.item}
            onPress={() => setShowDeleteModal(true)}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                <MaterialIcons name="delete-forever" size={20} color={COLORS.danger} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color: COLORS.danger }]}>Delete Account</Text>
                <Text style={styles.itemDesc}>Permanently remove your account and data</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="rgba(239, 68, 68, 0.2)" />
          </TouchableOpacity>
        </View>
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
              <MaterialIcons name="warning" size={40} color={COLORS.danger} />
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
                disabled={deleteConfirmation !== "DELETE"}
                onPress={() => {
                  Alert.alert("Account Deleted", "Your account has been permanently removed.");
                  setShowDeleteModal(false);
                  navigation.navigate("Login");
                }}
              >
                <Text style={styles.deleteButtonText}>PERMANENTLY DELETE</Text>
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
    backgroundColor: "#0d0d0d",
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
    textAlign: "center",
    flex: 1,
    marginRight: 40, // To balance the back button's width (40)
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginTop: 32,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(244,123,37,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  itemDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 20,
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
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 32,
    alignItems: "center",
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239,68,68,0.1)",
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
    backgroundColor: "#ef4444",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
});
