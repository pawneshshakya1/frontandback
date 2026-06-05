import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';

import { COLORS } from '../theme/colors';
import { CustomTabBar } from '../components/CustomTabBar';

// Tab screens
import { HomeScreenPartner } from '../screens/partner/HomeScreenPartner';
import { MyEventsScreenPartner } from '../screens/partner/MyEventsScreenPartner';
import { ProfileScreenPartner } from '../screens/partner/ProfileScreenPartner';
import { ScanScreenPartner } from '../screens/partner/ScanScreenPartner';
import { WalletContainerPartner } from '../screens/partner/WalletContainerPartner';

// Sub-screens
import { NotificationsScreenPartner } from '../screens/partner/NotificationsScreenPartner';
import { SettingsScreenPartner } from '../screens/partner/SettingsScreenPartner';
import { SecurityPrivacyScreenPartner } from '../screens/partner/SecurityPrivacyScreenPartner';
import { PersonalInformationScreenPartner } from '../screens/partner/PersonalInformationScreenPartner';
import { MatchDetailScreenPartner } from '../screens/partner/MatchDetailScreenPartner';
import { CreateMatchScreenPartner } from '../screens/partner/CreateMatchScreenPartner';
import { JoinRoomScreenPartner } from '../screens/partner/JoinRoomScreenPartner';
import { JoinedMatchScreenPartner } from '../screens/partner/JoinedMatchScreenPartner';
import { UploadScreenshotScreenPartner } from '../screens/partner/UploadScreenshotScreenPartner';
import { MediatorDashboardScreenPartner } from '../screens/partner/MediatorDashboardScreenPartner';
import { PartnerTierScreen } from '../screens/partner/PartnerTierScreen';
import { EventsScreenPartner } from '../screens/partner/EventsScreenPartner';
import { FeaturedEventsScreenPartner } from '../screens/partner/FeaturedEventsScreenPartner';
import { UserProfileScreenPartner } from '../screens/partner/UserProfileScreenPartner';
import { ElitePassScreenPartner } from '../screens/partner/ElitePassScreenPartner';
import { PartnerEventDetailScreen } from '../screens/partner/PartnerEventDetailScreen';
import { PartnerRoomUpdateScreen } from '../screens/partner/PartnerRoomUpdateScreen';
import { PartnerCreateEventScreen } from '../screens/partner/PartnerCreateEventScreen';
import { ChangePasswordScreenPartner } from '../screens/partner/ChangePasswordScreenPartner';
import { TwoFactorAuthScreenPartner } from '../screens/partner/TwoFactorAuthScreenPartner';
import { LoginActivityScreenPartner } from '../screens/partner/LoginActivityScreenPartner';
import { AccountVisibilityScreenPartner } from '../screens/partner/AccountVisibilityScreenPartner';
import { PersonalizationScreenPartner } from '../screens/partner/PersonalizationScreenPartner';
import { BlockedPlayersScreenPartner } from '../screens/partner/BlockedPlayersScreenPartner';
import { TermsOfServiceScreenPartner } from '../screens/partner/TermsOfServiceScreenPartner';
import { PrivacyPolicyScreenPartner } from '../screens/partner/PrivacyPolicyScreenPartner';
import { AddCashScreenPartner } from '../screens/partner/AddCashScreenPartner';
import { WithdrawScreenPartner } from '../screens/partner/WithdrawScreenPartner';
import { SendGiftScreenPartner } from '../screens/partner/SendGiftScreenPartner';
import WalletControlScreenPartner from '../screens/partner/WalletControlScreenPartner';
import { AchievementsScreenPartner } from '../screens/partner/AchievementsScreenPartner';
import { ComingSoonScreenPartner } from '../screens/partner/ComingSoonScreenPartner';
import { PartnerMyQRScreen } from '../screens/partner/PartnerMyQRScreen';
import { ReceiveQRSCREEN } from '../screens/main/ReceiveQRSCREEN';
import { ScanPayScreen } from '../screens/main/ScanPayScreen';
import { UsersListScreenPartner } from '../screens/partner/UsersListScreenPartner';
import { PaymentDashboardPartner } from '../screens/partner/PaymentDashboardPartner';
import { PromoBannerScreenPartner } from '../screens/partner/PromoBannerScreenPartner';
import { HelpScreenPartner } from '../screens/partner/HelpScreenPartner';
import { HelpConversationScreen } from '../screens/shared/HelpConversationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ========================
// PARTNER BOTTOM TAB NAVIGATOR
// ========================
const PartnerTabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} variant="PARTNER" />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { position: 'absolute' },
                tabBarBackground: () => <View style={{ flex: 1 }} />,
            }}
        >
            <Tab.Screen name="Dashboard" component={HomeScreenPartner} />
            <Tab.Screen name="Events" component={EventsScreenPartner} />
            <Tab.Screen name="Scan" component={ScanScreenPartner} />
            <Tab.Screen name="Wallet" component={WalletContainerPartner} />
            <Tab.Screen name="Profile" component={ProfileScreenPartner} />
        </Tab.Navigator>
    );
};

