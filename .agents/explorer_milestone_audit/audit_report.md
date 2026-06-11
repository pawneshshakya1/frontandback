# React Native Screens Audit Report

This report presents findings from an audit of 153 screen components under `frontend/src/screens`. 

The audit focused on three compliance areas based on styling and code guidelines:
1. **Native Alert Usage**: Locating native `Alert.alert` calls that must be replaced with `PopupModal`.
2. **Modal Backdrop Blur & Gaps**: Checking custom modals or overlay screens to ensure they use a blurred background (`BlurView`) and maintain standard `16px` margins.
3. **Universal Horizontal Padding**: Verifying that layout properties use exactly `16px` (or `SPACING.SCREEN_PADDING`), identifying any styling deviations.

---

## Executive Summary

| Category | Audited Instances | Compliance Status / Actions Required |
| :--- | :--- | :--- |
| **Native Alerts** | Multiple | Native `Alert.alert` is widely used for error handling and confirmations. All instances must be replaced with the custom `PopupModal`. |
| **Modal Blur backdrop** | Multiple | Many modal implementations do not import or use `BlurView`, rendering solid backgrounds instead. Modals in `ChangePasswordScreen`, `ChatConversationScreen`, `HelpConversationScreen`, `WalletControlScreenAdmin`, and others need `BlurView` integration. |
| **Horizontal Layout Padding** | Major Deviations | Almost every screen contains styles with custom values (like `20px` or `24px` padding) instead of standard `16px` or `SPACING.SCREEN_PADDING`. Container-level layouts require alignment. |

---

## 1. Native `Alert.alert` Occurrences

Below are the file paths, line numbers, and exact code snippets where native `Alert.alert` calls are implemented:

### Auth & Shared Screens
- **`frontend/src/screens/auth/RegisterScreen.tsx`**
  - Line 34: `Alert.alert("Error", "Please fill all fields");`
  - Line 38: `Alert.alert("Error", "Username must be at least 3 characters");`
  - Line 42: `Alert.alert("Error", "Username must be less than 30 characters");`
  - Line 47: `Alert.alert("Error", "Please enter a valid email address");`
  - Line 51: `Alert.alert("Error", "Password must be at least 6 characters");`
  - Line 55: `Alert.alert("Error", "Passwords do not match");`
  - Line 71: `Alert.alert("Success", "Account created successfully!");`
  - Line 74: `Alert.alert("Registration Failed", error.response?.data?.message || error.message || "Something went wrong");`
- **`frontend/src/screens/shared/HelpConversationScreen.tsx`**
  - Line 212: Action sheet style native alert for file attachments (camera vs library choice).

### Main (User) Screens
- **`frontend/src/screens/main/AchievementsScreen.tsx`**
  - Line 38: `Alert.alert('Error', 'Failed to load data');`
- **`frontend/src/screens/main/AddCashScreen.tsx`**
  - Line 63: `Alert.alert("Invalid Amount", "Please enter a valid amount to add.");`
  - Line 76: `Alert.alert("Error", "Failed to initiate payment session");`
  - Line 79: `Alert.alert("Error", error.response?.data?.message || "Failed to initiate payment");`
- **`frontend/src/screens/main/CreateMatchScreen.tsx`**
  - Line 822: Location permission native alert.
  - Line 958: `Alert.alert("Validation Error", "Please enter a match title.");`
  - Line 962: `Alert.alert("Validation Error", "Please select a match date.");`
  - Line 967: `Alert.alert("Validation Error", "Entry fee cannot be negative.");`
  - Line 971: Validation error for max players.
  - Line 1026: Success or error on draft save.
- **`frontend/src/screens/main/CreateWalletScreen.tsx`**
  - Line 38: `Alert.alert('Error', 'Please fill all fields');`
  - Line 43: `Alert.alert('Error', 'PIN must be exactly 6 digits');`
  - Line 48: `Alert.alert('Error', 'PINs do not match');`
  - Lines 63, 83, 96: Wallet generation alerts.
- **`frontend/src/screens/main/JoinRoomScreen.tsx`**
  - Line 76: `Alert.alert("Invalid Code", "Please enter a valid invite code");`
  - Line 85: Success dialog.
  - Line 91: Join error.
- **`frontend/src/screens/main/LoginActivityScreen.tsx`**
  - Line 22, 24, 29, 42: Terminate session, logout success/error alerts.
- **`frontend/src/screens/main/MatchDetailScreen.tsx`**
  - Line 90, 93, 101, 108, 117, 119: Match join/delete/live status change alerts.
