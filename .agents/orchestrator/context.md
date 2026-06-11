# Context

## Technical Overview
- Express/Mongoose backend + React Native Expo frontend.
- Universal horizontal padding constraint: 16px.
- Modal gap constraint: 16px.
- Modal background: Fully blurred background (BlurView intensity=80 or similar, tint="dark", backdrop-filter: blur).
- Custom popup: PopupModal from `frontend/src/components/PopupModal.tsx`.
- No native `Alert.alert` calls allowed.

## Spacing and Typography definitions
- SPACING.SCREEN_PADDING = 16.
- COLORS.ts has all styling tokens.

## Files to Auditing & Modifying
- All screens under `frontend/src/screens/`
- User screens (under `frontend/src/screens/main/` or similar)
- Partner screens (under `frontend/src/screens/partner/` or similar)
- Admin screens (under `frontend/src/screens/admin/` or similar)
- Shared screens (under `frontend/src/screens/shared/` or similar)
- Auth screens (under `frontend/src/screens/auth/` or similar)
