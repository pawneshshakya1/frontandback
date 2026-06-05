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

export const TermsOfServiceScreen = ({ navigation }: any) => {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        <Text style={styles.lastUpdated}>LAST UPDATED: JANUARY 2026</Text>
        
        <Section 
          title="1. INTRODUCTION" 
          content="Welcome to our E-sports platform. By accessing or using our services, you agree to be bound by these Terms of Service. Please read them carefully before participating in any tournaments."
        />
        
        <Section 
          title="2. ELIGIBILITY" 
          content="To use our services, you must be at least 18 years old or the legal age of majority in your jurisdiction. You must also comply with all local laws regarding online gaming and e-sports competitions."
        />

        <Section 
          title="3. TOURNAMENT RULES" 
          content="Matches are governed by specific game rules and our global fair play policy. Cheating, hacking, or any form of unsportsmanlike conduct will result in immediate disqualification and potential account suspension."
        />

        <Section 
          title="4. PAYMENTS & REFUNDS" 
          content="All entrance fees are processed securely. As stated in our refund policy, tournament entry fees are generally non-refundable once the matchmaking process has begun or the bracket is generated."
        />

        <Section 
          title="5. WALLET & WITHDRAWALS" 
          content="Your wallet balance represents virtual credits that can be used for entry fees or withdrawn to verified payment methods. Withdrawals may be subject to verification and processing times up to 72 hours."
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
