import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useWalletStore } from "../../store/useWalletStore";
import { PopupModal } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const SendGiftScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [accountNo, setAccountNo] = useState("");
  const [recipient, setRecipient] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [popup, setPopup] = useState<{
    visible: boolean;
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message: string;
    buttons?: any[];
  }>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const { sendGift, verifyReceiver, isLoading } = useWalletStore();

  const quickAmounts = ["500", "1000", "2000", "5000"];

  const COLORS = {
    primary: "#f47b25",
    bgDark: "#0d0d0d",
    cardDark: "#1a1a1a",
    accentBlue: "#2563eb",
    glassBorder: "rgba(255, 255, 255, 0.1)",
  };

  const handleVerify = async () => {
    if (!accountNo.trim()) {
      setPopup({
        visible: true,
        type: "warning",
        title: "Error",
        message: "Please enter a wallet account number",
      });
      return;
    }

    try {
      const res = await verifyReceiver(accountNo);
      if (res.success) {
        setRecipient(res.data);
      }
    } catch (error: any) {
      setRecipient(null);
      setPopup({
        visible: true,
        type: "error",
        title: "Verification Failed",
        message: error.message || "Wallet not found",
      });
    }
  };

  const handleConfirmSend = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setPopup({
        visible: true,
        type: "warning",
        title: "Invalid Amount",
        message: "Please enter a valid amount to send.",
      });
      return;
    }
    if (pin.length < 4) {
      setPopup({
        visible: true,
        type: "warning",
        title: "Security PIN",
        message: "Please enter your 6-digit Wallet PIN.",
      });
      return;
    }
    setPopup({
      visible: true,
      type: "confirm",
      title: "Confirm Transaction",
      message: `Are you sure you want to send ₹${amount} to ${accountNo}?`,
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => setPopup(p => ({ ...p, visible: false })) },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setPopup(p => ({ ...p, visible: false }));
              const res = await sendGift(accountNo, Number(amount), pin);
              if (res.success) {
                setPopup({
                  visible: true,
                  type: "success",
                  title: "Success",
                  message: "Gift sent successfully!",
                  buttons: [
                    {
                      text: "OK",
                      onPress: () => {
                        setPopup(p => ({ ...p, visible: false }));
                        navigation.goBack();
                      }
                    }
                  ]
                });
              }
            } catch (error: any) {
              setPopup({
                visible: true,
                type: "error",
                title: "Error",
                message: error.message || "Failed to send gift",
              });
            }
          }
        }
      ]
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Layer */}
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
        <Text style={styles.headerTitle}>Send Gift</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Recipient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECIPIENT DETAILS</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.inputField, { paddingRight: 90 }]}
              placeholder="Enter Wallet Account No."
              placeholderTextColor="rgba(255, 255, 255, 0.2)"
              value={accountNo}
              onChangeText={setAccountNo}
            />
            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={isLoading}>
              <Text style={styles.verifyBtnText}>{isLoading ? "..." : "VERIFY"}</Text>
            </TouchableOpacity>
          </View>

          {recipient && (
            <View style={styles.recipientCard}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: "https://ui-avatars.com/api/?name=" + recipient.username + "&background=random" }}
                  style={styles.avatar}
                />
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text style={styles.username}>{recipient.username}</Text>
                  <MaterialIcons name="verified" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.verifiedText}>Verified Recipient</Text>
              </View>
            </View>
          )}
        </View>

        {/* Amount Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AMOUNT</Text>
          <View style={styles.amountInputArea}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="rgba(255, 255, 255, 0.2)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <View style={styles.pillRow}>
            {quickAmounts.map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.pill}
                onPress={() => setAmount(val)}
              >
                <Text style={styles.pillText}>₹{parseInt(val).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY</Text>
          <View style={styles.securityInputArea}>
            <MaterialIcons name="lock" size={18} color="rgba(255, 255, 255, 0.2)" style={styles.lockIcon} />
            <TextInput
              style={styles.pinInput}
              placeholder="Enter Wallet PIN"
              placeholderTextColor="rgba(255, 255, 255, 0.2)"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={pin}
              onChangeText={setPin}
            />
          </View>
          <Text style={styles.securityHint}>Required for secure transaction</Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleConfirmSend}
          disabled={isLoading}
        >
          <Text style={styles.confirmBtnText}>{isLoading ? "SENDING..." : "CONFIRM & SEND"}</Text>
          <MaterialIcons name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        buttons={popup.buttons}
        onClose={() => setPopup((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
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
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  inputField: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    height: 46,
    paddingHorizontal: 20,
    color: "white",
    fontSize: 14,
  },
  verifyBtn: {
    position: "absolute",
    right: 5,
    top: 5,
    bottom: 5,
    backgroundColor: "#f47b25",
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  recipientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(244, 123, 37, 0.3)",
    marginRight: 16,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  username: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  verifiedText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  amountInputArea: {
    position: "relative",
    justifyContent: "center",
  },
  currencySymbol: {
    position: "absolute",
    left: 20,
    color: "#f47b25",
    fontSize: 18,
    fontWeight: "bold",
    zIndex: 10,
  },
  amountInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    height: 46,
    paddingLeft: 40,
    paddingHorizontal: 20,
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 23,
    paddingHorizontal: 16,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "bold",
  },
  securityInputArea: {
    position: "relative",
    justifyContent: "center",
  },
  lockIcon: {
    position: "absolute",
    left: 20,
    zIndex: 10,
  },
  pinInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    height: 46,
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 8,
  },
  securityHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(13, 13, 13, 0.9)",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  confirmBtn: {
    backgroundColor: "#f47b25",
    height: 46,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  confirmBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
