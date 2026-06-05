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

export const PersonalizationScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const [allowAds, setAllowAds] = useState(true);
  const [allowGameRecs, setAllowGameRecs] = useState(true);
  const [shareData, setShareData] = useState(false);

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
        <Text style={styles.headerTitle}>Personalization</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.sectionTitle}>ADS & RECOMMENDATIONS</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Personalized Ads"
            desc="Show ads relevant to your interests"
            icon="ad-units"
            value={allowAds}
            onValueChange={setAllowAds}
          />
          <View style={styles.divider} />
          <ToggleItem
            title="Game Recommendations"
            desc="Suggest games based on your play history"
            icon="games"
            value={allowGameRecs}
            onValueChange={setAllowGameRecs}
          />
        </View>

        <Text style={styles.sectionTitle}>DATA IMPROVEMENT</Text>
        <View style={styles.card}>
          <ToggleItem
            title="Share Usage Data"
            desc="Help us improve the app by sharing anonymous data"
            icon="analytics"
            value={shareData}
            onValueChange={setShareData}
          />
        </View>

        <Text style={styles.footerText}>
          We respect your privacy choices. You can change these settings at any time. Read our Privacy Policy for more details.
        </Text>
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
    paddingRight: 10, // Avoid overlap with switch
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 20,
  },
  footerText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginTop: 40,
    marginHorizontal: 20,
    lineHeight: 18,
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