// ========================
// PARTNER STACK NAVIGATOR
// ========================
export const PartnerNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: COLORS.backgroundDark },
            }}
        >
            <Stack.Screen name="PartnerTabs" component={PartnerTabNavigator} />

            {/* Notifications & Settings */}
            <Stack.Screen name="Notifications" component={NotificationsScreenPartner} />
            <Stack.Screen name="Settings" component={SettingsScreenPartner} />
            <Stack.Screen name="SecurityPrivacy" component={SecurityPrivacyScreenPartner} />
            <Stack.Screen name="PersonalInformation" component={PersonalInformationScreenPartner} />

            {/* Match screens */}
            <Stack.Screen name="MatchDetail" component={MatchDetailScreenPartner} />
            <Stack.Screen name="CreateMatch" component={CreateMatchScreenPartner} />
            <Stack.Screen name="JoinRoomScreen" component={JoinRoomScreenPartner} />
            <Stack.Screen name="JoinedMatch" component={JoinedMatchScreenPartner} />
            <Stack.Screen name="UploadScreenshot" component={UploadScreenshotScreenPartner} />
            <Stack.Screen name="MediatorDashboard" component={MediatorDashboardScreenPartner} />

            {/* Events */}
            <Stack.Screen name="EventsList" component={EventsScreenPartner} />
            <Stack.Screen name="MyEvents" component={MyEventsScreenPartner} />
            <Stack.Screen name="FeaturedEvents" component={FeaturedEventsScreenPartner} />
            <Stack.Screen name="PartnerTier" component={PartnerTierScreen} />
            <Stack.Screen name="PartnerEventDetail" component={PartnerEventDetailScreen} />
            <Stack.Screen name="PartnerRoomUpdate" component={PartnerRoomUpdateScreen} />
            <Stack.Screen name="PartnerCreateEvent" component={PartnerCreateEventScreen} />

            {/* Profile sub-screens */}
            <Stack.Screen name="UserProfile" component={UserProfileScreenPartner} />
            <Stack.Screen name="Achievements" component={AchievementsScreenPartner} />
            <Stack.Screen name="ElitePass" component={ElitePassScreenPartner} />

            {/* Security */}
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreenPartner} />
            <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreenPartner} />
            <Stack.Screen name="LoginActivity" component={LoginActivityScreenPartner} />
            <Stack.Screen name="AccountVisibility" component={AccountVisibilityScreenPartner} />
            <Stack.Screen name="Personalization" component={PersonalizationScreenPartner} />
            <Stack.Screen name="BlockedPlayers" component={BlockedPlayersScreenPartner} />

            {/* Legal */}
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreenPartner} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreenPartner} />

            {/* Wallet actions */}
            <Stack.Screen name="AddCash" component={AddCashScreenPartner} />
            <Stack.Screen name="Withdraw" component={WithdrawScreenPartner} />
            <Stack.Screen name="SendGift" component={SendGiftScreenPartner} />
            <Stack.Screen name="WalletControl" component={WalletControlScreenPartner} />
            <Stack.Screen name="WalletControlScreen" component={WalletControlScreenPartner} />
            <Stack.Screen name="ReceiveQR" component={ReceiveQRSCREEN} />
            <Stack.Screen name="ScanPay" component={ScanPayScreen} />

            {/* Coming Soon */}
            <Stack.Screen name="ComingSoon" component={ComingSoonScreenPartner} />

            {/* Partner Subscription - My QR */}
            <Stack.Screen name="PartnerMyQR" component={PartnerMyQRScreen} />

            {/* Subscribers + Payment + Promo */}
            <Stack.Screen name="UsersList" component={UsersListScreenPartner} />
            <Stack.Screen name="PaymentDashboard" component={PaymentDashboardPartner} />
            <Stack.Screen name="PromoBanner" component={PromoBannerScreenPartner} />

            {/* Help & Support */}
            <Stack.Screen name="Help" component={HelpScreenPartner} />
            <Stack.Screen name="HelpConversation" component={HelpConversationScreen} />
        </Stack.Navigator>
    );
};
