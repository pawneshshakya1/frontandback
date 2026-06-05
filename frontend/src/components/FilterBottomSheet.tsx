import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../theme/colors';

export type FilterOption = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Optional secondary text under the label */
  subtitle?: string;
  /** Optional badge count to show on the right (e.g., # of tickets) */
  count?: number;
};

export type FilterSection = {
  /** Unique section id */
  key: string;
  /** Section heading (e.g. "Game Type") */
  label: string;
  /** Currently selected value (key of an option) */
  value: string;
  /** Options list */
  options: FilterOption[];
};

export type FilterBottomSheetProps = {
  visible: boolean;
  /** Sheet title (e.g. "Filter Events") */
  title: string;
  /** Sheet subtitle (e.g. "Choose what to display") */
  subtitle?: string;
  /** Accent color for the gradient header. Default: COLORS.primary */
  accentColor?: string;
  /** Sections to render (in order). If 0-1 sections, shows without section labels. */
  sections: FilterSection[];
  /** Called when user taps "Apply Filter" — receives the new values keyed by section.key */
  onApply: (values: Record<string, string>) => void;
  /** Optional: called when user taps "Reset" */
  onReset?: () => void;
  /** Close handler */
  onClose: () => void;
  /** Apply button label override. Default: "Apply Filter" */
  applyLabel?: string;
  /** Reset button label override. Default: "Reset All" */
  resetLabel?: string;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 680);
const DRAG_THRESHOLD = 80;

/**
 * FilterBottomSheet — premium bottom-sheet style filter.
 *
 * Design:
 * - Slides up from bottom with drag-to-dismiss
 * - Drag handle + tinted gradient header with title + reset + close
 * - Stats strip showing # of sections and active filter count
 * - Sections with accent dot, label, and option count
 * - Premium option cards: glass background, icon in colored chip, label + subtitle, count badge
 * - Active option: gradient background, glowing icon, accent border, check mark
 * - Footer: "Reset" outline + "Apply Filter" gradient primary
 * - BlurView backdrop
 */
export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  title,
  subtitle = '',
  accentColor = COLORS.primary,
  sections,
  onApply,
  onReset,
  onClose,
  applyLabel = 'Apply Filter',
  resetLabel = 'Reset All',
}) => {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const initial: Record<string, string> = {};
      sections.forEach((s) => {
        initial[s.key] = s.value;
      });
      setDraft(initial);

      translateY.setValue(SHEET_HEIGHT);
      dragY.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleApply = () => {
    Keyboard.dismiss();
    onApply(draft);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      const reset: Record<string, string> = {};
      sections.forEach((s) => {
        const first = s.options[0];
        if (first) reset[s.key] = first.key;
      });
      setDraft(reset);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const showSectionLabels = sections.length > 1;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DRAG_THRESHOLD || g.vy > 1.2) {
          handleClose();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
          </BlurView>
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: Animated.add(translateY, dragY) }],
            },
          ]}
        >
          {/* Drag handle */}
          <View {...panResponder.panHandlers} style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Gradient header */}
          <LinearGradient
            colors={[accentColor, shadeColor(accentColor, -20)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerIconWrap}>
              <MaterialIcons name="tune" size={18} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
            </View>
            {onReset && (
              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="restart-alt" size={12} color="white" />
                <Text style={styles.resetText}>{resetLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Body — scrollable list of sections */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section, sectionIdx) => (
              <View key={section.key} style={sectionIdx > 0 ? styles.sectionGap : undefined}>
                {showSectionLabels && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>{section.label}</Text>
                  </View>
                )}
                <View style={styles.chipsRow}>
                  {section.options.map((opt) => {
                    const active = draft[section.key] === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        activeOpacity={0.85}
                        onPress={() =>
                          setDraft((prev) => ({ ...prev, [section.key]: opt.key }))
                        }
                        style={styles.chipWrap}
                      >
                        {active ? (
                          <LinearGradient
                            colors={[accentColor, shadeColor(accentColor, -15)]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.chip, styles.chipActive]}
                          >
                            <MaterialIcons name={opt.icon} size={14} color="white" />
                            <Text style={styles.chipLabelActive} numberOfLines={1}>
                              {opt.label}
                            </Text>
                            {typeof opt.count === 'number' && opt.count > 0 && (
                              <View style={styles.chipCountActive}>
                                <Text style={styles.chipCountActiveText}>{opt.count}</Text>
                              </View>
                            )}
                          </LinearGradient>
                        ) : (
                          <View style={styles.chip}>
                            <MaterialIcons
                              name={opt.icon}
                              size={14}
                              color="rgba(255,255,255,0.5)"
                            />
                            <Text style={styles.chipLabel} numberOfLines={1}>
                              {opt.label}
                            </Text>
                            {typeof opt.count === 'number' && opt.count > 0 && (
                              <View style={styles.chipCount}>
                                <Text style={styles.chipCountText}>{opt.count}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 2 }]}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[accentColor, shadeColor(accentColor, -20)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnPrimaryGradient}
              >
                <MaterialIcons name="check" size={14} color="white" />
                <Text style={styles.btnPrimaryText}>{applyLabel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/** Darken a hex color by a percentage (-100..100). Used for the gradient pair. */
const shadeColor = (hex: string, percent: number): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const num = parseInt(h, 16);
  let r = (num >> 16) + Math.round((255 * percent) / 100);
  let g = ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100);
  let b = (num & 0x0000ff) + Math.round((255 * percent) / 100);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    maxHeight: SHEET_HEIGHT,
    minHeight: 440,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 20,
    elevation: 24,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: 'white', fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resetText: { color: 'white', fontSize: 11, fontWeight: '800' },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body
  body: { maxHeight: 380 },
  bodyContent: { padding: 16, paddingTop: 20 },
  sectionGap: { marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },

  // Option chips (compact inline buttons)
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 110,
  },
  chipLabelActive: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 110,
  },
  chipCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  chipCountText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
  },
  chipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  chipCountActiveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnSecondaryText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  btnPrimary: { borderRadius: 14, overflow: 'hidden' },
  btnPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  btnPrimaryText: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
});

export default FilterBottomSheet;
