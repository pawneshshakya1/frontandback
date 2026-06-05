import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { setAuthToken, authAPI, notificationAPI, onUnauthorized } from '../services/api';
import { sseService } from '../services/sse';

// Detect Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Load Firebase messaging (only works in dev builds, NOT Expo Go)
let messaging: any = null;
if (!isExpoGo) {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (e: any) {
    console.warn('[PUSH] Firebase messaging module not found:', e?.message);
  }
}

interface AuthContextData {
  authData: any;
  loading: boolean;
  signIn: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (data: { username: string; email: string; password: string }) => Promise<any>;
  googleSignIn: (idToken: string) => Promise<void>;
  updateAuthData: (updates: any) => Promise<void>;
  registerPushToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authData, setAuthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const lastRegisteredToken = useRef<string | null>(null);

  useEffect(() => {
    loadStorageData();
  }, []);

  // Q4: when the API layer sees a 401 on a non-auth endpoint it
  // invokes these listeners. We sign the user out so the rest of
  // the app re-renders against an unauthenticated state and the
  // root navigator can show the login screen.
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      signOut().catch(() => { /* signOut already logs */ });
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (authData?.token) {
      sseService.connect(authData.token);
      registerPushToken();
    }
    return () => {
      sseService.disconnect();
    };
  }, [authData?.token]);

  // ============ FCM TOKEN REGISTRATION ============
  // This is the core function. Call it:
  // 1. On login
  // 2. On every app foreground
  // 3. From "Enable Notifications" button in settings

  const registerPushToken = async (): Promise<boolean> => {
    if (isExpoGo || !messaging) {
      console.log('[PUSH] ⚠️ Expo Go detected — Push notifications require a dev build.');
      console.log('[PUSH] Run: npx expo prebuild && npx expo run:android');
      return false;
    }

    try {
      // Request permission (Android 13+)
      if (Platform.OS === 'android') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('[PUSH] Permission denied by user');
          return false;
        }
      }

      // Get FCM token
      const fcmToken = await messaging().getToken();

      if (fcmToken) {
        // Skip if same token was already registered
        if (lastRegisteredToken.current === fcmToken) {
          console.log('[PUSH] Token already registered, skipping');
          return true;
        }

        console.log('[PUSH] FCM Token:', fcmToken.substring(0, 40) + '...');

        try {
          await notificationAPI.registerToken({ token: fcmToken });
          lastRegisteredToken.current = fcmToken;
          console.log('[PUSH] ✅ Token registered successfully');
          return true;
        } catch (err: any) {
          console.error('[PUSH] ❌ Failed:', err.response?.data?.message || err.message);
          return false;
        }
      } else {
        console.log('[PUSH] No FCM token returned');
        return false;
      }
    } catch (error: any) {
      console.error('[PUSH] ❌ Error:', error.message || error);
      return false;
    }
  };

  // ============ RE-REGISTER TOKEN ON EVERY APP FOREGROUND ============
  // This ensures existing users who update to dev build will register their token

  useEffect(() => {
    if (!authData?.token || isExpoGo || !messaging) return;

    // When app comes to foreground, re-register token
    const subscription = messaging().onTokenRefresh(async (newToken: string) => {
      console.log('[PUSH] Token refreshed, re-registering...');
      try {
        await notificationAPI.registerToken({ token: newToken });
        lastRegisteredToken.current = newToken;
        console.log('[PUSH] ✅ Refreshed token registered');
      } catch (err) {
        console.error('[PUSH] ❌ Refresh registration failed');
      }
    });

    // Foreground message handler
    const foregroundMessage = messaging().onMessage(async (remoteMessage: any) => {
      console.log('[PUSH] Foreground:', remoteMessage.notification?.title);
    });

    // Notification opened (background)
    const backgroundOpen = messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('[PUSH] Opened from background:', remoteMessage.data);
    });

    // Notification opened (quit state)
    messaging().getInitialNotification().then((remoteMessage: any) => {
      if (remoteMessage) {
        console.log('[PUSH] Opened from quit:', remoteMessage.data);
      }
    });

    return () => {
      subscription();
      foregroundMessage();
      backgroundOpen();
    };
  }, [authData?.token, isExpoGo]);

  // ============ AUTH METHODS ============

  async function loadStorageData() {
    try {
      const authDataSerialized = await SecureStore.getItemAsync('authData');
      if (authDataSerialized) {
        const _authData = JSON.parse(authDataSerialized);
        setAuthData(_authData);
        if (_authData.token) setAuthToken(_authData.token);
      }
    } catch (error) {
      console.error('Load storage error:', error);
    } finally {
      setLoading(false);
    }
  }

  const signIn = async (data: any) => {
    setAuthToken(data.token);
    setAuthData(data);
    await SecureStore.setItemAsync('authData', JSON.stringify(data));
  };

  const signUp = async (data: { username: string; email: string; password: string }) => {
    const response = await authAPI.register(data);
    if (response.data?.success && response.data?.data) {
      const payload = response.data.data;
      const fullData = {
        _id: payload._id,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        is_verified: payload.is_verified,
        token: payload.token,
      };
      await SecureStore.setItemAsync('authData', JSON.stringify(fullData));
      setAuthToken(fullData.token);
      setAuthData(fullData);
      return fullData;
    }
    throw new Error(response.data?.message || 'Registration failed');
  };

  const googleSignIn = async (idToken: string) => {
    const response = await authAPI.googleLogin({ token: idToken });
    if (response.data.success) {
      await signIn(response.data.data);
    }
  };

  const signOut = async () => {
    try {
      sseService.disconnect();
      if (authData?.token) {
        // Remove FCM token from backend
        if (messaging) {
          try {
            const fcmToken = await messaging().getToken();
            if (fcmToken) {
              await notificationAPI.removeToken({ token: fcmToken }).catch(() => {});
            }
          } catch (e) { /* ignore */ }
        }
        await authAPI.logout().catch(() => {});
      }
    } catch (e) {
      console.log('Logout error:', e);
    } finally {
      lastRegisteredToken.current = null;
      setAuthToken(null);
      setAuthData(null);
      await SecureStore.deleteItemAsync('authData');
    }
  };

  const updateAuthData = async (updates: any) => {
    const updatedData = { ...authData, ...updates };
    setAuthData(updatedData);
    await SecureStore.setItemAsync('authData', JSON.stringify(updatedData));
  };

  return (
    <AuthContext.Provider value={{ authData, loading, signIn, signOut, signUp, googleSignIn, updateAuthData, registerPushToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
