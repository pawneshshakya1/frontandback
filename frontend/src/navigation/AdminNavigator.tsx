import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import { COLORS } from '../theme/colors';
import { CustomTabBar } from '../components/CustomTabBar';

// Tab screens
import { HomeScreenAdmin } from '../screens/admin/HomeScreenAdmin';
import { WalletContainerAdmin } from '../screens/admin/WalletContainerAdmin';
import UsersControlScreenAdmin from '../screens/admin/UsersControlScreenAdmin';
import { ProfileScreenAdmin } from '../screens/admin/ProfileScreenAdmin';
import { MyEventsScreenAdmin } from '../screens/admin/MyEventsScreenAdmin';

// Sub-screens
import { NotificationsScreenAdmin } from '../screens/admin/NotificationsScreenAdmin';
import { SettingsScreenAdmin } from '../screens/admin/SettingsScreenAdmin';
import { SecurityPrivacyScreenAdmin } from '../screens/admin/SecurityPrivacyScreenAdmin';
import { PersonalInformationScreenAdmin } from '../screens/admin/PersonalInformationScreenAdmin';
import { MatchDetailScreenAdmin } from '../screens/admin/MatchDetailScreenAdmin';
import { CreateMatchScreenAdmin } from '../screens/admin/CreateMatchScreenAdmin';
import { EventsScreenAdmin } from '../screens/admin/EventsScreenAdmin';
import MatchControlScreenAdmin from '../screens/admin/MatchControlScreenAdmin';
import { UsersListScreenAdmin } from '../screens/admin/UsersListScreenAdmin';
import { UserProfileScreenAdmin } from '../screens/admin/UserProfileScreenAdmin';
import { ElitePassScreenAdmin } from '../screens/admin/ElitePassScreenAdmin';
import { PromoBannerScreenAdmin } from '../screens/admin/PromoBannerScreenAdmin';
import { PaymentDashboardAdmin } from '../screens/admin/PaymentDashboardAdmin';
import { MediatorDashboardScreenAdmin } from '../screens/admin/MediatorDashboardScreenAdmin';
import MediatorApprovalScreenAdmin from '../screens/admin/MediatorApprovalScreenAdmin';
import WalletControlScreenAdmin from '../screens/admin/WalletControlScreenAdmin';
import { WalletScreenAdmin } from '../screens/admin/WalletScreenAdmin';
import { JoinedMatchScreenAdmin } from '../screens/admin/JoinedMatchScreenAdmin';
import { JoinRoomScreenAdmin } from '../screens/admin/JoinRoomScreenAdmin';
import { UploadScreenshotScreenAdmin } from '../screens/admin/UploadScreenshotScreenAdmin';
import { ChangePasswordScreenAdmin } from '../screens/admin/ChangePasswordScreenAdmin';
import { TwoFactorAuthScreenAdmin } from '../screens/admin/TwoFactorAuthScreenAdmin';
import { LoginActivityScreenAdmin } from '../screens/admin/LoginActivityScreenAdmin';
import { AccountVisibilityScreenAdmin } from '../screens/admin/AccountVisibilityScreenAdmin';
import { PersonalizationScreenAdmin } from '../screens/admin/PersonalizationScreenAdmin';
import { BlockedPlayersScreenAdmin } from '../screens/admin/BlockedPlayersScreenAdmin';
import { TermsOfServiceScreenAdmin } from '../screens/admin/TermsOfServiceScreenAdmin';
import { PrivacyPolicyScreenAdmin } from '../screens/admin/PrivacyPolicyScreenAdmin';
import { AddCashScreenAdmin } from '../screens/admin/AddCashScreenAdmin';
import { WithdrawScreenAdmin } from '../screens/admin/WithdrawScreenAdmin';
import { SendGiftScreenAdmin } from '../screens/admin/SendGiftScreenAdmin';
import { AchievementsScreenAdmin } from '../screens/admin/AchievementsScreenAdmin';
import { CreateWalletScreenAdmin } from '../screens/admin/CreateWalletScreenAdmin';
import { ComingSoonScreenAdmin } from '../screens/admin/ComingSoonScreenAdmin';
import { ScanScreenAdmin } from '../screens/admin/ScanScreenAdmin';
import { RevenueDashboardAdmin } from '../screens/admin/RevenueDashboardAdmin';
import { UserDetailScreenAdmin } from '../screens/admin/UserDetailScreenAdmin';
import { WalletManagementScreenAdmin } from '../screens/admin/WalletManagementScreenAdmin';
import { SecurityAuditLogScreenAdmin } from '../screens/admin/SecurityAuditLogScreenAdmin';
import { UserSpendingScreenAdmin } from '../screens/admin/UserSpendingScreenAdmin';
import { PartnerManagementScreenAdmin } from '../screens/admin/PartnerManagementScreenAdmin';
import { PushNotificationScreenAdmin } from '../screens/admin/PushNotificationScreenAdmin';
import { MatchAnalyticsScreenAdmin } from '../screens/admin/MatchAnalyticsScreenAdmin';
import { ElitePassManagementScreenAdmin } from '../screens/admin/ElitePassManagementScreenAdmin';
import { AppSettingsScreenAdmin } from '../screens/admin/AppSettingsScreenAdmin';
import { HelpManagementScreenAdmin } from '../screens/admin/HelpManagementScreenAdmin';
import { HelpConversationScreen } from '../screens/shared/HelpConversationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ========================
// ADMIN BOTTOM TAB NAVIGATOR
// ========================
const AdminTabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} variant="ADMIN" />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { position: 'absolute' },
                tabBarBackground: () => <View style={{ flex: 1 }} />,
            }}
        >
            <Tab.Screen name="Dashboard" component={HomeScreenAdmin} />
            <Tab.Screen name="Events" component={EventsScreenAdmin} />
            <Tab.Screen name="Scan" component={ScanScreenAdmin} />
            <Tab.Screen name="Payments" component={WalletContainerAdmin} />
            <Tab.Screen name="Profile" component={ProfileScreenAdmin} />
        </Tab.Navigator>
    );
};

