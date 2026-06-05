import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const SLIDE_PEEK = 20;
const SLIDE_WIDTH = SCREEN_W - SLIDE_PEEK * 1.5;
const SLIDE_HEIGHT = 230;
const PAGE_WIDTH = SCREEN_W;

const FALLBACK_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAwQWNaaBgdOXGVmuHX-vDdsW0B_K4GoKl2GcFXoCxPWPrQZ_yNXFZOV5TpsZC00vfqBOwhnsWVfPwodPRTwwgaukeSR6KstNxSN-kB2RD5o5ZN4Dtx6LRX9NuHKTTC52i8O1H4FEh0YIB2T81bmY0Gty3tZzDUJ_8kNaBqKGtXSoHDqmcZ8rBcGZ4mAEb-uJpfHgfiwd-2a7KZ8XkgHuZp6x3V_wCKtwO3E9IZoW6fvj41ubixnkcdl0NX9KIaqM0_5TRfzNgtXEQ";

const PARTNER_TIER_CONFIG: Record<string, { color: string }> = {
  standard: { color: "#94a3b8" },
  sponsored: { color: "#3b82f6" },
  premium: { color: "#fbbf24" },
};

interface FeaturedEventsCarouselProps {
  data: any[];
  autoPlayInterval?: number;
  height?: number;
  partnerTier?: string;
  onPressEvent?: (event: any) => void;
  showDots?: boolean;
}

export const FeaturedEventsCarousel: React.FC<FeaturedEventsCarouselProps> = ({
  data,
  autoPlayInterval = 4000,
  height = SLIDE_HEIGHT,
  partnerTier = "standard",
  onPressEvent,
  showDots = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserScrolling = useRef(false);

  const tier = PARTNER_TIER_CONFIG[partnerTier] || PARTNER_TIER_CONFIG.standard;
  const validData = (data || []).slice(0, 10).filter((e) => e && e._id);

  useEffect(() => {
    if (validData.length <= 1) return;
    startAutoPlay();
    return () => stopAutoPlay();
  }, [validData.length, activeIndex]);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    intervalRef.current = setInterval(() => {
      if (isUserScrolling.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % validData.length;
        flatListRef.current?.scrollToOffset({
          offset: next * PAGE_WIDTH,
          animated: true,
        });
        return next;
      });
    }, autoPlayInterval);
  }, [validData.length, autoPlayInterval]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleScrollBegin = () => {
    isUserScrolling.current = true;
    stopAutoPlay();
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserScrolling.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / PAGE_WIDTH);
    setActiveIndex(newIndex);
    startAutoPlay();
  };

  const handleDotPress = (idx: number) => {
    setActiveIndex(idx);
    flatListRef.current?.scrollToOffset({
      offset: idx * PAGE_WIDTH,
      animated: true,
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const isFull = (item.participants?.length || 0) >= item.max_players;
    return (
      <View style={styles.page}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onPressEvent?.(item)}
          style={[
            styles.slide,
            { width: SLIDE_WIDTH, height, opacity: isFull ? 0.6 : 1 },
          ]}
        >
          {/* Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.banner_url || FALLBACK_IMAGE }}
              style={styles.image}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={styles.imageGradient}
              pointerEvents="none"
            />
            {item.isPublished && (
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: tier.color },
                ]}
              >
                <MaterialIcons name="verified" size={10} color="white" />
                <Text style={styles.verifiedText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.statsRow}>
              <View>
                <Text style={styles.statLabel}>ENTRY</Text>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {item.entry_fee > 0 ? `₹${item.entry_fee}` : "Free"}
                </Text>
              </View>
              <View>
                <Text style={styles.statLabel}>PRIZE</Text>
                <Text style={styles.statValue}>
                  ₹{(item.prize_pool || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <MaterialIcons
                  name="people"
                  size={12}
                  color={tier.color}
                />
                <Text style={styles.ratingText}>
                  {item.participants?.length || 0}/{item.max_players}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (validData.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={validData}
        keyExtractor={(item, index) => `${item._id || index}`}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={PAGE_WIDTH}
        snapToAlignment="start"
        decelerationRate={Platform.OS === "ios" ? "fast" : 0.9}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: PAGE_WIDTH,
          offset: PAGE_WIDTH * index,
          index,
        })}
        contentContainerStyle={styles.listContent}
        initialNumToRender={1}
        windowSize={3}
        removeClippedSubviews={false}
      />

      {showDots && validData.length > 1 && (
        <View style={styles.dotsRow}>
          {validData.map((_, idx) => (
            <TouchableOpacity
              key={`dot-${idx}`}
              activeOpacity={0.7}
              onPress={() => handleDotPress(idx)}
              style={styles.dotTouchable}
            >
              <View
                style={[
                  styles.dot,
                  activeIndex === idx ? styles.dotActive : styles.dotInactive,
                  activeIndex === idx && { backgroundColor: tier.color },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  listContent: {
    paddingHorizontal: 0,
  },
  page: {
    width: PAGE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  slide: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  /* Image */
  imageContainer: {
    height: 130,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  verifiedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "#020617",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* Content */
  content: {
    padding: 14,
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  statValue: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  ratingBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Dots */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    gap: 6,
  },
  dotTouchable: {
    padding: 5,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
    backgroundColor: COLORS.primary,
  },
  dotInactive: {
    width: 7,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
});

export default FeaturedEventsCarousel;