- **`frontend/src/screens/main/MatchesListScreen.tsx`**
  - Line 38: Load matches failure alert.
- **`frontend/src/screens/main/MediatorDashboardScreen.tsx`**
  - Line 66, 71, 79, 90, 94, 109, 115, 123, 133, 137: Results approval, AI verdicts, winner selections, and rejection alerts.
- **`frontend/src/screens/main/PaymentMethodScreen.tsx`**
  - Line 71, 89, 114: Transaction error and match join success alerts.
- **`frontend/src/screens/main/ScanPayScreen.tsx`**
  - Line 114, 118, 126, 138, 153, 168: PIN, limit, and transfer validations/errors.
- **`frontend/src/screens/main/SecurityPrivacyScreen.tsx`**
  - Line 174: Account deletion confirmation.
- **`frontend/src/screens/main/SendGiftScreen.tsx`**
  - Line 41, 52, 58, 62, 65, 76, 81: Account verification, PIN prompt, transfer success/error alerts.
- **`frontend/src/screens/main/SettingsScreen.tsx`**
  - Line 131: Graphics settings prompt.
  - Line 149: Sound settings information.
  - Line 160: Push notification setup status alerts.
  - Line 263, 273: Account delete errors.
- **`frontend/src/screens/main/TwoFactorAuthScreen.tsx`**
  - Line 26, 45, 106: Activation confirmation, copy token success alerts.
- **`frontend/src/screens/main/UploadScreenshotScreen.tsx`**
  - Line 62: Match time expired alert.
  - Line 99, 100, 101, 115, 119: Validation errors and screenshot upload confirmations.
- **`frontend/src/screens/main/WalletScreen.tsx`**
  - Line 126: Coming soon features.
  - Line 137, 145, 152, 158, 163, 169: Reset PIN flow prompts, errors, and success dialogs.
- **`frontend/src/screens/main/WalletSettingsScreen.tsx`**
  - Line 46, 86, 88, 91, 115: Config save errors and limit format validation alerts.
- **`frontend/src/screens/main/WithdrawScreen.tsx`**
  - Line 80, 84, 91, 97, 103, 111, 114, 149: Bank account details check, UPI format check, low balance, and support dialog.

### Partner Screens
- **`frontend/src/screens/partner/AddCashScreenPartner.tsx`**
  - Line 63, 76, 79: Cash addition alerts.
- **`frontend/src/screens/partner/CreateMatchScreenPartner.tsx`**
  - Lines 942, 1138, 1143, 1151, 1155: Location permissions, validation issues, draft save confirmations.
- **`frontend/src/screens/partner/CreateWalletScreenPartner.tsx`**
  - Line 38, 43, 48, 63, 83, 96: Wallet setup alerts.
- **`frontend/src/screens/partner/ElitePassScreenPartner.tsx`**
  - Lines 88, 96, 99, 140, 160, 163, 169, 176, 184, 187: Seed defaults, save errors, delete pass confirmation.
- **`frontend/src/screens/partner/LoginActivityScreenPartner.tsx`**
  - Line 28, 33, 47: Logout success/errors.
- **`frontend/src/screens/partner/MatchControlScreenPartner.tsx`**
  - Line 114, 122: Control confirmations.
- **`frontend/src/screens/partner/MatchDetailScreenPartner.tsx`**
  - Lines 71, 74, 117, 130, 134, 139, 146, 155, 157: Event publish status, draft deletion alerts, room detail validations.
- **`frontend/src/screens/partner/MediatorApprovalScreenPartner.tsx`**
  - Lines 70, 82, 84, 105, 107: Mediator assignment alerts.
- **`frontend/src/screens/partner/MediatorDashboardScreenPartner.tsx`**
  - Line 72, 77: Result verification.
- **`frontend/src/screens/partner/PartnerDashboardScreen.tsx`**
  - Line 110, 184: Event launch confirmation, data load errors.
- **`frontend/src/screens/partner/PartnerEventDetailScreen.tsx`**
  - Lines 92, 108, 120, 123, 134, 138, 147, 157, 161: Status modifications, draft deletion confirmations.
- **`frontend/src/screens/partner/PartnerMyQRScreen.tsx`**
  - Lines 53, 67, 80, 82, 225, 237: QR generation, clipboard copy confirmation alerts.
- **`frontend/src/screens/partner/PartnerRoomUpdateScreen.tsx`**
  - Lines 37, 42, 58, 63: Room details update dialogs.
- **`frontend/src/screens/partner/ProfileScreenPartner.tsx`**
  - Lines 77, 107, 113, 121, 134: Logout validation.
