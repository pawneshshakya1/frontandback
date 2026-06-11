# BRIEFING — Milestone 3: Partner Screens Alignment

You are a worker agent for Milestone 3.
Your working directory is d:\batuk\frontandback\.agents\worker_milestone3.
Your goal is to align the visual and interactive theme (horizontal padding, modal layouts, custom popups, and blur views) across all screens in the Partner interface of the Free Fire tournament platform (located in `frontend/src/screens/partner/`), strictly preserving the existing colors.

## Tasks
1. **Universal Horizontal Padding**: Ensure that all layouts/containers in `frontend/src/screens/partner/` use exactly 16px (or SPACING.SCREEN_PADDING) horizontal padding.
2. **Modal Backdrop Blur & Gaps**: Ensure custom modals or screen overlays use a fully blurred background (`BlurView` with intensity=80, tint="dark") and maintain a left/right margin/gap of exactly 16px.
   - Inspect files like `ChangePasswordScreenPartner.tsx`, `CreateEventScreenPartner.tsx`, `HomeScreenPartner.tsx`, `NotificationsScreenPartner.tsx`, `PartnerCreateEventScreen.tsx`, `PersonalInformationScreenPartner.tsx`, `PromoBannerScreenPartner.tsx`, `WalletControlScreenPartner.tsx`, and others.
3. **Replace Native Alerts**: Replace all native `Alert.alert` calls with `PopupModal` / `usePopup` hook (similar to how it was done in main screens).
   - Inspect files like `AddCashScreenPartner.tsx`, `CreateMatchScreenPartner.tsx`, `CreateWalletScreenPartner.tsx`, `ElitePassScreenPartner.tsx`, `LoginActivityScreenPartner.tsx`, `MatchControlScreenPartner.tsx`, `MatchDetailScreenPartner.tsx`, `MediatorApprovalScreenPartner.tsx`, `MediatorDashboardScreenPartner.tsx`, `PartnerDashboardScreen.tsx`, `PartnerEventDetailScreen.tsx`, `PartnerMyQRScreen.tsx`, `PartnerRoomUpdateScreen.tsx`, `ProfileScreenPartner.tsx`, `PromoBannerScreenPartner.tsx`, `SecurityPrivacyScreenPartner.tsx`, `SendGiftScreenPartner.tsx`, `SettingsScreenPartner.tsx`, `TwoFactorAuthScreenPartner.tsx`, `UploadScreenshotScreenPartner.tsx`, `UsersListScreenPartner.tsx`, `WalletControlScreenPartner.tsx`, `WalletScreenPartner.tsx`, `WithdrawScreenPartner.tsx`, etc.
4. **Build & Test**: Ensure the code compiles (`npx tsc --noEmit`) and tests pass (`npx jest`) in the `frontend` folder.
5. **No Colors Modification**: Do not modify any colors in `frontend/src/theme/colors.ts`.
