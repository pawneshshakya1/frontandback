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
  Linking,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const BANNER_PEEK = 20;
export const BANNER_SLIDE_WIDTH = SCREEN_W - BANNER_PEEK * 1.5;
export const BANNER_SLIDE_HEIGHT = 200;
export const BANNER_PAGE_WIDTH = SCREEN_W;

interface BannerCarouselProps {
  data: any[];
  autoPlayInterval?: number;
  height?: number;
  onPressBanner?: (banner: any) => void;
  showDots?: boolean;
  rounded?: boolean;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  data,
  autoPlayInterval = 3000,
  height = BANNER_SLIDE_HEIGHT,
  onPressBanner,
  showDots = true,
  rounded = true,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserScrolling = useRef(false);

  const validData = (data || []).filter(
    (b) => b && (b.image_url || b.banner_url),
  );

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
          offset: next * BANNER_PAGE_WIDTH,
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
    const newIndex = Math.round(offsetX / BANNER_PAGE_WIDTH);
    setActiveIndex(newIndex);
    startAutoPlay();
  };

  const handleDotPress = (idx: number) => {
    setActiveIndex(idx);
    flatListRef.current?.scrollToOffset({
      offset: idx * BANNER_PAGE_WIDTH,
      animated: true,
    });
  };

  const handlePress = (banner: any) => {
    if (onPressBanner) {
      onPressBanner(banner);
      return;
    }
    if (banner.link_url) {
      Linking.openURL(banner.link_url);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const uri = item.image_url || item.banner_url;
    const radius = rounded ? 20 : 0;
    return (
      <View style={styles.page}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePress(item)}
          style={[
            styles.slide,
            {
              width: BANNER_SLIDE_WIDTH,
              height,
              borderRadius: radius,
            },
          ]}
        >
          <Image
            source={{ uri }}
            style={[styles.image, { borderRadius: radius }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.9)"]}
            style={[styles.gradient, { borderRadius: radius }]}
            pointerEvents="none"
          >
            <View style={styles.textWrap}>
              {item.tag ? (
                <View style={styles.tagPill}>
                  <Text style={styles.tagText}>
                    {String(item.tag).toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.title} numberOfLines={1}>
                {item.title || "Featured"}
              </Text>
              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </LinearGradient>
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
        snapToInterval={BANNER_PAGE_WIDTH}
        snapToAlignment="start"
        decelerationRate={Platform.OS === "ios" ? "fast" : 0.9}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: BANNER_PAGE_WIDTH,
          offset: BANNER_PAGE_WIDTH * index,
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
    width: BANNER_PAGE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  slide: {
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  textWrap: {
    padding: 14,
  },
  tagPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginBottom: 6,
  },
  tagText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  description: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    lineHeight: 16,
  },
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

export default BannerCarousel;
