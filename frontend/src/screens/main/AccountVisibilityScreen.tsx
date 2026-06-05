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

export const AccountVisibilityScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showMatchHistory, setShowMatchHistory] = useState(true);
  const [showInventory, setShowInventory] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  const ToggleItem = ({ title, desc, icon, value, onValueChange }: any) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon} size={20} color="#f47b25" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemDesc}>{desc}</Text>
        </View>
      </View>
      <Switch
        trackColor={{ false: "#333", true: "#f47b25" }}
        thumbColor={value ? "white" : "#f4f3f4"}
        onValueChange={onValueChange}
        value={value}
      />
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
        <Text style={styles.headerTitle}>Account Visibility</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={styles.infoText}>
            Control who can see your profile details. Keeping your profile public helps in finding friends and teammates.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>PROFILE PRIVACY</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Public Profile"
            desc="Everyone can find you and see your profile"
            icon="public"
            value={isPublicProfile}
            onValueChange={setIsPublicProfile}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Online Status"
            desc="Show when you are active"
            icon="circle"
            value={showOnlineStatus}
            onValueChange={setShowOnlineStatus}
          />
        </View>

        <Text style={styles.sectionTitle}>GAME DATA</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Match History"
            desc="Allow others to see your past games"
            icon="history"
            value={showMatchHistory}
            onValueChange={setShowMatchHistory}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Inventory & Skins"
            desc="Display your collected items"
            icon="inventory-2"
            value={showInventory}
            onValueChange={setShowInventory}
          />
        </View>
      </ScrollView>
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
    marginRight: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  infoBox: {
    backgroundColor: "rgba(37,99,235,0.1)",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
  },
  infoText: {
    flex: 1,
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginTop: 12,
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
    backgroundColor: "rgba(255,255,255,0.05)",
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
});
