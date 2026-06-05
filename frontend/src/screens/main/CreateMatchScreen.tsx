import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import api from "../../services/api";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#f47b25",
  bgDark: "#0d0d0d",
  cardDark: "#1a1a1a",
  accentBlue: "#2563eb",
};

const MAPS = [
  {
    id: "BERMUDA",
    name: "BERMUDA",
    image:
      "https://raw.githubusercontent.com/pawneshshakya/ffmaps/refs/heads/main/Bermuda_Map.webp",
  },
  {
    id: "PURGATORY",
    name: "PURGATORY",
    image:
      "https://raw.githubusercontent.com/pawneshshakya/ffmaps/refs/heads/main/Purgatory_Map.webp",
  },
  {
    id: "KALAHARI",
    name: "KALAHARI",
    image:
      "https://raw.githubusercontent.com/pawneshshakya/ffmaps/refs/heads/main/Kalahary_Map.webp",
  },
  {
    id: "ALPINE",
    name: "ALPINE",
    image:
      "https://raw.githubusercontent.com/pawneshshakya/ffmaps/refs/heads/main/Alpine_Map.webp",
  },
];

const renderRuleItem = (
  title: string,
  sub: string,
  icon: any,
  value: boolean,
  onToggle: any,
) => (
  <View style={styles.ruleItem}>
    <View style={styles.ruleInfo}>
      <MaterialIcons name={icon} size={20} color={COLORS.primary} />
      <View>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleSub}>{sub}</Text>
      </View>
    </View>
    <TouchableOpacity
      style={[
        styles.toggleTrack,
        { backgroundColor: value ? COLORS.primary : "rgba(255,255,255,0.1)" },
      ]}
      onPress={onToggle}
    >
      <View
        style={[
          styles.toggleDot,
          { transform: [{ translateX: value ? 20 : 0 }] },
        ]}
      />
    </TouchableOpacity>
  </View>
);

interface Step1Props {
  title: string;
  setTitle: (t: string) => void;
  selectedBanner: string;
  setSelectedBanner: (b: string) => void;
  customBanner: string | null;
  setCustomBanner: (url: string | null) => void;
  isUrlMode: boolean;
  setIsUrlMode: (val: boolean) => void;
  pickImage: () => void;
  removeCustomBanner: () => void;
  gameType: "CS" | "BR";
  setGameType: (g: "CS" | "BR") => void;
  csMode: string;
  setCsMode: (m: string) => void;
  playerCount: number;
  setPlayerCount: (c: number) => void;
  selectedMap: string;
  setSelectedMap: (m: string) => void;
  entryFee: string;
  setEntryFee: (f: string) => void;
  prizePool: string;
  setPrizePool: (p: string) => void;
  matchDate: string;
  matchTime: string;
  onShowDatePicker: () => void;
  onShowTimePicker: () => void;
  useLocation: boolean;
  onToggleLocation: (val: boolean) => void;
}

