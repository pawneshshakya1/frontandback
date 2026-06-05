import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const PrivacyPolicyScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const Section = ({ title, content }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{content}</Text>
    </View>
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        <Text style={styles.lastUpdated}>LAST UPDATED: JANUARY 2026</Text>
        
        <Section 
          title="1. DATA COLLECTION" 
          content="We collect information that you provides directly to us, such as when you create an account, participate in a tournament, or contact customer support."
        />
        
        <Section 
          title="2. GAME DATA" 
          content="To ensure fair play and track performance, we collect statistical data from your matches, including kills, deaths, match duration, and in-game behavior."
        />

        <Section 
          title="3. THIRD-PARTY SERVICES" 
          content="We may use third-party payment processors to handle wallet transactions. These services have their own privacy policies regarding how they handle your financial information."
        />

        <Section 
          title="4. YOUR RIGHTS" 
          content="You have the right to access, correct, or delete your personal information. You can manage most of these settings directly through your profile or by contacting our support team."
        />

        <Section 
          title="5. SECURITY" 
          content="We implement robust security measures to protect your data, including encryption for sensitive information and regular security audits of our infrastructure."
        />
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
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  lastUpdated: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#f47b25",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 22,
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
