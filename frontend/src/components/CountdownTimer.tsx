import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

type Variant = "hero" | "inline";

interface Props {
  targetDate?: string;
  targetTime?: string;
  onFinish?: () => void;
  variant?: Variant;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function parseDate(dateStr: string): number {
  if (!dateStr) return 0;

  const standard = Date.parse(dateStr.trim());
  if (!isNaN(standard)) return standard;

  const parts = dateStr.match(
    /(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})/,
  );
  if (parts) {
    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const month = monthMap[parts[2].substring(0, 3).toLowerCase()];
    if (month !== undefined) {
      return new Date(
        +parts[3],
        month,
        +parts[1],
        +parts[4],
        +parts[5],
      ).getTime();
    }
  }

  return 0;
}

function calcRemaining(targetMs: number): TimeLeft | null {
  const diff = targetMs - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export const CountdownTimer: React.FC<Props> = ({
  targetDate,
  targetTime,
  onFinish,
  variant = "hero",
}) => {
  const fullDateStr = targetTime
    ? `${targetDate} ${targetTime}`
    : (targetDate ?? "");

  const targetMs = parseDate(fullDateStr);

  const [remaining, setRemaining] = useState<TimeLeft | null>(() =>
    calcRemaining(targetMs),
  );

  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    finishedRef.current = false;

    const tick = () => {
      const r = calcRemaining(targetMs);
      setRemaining(r);

      if (!r && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(timerRef.current!);
        onFinish?.();
      }
    };

    timerRef.current = setInterval(tick, 1000);
    tick();

    return () => clearInterval(timerRef.current!);
  }, [fullDateStr]);

  if (!targetDate) return null;

  // ───────────── FINISHED STATE ─────────────
  if (!remaining) {
    return null;
  }

  // ───────────── INLINE VARIANT ─────────────
  if (variant === "inline") {
    const label = `${remaining.days}D ${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;

    return (
      <View style={styles.inlineContainer}>
        <View style={styles.inlineGlow} />
        <Text style={styles.inlineTimer}>{label}</Text>
      </View>
    );
  }

  // ───────────── HERO VARIANT ─────────────
  const TimeBlock = ({ val, label }: { val: number; label: string }) => (
    <View style={styles.heroBlock}>
      <Text style={styles.heroVal}>{pad(val)}</Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.heroContainer}>
      <View style={styles.heroRow}>
        <TimeBlock val={remaining.days} label="DAYS" />
        <Text style={styles.heroSep}>:</Text>
        <TimeBlock val={remaining.hours} label="HRS" />
        <Text style={styles.heroSep}>:</Text>
        <TimeBlock val={remaining.minutes} label="MIN" />
        <Text style={styles.heroSep}>:</Text>
        <TimeBlock val={remaining.seconds} label="SEC" />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // ───────── INLINE ─────────
  inlineContainer: {
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.4)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    overflow: "hidden",
  },
  inlineGlow: {
    position: "absolute",
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: "rgba(244,123,37,0.08)",
    borderRadius: 20,
  },
  inlineTimer: {
    color: "#f47b25",
    fontSize: 11,
    fontFamily: "ChakraPetch_700Bold",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },

  inlineLiveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(244,123,37,0.15)",
    borderWidth: 1,
    borderColor: "rgba(244,123,37,0.4)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f47b25",
  },
  inlineLiveText: {
    color: "#f47b25",
    fontSize: 11,
    fontFamily: "ChakraPetch_700Bold",
    letterSpacing: 1.5,
  },

  // ───────── HERO ─────────
  heroContainer: {
    marginTop: 16,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroBlock: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minWidth: 40,
  },
  heroVal: {
    color: "white",
    fontSize: 14,
    fontFamily: "ChakraPetch_700Bold",
    fontVariant: ["tabular-nums"],
  },
  heroLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 8,
    fontFamily: "ChakraPetch_700Bold",
  },
  heroSep: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontFamily: "ChakraPetch_700Bold",
    marginTop: -8,
  },
  heroLive: {
    color: "#f47b25",
    fontSize: 14,
    fontFamily: "ChakraPetch_700Bold",
    letterSpacing: 2,
  },
});
