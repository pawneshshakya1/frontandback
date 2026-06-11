import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { usePopup } from "../../components/PopupModal";

const { width } = Dimensions.get("window");

export const PersonalInformationScreenAdmin = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { authData, updateAuthData } = useAuth();
  const { showSuccess, showError, PopupElement } = usePopup();
  const [isSuccessSave, setIsSuccessSave] = useState(false);
  const [formData, setFormData] = useState({
    username: authData?.username || "",
    email: authData?.email || "",
    fullName: "",
    phone: "",
    gameUidName: "",
    gender: "Male" as "Male" | "Female" | "Other",
    ffMaxUid: "",
    guildUid: "",
    guildName: "",
    preferredRole: "" as any,
    discordTag: "",
    bio: "",
    instagram: "",
    facebook: "",
    x: "",
    threads: "",
    youtube: "",
    discordServer: "",
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const originalEmail = authData?.email;

  React.useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('users/profile');
      if (response.data.success) {
        const userObj = response.data.data?.user;
        const profileObj = response.data.data?.profile;
        if (userObj) {
          setFormData({
            username: userObj.username || "",
            email: userObj.email || "",
            fullName: profileObj?.full_name || "",
            phone: profileObj?.phone || "",
            gameUidName: profileObj?.game_uid_name || "",
            gender: profileObj?.gender || "Male",
            ffMaxUid: profileObj?.ff_max_uid || "",
            guildUid: profileObj?.guild_uid || "",
            guildName: profileObj?.guild_name || "",
            preferredRole: profileObj?.preferred_role || "",
            discordTag: profileObj?.discord_tag || "",
            bio: profileObj?.bio || "",
            instagram: profileObj?.instagram || "",
            facebook: profileObj?.facebook || "",
            x: profileObj?.x_twitter || "",
            threads: profileObj?.threads || "",
            youtube: profileObj?.youtube || "",
            discordServer: profileObj?.discord_server || "",
          });
          setAvatar(profileObj?.avatar || null);
          setBackgroundImage(profileObj?.background_image || null);
          setIsEmailVerified(userObj.email === authData?.email);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = {
    primary: "#f47b25",
    bgDark: "#0d0d0d",
    cardDark: "#1a1a1a",
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const pickBackgroundImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setBackgroundImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    try {
      if (formData.email !== originalEmail && !isEmailVerified) {
        showError("Action Required", "Please verify your new email address using the 'VERIFY' button before saving.");
        return;
      }

      setIsVerifying(true);
      
      const updateData = {
        user: {
          username: formData.username,
        },
        profile: {
          full_name: formData.fullName,
          phone: formData.phone,
          game_uid_name: formData.gameUidName,
          gender: formData.gender,
          ff_max_uid: formData.ffMaxUid,
          guild_uid: formData.guildUid,
          guild_name: formData.guildName,
          preferred_role: formData.preferredRole,
          discord_tag: formData.discordTag,
          bio: formData.bio,
          instagram: formData.instagram,
          facebook: formData.facebook,
          x_twitter: formData.x,
          threads: formData.threads,
          youtube: formData.youtube,
          discord_server: formData.discordServer,
          avatar: avatar,
          background_image: backgroundImage,
        }
      };

      const response = await api.put('users/profile', updateData);
      
      if (response.data.success) {
        await updateAuthData({
          email: formData.email,
          avatar: avatar,
          backgroundImage: backgroundImage,
          username: formData.username,
        });
        setIsSuccessSave(true);
        showSuccess("Success", "Profile updated successfully!");
      } else {
        showError("Error", response.data.message || "Failed to update profile");
      }
    } catch (error: any) {
      showError("Error", error.response?.data?.message || "Something went wrong during save");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      if (!formData.email) {
        showError("Error", "Please enter an email address");
        return;
      }
      setIsOtpLoading(true);
      const response = await api.post('auth/send-email-otp', { newEmail: formData.email });
      if (response.data.success) {
        setIsOtpSent(true);
        showSuccess("Success", "OTP sent to your email!");
      } else {
        showError("Error", response.data.message || "Failed to send OTP");
      }
    } catch (error: any) {
      showError("Error", error.response?.data?.message || "Something went wrong");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      if (otpValue.length < 6) {
        showError("Error", "Please enter a valid 6-digit OTP");
        return;
      }
      setIsOtpLoading(true);
      const response = await api.post('auth/verify-email-otp', {
        newEmail: formData.email,
        otp: otpValue,
      });
      if (response.data.success) {
        await updateAuthData({
          email: formData.email,
          username: formData.username,
        });

        setIsEmailVerified(true);
        setShowOtpSection(false);
        setIsOtpSent(false);
        setOtpValue("");
        showSuccess("Success", "Email updated successfully!");
      } else {
        showError("Error", response.data.message || "Invalid OTP");
      }
    } catch (error: any) {
      showError("Error", error.response?.data?.message || "Verification failed");
    } finally {
      setIsOtpLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#f47b25" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Hero Section (Fixed at Top) */}
      <View style={styles.heroContainer}>
        {/* Banner with Edit Overlay */}
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={pickBackgroundImage} 
            style={StyleSheet.absoluteFill}
          >
            {backgroundImage ? (
              <Image source={{ uri: backgroundImage }} style={styles.heroImage} />
            ) : (
              <View style={[styles.heroImage, { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialIcons name="add-photo-alternate" size={40} color="rgba(255,255,255,0.1)" />
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>TAP TO CHANGE COVER</Text>
              </View>
            )}
            <LinearGradient
              colors={["rgba(13,13,13,0)", "rgba(13,13,13,0.8)", "rgba(13,13,13,1)"]}
              style={styles.heroGradient}
            />
          </TouchableOpacity>

          {/* Banner Edit Control */}
          <View style={styles.bannerControls}>
            <TouchableOpacity onPress={pickBackgroundImage} style={styles.bannerActionBtn}>
              <MaterialIcons name="edit" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header Controls */}
        <View style={[styles.headerActions, { top: insets.top + 16 }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="chevron-left" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: '#262626', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialIcons name="person" size={40} color="rgba(255,255,255,0.1)" />
                </View>
              )}
            </View>
            
            {/* Avatar Edit Badge */}
            <TouchableOpacity onPress={pickImage} style={styles.editBadge}>
              <MaterialIcons name="edit" size={14} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 20 }}>
          <View style={styles.form}>
            <Text style={styles.sectionHeader}>BASIC INFO</Text>
            <InputField 
              label="FULL NAME" 
              value={formData.fullName} 
              onChangeText={(t: string) => setFormData({...formData, fullName: t})} 
            />
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>GENDER</Text>
              <View style={styles.choiceRow}>
                <GenderOption 
                  label="Male" 
                  isSelected={formData.gender === "Male"} 
                  onSelect={(v) => setFormData({...formData, gender: v})} 
                />
                <GenderOption 
                  label="Female" 
                  isSelected={formData.gender === "Female"} 
                  onSelect={(v) => setFormData({...formData, gender: v})} 
                />
                <GenderOption 
                  label="Other" 
                  isSelected={formData.gender === "Other"} 
                  onSelect={(v) => setFormData({...formData, gender: v})} 
                />
              </View>
            </View>

            <InputField 
              label="BIO / MOTTO" 
              value={formData.bio} 
              onChangeText={(t: string) => setFormData({...formData, bio: t})} 
              placeholder="Tell us about yourself"
            />

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>GAME DETAILS</Text>
            
            <InputField 
              label="GAME UID NAME" 
              value={formData.gameUidName} 
              onChangeText={(t: string) => setFormData({...formData, gameUidName: t})} 
              placeholder="Enter your in-game name"
            />

            <InputField 
              label="FREE FIRE MAX UID" 
              value={formData.ffMaxUid} 
              onChangeText={(t: string) => setFormData({...formData, ffMaxUid: t})} 
              keyboardType="numeric"
              placeholder="e.g. 12345678"
            />

            <InputField 
              label="GUILD NAME" 
              value={formData.guildName} 
              onChangeText={(t: string) => setFormData({...formData, guildName: t})} 
            />

            <InputField 
              label="GUILD UID" 
              value={formData.guildUid} 
              onChangeText={(t: string) => setFormData({...formData, guildUid: t})} 
              keyboardType="numeric"
            />

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>SOCIAL & CONTACT</Text>

            <InputField 
              label="EMAIL ADDRESS" 
              value={formData.email} 
              onChangeText={(t: string) => {
                setFormData({...formData, email: t});
                setIsEmailVerified(t === originalEmail);
                setShowOtpSection(false);
                setIsOtpSent(false);
                setOtpValue("");
              }} 
              keyboardType="email-address"
              isVerified={isEmailVerified}
              rightElement={
                !isEmailVerified && !showOtpSection && (
                  <TouchableOpacity 
                    style={styles.verifyInlineBtn}
                    onPress={() => setShowOtpSection(true)}
                  >
                    <Text style={styles.verifyInlineBtnText}>VERIFY</Text>
                  </TouchableOpacity>
                )
              }
            />

            {showOtpSection && !isEmailVerified && (
              <View style={styles.otpInlineContainer}>
                <TextInput
                  style={styles.otpInlineInput}
                  value={otpValue}
                  onChangeText={setOtpValue}
                  placeholder={isOtpSent ? "ENTER OTP" : "VERIFICATION REQUIRED"}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={isOtpSent}
                />
                <TouchableOpacity 
                  style={[styles.otpInlineBtn, (!isOtpSent && { backgroundColor: '#333' })]}
                  onPress={isOtpSent ? verifyOtp : handleSendOtp}
                  disabled={isOtpLoading}
                >
                  {isOtpLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.otpInlineBtnText}>{isOtpSent ? "SUBMIT" : "SEND OTP"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <InputField 
              label="PHONE NUMBER" 
              value={formData.phone} 
              onChangeText={(t: string) => setFormData({...formData, phone: t})} 
              keyboardType="phone-pad"
            />

            <InputField 
              label="DISCORD TAG" 
              value={formData.discordTag} 
              onChangeText={(t: string) => setFormData({...formData, discordTag: t})} 
              placeholder="User#1234"
            />

            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>SOCIAL LINKS</Text>

            <InputField 
              label="INSTAGRAM" 
              value={formData.instagram} 
              onChangeText={(t: string) => setFormData({...formData, instagram: t})} 
              placeholder="Username"
              icon="logo-instagram"
            />
            <InputField 
              label="FACEBOOK" 
              value={formData.facebook} 
              onChangeText={(t: string) => setFormData({...formData, facebook: t})} 
              placeholder="Profile link or username"
              icon="logo-facebook"
            />
            <InputField 
              label="X (TWITTER)" 
              value={formData.x} 
              onChangeText={(t: string) => setFormData({...formData, x: t})} 
              placeholder="Username"
              icon="logo-twitter"
            />
            <InputField 
              label="THREADS" 
              value={formData.threads} 
              onChangeText={(t: string) => setFormData({...formData, threads: t})} 
              placeholder="Username"
              icon="at-circle-outline"
            />
            <InputField 
              label="YOUTUBE" 
              value={formData.youtube} 
              onChangeText={(t: string) => setFormData({...formData, youtube: t})} 
              placeholder="Channel link or Name"
              icon="logo-youtube"
            />
            <InputField 
              label="DISCORD SERVER" 
              value={formData.discordServer} 
              onChangeText={(t: string) => setFormData({...formData, discordServer: t})} 
              placeholder="Invite link (discord.gg/xxxx)"
              icon="logo-discord"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button (Fixed at Bottom) */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
          )}
        </TouchableOpacity>
      </View>
      <PopupElement onClose={() => {
        if (isSuccessSave) {
          navigation.goBack();
        }
      }} />
    </View>
  );
};

const InputField = ({ label, value, onChangeText, keyboardType = "default", placeholder = "", icon, isVerified, rightElement }: any) => (
  <View style={styles.inputContainer}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={styles.inputLabel}>{label}</Text>
      {isVerified && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
          <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
          <Text style={{ color: "#4CAF50", fontSize: 9, fontWeight: 'bold', marginLeft: 4 }}>VERIFIED</Text>
        </View>
      )}
    </View>
    <View style={styles.inputWrapper}>
      {icon && <Ionicons name={icon} size={20} color="rgba(255,255,255,0.3)" style={styles.inputIcon} />}
      <TextInput
        style={[styles.input, { color: "white", flex: 1, paddingHorizontal: icon ? 12 : 16 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.2)"
        keyboardType={keyboardType}
      />
      {rightElement}
    </View>
  </View>
);

const GenderOption = ({ label, isSelected, onSelect }: { label: string, isSelected: boolean, onSelect: (val: any) => void }) => (
  <TouchableOpacity 
    style={[
      styles.choiceBtn, 
      isSelected && styles.choiceBtnActive
    ]} 
    onPress={() => onSelect(label)}
  >
    <Text style={[
      styles.choiceBtnText, 
      isSelected && styles.choiceBtnTextActive
    ]}>{label}</Text>
  </TouchableOpacity>
);

const RoleOption = ({ label, isSelected, onSelect }: { label: string, isSelected: boolean, onSelect: (val: any) => void }) => (
  <TouchableOpacity 
    style={[
      styles.choiceBtn, 
      isSelected && styles.choiceBtnActive
    ]} 
    onPress={() => onSelect(label)}
  >
    <Text style={[
      styles.choiceBtnText, 
      isSelected && styles.choiceBtnTextActive
    ]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    width: "100%",
    height: 320,
    backgroundColor: '#0d0d0d',
  },
  heroImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  headerActions: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  profileSection: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  avatarBorder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#f47b25",
    padding: 3,
    backgroundColor: "#0d0d0d",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#f47b25",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#0d0d0d",
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameDisplay: {
    fontSize: 18,
    fontWeight: "900",
    color: "white",
    textTransform: "uppercase",
    fontStyle: 'italic',
  },
  avatarActions: {
    display: 'none',
  },
  bannerControls: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  bannerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: "rgba(244,123,37,0.7)",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  choiceBtn: {
    flex: 1,
    height: 46,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceBtnActive: {
    borderColor: "#f47b25",
    backgroundColor: "rgba(244,123,37,0.1)",
  },
  choiceBtnText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "bold",
  },
  choiceBtnTextActive: {
    color: "#f47b25",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 12,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    height: 46,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    fontSize: 15,
  },
  saveButton: {
    height: 46,
    backgroundColor: "#f47b25",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: "#0d0d0d",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  saveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  otpInput: {
    width: '100%',
    height: 46,
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: 'white',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  verifyBtn: {
    backgroundColor: '#f47b25',
  },
  cancelBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  verifyBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  verifyInlineBtn: {
    paddingHorizontal: 12,
    height: 30,
    backgroundColor: 'rgba(244,123,37,0.15)',
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,123,37,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyInlineBtnText: {
    color: '#f47b25',
    fontSize: 10,
    fontWeight: 'bold',
  },
  otpInlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -16,
    marginBottom: 8,
  },
  otpInlineInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: 'white',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  otpInlineBtn: {
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: '#f47b25',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInlineBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
