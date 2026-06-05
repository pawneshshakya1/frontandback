import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COLORS, RADIUS, SPACING } from "../theme/colors";

const { width } = Dimensions.get("window");

type PopupType = "success" | "error" | "warning" | "info" | "confirm";

interface PopupButton {
  text: string;
  onPress: () => void;
  style?: "primary" | "danger" | "ghost";
  color?: string;
}

interface PopupModalProps {
  visible: boolean;
  type?: PopupType;
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  buttons?: PopupButton[];
  onClose?: () => void;
  // Quick presets
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  // Optional label/value summary block rendered between the
  // message and the button row. Each row's `value` is colored with
  // `valueColor` if provided; otherwise the default foreground is
  // used. Use this instead of building a hand-rolled <Modal> when
  // the confirmation needs a few key/value facts.
  summary?: { label: string; value: string; valueColor?: string }[];
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
}

const TYPE_CONFIG: Record<PopupType, { icon: string; color: string; bgColor: string }> = {
  success: { icon: "check-circle", color: COLORS.success, bgColor: COLORS.successBg },
  error: { icon: "error", color: COLORS.error, bgColor: COLORS.errorBg },
  warning: { icon: "warning", color: COLORS.warning, bgColor: COLORS.warningBg },
  info: { icon: "info", color: COLORS.info, bgColor: COLORS.infoBg },
  confirm: { icon: "help", color: COLORS.primary, bgColor: "rgba(244,123,37,0.1)" },
};

export const PopupModal: React.FC<PopupModalProps> = ({
  visible,
  type = "info",
  title,
  message,
  icon,
  iconColor,
  buttons,
  onClose,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  summary,
  confirmLoading = false,
  confirmDisabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const config = TYPE_CONFIG[type];
  const finalIcon = icon || config.icon;
  const finalColor = iconColor || config.color;

  // Build button list
  let finalButtons: PopupButton[] = [];
  if (buttons) {
    finalButtons = buttons;
  } else if (onConfirm) {
    finalButtons = [
      { text: cancelText, onPress: onCancel || onClose || (() => {}), style: "ghost" },
      {
        text: confirmText,
        onPress: onConfirm,
        style: type === "confirm" || type === "warning" ? "danger" : "primary",
        color: iconColor,
      },
    ];
  } else {
    finalButtons = [{ text: confirmText, onPress: onClose || (() => {}), style: "primary" }];
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          {/* Glow */}
          <View style={[styles.glow, { backgroundColor: finalColor + "15" }]} />

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <MaterialIcons name={finalIcon as any} size={36} color={finalColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Summary rows (key/value facts) */}
          {summary && summary.length > 0 ? (
            <View style={styles.summary}>
              {summary.map((row, idx) => (
                <View key={`${row.label}-${idx}`} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      row.valueColor ? { color: row.valueColor } : null,
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {finalButtons.map((btn, idx) => {
              const isPrimary = btn.style === "primary";
              const isDanger = btn.style === "danger";
              const isGhost = btn.style === "ghost";
              const isConfirmBtn = idx === finalButtons.length - 1 && (isPrimary || isDanger);
              const btnColor = btn.color || (isDanger ? COLORS.error : isPrimary ? COLORS.primary : "transparent");
              const disabled = isConfirmBtn && (confirmLoading || confirmDisabled);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.button,
                    isPrimary && { backgroundColor: btnColor },
                    isDanger && { backgroundColor: btnColor },
                    isGhost && styles.buttonGhost,
                    finalButtons.length === 1 && { flex: 1 },
                    disabled && { opacity: 0.6 },
                  ]}
                  onPress={btn.onPress}
                  activeOpacity={0.7}
                  disabled={disabled}
                >
                  {isConfirmBtn && confirmLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={[
                        styles.buttonText,
                        (isPrimary || isDanger) && { color: "white" },
                        isGhost && { color: COLORS.textSecondary },
                      ]}
                    >
                      {btn.text}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  container: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.6,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGhost: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  summary: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
});

// ============ HELPER HOOK ============

interface UsePopupReturn {
  popup: {
    visible: boolean;
    type: PopupType;
    title: string;
    message: string;
  };
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string) => void;
  hidePopup: () => void;
}

export const usePopup = (): UsePopupReturn & { PopupElement: React.FC<{ onClose?: () => void }> } => {
  const [state, setState] = React.useState({
    visible: false,
    type: "info" as PopupType,
    title: "",
    message: "",
    onConfirm: null as (() => void) | null,
    confirmText: "OK",
    cancelText: "Cancel",
  });

  const showSuccess = (title: string, message?: string) =>
    setState({ visible: true, type: "success", title, message: message || "", onConfirm: null, confirmText: "OK", cancelText: "Cancel" });

  const showError = (title: string, message?: string) =>
    setState({ visible: true, type: "error", title, message: message || "", onConfirm: null, confirmText: "OK", cancelText: "Cancel" });

  const showWarning = (title: string, message?: string) =>
    setState({ visible: true, type: "warning", title, message: message || "", onConfirm: null, confirmText: "OK", cancelText: "Cancel" });

  const showInfo = (title: string, message?: string) =>
    setState({ visible: true, type: "info", title, message: message || "", onConfirm: null, confirmText: "OK", cancelText: "Cancel" });

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText?: string) =>
    setState({ visible: true, type: "confirm", title, message, onConfirm, confirmText: confirmText || "Confirm", cancelText: "Cancel" });

  const hidePopup = () =>
    setState((prev) => ({ ...prev, visible: false }));

  const PopupElement: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
    <PopupModal
      visible={state.visible}
      type={state.type}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      onClose={hidePopup}
      onConfirm={state.onConfirm || undefined}
      onCancel={onClose || hidePopup}
    />
  );

  return { popup: state, showSuccess, showError, showWarning, showInfo, showConfirm, hidePopup, PopupElement };
};