- **`frontend/src/screens/partner/PromoBannerScreenPartner.tsx`**
  - Lines 153, 164, 169, 177, 187, 200, 330, 343: Image picker permission error, upload failure alerts.
- **`frontend/src/screens/partner/SecurityPrivacyScreenPartner.tsx`**
  - Line 174: Account deletion confirmation.
- **`frontend/src/screens/partner/SendGiftScreenPartner.tsx`**
  - Line 41, 53, 61, 65, 68, 85, 90: verification, gift transfer confirmations.
- **`frontend/src/screens/partner/SettingsScreenPartner.tsx`**
  - Line 118, 214, 218: Account suspension, volume configs.
- **`frontend/src/screens/partner/TwoFactorAuthScreenPartner.tsx`**
  - Lines 26, 45, 47, 54: 2FA setup feedback.
- **`frontend/src/screens/partner/UploadScreenshotScreenPartner.tsx`**
  - Lines 67, 68, 69, 81, 85: Screenshot validations.
- **`frontend/src/screens/partner/UsersListScreenPartner.tsx`**
  - Line 34: Data loading issues.
- **`frontend/src/screens/partner/WalletControlScreenPartner.tsx`**
  - Lines 96, 100, 110, 123, 132: Adjustment amount errors.
- **`frontend/src/screens/partner/WalletScreenPartner.tsx`**
  - Lines 96, 124, 128, 140, 145, 162, 174, 182, 188, 194: Balance redeem success/failure alerts.
- **`frontend/src/screens/partner/WithdrawScreenPartner.tsx`**
  - Lines 58, 68, 75, 81, 87, 100, 105, 144, 208: UPI verification, account confirmation alerts.

### Admin Screens
- **`frontend/src/screens/admin/AchievementsManagementScreenAdmin.tsx`**
  - Line 115, 122, 142, 153: Achievement CRUD confirmations.
- **`frontend/src/screens/admin/AddCashScreenAdmin.tsx`**
  - Lines 61, 74, 77, 98, 102, 105: Sandbox transaction statuses.
- **`frontend/src/screens/admin/AppSettingsScreenAdmin.tsx`**
  - Line 68, 72: App config sync alerts.
- **`frontend/src/screens/admin/CreateEventScreenAdmin.tsx`**
  - Lines 50, 54, 93, 97, 101: Admin event creations.
- **`frontend/src/screens/admin/CreateMatchScreenAdmin.tsx`**
  - Lines 763, 947, 951, 955: Location warning, success notifications.
- **`frontend/src/screens/admin/CreateWalletScreenAdmin.tsx`**
  - Line 38, 43, 48, 63, 83, 96: Wallet creation checks.
- **`frontend/src/screens/admin/ElitePassManagementScreenAdmin.tsx`**
  - Lines 59, 79, 82, 87, 92, 99, 102, 110, 116, 119: Pass configurations.
- **`frontend/src/screens/admin/ElitePassScreenAdmin.tsx`**
  - Lines 88, 96, 99, 140, 160, 163, 169, 176, 184, 187: Admin configurations.
- **`frontend/src/screens/admin/FriendsManagementScreenAdmin.tsx`**
  - Lines 122, 130, 133, 143, 146: Account block status warnings.
- **`frontend/src/screens/admin/HomeScreenAdmin.tsx`**
  - Line 696: Sync verification alerts.
- **`frontend/src/screens/admin/LoginActivityScreenAdmin.tsx`**
  - Line 24: Terminate session alert.
- **`frontend/src/screens/admin/MatchControlScreenAdmin.tsx`**
  - Line 114, 122: Global match cancellation.
- **`frontend/src/screens/admin/MatchDetailScreenAdmin.tsx`**
  - Lines 128, 131, 157, 171, 174, 179, 187, 190, 197, 206, 208, 212, 218, 220: Detail adjustments, deletion, and publishing alerts.
- **`frontend/src/screens/admin/MediatorApprovalScreenAdmin.tsx`**
  - Lines 67, 79, 81, 102, 104: Approval configurations.
- **`frontend/src/screens/admin/MediatorDashboardScreenAdmin.tsx`**
  - Line 60, 65: Status checks.
- **`frontend/src/screens/admin/PartnerManagementScreenAdmin.tsx`**
  - Lines 58, 65, 68, 137, 142, 144: Partner updates and suspensions.
- **`frontend/src/screens/admin/PaymentDashboardAdmin.tsx`**
  - Line 51: Load errors.
