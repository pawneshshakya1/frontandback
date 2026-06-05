import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

export type TabVariant = 'USER' | 'ADMIN' | 'PARTNER';

interface CustomTabBarProps extends BottomTabBarProps {
  /** Variant — adjusts accent and behaviour for different roles */
  variant?: TabVariant;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const CustomTabBar: React.FC<CustomTabBarProps> = ({
  state,
  descriptors,
  navigation,
  variant = 'USER',
}) => {
  const insets = useSafeAreaInsets();

  // Resolve variant accent color
  const accent =
    variant === 'ADMIN' ? '#ef4444' : variant === 'PARTNER' ? '#fbbf24' : COLORS.primary;

  return (
    <View
      style={[
        styles.floatingNavContainer,
        { paddingBottom: Math.max(insets.bottom, 8) + 8 },
      ]}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={100}
        tint="dark"
        style={[
          styles.tabBar,
          { backgroundColor: 'rgba(2,6,23,0.92)' },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Mapping Routes to Design Icons/Labels
          let iconName: any = 'home';
          let label = 'Home';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              label = 'Home';
              break;
            case 'Dashboard':
              iconName = 'dashboard';
              label = 'Dashboard';
              break;
            case 'Events':
              iconName = 'military-tech';
              label = 'Events';
              break;
            case 'Scan':
              iconName = 'qr-code-scanner';
              label = 'Scan';
              break;
            case 'Wallet':
              iconName = 'account-balance-wallet';
              label = 'Wallet';
              break;
            case 'Payments':
              iconName = 'payments';
              label = 'Payments';
              break;
            case 'Users':
              iconName = 'people';
              label = 'Users';
              break;
            case 'Profile':
              iconName = 'person';
              label = 'Profile';
              break;
            default:
              // Try to format the route name as a label
              iconName = 'circle';
              label = String(route.name).toUpperCase();
          }

          const color = isFocused ? accent : 'rgba(255,255,255,0.4)';

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isFocused }}
            >
              <MaterialIcons name={iconName} size={22} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: SCREEN_WIDTH - 32,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingVertical: 2,
  },
  activeDot: {
    position: 'absolute',
    top: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

export default CustomTabBar;
