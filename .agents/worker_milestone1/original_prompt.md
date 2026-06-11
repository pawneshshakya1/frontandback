## 2026-06-06T16:52:18Z
Task to implement the theme and interactive UI alignments for all files in Milestone 1 (Auth & Shared Screens):
1. `frontend/src/screens/SplashScreen.tsx` (ensure horizontal padding is exactly 16px)
2. `frontend/src/screens/auth/RegisterScreen.tsx` (replace all native `Alert.alert` calls with `PopupModal` / `usePopup` hook, and check for any horizontal padding styling to make sure it's exactly 16px)
3. `frontend/src/screens/auth/ForgotPasswordScreen.tsx` (verify/ensure that layout margins/gaps are exactly 16px)
4. `frontend/src/screens/auth/LoginScreen.tsx` (verify/ensure that layout margins/gaps are exactly 16px)
5. `frontend/src/screens/shared/HelpConversationScreen.tsx` (replace native action sheet style alert with custom popup modal, implement fully blurred backdrop with BlurView, and ensure left/right gaps are 16px)

Please make these modifications in the code. Make sure the code continues to build successfully (you can run build/lint checks or launch the app to test). Do not modify any colors in `frontend/src/theme/colors.ts`.
