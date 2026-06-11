## 2026-06-06T16:45:46Z

Align the visual and interactive theme (horizontal padding, modal layouts, custom popups, and blur views) across all screens in the User, Partner, and Admin interfaces of the Free Fire tournament platform, strictly preserving the existing colors.

Working directory: d:/batuk/frontandback
Integrity mode: development

## Requirements

### R1. Theme & Spacing Alignment
- Ensure all screens in the React Native frontend under `frontend/src/screens` for User, Partner, and Admin roles use a uniform horizontal padding of exactly 16px.
- Use spacing tokens (`SPACING.SCREEN_PADDING` or raw 16) consistently across all layout containers. Do not modify the existing color palette (`frontend/src/theme/colors.ts`).

### R2. Modal & Popup Standardization
- Replace all native `Alert.alert` calls with the custom `PopupModal` component across all screen navigators.
- Update all modal overlays to use a fully blurred background (`BlurView` or `backdrop-filter: blur`) with a left/right gap of exactly 16px.

## Acceptance Criteria

### Padding and Layout
- [ ] Every screen file in `frontend/src/screens` has a horizontal padding of exactly 16px (either via style sheets or inline styling containing 16).
- [ ] No screen has horizontal padding of 24px, 20px, or any other value unless explicitly excluded by theme metrics.

### Modals and Popups
- [ ] Every modal overlay utilizes `BlurView` with standard backdrop filter styles, ensuring no underlying components are visible.
- [ ] All instances of native `Alert.alert` in the React Native code are replaced with `PopupModal` or custom overlay popups.

### Theme Colors Integrity
- [ ] The color palette defined in `frontend/src/theme/colors.ts` is completely untouched. No colors are changed.
