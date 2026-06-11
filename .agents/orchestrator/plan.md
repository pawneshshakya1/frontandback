# Plan

## Step 1: Codebase Audit & Scanning
- Search for `Alert.alert` usages in `frontend/src/screens` and related component files.
- Search for custom Modals and check if their backdrop uses solid colors instead of `BlurView`.
- Search for layout containers in screens (e.g. `paddingHorizontal`, `paddingRight`, `paddingLeft`) that do not use 16px (or SPACING.SCREEN_PADDING).

## Step 2: Milestone Decomposition
- Decompose the alignment task into distinct milestones (e.g. Auth/Shared Screens, Main/User Screens, Partner Screens, Admin Screens).
- Document this decomposition in `PROJECT.md` at the project root.

## Step 3: Iterate (Explorer -> Worker -> Reviewer -> gate)
- For each milestone:
  - Spawn Explorer to devise strategies.
  - Spawn Worker to implement.
  - Spawn Reviewer to review and verify.
  - Gate check.

## Step 4: Final verification and handoff
- Run comprehensive check to verify no `Alert.alert` remains and that padding/modals are correct.
- Provide a summary and handoff.md.
