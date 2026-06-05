import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export const AchievementsScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const achievements = [
    { title: "Killstreak Master", desc: "Get 15 kills in a single match", icon: "local-fire-department", color: "#f47b25", earned: true },
    { title: "Survivor Pro", desc: "Win 10 matches without dying", icon: "security", color: "#2563eb", earned: true },
    { title: "First Blood", desc: "Get the first kill in 50 matches", icon: "bolt", color: "#eab308", earned: true },
    { title: "Sharpshooter", desc: "Maintain 80% accuracy in 5 matches", icon: "gps-fixed", color: "#ef4444", earned: false },
    { title: "Wealthy Warrior", desc: "Earn over $1000 in tournament winnings", icon: "account-balance-wallet", color: "#10b981", earned: false },
    { title: "Social Gamer", desc: "Play 20 matches with friends", icon: "group", color: "#8b5cf6", earned: true },
  ];

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
        <View>
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSubtitle}>4 / 6 COMPLETED</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <View style={styles.summaryCard}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '66%' }]} />
          </View>
          <Text style={styles.summaryText}>You've earned 66% of all available badges!</Text>
        </View>

        <View style={styles.grid}>
          {achievements.map((item, index) => (
            <View
              key={index}
              style={[
                styles.achievementCard,
                !item.earned && styles.unearnedCard
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}${item.earned ? '20' : '05'}` }]}>
                <MaterialIcons name={item.icon as any} size={28} color={item.earned ? item.color : "rgba(255,255,255,0.1)"} />
              </View>
              <Text style={[styles.itemTitle, !item.earned && { color: 'rgba(255,255,255,0.3)' }]}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.desc}</Text>
              {item.earned && (
                <View style={styles.earnedBadge}>
                  <MaterialIcons name="check" size={10} color="white" />
                </View>
              )}
            </View>
          ))}
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
    gap: 16,
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
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#f47b25",
    letterSpacing: 1,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 24,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#f47b25",
    borderRadius: 3,
  },
  summaryText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: (width - 52) / 2,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    position: "relative",
  },
  unearnedCard: {
    opacity: 0.6,
    borderStyle: "dashed",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  itemTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  itemDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  earnedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
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
