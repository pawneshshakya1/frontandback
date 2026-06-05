import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const BlockedPlayersScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const [blockedUsers, setBlockedUsers] = useState([
    { id: 1, name: "ToxicGamer99", avatar: "https://via.placeholder.com/50", reason: "Harassment" },
    { id: 2, name: "NoobMaster69", avatar: "https://via.placeholder.com/50", reason: "Spamming" },
  ]);

  const handleUnblock = (id: number) => {
    setBlockedUsers(prev => prev.filter(user => user.id !== id));
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
        <Text style={styles.headerTitle}>Blocked Players</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {blockedUsers.length > 0 ? (
          blockedUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userAvatarContainer}>
                <MaterialIcons name="person" size={24} color="rgba(255,255,255,0.5)" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userReason}>Blocked for: {user.reason}</Text>
              </View>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(user.id)}
              >
                <Text style={styles.unblockText}>UNBLOCK</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="check-circle" size={48} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={styles.emptyTitle}>No Blocked Players</Text>
            <Text style={styles.emptyDesc}>Your block list is empty. Peace and quiet!</Text>
          </View>
        )}
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  userAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  userReason: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  unblockButton: {
    backgroundColor: "rgba(244,123,37,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.3)",
  },
  unblockText: {
    color: "#f47b25",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    textAlign: "center",
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
