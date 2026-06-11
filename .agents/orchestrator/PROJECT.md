# Project: Align Theme & Interactive UI Across All Screens

## Architecture & Conventions
- All React Native screens in `frontend/src/screens/` must use a uniform horizontal padding of exactly 16px (represented by `SPACING.SCREEN_PADDING` or raw `16`).
- All modals/overlays must use `BlurView` for backdrops (fully blurred overlay background) and maintain a left/right margin/gap of exactly 16px.
- All native `Alert.alert` calls must be replaced with the custom `PopupModal` component (ideally using the `usePopup` hook).
- Existing color palette in `frontend/src/theme/colors.ts` must remain completely untouched.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Auth & Shared Screens | SplashScreen, RegisterScreen, LoginScreen, HelpConversationScreen, etc. | None | DONE |
| 2 | User (Main) Screens | All screens under `frontend/src/screens/main/` | M1 | DONE |
| 3 | Partner Screens | All screens under `frontend/src/screens/partner/` | M2 | IN_PROGRESS |
| 4 | Admin Screens | All screens under `frontend/src/screens/admin/` | M3 | PLANNED |

## Interface Contracts
- **PopupModal Interface**: Matches props from `frontend/src/components/PopupModal.tsx`.
- **BlurView**: Uses `intensity={80}` and `tint="dark"` for consistent modal overlays.
- **SPACING**: Import `SPACING` from `../../theme/colors` or similar relative paths.
