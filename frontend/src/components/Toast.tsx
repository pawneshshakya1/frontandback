import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface UseToastReturn {
  showToast: (message: string, type?: ToastType) => void;
  ToastElement: React.FC;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; color: string; bgColor: string }> = {
  success: { icon: "check-circle", color: COLORS.success, bgColor: "rgba(34,197,94,0.15)" },
  error: { icon: "error", color: COLORS.error, bgColor: "rgba(239,68,68,0.15)" },
  warning: { icon: "warning", color: COLORS.warning, bgColor: "rgba(234,179,8,0.15)" },
  info: { icon: "info", color: COLORS.info, bgColor: "rgba(59,130,246,0.15)" },
};

const BORDER_COLORS: Record<ToastType, string> = {
  success: "rgba(34,197,94,0.4)",
  error: "rgba(239,68,68,0.4)",
  warning: "rgba(234,179,8,0.4)",
  info: "rgba(59,130,246,0.4)",
};

export const useToast = (): UseToastReturn => {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => {
      setToast({ visible: false, message: "", type: "success" });
    }, 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const ToastElement: React.FC = () => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (toast.visible) {
        Animated.spring(slideAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start();
      } else {
        slideAnim.setValue(0);
      }
    }, [toast.visible]);

    if (!toast.visible) return null;

    const config = TOAST_CONFIG[toast.type];
    const borderColor = BORDER_COLORS[toast.type];

    return (
      <View pointerEvents="none" style={styles.wrapper}>
        <Animated.View
          style={[
            styles.card,
            { borderColor, transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], opacity: slideAnim },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: config.bgColor }]}>
            <MaterialIcons name={config.icon as any} size={18} color={config.color} />
          </View>
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      </View>
    );
  };

  return { showToast, ToastElement };
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