// ========================
// ADMIN STACK NAVIGATOR
// ========================
export const AdminNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.backgroundDark },
            }}
        >
            <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />

            {/* Notifications & Settings */}
            <Stack.Screen name="Notifications" component={NotificationsScreenAdmin} />
            <Stack.Screen name="NotificationsAdmin" component={NotificationsScreenAdmin} />
            <Stack.Screen name="Settings" component={SettingsScreenAdmin} />
            <Stack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreenAdmin} />
            <Stack.Screen name="PersonalInformation" component={PersonalInformationScreenAdmin} />

            {/* Match screens */}
            <Stack.Screen name="MatchDetail" component={MatchDetailScreenAdmin} />
            <Stack.Screen name="CreateMatch" component={CreateMatchScreenAdmin} />
            <Stack.Screen name="JoinedMatch" component={JoinedMatchScreenAdmin} />
            <Stack.Screen name="JoinRoomScreen" component={JoinRoomScreenAdmin} />
            <Stack.Screen name="UploadScreenshot" component={UploadScreenshotScreenAdmin} />
            <Stack.Screen name="MediatorDashboard" component={MediatorDashboardScreenAdmin} />
            <Stack.Screen name="MediatorApproval" component={MediatorApprovalScreenAdmin} />
            <Stack.Screen name="MatchControlScreen" component={MatchControlScreenAdmin} />

            {/* Events */}
            <Stack.Screen name="EventsList" component={EventsScreenAdmin} />
            <Stack.Screen name="PromoBanner" component={PromoBannerScreenAdmin} />

            {/* Users */}
            <Stack.Screen name="UsersList" component={UsersListScreenAdmin} />
            <Stack.Screen name="UserProfile" component={UserProfileScreenAdmin} />
            <Stack.Screen name="ElitePass" component={ElitePassScreenAdmin} />

            {/* Payments */}
            <Stack.Screen name="PaymentDashboard" component={PaymentDashboardAdmin} />
            <Stack.Screen name="WalletControl" component={WalletControlScreenAdmin} />
            <Stack.Screen name="WalletControlScreen" component={WalletControlScreenAdmin} />
            <Stack.Screen name="Wallet" component={WalletScreenAdmin} />
            <Stack.Screen name="AddCash" component={AddCashScreenAdmin} />
            <Stack.Screen name="Withdraw" component={WithdrawScreenAdmin} />
            <Stack.Screen name="SendGift" component={SendGiftScreenAdmin} />

            {/* Security */}
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreenAdmin} />
            <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreenAdmin} />
            <Stack.Screen name="LoginActivity" component={LoginActivityScreenAdmin} />
            <Stack.Screen name="AccountVisibility" component={AccountVisibilityScreenAdmin} />
            <Stack.Screen name="Personalization" component={PersonalizationScreenAdmin} />
            <Stack.Screen name="BlockedPlayers" component={BlockedPlayersScreenAdmin} />

            {/* Legal */}
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreenAdmin} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreenAdmin} />

            {/* Other */}
            <Stack.Screen name="Achievements" component={AchievementsScreenAdmin} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreenAdmin} />
            <Stack.Screen name="Scan" component={ScanScreenAdmin} />
            <Stack.Screen name="RevenueDashboard" component={RevenueDashboardAdmin} />
            <Stack.Screen name="UserDetail" component={UserDetailScreenAdmin} />
            <Stack.Screen name="WalletManagement" component={WalletManagementScreenAdmin} />
            <Stack.Screen name="SecurityAuditLog" component={SecurityAuditLogScreenAdmin} />
            <Stack.Screen name="UserSpending" component={UserSpendingScreenAdmin} />
            <Stack.Screen name="PartnerManagement" component={PartnerManagementScreenAdmin} />
            <Stack.Screen name="PushNotification" component={PushNotificationScreenAdmin} />
            <Stack.Screen name="MatchAnalytics" component={MatchAnalyticsScreenAdmin} />
            <Stack.Screen name="ElitePassManagement" component={ElitePassManagementScreenAdmin} />
            <Stack.Screen name="CreatePass" component={require('../screens/admin/CreatePassScreenAdmin').CreatePassScreenAdmin} />
            <Stack.Screen name="AppSettings" component={AppSettingsScreenAdmin} />
            <Stack.Screen name="ComingSoon" component={ComingSoonScreenAdmin} />

            {/* Help & Support */}
            <Stack.Screen name="HelpManagement" component={HelpManagementScreenAdmin} />
            <Stack.Screen name="HelpConversation" component={HelpConversationScreen} />
            <Stack.Screen name="Help" component={HelpManagementScreenAdmin} />
        </Stack.Navigator>
    );
};