- **`frontend/src/screens/admin/PromoBannerScreenAdmin.tsx`**
  - Lines 106, 118, 123, 133, 143, 155, 285, 298: Admin promotional content configs.
- **`frontend/src/screens/admin/PushNotificationScreenAdmin.tsx`**
  - Lines 120, 130, 202, 274, 286: Push broadcast alerts.
- **`frontend/src/screens/admin/SecurityPrivacyScreenAdmin.tsx`**
  - Line 174: Deletion confirmation.
- **`frontend/src/screens/admin/SendGiftScreenAdmin.tsx`**
  - Lines 41, 53, 61, 65, 68, 85, 90: gift verification.
- **`frontend/src/screens/admin/SettingsScreenAdmin.tsx`**
  - Line 50, 146, 158: Reset database, reset config warnings.
- **`frontend/src/screens/admin/TwoFactorAuthScreenAdmin.tsx`**
  - Lines 24, 43, 105: setup check alerts.
- **`frontend/src/screens/admin/UploadScreenshotScreenAdmin.tsx`**
  - Lines 67, 68, 69, 81, 85: Screenshot verification flags.
- **`frontend/src/screens/admin/UserDetailScreenAdmin.tsx`**
  - Lines 63, 76, 86, 97, 100: Wallet adjustments.
- **`frontend/src/screens/admin/UsersListScreenAdmin.tsx`**
  - Lines 92, 122, 136, 138, 145, 160, 162: User management blocks.
- **`frontend/src/screens/admin/WalletControlScreenAdmin.tsx`**
  - Lines 73, 77, 90, 97: Admin wallet transfers.
- **`frontend/src/screens/admin/WalletManagementScreenAdmin.tsx`**
  - Lines 66, 77, 80: Adjust logic checks.
- **`frontend/src/screens/admin/WalletScreenAdmin.tsx`**
  - Lines 115, 134: Admin reset confirmations.
- **`frontend/src/screens/admin/WithdrawScreenAdmin.tsx`**
  - Lines 74, 81, 87, 93, 106, 111, 149: UPI, banking error notifications.

---

## 2. Modal Components & Screens Functioning as Overlays

All custom modal components must use a blurred background (`BlurView`) and match the home screen's layout gap (`16px`). Below is the evaluation of files containing Modal structures:

