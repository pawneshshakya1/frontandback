import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { CustomTabBar } from '../components/CustomTabBar';

// Auth screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';

// Main (User) screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { MyEventsScreen } from '../screens/main/MyEventsScreen';
import { ScanScreen } from '../screens/main/ScanScreen';
import { WalletContainer } from '../screens/main/WalletContainer';
import { ProfileScreen } from '../screens/main/ProfileScreen';

// Main stack screens
import { MatchDetailScreen } from '../screens/main/MatchDetailScreen';
import { JoinedMatchScreen } from '../screens/main/JoinedMatchScreen';
import { CreateMatchScreen } from '../screens/main/CreateMatchScreen';
import { MatchesListScreen } from '../screens/main/MatchesListScreen';
import { EventsScreen } from '../screens/main/EventsScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { ElitePassScreen } from '../screens/main/ElitePassScreen';
import { JoinRoomScreen } from '../screens/main/JoinRoomScreen';
import { UploadScreenshotScreen } from '../screens/main/UploadScreenshotScreen';
import { MediatorDashboardScreen } from '../screens/main/MediatorDashboardScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { SecurityPrivacyScreen } from '../screens/main/SecurityPrivacyScreen';
import { PersonalInformationScreen } from '../screens/main/PersonalInformationScreen';
import { AchievementsScreen } from '../screens/main/AchievementsScreen';
import { SubscribePartnersScreen } from '../screens/main/SubscribePartnersScreen';
import { PartnerProfileScreen } from '../screens/main/PartnerProfileScreen';
import { ChangePasswordScreen } from '../screens/main/ChangePasswordScreen';
import { TwoFactorAuthScreen } from '../screens/main/TwoFactorAuthScreen';
import { LoginActivityScreen } from '../screens/main/LoginActivityScreen';
import { AccountVisibilityScreen } from '../screens/main/AccountVisibilityScreen';
import { PersonalizationScreen } from '../screens/main/PersonalizationScreen';
import { BlockedPlayersScreen } from '../screens/main/BlockedPlayersScreen';
import { TermsOfServiceScreen } from '../screens/main/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from '../screens/main/PrivacyPolicyScreen';
import { AddCashScreen } from '../screens/main/AddCashScreen';
import { WithdrawScreen } from '../screens/main/WithdrawScreen';
import { SendGiftScreen } from '../screens/main/SendGiftScreen';
import { ScanPayScreen } from '../screens/main/ScanPayScreen';
import { ReceiveQRSCREEN } from '../screens/main/ReceiveQRSCREEN';
import { TransactionHistoryScreen } from '../screens/main/TransactionHistoryScreen';
import { PaymentMethodScreen } from '../screens/main/PaymentMethodScreen';
import { CreateWalletScreen } from '../screens/main/CreateWalletScreen';
import { WalletSettingsScreen } from '../screens/main/WalletSettingsScreen';
import { UserProfileScreen } from '../screens/main/UserProfileScreen';
import { ComingSoonScreen } from '../screens/main/ComingSoonScreen';
import { HelpScreen } from '../screens/main/HelpScreen';
import { HelpConversationScreen } from '../screens/shared/HelpConversationScreen';
import { ChatListScreen } from '../screens/main/ChatListScreen';
import { ChatConversationScreen } from '../screens/main/ChatConversationScreen';

// Role-based navigators
import { AdminNavigator } from './AdminNavigator';
import { PartnerNavigator } from './PartnerNavigator';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ========================
// USER BOTTOM TAB NAVIGATOR
// ========================
const UserTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} variant="USER" />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute' },
        tabBarBackground: () => <View style={{ flex: 1 }} />,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Wallet" component={WalletContainer} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// ========================
// USER STACK NAVIGATOR
// ========================
const UserStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.backgroundDark },
      }}
    >
      <Stack.Screen name="MainTabs" component={UserTabNavigator} />

      {/* Match screens */}
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
      <Stack.Screen name="JoinedMatch" component={JoinedMatchScreen} />
      <Stack.Screen name="CreateMatch" component={CreateMatchScreen} />
      <Stack.Screen name="MatchesList" component={MatchesListScreen} />
      <Stack.Screen name="JoinRoomScreen" component={JoinRoomScreen} />

      {/* Events */}
      <Stack.Screen name="EventsList" component={EventsScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />

      {/* Notifications */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />

      {/* Elite Pass */}
      <Stack.Screen name="ElitePass" component={ElitePassScreen} />

      {/* Wallet & Payments */}
      <Stack.Screen name="AddCash" component={AddCashScreen} />
      <Stack.Screen name="Withdraw" component={WithdrawScreen} />
      <Stack.Screen name="SendGift" component={SendGiftScreen} />
      <Stack.Screen name="ScanPay" component={ScanPayScreen} />
      <Stack.Screen name="ReceiveQR" component={ReceiveQRSCREEN} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen as any} />
      <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
      <Stack.Screen name="WalletSettings" component={WalletSettingsScreen} />

      {/* Upload & Mediator */}
      <Stack.Screen name="UploadScreenshot" component={UploadScreenshotScreen} />
      <Stack.Screen name="MediatorDashboard" component={MediatorDashboardScreen} />

      {/* Profile sub-screens */}
      <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />

      {/* Partner Subscription */}
      <Stack.Screen name="SubscribePartners" component={SubscribePartnersScreen} />
      <Stack.Screen name="PartnerProfile" component={PartnerProfileScreen} />

      {/* Settings & Security */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
      <Stack.Screen name="LoginActivity" component={LoginActivityScreen} />
      <Stack.Screen name="AccountVisibility" component={AccountVisibilityScreen} />
      <Stack.Screen name="Personalization" component={PersonalizationScreen} />
      <Stack.Screen name="BlockedPlayers" component={BlockedPlayersScreen} />

      {/* Legal */}
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

      {/* Coming Soon */}
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />

      {/* Help & Support */}
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="HelpConversation" component={HelpConversationScreen} />

      {/* Chat (Elite Pass + Friends) */}
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
    </Stack.Navigator>
  );
};

// ========================
// AUTH STACK NAVIGATOR
// ========================
const AuthStackNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.backgroundDark },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Splash" component={SplashScreen} />
    </Stack.Navigator>
  );
};

// ========================
// ROOT NAVIGATOR
// ========================
export const AppNavigator = () => {
  const { authData, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!authData ? (
        <AuthStackNavigator />
      ) : authData.role === 'ADMIN' ? (
        <AdminNavigator />
      ) : authData.role === 'PARTNER' ? (
        <PartnerNavigator />
      ) : (
        <UserStackNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundDark,
  },
});