const Step1 = ({
  title,
  setTitle,
  selectedBanner,
  setSelectedBanner,
  customBanner,
  setCustomBanner,
  isUrlMode,
  setIsUrlMode,
  pickImage,
  removeCustomBanner,
  gameType,
  setGameType,
  csMode,
  setCsMode,
  playerCount,
  setPlayerCount,
  selectedMap,
  setSelectedMap,
  entryFee,
  setEntryFee,
  prizePool,
  setPrizePool,
  matchDate,
  matchTime,
  onShowDatePicker,
  onShowTimePicker,
  useLocation,
  onToggleLocation,
}: Step1Props) => (
  <View style={styles.stepContainer}>
    <View style={styles.inputGroup}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.label}>Match Banner</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.4)",
              fontWeight: "bold",
            }}
          >
            PASTE URL
          </Text>
          <Switch
            value={isUrlMode}
            onValueChange={setIsUrlMode}
            trackColor={{ false: "#333", true: "rgba(244,123,37,0.3)" }}
            thumbColor={isUrlMode ? COLORS.primary : "#f4f3f4"}
          />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bannerScroll}
      >
        {!isUrlMode && (
          <TouchableOpacity style={styles.uploadBannerBtn} onPress={pickImage}>
            <MaterialIcons
              name="add-a-photo"
              size={24}
              color="rgba(255,255,255,0.4)"
            />
            <Text style={styles.uploadText}>Upload</Text>
          </TouchableOpacity>
        )}
        {customBanner && (
          <TouchableOpacity
            style={[
              styles.bannerCard,
              selectedBanner === customBanner && styles.bannerCardActive,
            ]}
            onPress={() => setSelectedBanner(customBanner)}
          >
            <Image source={{ uri: customBanner }} style={styles.bannerImg} />
            <TouchableOpacity
              style={styles.deleteBannerBtn}
              onPress={removeCustomBanner}
            >
              <MaterialIcons name="close" size={14} color="white" />
            </TouchableOpacity>
            {selectedBanner === customBanner && (
              <View style={styles.activeIndicator}>
                <MaterialIcons name="check" size={16} color="white" />
              </View>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
      {/* Optional Custom URL Input */}
      {isUrlMode && (
        <View style={[styles.inputGroup]}>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={customBanner || ""}
            onChangeText={(text) => {
              setCustomBanner(text);
              setSelectedBanner(text);
            }}
          />
        </View>
      )}
    </View>

    <View style={styles.inputGroup}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text style={styles.label}>Broadcast Location</Text>
        <Switch
          value={useLocation}
          onValueChange={onToggleLocation}
          trackColor={{ false: "#333", true: "rgba(244,123,37,0.3)" }}
          thumbColor={useLocation ? COLORS.primary : "#f4f3f4"}
        />
      </View>
      <Text style={styles.hintText}>
        If enabled, your current location will be attached to the event so
        nearby players can find it easily.
      </Text>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Match Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Pro Scrims Tournament"
        placeholderTextColor="rgba(255,255,255,0.2)"
        value={title}
        onChangeText={setTitle}
      />
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Game Type</Text>
      <View style={styles.gameTypeContainer}>
        <TouchableOpacity
          style={[
            styles.gameTypeButton,
            gameType === "CS" && styles.gameTypeButtonActive,
          ]}
          onPress={() => setGameType("CS")}
        >
          <MaterialIcons
            name="grid-view"
            size={20}
            color={gameType === "CS" ? "white" : "rgba(255,255,255,0.4)"}
          />
          <Text
            style={[
              styles.gameTypeButtonText,
              gameType === "CS" && styles.gameTypeButtonTextActive,
            ]}
          >
            CS RANKED
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.gameTypeButton,
            gameType === "BR" && styles.gameTypeButtonActive,
          ]}
          onPress={() => setGameType("BR")}
        >
          <MaterialIcons
            name="map"
            size={20}
            color={gameType === "BR" ? "white" : "rgba(255,255,255,0.4)"}
          />
          <Text
            style={[
              styles.gameTypeButtonText,
              gameType === "BR" && styles.gameTypeButtonTextActive,
            ]}
          >
            BR RANKED
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {gameType === "CS" ? (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Match Mode</Text>
        <View style={styles.modeGrid}>
          {["1v1", "2v2", "3v3", "4v4"].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeButton,
                csMode === mode && styles.modeButtonActive,
              ]}
              onPress={() => setCsMode(mode)}
            >
              <Text
                style={[
                  styles.modeButtonText,
                  csMode === mode && styles.modeButtonTextActive,
                ]}
              >
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ) : (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Player Count: {playerCount}</Text>
        <View style={styles.playerCountWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playerCountScroll}
          >
            {[12, 24, 48, 52].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.countChip,
                  playerCount === count && styles.countChipActive,
                ]}
                onPress={() => setPlayerCount(count)}
              >
                <Text
                  style={[
                    styles.countChipText,
                    playerCount === count && styles.countChipTextActive,
                  ]}
                >
                  {count} Players
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    )}

    {gameType === "BR" && (
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Select Map</Text>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalText}>OPTIONAL</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mapScroll}
        >
          {MAPS.map((map) => (
            <TouchableOpacity
              key={map.id}
              style={styles.mapCard}
              onPress={() => setSelectedMap(map.id)}
            >
              <View
                style={[
                  styles.mapThumb,
                  selectedMap === map.id && {
                    borderColor: COLORS.primary,
                    borderWidth: 2,
                  },
                ]}
              >
                <Image
                  source={{ uri: map.image }}
                  style={[
                    styles.mapImage,
                    selectedMap !== map.id && { opacity: 0.4 },
                  ]}
                />
                {selectedMap === map.id && (
                  <View style={styles.mapSelectedOverlay}>
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color="white"
                    />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.mapName,
                  {
                    color:
                      selectedMap === map.id
                        ? COLORS.primary
                        : "rgba(255,255,255,0.4)",
                  },
                ]}
              >
                {map.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}

    <View style={styles.grid}>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Entry Fee (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={entryFee}
          onChangeText={setEntryFee}
        />
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Prize Pool (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="100.00"
          keyboardType="numeric"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={prizePool}
          onChangeText={setPrizePool}
        />
      </View>
    </View>

    <View style={styles.grid}>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={onShowDatePicker}
        >
          <MaterialIcons
            name="calendar-today"
            size={20}
            color={COLORS.primary}
          />
          <Text
            style={[
              styles.pickerButtonText,
              !matchDate && styles.pickerPlaceholder,
            ]}
          >
            {matchDate || "Select Date"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>Time</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={onShowTimePicker}
        >
          <MaterialIcons name="access-time" size={20} color={COLORS.primary} />
          <Text
            style={[
              styles.pickerButtonText,
              !matchTime && styles.pickerPlaceholder,
            ]}
          >
            {matchTime || "Select Time"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

interface Step2Props {
  rules: any;
  setRules: (r: any) => void;
  additionalRules: string;
  setAdditionalRules: (r: string) => void;
}

const Step2 = ({
  rules,
  setRules,
  additionalRules,
  setAdditionalRules,
}: Step2Props) => (
  <View style={styles.stepContainer}>
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Standard Restrictions</Text>
      <View style={styles.rulesList}>
        {renderRuleItem(
          "No Grenades",
          "Flashbangs & Explosives Disabled",
          "block",
          rules.noGrenades,
          () => setRules({ ...rules, noGrenades: !rules.noGrenades }),
        )}
        {renderRuleItem(
          "Sniper Only",
          "Long range rifles only",
          "gps-fixed",
          rules.sniperOnly,
          () => setRules({ ...rules, sniperOnly: !rules.sniperOnly }),
        )}
        {renderRuleItem(
          "No Vehicles",
          "Vehicles spawn disabled",
          "directions-car",
          rules.noVehicles,
          () => setRules({ ...rules, noVehicles: !rules.noVehicles }),
        )}
        {renderRuleItem(
          "Character Skills Off",
          "Passive & Active skills disabled",
          "person-off",
          rules.skillsOff,
          () => setRules({ ...rules, skillsOff: !rules.skillsOff }),
        )}
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Security & Policy</Text>
      <View style={styles.rulesList}>
        {renderRuleItem(
          "Anti-Hack Policy",
          "Immediate DQ if hacks detected",
          "security",
          rules.disqualifiedOnHack,
          () =>
            setRules({
              ...rules,
              disqualifiedOnHack: !rules.disqualifiedOnHack,
            }),
        )}
        {renderRuleItem(
          "Refund Policy",
          "Payments are strictly non-refundable",
          "monetization-on",
          rules.nonRefundable,
          () => setRules({ ...rules, nonRefundable: !rules.nonRefundable }),
        )}
      </View>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Additional Custom Rules</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter any specific rules not covered above (e.g. No usage of Flare Gun, Specific drop zones only...)"
        placeholderTextColor="rgba(255,255,255,0.2)"
        multiline
        numberOfLines={4}
        value={additionalRules}
        onChangeText={setAdditionalRules}
      />
    </View>
  </View>
);

interface Step3Props {
  mediatorEmail: string;
  setMediatorEmail: (e: string) => void;
  selectedBanner: string;
  selectedMap: string;
  title: string;
  gameType: "CS" | "BR";
  csMode: string;
  playerCount: number;
  entryFee: string;
  prizePool: string;
  matchDate: string;
  matchTime: string;
}

const Step3 = ({
  mediatorEmail,
  setMediatorEmail,
  selectedBanner,
  selectedMap,
  title,
  gameType,
  csMode,
  playerCount,
  entryFee,
  prizePool,
  matchDate,
  matchTime,
}: Step3Props) => (
  <View style={styles.stepContainer}>
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Assign Mediator</Text>
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalText}>OPTIONAL</Text>
        </View>
      </View>
      <View style={styles.emailInputWrapper}>
        <MaterialIcons
          name="alternate-email"
          size={20}
          color="rgba(255,255,255,0.4)"
          style={styles.emailIcon}
        />
        <TextInput
          style={[styles.input, { paddingLeft: 48 }]}
          placeholder="mediator@esports.com"
          placeholderTextColor="rgba(255,255,255,0.2)"
          value={mediatorEmail}
          onChangeText={setMediatorEmail}
        />
      </View>
      <Text style={styles.hintText}>
        Assign an official mediator to oversee the match results and disputes.
      </Text>
    </View>

    <View style={styles.inputGroup}>
      <Text style={styles.label}>Match Preview</Text>
      <View style={styles.previewCard}>
        <View style={styles.previewImageContainer}>
          <Image
            source={{
              uri: selectedBanner,
            }}
            style={styles.previewImage}
          />
          <LinearGradient
            colors={["transparent", COLORS.cardDark]}
            style={styles.previewGradient}
          />
          <View style={styles.mapNameBadge}>
            <Text style={styles.mapNameBadgeText}>{selectedMap}</Text>
          </View>
        </View>
        <View style={styles.previewContent}>
          <Text style={styles.previewTitle}>
            {title || "Pro Scrims Championship"}
          </Text>
          <Text style={styles.previewSub}>
            {gameType === "CS"
              ? `CS Ranked • ${csMode}`
              : `BR Ranked • ${playerCount} Players`}
          </Text>

          <View style={styles.previewGrid}>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>ENTRY FEE</Text>
              <View style={[styles.previewStatRow, { marginTop: 4 }]}>
                <MaterialIcons
                  name="payments"
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.previewStatValue}>
                  ₹{entryFee || "0.00"}
                </Text>
              </View>
            </View>
            <View style={styles.previewStat}>
              <Text style={styles.previewStatLabel}>PRIZE POOL</Text>
              <View style={[styles.previewStatRow, { marginTop: 4 }]}>
                <MaterialIcons name="emoji-events" size={14} color="#f47b25" />
                <Text style={[styles.previewStatValue, { color: "#f47b25" }]}>
                  ₹{prizePool || "0.00"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.previewInfoRow}>
            <Text style={styles.previewInfoLabel}>Schedule</Text>
            <Text style={styles.previewInfoValue}>
              {matchDate || "Today"} • {matchTime || "TBA"}
            </Text>
          </View>
          <View style={styles.previewInfoRow}>
            <Text style={styles.previewInfoLabel}>Rules</Text>
            <Text style={styles.previewInfoValue}>
              Classic Competitive • No Hack
            </Text>
          </View>
        </View>
      </View>
    </View>

    <View style={styles.infoBox}>
      <MaterialIcons name="info" size={18} color={COLORS.primary} />
      <Text style={styles.infoText}>
        By launching this match, you agree to our Tournament Organizer Terms.
        The prize pool will be held in escrow until the winner is verified.
      </Text>
    </View>
  </View>
);

export const CreateMatchScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMap, setSelectedMap] = useState("BERMUDA");
  const [gameType, setGameType] = useState<"CS" | "BR">("CS");
  const [csMode, setCsMode] = useState("1v1");
  const [playerCount, setPlayerCount] = useState(52);
  const [selectedBanner, setSelectedBanner] = useState("");
  const [customBanner, setCustomBanner] = useState<string | null>(null);
  const [isUrlMode, setIsUrlMode] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [additionalRules, setAdditionalRules] = useState("");
  const [mediatorEmail, setMediatorEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isTimePickerVisible, setTimePickerVisibility] = useState(false);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [useLocation, setUseLocation] = useState(false);

  // Daily limit state
  const [dailyLimit, setDailyLimit] = useState<any>(null);
  const [limitLoading, setLimitLoading] = useState(true);

  const initialData = route?.params?.initialData;
  const isEditMode = !!initialData;

  // Fetch daily limit on mount
  useEffect(() => {
    const fetchDailyLimit = async () => {
      try {
        const res = await api.get("/matches/daily-limit");
        if (res.data.success) {
          setDailyLimit(res.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch daily limit:", e);
      } finally {
        setLimitLoading(false);
      }
    };
    fetchDailyLimit();
  }, []);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setSelectedBanner(initialData.banner_url || "");
      if (initialData.banner_url) {
        setCustomBanner(initialData.banner_url);
      }
      setGameType(initialData.game_type || "CS");
      setCsMode(initialData.mode || "1v1");
      setPlayerCount(initialData.max_players || 52);
      setSelectedMap(initialData.map || "BERMUDA");
      setEntryFee(String(initialData.entry_fee || ""));
      setPrizePool(String(initialData.prize_pool || ""));
      setMatchDate(initialData.match_date || "");
      setMatchTime(initialData.match_time || "");
      setMediatorEmail(initialData.mediator_email || "");
      setAdditionalRules(initialData.additional_rules || "");
      if (initialData.standard_restrictions) {
        setRules(initialData.standard_restrictions);
      }
      if (initialData.location) {
        setUseLocation(true);
        setLocation({
          latitude: initialData.location.coordinates[1],
          longitude: initialData.location.coordinates[0],
        });
      }
    }
  }, [initialData]);

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "We need location permissions to attach your location to the event.",
        );
        setUseLocation(false);
        return;
      }

      setUseLocation(true);
      // Ideally show loading indicator here while fetching
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } else {
      setUseLocation(false);
      setLocation(null);
    }
  };

  const [rules, setRules] = useState({
    noGrenades: true,
    sniperOnly: false,
    noVehicles: true,
    skillsOff: false,
    disqualifiedOnHack: true,
    nonRefundable: true,
  });

  const renderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarWrapper}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor:
                currentStep >= 1 ? COLORS.primary : "rgba(255,255,255,0.1)",
            },
          ]}
        />
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor:
                currentStep >= 2 ? COLORS.primary : "rgba(255,255,255,0.1)",
            },
          ]}
        />
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor:
                currentStep >= 3 ? COLORS.primary : "rgba(255,255,255,0.1)",
              shadowOpacity: currentStep === 3 ? 0.5 : 0,
              elevation: currentStep === 3 ? 4 : 0,
            },
          ]}
        />
      </View>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressStepText}>
          {currentStep === 1
            ? "Step 1: Basic Info"
            : currentStep === 2
              ? "Step 2: Customize Rules"
              : "Step 3: Mediator & Preview"}
        </Text>
        {currentStep > 1 && (
          <Text style={styles.progressCountText}>{currentStep} OF 3</Text>
        )}
      </View>
    </View>
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setCustomBanner(uri);
      setSelectedBanner(uri);
    }
  };

  const removeCustomBanner = () => {
    setCustomBanner(null);
    if (selectedBanner === customBanner) {
      setSelectedBanner("");
    }
  };

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);

  const handleDateConfirm = (date: Date) => {
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    setMatchDate(formattedDate);
    hideDatePicker();
  };

  const showTimePicker = () => setTimePickerVisibility(true);
  const hideTimePicker = () => setTimePickerVisibility(false);

  const handleTimeConfirm = (time: Date) => {
    const formattedTime = time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMatchTime(formattedTime);
    hideTimePicker();
  };

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      return;
    }
    // Save as draft by default — publish is a separate explicit action
    await handleSave({ publish: false });
  };

  const handleSave = async ({ publish }: { publish: boolean }) => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a match title.");
      return;
    }
    if (!matchDate) {
      Alert.alert("Validation Error", "Please select a match date.");
      return;
    }
    const fee = parseFloat(entryFee) || 0;
    if (fee < 0) {
      Alert.alert("Validation Error", "Entry fee cannot be negative.");
      return;
    }
    if (publish && !matchTime) {
      Alert.alert(
        "Validation Error",
        "Please select a match time before publishing.",
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        banner_url: selectedBanner,
        game_type: gameType,
        mode: gameType === "CS" ? csMode : undefined,
        max_players:
          gameType === "BR"
            ? playerCount
            : csMode === "1v1"
              ? 2
              : csMode === "2v2"
                ? 4
                : csMode === "3v3"
                  ? 6
                  : 8,
        map: selectedMap,
        entry_fee: parseFloat(entryFee) || 0,
        prize_pool: parseFloat(prizePool) || 0,
        match_date: matchDate,
        match_time: matchTime,
        mediator_email: mediatorEmail,
        standard_restrictions: {
          no_grenades: rules.noGrenades,
          sniper_only: rules.sniperOnly,
          no_vehicles: rules.noVehicles,
          skills_off: rules.skillsOff,
          disqualified_on_hack: rules.disqualifiedOnHack,
          non_refundable: rules.nonRefundable,
        },
        additional_rules: additionalRules,
        latitude: useLocation ? location?.latitude : undefined,
        longitude: useLocation ? location?.longitude : undefined,
        isPublished: publish,
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/matches/${initialData._id}`, payload);
        if (publish && !initialData?.isPublished) {
          // Already in payload above
        }
      } else {
        response = await api.post("/matches", payload);
      }

      if (response.data.success) {
        Alert.alert(
          publish ? "Published!" : "Saved",
          publish
            ? "Your event is now live and players can join."
            : isEditMode
              ? "Draft updated successfully."
              : "Event saved as draft. You can publish it from My Events.",
        );
        navigation.goBack();
      }
    } catch (error: any) {
      console.error("Match save error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to save match",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Changes?",
      "Are you sure you want to cancel? All progress will be lost.",
      [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ],
    );
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Decorative Glows */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top Status Bar Blur */}
      <BlurView
        intensity={250}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          zIndex: 100,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="chevron-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentStep === 3
              ? "Finalize Match"
              : currentStep === 2
                ? "Match Rules"
                : isEditMode
                  ? "Update Match"
                  : "Create Match"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {renderProgress()}

        {/* Daily Limit Info Banner */}
        {!limitLoading && dailyLimit && !dailyLimit.is_unlimited && (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              backgroundColor:
                dailyLimit.remaining > 0
                  ? "rgba(244,123,37,0.08)"
                  : "rgba(239,68,68,0.1)",
              borderWidth: 1,
              borderColor:
                dailyLimit.remaining > 0
                  ? "rgba(244,123,37,0.2)"
                  : "rgba(239,68,68,0.2)",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <MaterialIcons
              name={dailyLimit.remaining > 0 ? "event-available" : "event-busy"}
              size={20}
              color={dailyLimit.remaining > 0 ? COLORS.primary : "#ef4444"}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: "white", fontSize: 12, fontWeight: "bold" }}
              >
                {dailyLimit.remaining > 0
                  ? `${dailyLimit.remaining} of ${dailyLimit.daily_limit} events remaining today`
                  : "Daily event limit reached!"}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {dailyLimit.pass_type === "none"
                  ? "Upgrade to Elite Pass for more daily events"
                  : `${dailyLimit.pass_type.charAt(0).toUpperCase() + dailyLimit.pass_type.slice(1)} Pass • ${dailyLimit.daily_limit} events/day`}
              </Text>
            </View>
            {dailyLimit.remaining <= 0 && (
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
                onPress={() => navigation.navigate("ElitePass")}
              >
                <Text
                  style={{ color: "white", fontSize: 10, fontWeight: "bold" }}
                >
                  UPGRADE
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && (
            <Step1
              title={title}
              setTitle={setTitle}
              selectedBanner={selectedBanner}
              setSelectedBanner={setSelectedBanner}
              customBanner={customBanner}
              setCustomBanner={setCustomBanner}
              isUrlMode={isUrlMode}
              setIsUrlMode={setIsUrlMode}
              pickImage={pickImage}
              removeCustomBanner={removeCustomBanner}
              gameType={gameType}
              setGameType={setGameType}
              csMode={csMode}
              setCsMode={setCsMode}
              playerCount={playerCount}
              setPlayerCount={setPlayerCount}
              selectedMap={selectedMap}
              setSelectedMap={setSelectedMap}
              entryFee={entryFee}
              setEntryFee={setEntryFee}
              prizePool={prizePool}
              setPrizePool={setPrizePool}
              matchDate={matchDate}
              matchTime={matchTime}
              onShowDatePicker={showDatePicker}
              onShowTimePicker={showTimePicker}
              useLocation={useLocation}
              onToggleLocation={handleLocationToggle}
            />
          )}
          {currentStep === 2 && (
            <Step2
              rules={rules}
              setRules={setRules}
              additionalRules={additionalRules}
              setAdditionalRules={setAdditionalRules}
            />
          )}
          {currentStep === 3 && (
            <Step3
              mediatorEmail={mediatorEmail}
              setMediatorEmail={setMediatorEmail}
              selectedBanner={selectedBanner}
              selectedMap={selectedMap}
              title={title}
              gameType={gameType}
              csMode={csMode}
              playerCount={playerCount}
              entryFee={entryFee}
              prizePool={prizePool}
              matchDate={matchDate}
              matchTime={matchTime}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Button(s) */}
      <BlurView
        intensity={20}
        tint="dark"
        style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}
      >
        {currentStep === 1 ? (
          <View style={styles.twoButtonFooter}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCancel}
            >
              <Text style={styles.secondaryButtonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainButton, { flex: 2, marginLeft: 12 }]}
              onPress={handleNext}
            >
              <Text style={styles.mainButtonText}>NEXT STEP</Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : currentStep === 2 ? (
          <View style={styles.twoButtonFooter}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mainButton, { flex: 2, marginLeft: 12 }]}
              onPress={handleNext}
            >
              <Text style={styles.mainButtonText}>NEXT STEP</Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          // Step 3: Cancel | Save Draft | Publish
          <View style={styles.threeButtonFooter}>
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleCancel}
              disabled={loading}
            >
              <MaterialIcons
                name="close"
                size={16}
                color="rgba(255,255,255,0.6)"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, loading && { opacity: 0.5 }]}
              onPress={() => handleSave({ publish: false })}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialIcons name="save" size={14} color="white" />
                  <Text style={styles.secondaryButtonText}>DRAFT</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mainButton,
                { flex: 1.6, marginLeft: 8 },
                (loading ||
                  (!isEditMode &&
                    dailyLimit &&
                    !dailyLimit.is_unlimited &&
                    dailyLimit.remaining <= 0)) && { opacity: 0.5 },
              ]}
              onPress={() => handleSave({ publish: true })}
              disabled={
                loading ||
                (!isEditMode &&
                  dailyLimit &&
                  !dailyLimit.is_unlimited &&
                  dailyLimit.remaining <= 0)
              }
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : !isEditMode &&
                dailyLimit &&
                !dailyLimit.is_unlimited &&
                dailyLimit.remaining <= 0 ? (
                <>
                  <Text style={styles.mainButtonText}>LIMIT</Text>
                  <MaterialIcons name="lock" size={16} color="white" />
                </>
              ) : (
                <>
                  <Text style={styles.mainButtonText}>PUBLISH</Text>
                  <MaterialIcons name="send" size={16} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </BlurView>

      {/* Top Status Bar Blur */}
      <BlurView
        intensity={250}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          zIndex: 100,
        }}
      />

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={hideDatePicker}
        themeVariant="dark"
        accentColor={COLORS.primary}
      />

      <DateTimePickerModal
        isVisible={isTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={hideTimePicker}
        themeVariant="dark"
        accentColor={COLORS.primary}
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
    top: "-5%",
    right: "-10%",
    width: 256,
    height: 256,
    backgroundColor: "rgba(244,123,37,0.15)",
    borderRadius: 128,
    opacity: 0.5,
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "20%",
    left: "-10%",
    width: 256,
    height: 256,
    backgroundColor: "rgba(37,99,235,0.1)",
    borderRadius: 128,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
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
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  bannerScroll: {
    gap: 12,
    paddingVertical: 10,
  },
  bannerCard: {
    width: 120,
    height: 68,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  bannerCardActive: {
    borderColor: "#f47b25",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  activeIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#f47b25",
    borderRadius: 8,
    padding: 2,
  },
  uploadBannerBtn: {
    width: 120,
    height: 68,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  uploadText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "bold",
  },
  deleteBannerBtn: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "rgba(255,0,0,0.6)",
    borderRadius: 10,
    padding: 2,
    zIndex: 10,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
    zIndex: 10,
  },
  progressBarWrapper: {
    flexDirection: "row",
    gap: 8,
    height: 4,
  },
  progressBar: {
    flex: 1,
    borderRadius: 2,
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  progressStepText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#f47b25",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  progressCountText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.2)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
    gap: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginLeft: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionalBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  optionalText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
  },
  gameTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  gameTypeButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  gameTypeButtonActive: {
    backgroundColor: "rgba(244,123,37,0.1)",
    borderColor: "#f47b25",
  },
  gameTypeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
  },
  gameTypeButtonTextActive: {
    color: "white",
  },
  modeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonActive: {
    backgroundColor: "#f47b25",
    borderColor: "#f47b25",
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
  },
  modeButtonTextActive: {
    color: "white",
  },
  playerCountWrapper: {
    marginHorizontal: -24,
  },
  playerCountScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  countChip: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  countChipActive: {
    backgroundColor: "#f47b25",
    borderColor: "#f47b25",
  },
  countChipText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
  },
  countChipTextActive: {
    color: "white",
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    height: 46,
    paddingHorizontal: 16,
    color: "white",
    fontSize: 14,
  },
  pickerButton: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    height: 46,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pickerButtonText: {
    color: "white",
    fontSize: 14,
  },
  pickerPlaceholder: {
    color: "rgba(255,255,255,0.2)",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  grid: {
    flexDirection: "row",
    gap: 16,
  },
  mapScroll: {
    paddingVertical: 4,
    gap: 16,
  },
  mapCard: {
    width: 128,
    gap: 8,
  },
  mapThumb: {
    width: 128,
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1a1a1a",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapSelectedOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(244,123,37,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapName: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  rulesList: {
    gap: 12,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  ruleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },
  ruleSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    fontWeight: "500",
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  emailInputWrapper: {
    position: "relative",
  },
  emailIcon: {
    position: "absolute",
    left: 16,
    top: 16,
    zIndex: 1,
  },
  hintText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    paddingHorizontal: 4,
  },
  previewCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  previewImageContainer: {
    height: 128,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  mapNameBadge: {
    position: "absolute",
    bottom: 12,
    left: 16,
    backgroundColor: "#f47b25",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapNameBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  previewContent: {
    padding: 20,
    gap: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    letterSpacing: -0.5,
  },
  previewSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: -12,
  },
  previewGrid: {
    flexDirection: "row",
    gap: 12,
  },
  previewStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  previewStatLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
  },
  previewStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewStatValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },
  previewDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  previewInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewInfoLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  previewInfoValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "white",
  },
  infoBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(244,123,37,0.05)",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.1)",
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  mainButton: {
    height: 46,
    backgroundColor: "#f47b25",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  mainButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  twoButtonFooter: {
    flexDirection: "row",
    gap: 12,
  },
  threeButtonFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  secondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  tertiaryButton: {
    width: 46,
    height: 46,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
