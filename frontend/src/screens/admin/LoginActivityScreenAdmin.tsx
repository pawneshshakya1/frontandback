import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authAPI } from "../../services/api";
import { usePopup } from "../../components/PopupModal";

export const LoginActivityScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { showError, PopupElement } = usePopup();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigation.navigate("Login");
    } catch (e) {
      showError("Error", "Failed to logout");
    }
  };

  const sessions = [
    {
      id: 1,
      device: "iPhone 15 Pro",
      location: "New York, USA",
      time: "Active Now",
      isCurrent: true,
      icon: "phone-iphone"
    },
    {
      id: 2,
      device: "Chrome on Windows",
      location: "New York, USA",
      time: "2 hours ago",
      isCurrent: false,
      icon: "laptop-mac" // using mac icon for generic desktop
    },
    {
      id: 3,
      device: "iPad Air",
      location: "New Jersey, USA",
      time: "Yesterday, 10:30 PM",
      isCurrent: false,
      icon: "tablet-mac"
    }
  ];

  const SessionItem = ({ item }: any) => (
    <View style={styles.sessionItem}>
      <View style={styles.deviceIcon}>
        <MaterialIcons name={item.icon} size={24} color={item.isCurrent ? "#f47b25" : "rgba(255,255,255,0.5)"} />
        {item.isCurrent && <View style={styles.activeDot} />}
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.deviceName}>{item.device}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.locationText}>{item.location}</Text>
          <View style={styles.dot} />
          <Text style={[styles.timeText, item.isCurrent && { color: "#f47b25" }]}>
            {item.time}
          </Text>
        </View>
      </View>
      {!item.isCurrent && (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={`Logout from ${item.device}`}
        >
          <MaterialIcons name="logout" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      )}
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
        <Text style={styles.headerTitle}>Login Activity</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>CURRENT SESSION</Text>
        <View style={styles.card}>
          {sessions.filter(s => s.isCurrent).map(s => <SessionItem key={s.id} item={s} />)}
        </View>

        <Text style={styles.sectionTitle}>OTHER DEVICES</Text>
        <View style={styles.card}>
          {sessions.filter(s => !s.isCurrent).map((s, index) => (
            <View key={s.id}>
              <SessionItem item={s} />
              {index < sessions.filter(x => !x.isCurrent).length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutAllBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout of all sessions"
        >
          <Text style={styles.logoutAllText}>LOG OUT OF ALL OTHER SESSIONS</Text>
        </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginTop: 24,
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
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#f47b25",
    borderWidth: 2,
    borderColor: "#1a1a1a",
  },
  sessionInfo: {
    flex: 1,
  },
  deviceName: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 6,
  },
  timeText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  logoutBtn: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginLeft: 80,
    marginRight: 20,
  },
  logoutAllBtn: {
    marginTop: 40,
    alignSelf: "center",
  },
  logoutAllText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "bold",
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
