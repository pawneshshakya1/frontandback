import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import api from '../../services/api';
import { PopupModal } from '../../components/PopupModal';

const { width, height } = Dimensions.get("window");

export const ScanScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [zoom, setZoom] = useState(0);
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Popup state
  const [popup, setPopup] = useState({ visible: false, type: "info" as "success" | "error" | "warning" | "info" | "confirm", title: "", message: "" });
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const showPopup = (type: "success" | "error" | "warning" | "info" | "confirm", title: string, message?: string, onConfirm?: () => void) => {
    setPopup({ visible: true, type, title, message: message || "" });
    setConfirmAction(() => onConfirm || null);
  };

  const hidePopup = () => {
    setPopup({ ...popup, visible: false });
    setConfirmAction(null);
    setScanned(false);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

      // 1. Try MATCH QR — plain JSON with { type: 'match', roomId, id }
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        // Not a JSON — could be a wallet QR (base64)
      }

      if (parsedData && parsedData.type === 'match' && parsedData.roomId) {
        // Directly navigate to match detail — no popup
        navigation.replace('MatchDetail', { matchId: parsedData.id });
        return;
      }

      // 2. Try WALLET QR — base64-encoded JSON with { a, t, e, s }
      try {
        const cleaned = data.trim().replace(/-/g, '+').replace(/_/g, '/');
        const paddingNeeded = cleaned.length % 4;
        const padded = paddingNeeded !== 0 ? cleaned + '='.repeat(4 - paddingNeeded) : cleaned;
        const decoded = atob(padded);
        const walletPayload = JSON.parse(decoded);

        if (walletPayload.a && walletPayload.t && walletPayload.e && walletPayload.s) {
          // Valid wallet QR — directly navigate to ScanPay — no popup
          navigation.navigate('ScanPay', { preScannedQR: data.trim() });
          return;
        }
      } catch (e) {
        // Not a wallet QR either
      }

      // 3. Unknown QR code — show error popup
      showPopup("error", "Invalid QR", "This QR code is not recognized. Please scan a valid match or payment QR code.");
    } catch (e) {
      showPopup("error", "Scan Error", "Could not process scanned data.");
      setScanned(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showPopup("warning", "Permission Required", "Gallery access is needed to pick images.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      showPopup("info", "Coming Soon", "Image scanning from gallery will be available in a future update.");
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0));
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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

      {/* Live Camera View */}
      <CameraView
        style={StyleSheet.absoluteFill}
        enableTorch={torchEnabled}
        zoom={zoom}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Camera Overlay */}
      <View style={[styles.overlay, StyleSheet.absoluteFill]} />

      {/* Top Navigation */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconButtonSmall}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>TACTICAL SCANNER</Text>
          <Text style={styles.systemVersion}>SYSTEM V1.0.4-ACTIVE</Text>
        </View>

        <TouchableOpacity style={styles.iconButtonBlur} onPress={() => showPopup("info", "How to Scan", "Point your camera at a QR code to join matches or add friends.")}>
          <MaterialIcons name="info-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Central Scanning Area */}
      <View style={styles.scanArea}>
        <View style={styles.frameContainer}>
          {/* Corners */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {/* Scanning Line */}
          <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]}>
            <LinearGradient
              colors={["transparent", "#f47b25", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.lineGradient}
            />
          </Animated.View>

          {/* Reticle */}
          <View style={styles.reticleContainer}>
            <View style={styles.reticleH} />
            <View style={styles.reticleV} />
          </View>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.controlRowMain}>
          <TouchableOpacity
            style={styles.sideControl}
            onPress={handleZoomOut}
          >
            <MaterialIcons name="zoom-out" size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sideControl}
            onPress={handleZoomIn}
          >
            <MaterialIcons name="zoom-in" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.utilityRow}>
          <TouchableOpacity
            style={styles.utilityButton}
            onPress={() => setTorchEnabled(!torchEnabled)}
          >
            <BlurView intensity={20} tint="dark" style={styles.utilityBlur}>
              <MaterialIcons
                name={torchEnabled ? "flashlight-off" : "flashlight-on"}
                size={20}
                color="#f47b25"
              />
              <Text style={styles.utilityText}>{torchEnabled ? "OFF" : "Flashlight"}</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityButton}
            onPress={pickImage}
          >
            <BlurView intensity={20} tint="dark" style={styles.utilityBlur}>
              <MaterialIcons name="photo-library" size={20} color="#f47b25" />
              <Text style={styles.utilityText}>Gallery</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Popup */}
      <PopupModal
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={hidePopup}
        onConfirm={confirmAction || undefined}
        confirmText={popup.type === "confirm" ? "Join Now" : "OK"}
        cancelText="Cancel"
        onCancel={popup.type === "confirm" ? () => { setScanned(false); hidePopup(); } : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  permissionText: {
    color: "white",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: "#f47b25",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  iconButtonSmall: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2.5,
  },
  systemVersion: {
    color: "rgba(244,123,37,0.8)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 2,
  },
  iconButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  frameContainer: {
    width: 280,
    height: 280,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#f47b25",
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    zIndex: 5,
  },
  lineGradient: {
    width: "100%",
    height: "100%",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  reticleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
  },
  reticleH: {
    width: 16,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  reticleV: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    position: "absolute",
  },
  hintContainer: {
    marginTop: 48,
    alignItems: "center",
  },
  hintBlur: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  hintText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  dotRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    backgroundColor: "#f47b25",
  },
  controls: {
    paddingHorizontal: 24,
    gap: 24,
  },
  controlRowMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  sideControl: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainCapture: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f47b25",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#f47b25",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  utilityRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  utilityButton: {
    flex: 1,
    maxWidth: 160,
  },
  utilityBlur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  utilityText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  accentLeft: {
    position: "absolute",
    left: 16,
    top: height * 0.4,
    alignItems: "center",
    opacity: 0.2,
  },
  accentRight: {
    position: "absolute",
    right: 16,
    top: height * 0.4,
    alignItems: "center",
    opacity: 0.2,
  },
  accentLine: {
    width: 1,
    height: 100,
    backgroundColor: "white",
  },
  accentText: {
    color: "white",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 4,
    transform: [{ rotate: "90deg" }],
    marginVertical: 40,
    width: 200, // To prevent wrapping when rotated
    textAlign: "center",
  },
});
