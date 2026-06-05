# Project Context

## Project
- `frontandback` — Express/Mongoose backend + React Native frontend
- Partner tier system with Cashfree payment sandbox

## Styling Preferences
- **Universal horizontal padding**: 16px — EVERY component must use this exact value. No more, no less, anywhere.
- **Modal left/right gap**: Same as home screen padding (16px). All modals must match this.
- **Modal background**: Fully blurred (`backdrop-filter: blur`) — only the popup content should be visible, no underlying components.
- **No alerts**: Use custom popup/overlay everywhere instead of `alert()`.
- "commission" → "Platform Fee" everywhere (already done)

## Partner Account for Testing
- Email: testing12@gmail.com
- Password: 12345678
- Current tier: Sponsored Partner

## User Account for Testing
- Email: pawneshkumar162@gmail.com
- Password: 12345678

## Admin Account for Testing
- Email: pawneshshakya1@gmail.com
- Password: 12345678

## Key Files
- `backend/src/controllers/partner.controller.js` — Tier purchase/verify/upgrade/degrade logic
- `backend/src/services/partner.service.js` — TierHistory.create() in upgradePartnerTier, degradePartnerTier
- `backend/src/models/tier-history.model.js` — Schema: user_id, partner_tier, action, amount, label, created_at
- `frontend/src/components/partner/PartnerHistory.tsx` — History list UI
- `frontend/src/components/partner/PartnerUpgrade.tsx` — Upgrade UI + snake animation
- `frontend/src/components/partner/PartnerOverview.tsx` — Overview tab
- `frontend/src/screens/partner/PartnerTierScreen.tsx` — Main screen (877 lines)

## Server
- Running via nodemon (PID variable)
- Watches for file changes automatically
- Backend port: 5000

## Completed Work
- Modal padding fixed
- "commission" → "Platform Fee" rename (frontend + backend)
- PartnerTierScreen refactored into PartnerOverview, PartnerUpgrade, PartnerHistory
- Snake SVG animation moved into PartnerUpgrade
- TierHistory model + API endpoint created
- Server restart fixed stale-code issue
- `tierPricing` → `tierConfig` typo fixed in purchaseTier controller
- All Alert.alert calls replaced with PopupModal in EventsScreen (user/partner/admin)
- Filter modal background: blurred (BlurView) instead of solid rgba in all EventsScreen variants
- Padding fix: all horizontal padding in EventsScreen variants changed from 24/20 to 16px
- Events tab in bottom nav now shows EventsScreen instead of MyEventsScreen for all roles