| File Path | Modal Line Numbers | Imports `BlurView`? | Assessment / Corrective Actions Needed |
| :--- | :--- | :--- | :--- |
| `frontend/src/screens/auth/ForgotPasswordScreen.tsx` | 245 | **Yes** | Fully compliant backdrop. Verify 16px margins. |
| `frontend/src/screens/auth/LoginScreen.tsx` | 385 | **Yes** | Fully compliant backdrop. Verify 16px margins. |
| `frontend/src/screens/shared/HelpConversationScreen.tsx` | 480 | **No** | **Requires BlurView backdrop replacement.** Currently uses solid color overlay. |
| `frontend/src/screens/main/ChangePasswordScreen.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation** for background. |
| `frontend/src/screens/main/ChatConversationScreen.tsx` | 239 | **No** | **Requires BlurView backdrop replacement.** Currently uses solid color overlay. |
| `frontend/src/screens/main/ChatListScreen.tsx` | 277, 307, 434 | **Yes** | Uses BlurView. Ensure left/right gaps are 16px. |
| `frontend/src/screens/main/CreateMatchScreen.tsx` | N/A (Imported) | **Yes** | Uses BlurView wrapper. |
| `frontend/src/screens/main/HelpScreen.tsx` | 423, 565 | **Yes** | Uses BlurView. Ensure left/right gaps are 16px. |
| `frontend/src/screens/main/PersonalInformationScreen.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/main/ReceiveQRSCREEN.tsx` | N/A (Imported) | **Yes** | Uses BlurView. |
| `frontend/src/screens/partner/ChangePasswordScreenPartner.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/partner/CreateEventScreenPartner.tsx` | 585 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/partner/CreateMatchScreenPartner.tsx` | N/A (Imported) | **Yes** | Uses BlurView. |
| `frontend/src/screens/partner/FeaturedEventsScreenPartner.tsx` | N/A (Imported) | **Yes** | Uses BlurView. |
| `frontend/src/screens/partner/HomeScreenPartner.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/partner/NotificationsScreenPartner.tsx` | 271 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/partner/PartnerCreateEventScreen.tsx` | 495 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/partner/PersonalInformationScreenPartner.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/partner/PromoBannerScreenPartner.tsx` | 280 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/partner/WalletControlScreenPartner.tsx` | 392 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/admin/ChangePasswordScreenAdmin.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/admin/CreateMatchScreenAdmin.tsx` | N/A (Imported) | **Yes** | Uses BlurView. |
| `frontend/src/screens/admin/HelpManagementScreenAdmin.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/admin/NotificationsScreenAdmin.tsx` | 140 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/admin/PersonalInformationScreenAdmin.tsx` | N/A (Imported) | **No** | **Needs BlurView implementation.** |
| `frontend/src/screens/admin/PromoBannerScreenAdmin.tsx` | 234 | **No** | **Requires BlurView backdrop replacement.** |
| `frontend/src/screens/admin/WalletControlScreenAdmin.tsx` | 340 | **No** | **Requires BlurView backdrop replacement.** |

---

## 3. Non-Compliant Layout Horizontal Paddings

The project standard specifies a universal horizontal padding of exactly `16px` (or `SPACING.SCREEN_PADDING`). Custom values (like `20px` or `24px`) must be adjusted to match.

Below are key instances of non-compliant horizontal layouts found:

- **`frontend/src/screens/SplashScreen.tsx`**
  - Line 151: `paddingHorizontal: 24`
  - Line 181: `paddingHorizontal: 32`
- **`frontend/src/screens/auth/RegisterScreen.tsx`**
  - Line 310: `paddingHorizontal: 24` inside `contentContainer`.
- **`frontend/src/screens/main/AccountVisibilityScreen.tsx`** (and Partner/Admin variants)
  - Line 117: `paddingHorizontal: 24`
  - Line 139: `paddingHorizontal: 20`
- **`frontend/src/screens/main/BlockedPlayersScreen.tsx`** (and Partner/Admin variants)
  - Line 84: `paddingHorizontal: 24`
  - Line 106: `paddingHorizontal: 20`
- **`frontend/src/screens/main/ComingSoonScreen.tsx`**
  - Line 64: `paddingHorizontal: 24`
  - Line 89: `paddingHorizontal: 40`
- **`frontend/src/screens/main/CreateWalletScreen.tsx`** (and Partner/Admin variants)
  - Line 347: `paddingHorizontal: 24`
- **`frontend/src/screens/main/JoinedMatchScreen.tsx`** (and Partner/Admin variants)
  - Line 174: `paddingHorizontal: 20`
  - Line 194: `paddingHorizontal: 20`
  - Line 311: `paddingHorizontal: 20`
- **`frontend/src/screens/main/LoginActivityScreen.tsx`** (and Partner/Admin variants)
  - Line 150: `paddingHorizontal: 24`
  - Line 172: `paddingHorizontal: 20`
- **`frontend/src/screens/main/MatchesListScreen.tsx`**
  - Line 105: `paddingHorizontal: 20` inside horizontal scroll.
  - Line 125: `paddingHorizontal: 20`
  - Line 187: `paddingHorizontal: 24`
- **`frontend/src/screens/main/PersonalizationScreen.tsx`** (and Partner/Admin variants)
  - Line 106: `paddingHorizontal: 24`
  - Line 128: `paddingHorizontal: 20`
- **`frontend/src/screens/main/PrivacyPolicyScreen.tsx`** (and Partner/Admin variants)
  - Line 43: `paddingHorizontal: 24`
  - Line 84: `paddingHorizontal: 24`
- **`frontend/src/screens/main/SecurityPrivacyScreen.tsx`** (and Partner/Admin variants)
  - Line 65: `paddingHorizontal: 20`
  - Line 207: `paddingHorizontal: 24`
  - Line 367: `paddingHorizontal: 20`
- **`frontend/src/screens/main/SettingsScreen.tsx`** (and Partner/Admin variants)
  - Line 311: `paddingHorizontal: 24`
  - Line 334: `paddingHorizontal: 24`
  - Line 399: `paddingHorizontal: 28`
  - Line 471: `paddingHorizontal: 20`
- **`frontend/src/screens/main/TermsOfServiceScreen.tsx`** (and Partner/Admin variants)
  - Line 43: `paddingHorizontal: 24`
  - Line 84: `paddingHorizontal: 24`
- **`frontend/src/screens/main/TwoFactorAuthScreen.tsx`** (and Partner/Admin variants)
  - Line 130: `paddingHorizontal: 24`
  - Line 152: `paddingHorizontal: 20`
- **`frontend/src/screens/main/UploadScreenshotScreen.tsx`** (and Partner/Admin variants)
  - Line 359: `paddingHorizontal: 24`
  - Line 491: `paddingHorizontal: 20`
