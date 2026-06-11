import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/config';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// FormData uploads (banner images etc.) must NOT carry a fixed
// Content-Type header — the browser/RN runtime needs to set the
// `multipart/form-data; boundary=…` itself. Without this interceptor
// multer on the backend gets an empty `req.file` and rejects with
// "image is required" even though the client thought it sent a file.
api.interceptors.request.use((config) => {
  if (config.data && typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
      config.headers.delete("content-type");
    }
  }
  return config;
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Q4: 401 interceptor. The backend issues 24h JWTs and does not
// expose a /auth/refresh endpoint, so on token expiry the safest
// behaviour is to invalidate the local session and emit a global
// `auth:unauthorized` event that the AuthProvider listens for and
// turns into a signOut(). Each in-flight request is also tagged so
// we never recurse.
type UnauthorizedListener = (reason: 'expired' | 'invalid') => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export const onUnauthorized = (listener: UnauthorizedListener) => {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
};

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error?.response?.status;
    const config = error?.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const requestUrl = config?.url || '';
    const isAuthEndpoint = /\/auth\/(login|register|google|facebook|apple|send-email-otp|verify-email-otp|forgot-password|reset-password|logout)/.test(requestUrl);

    if (status === 401 && !config?._retried && !isAuthEndpoint) {
      if (config) config._retried = true;
      console.warn('[API] 401 received on', requestUrl, '— triggering global signOut');
      setAuthToken(null);
      unauthorizedListeners.forEach((fn) => {
        try { fn('expired'); } catch (e) { /* ignore listener errors */ }
      });
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleLogin: (data: { token: string }) =>
    api.post('/auth/google', data),
  facebookLogin: (data: { token: string }) =>
    api.post('/auth/facebook', data),
  appleLogin: (data: { token: string }) =>
    api.post('/auth/apple', data),
  sendEmailOtp: (data?: { email?: string }) =>
    api.post('/auth/send-email-otp', data),
  verifyEmailOtp: (data: { otp: string; email?: string }) =>
    api.post('/auth/verify-email-otp', data),
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getPublicProfile: (id: string) => api.get(`/users/profile/${id}`),
  getStats: () => api.get('/users/stats'),
};

export const friendAPI = {
  sendRequest: (data: { email: string }) => api.post('/friends/request', data),
  acceptRequest: (id: string) => api.put(`/friends/request/${id}/accept`),
  rejectRequest: (id: string) => api.delete(`/friends/request/${id}/reject`),
  removeFriend: (id: string) => api.delete(`/friends/${id}`),
  blockUser: (id: string) => api.post(`/friends/block/${id}`),
  unblockUser: (id: string) => api.post(`/friends/unblock/${id}`),
  getFriends: () => api.get('/friends'),
  getPendingRequests: () => api.get('/friends/pending'),
  getSentRequests: () => api.get('/friends/sent'),
  getBlockedUsers: () => api.get('/friends/blocked'),
  searchUsers: (q: string) => api.get('/friends/search', { params: { q } }),
};

export const chatAPI = {
  listConversations: () => api.get('/chat/conversations'),
  listMessages: (conversationId: string) => api.get(`/chat/conversations/${conversationId}/messages`),
  openOrCreate: (friend_id: string) => api.post('/chat/conversations', { friend_id }),
  sendMessage: (receiver_id: string, content: string) => api.post('/chat/messages', { receiver_id, content }),
  getEligibility: () => api.get('/chat/eligibility'),
  getUnreadCount: () => api.get('/chat/unread'),
};

export const matchAPI = {
  getMatches: (params?: any) => api.get('/matches', { params }),
  getMatch: (id: string) => api.get(`/matches/${id}`),
  createMatch: (data: any) => api.post('/matches', data),
  joinMatch: (data: any) => api.post('/matches/join', data),
  joinMatchById: (id: string, data: any = {}) => api.post(`/matches/${id}/join`, data),
  joinByCode: (invite_code: string) => api.post('/matches/join-by-code', { invite_code }),
  getEventByShareToken: (token: string) => api.get(`/matches/share/${token}`),
  initiatePayment: (data: any) => api.post('/matches/initiate-payment', data),
  confirmCashfreeJoin: (data: any) => api.post('/matches/confirm-cashfree-join', data),
  getMyMatches: () => api.get('/matches/my-matches'),
  getCreatedMatches: () => api.get('/matches/created'),
  getDrafts: () => api.get('/matches/drafts'),
  getInvites: () => api.get('/matches/invites'),
  updateMatch: (id: string, data: any) => api.put(`/matches/${id}`, data),
  deleteMatch: (id: string) => api.delete(`/matches/${id}`),
  submitResult: (id: string, data: any) => api.post(`/matches/${id}/result`, data),
  approveResult: (id: string) => api.post(`/matches/${id}/approve`),
  // New event lifecycle
  cancelEvent: (id: string, data?: { reason?: string }) => api.post(`/matches/${id}/cancel`, data || {}),
  shareEvent: (id: string) => api.post(`/matches/${id}/share`),
  publishDraft: (id: string) => api.post(`/matches/${id}/publish-draft`),
  setRoomCredentials: (id: string, data: { room_id: string; room_password?: string }) =>
    api.post(`/matches/${id}/room-credentials`, data),
  submitParticipantResult: (id: string, data: any) => api.post(`/matches/${id}/submit`, data),
  aiAnalyze: (id: string) => api.post(`/matches/${id}/ai-analyze`),
  rejectResult: (id: string, data: { reason?: string }) => api.post(`/matches/${id}/reject`, data),
  selectWinner: (id: string, winner_user_id: string) =>
    api.post(`/matches/${id}/select-winner`, { winner_user_id }),
  getDailyLimit: () => api.get('/matches/daily-limit'),
  checkMediatorStatus: () => api.get('/matches/mediator/check'),
  getMediatorMatches: () => api.get('/matches/mediator/all'),
};

export const walletAPI = {
  getMyWallet: () => api.get('/wallet/my'),
  getBalance: () => api.get('/wallet/my'),
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string | string[];
    category?: string;
    status?: string;
    from?: string;
    to?: string;
    skip?: number;
  }) => api.get('/wallet/transactions', { params }),
  initializeWallet: (data: any) => api.post('/wallet/initialize', data),
  deposit: (data: any) => api.post('/wallet/deposit', data),
  withdraw: (data: any) => api.post('/wallet/withdraw', data),
  requestPinReset: () => api.post('/wallet/request-pin-reset'),
  verifyPinOtp: (data: any) => api.post('/wallet/verify-pin-otp', data),
  resetPin: (data: any) => api.post('/wallet/reset-pin', data),
  initiateAddCash: (data: any) => api.post('/wallet/add-cash/initiate', data),
  verifyAddCash: (data: any) => api.post('/wallet/add-cash/verify', data),
  recordTransaction: (data: any) => api.post('/wallet/transactions/record', data),
  sendGift: (data: any) => api.post('/wallet/send-gift', data),
  redeem: (data: any) => api.post('/wallet/redeem', data),
  verifyReceiver: (data: any) => api.post('/wallet/verify-receiver', data),
  getLastDepositSource: () => api.get('/wallet/last-deposit-source'),
  // QR-based transfer APIs
  getMyQRCode: () => api.get('/wallet/my-qr'),
  validateQRCode: (data: { qrData: string }) => api.post('/wallet/validate-qr', data),
  // Settings
  getSettings: () => api.get('/wallet/settings'),
  updateSettings: (data: Record<string, any>) => api.put('/wallet/settings', data),
};

export const paymentAPI = {
  initiateCashfree: (data: any) => api.post('/payments/initiate-cashfree', data),
  verifyPayment: (data: any) => api.post('/payments/verify', data),
  getHistory: (params?: any) => api.get('/payments/history', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  getAdminPayments: (params?: any) => api.get('/payments/admin/payments', { params }),
  getAdminStats: () => api.get('/payments/admin/payments/stats'),
};

export const notificationAPI = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  registerToken: (data: { token: string }) => api.post('/notifications/register-token', data),
  removeToken: (data: { token: string }) => api.post('/notifications/remove-token', data),
  // Preferences
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: any) => api.put('/notifications/preferences', data),
  // Admin Broadcast (Batch Scheduler)
  sendBroadcast: (data: {
    title: string;
    body: string;
    target?: 'all' | 'partners' | 'premium';
    batchSize?: number;
    batchDelay?: number;
    sendMode?: 'instant' | 'scheduled';
    scheduledAt?: string | null;
    image?: string | null;
    data?: any;
  }) => api.post('/notifications/send-broadcast', data),
  getBroadcastStatus: (jobId: string) =>
    api.get(`/notifications/broadcast/status/${jobId}`),
  getAllBroadcastJobs: () => api.get('/notifications/broadcast/jobs'),
  cancelBroadcast: (jobId: string) =>
    api.post(`/notifications/broadcast/cancel/${jobId}`),
  // Diagnostic
  getTokenStatus: () => api.get('/notifications/token-status'),
};

export const analyticsAPI = {
  getMyAnalytics: () => api.get('/analytics/my-analytics'),
  getAllUsersSpending: (params?: any) => api.get('/analytics/admin/users-spending', { params }),
  getUserFinancialProfile: (userId: string) => api.get(`/analytics/admin/user/${userId}`),
  getSystemRevenue: () => api.get('/analytics/admin/revenue'),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  blockUser: (id: string, data: any) => api.post(`/admin/users/${id}/block`, data),
  getUserFinancialProfile: (userId: string) => api.get(`/admin/users/${userId}/financial`),
  getMediatorDashboard: () => api.get('/admin/mediator-dashboard'),
  getSecurityAudits: (params?: any) => api.get('/admin/security-audits', { params }),
  getMatches: (params?: any) => api.get('/admin/matches', { params }),
  getMatch: (id: string) => api.get(`/admin/matches/${id}`),
  updateMatch: (id: string, data: any) => api.put(`/admin/matches/${id}`, data),
  deleteMatch: (id: string, params?: any) => api.delete(`/admin/matches/${id}`, { params }),
  updateMatchStatus: (id: string, data: any) => api.put(`/admin/matches/${id}/status`, data),
  togglePublish: (id: string) => api.post(`/admin/matches/${id}/publish`),
  addRoomDetails: (id: string, data: any) => api.post(`/admin/matches/${id}/add-room-details`, data),
  updateRoomDetails: (id: string, data: any) => api.put(`/admin/matches/${id}/room-details`, data),
  bulkAction: (data: any) => api.post('/admin/matches/bulk-action', data),
  getMatchAnalytics: (id: string) => api.get(`/admin/matches/${id}/analytics`),
  getTransactions: (params?: any) => api.get('/admin/transactions', { params }),
  getWallets: (params?: any) => api.get('/admin/wallets', { params }),
  adjustWalletBalance: (id: string, data: any) => api.post(`/admin/wallets/${id}/adjust`, data),
  getWeeklyPerformance: () => api.get('/admin/weekly-performance'),
  getBanners: () => api.get('/admin/banners'),
  createBanner: (data: any) => api.post('/admin/banners', data),
  updateBanner: (id: string, data: any) => api.put(`/admin/banners/${id}`, data),
  deleteBanner: (id: string) => api.delete(`/admin/banners/${id}`),
  uploadBanner: (data: any) => api.post('/admin/banners/upload', data),
  reorderBanner: (id: string, direction: "up" | "down") =>
    api.post('/admin/banners/reorder', { id, direction }),
  createStandardEvent: (data: any) => api.post('/admin/create-standard-event', data),
  createPremiumEvent: (data: any) => api.post('/admin/create-premium-event', data),
  createSponsoredEvent: (data: any) => api.post('/admin/create-sponsored-event', data),
  getMediatorApplications: (params?: any) => api.get('/admin/mediator-applications', { params }),
  approveMediator: (id: string) => api.post(`/admin/mediator-applications/${id}/approve`),
  rejectMediator: (id: string, data: any) => api.post(`/admin/mediator-applications/${id}/reject`, data),
  getAppVersion: (platform: string) => api.get('/admin/app/version', { params: { platform } }),
  upsertAppVersion: (data: any) => api.post('/admin/app/version', data),
};

export const bannerAPI = {
  getBanners: () => api.get('/banners'),
};

export const achievementsAPI = {
  getAll: (params?: any) => api.get('/achievements', { params }),
  getMyAchievements: () => api.get('/achievements/my'),
  getById: (id: string) => api.get(`/achievements/${id}`),
  create: (data: any) => api.post('/achievements', data),
  update: (id: string, data: any) => api.put(`/achievements/${id}`, data),
  delete: (id: string) => api.delete(`/achievements/${id}`),
};

export const elitePassAPI = {
  getActivePasses: () => api.get('/elite-pass/active'),
  getPartnerPasses: () => api.get('/elite-pass/partner-passes'),
  getMyPass: () => api.get('/elite-pass/my-pass'),
  purchase: (data: any) => api.post('/elite-pass/purchase', data),
  verify: (data: any) => api.post('/elite-pass/verify', data),
  cancel: () => api.post('/elite-pass/cancel'),
  // Admin methods
  getAllPassesAdmin: () => api.get('/elite-pass/admin/all'),
  createPass: (data: any) => api.post('/elite-pass/admin', data),
  updatePass: (id: string, data: any) => api.put(`/elite-pass/admin/${id}`, data),
  deletePass: (id: string) => api.delete(`/elite-pass/admin/${id}`),
  seedDefaultPasses: () => api.post('/elite-pass/admin/seed'),
};

export const partnerAPI = {
  getDashboard: () => api.get('/partner/dashboard'),
  getProfile: () => api.get('/partner/profile'),
  updateProfile: (data: any) => api.put('/partner/profile', data),
  // Tier Management
  getTierInfo: () => api.get('/partner/tier'),
  upgradeTier: (data: { tier: string }) => api.post('/partner/tier/upgrade', data),
  degradeTier: () => api.post('/partner/tier/degrade'),
  purchaseTier: (data: { tier: string }) => api.post('/partner/tier/purchase', data),
  verifyTierPurchase: (data: { order_id: string; tier: string }) => api.post('/partner/tier/verify', data),
  // Tier History
  getTierHistory: () => api.get('/partner/tier/history'),
  // Commission History
  getCommissionHistory: () => api.get('/partner/commission-history'),
  // Events
  createEvent: (data: any) => api.post('/partner/events', data),
  getEvents: (params?: any) => api.get('/partner/events', { params }),
  getEvent: (id: string) => api.get(`/partner/events/${id}`),
  updateEvent: (id: string, data: any) => api.put(`/partner/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/partner/events/${id}`),
  publishEvent: (id: string) => api.post(`/partner/events/${id}/publish`),
  updateRoomDetails: (id: string, data: any) => api.post(`/partner/events/${id}/room-details`, data),
  getParticipants: (id: string) => api.get(`/partner/events/${id}/participants`),
  getSubscribers: () => api.get('/partner/subscribers'),
};

export const partnerSubscriptionAPI = {
  subscribe: (data: { partner_id: string }) => api.post('/partners/subscribe', data),
  unsubscribe: (partnerId: string) => api.delete(`/partners/unsubscribe/${partnerId}`),
  pauseSubscription: (partnerId: string) => api.post(`/partners/pause/${partnerId}`),
  resumeSubscription: (partnerId: string) => api.post(`/partners/resume/${partnerId}`),
  getMySubscriptions: () => api.get('/partners/my-subscriptions'),
  getMySubscriptionsWithDetails: (params?: { lat?: string; lng?: string }) =>
    api.get('/partners/my-subscriptions', { params }),
  updatePreferences: (partnerId: string, data: { notify_new_events?: boolean; notify_promotions?: boolean }) =>
    api.put(`/partners/preferences/${partnerId}`, data),
  getNearbyPartners: (params: { lat: string; lng: string; max_distance?: string; limit?: string }) =>
    api.get('/partners/nearby', { params }),
  getAllPartners: (params?: { lat?: string; lng?: string; tier?: string; search?: string; limit?: string }) =>
    api.get('/partners/all', { params }),
  getPublicPartnerProfile: (id: string, params?: { lat?: string; lng?: string }) =>
    api.get(`/partners/${id}`, { params }),
  subscribeByQr: (qr_token: string) => api.post('/partners/scan-qr', { qr_token }),
  // Partner-side QR
  getMyQrCode: () => api.get('/partner/qr-code'),
  regenerateQrCode: () => api.post('/partner/qr-code/regenerate'),
};

export const appVersionAPI = {
  getVersionStatus: (platform: string, appVersion: string) =>
    api.get('/app/version', { params: { platform, appVersion } }),
  getVersionConfig: (platform: string) =>
    api.get('/admin/app/version', { params: { platform } }),
  upsertVersionConfig: (data: { platform: string; latestVersion: string; minSupportedVersion: string; graceDays?: number; forceUpdate?: boolean; message?: string; storeUrl?: string }) =>
    api.post('/admin/app/version', data),
};

export const supportAPI = {
  // User/Partner
  createTicket: (data: {
    category: string;
    subject: string;
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    related_match_id?: string;
    attachments?: string[];
  }) => api.post('/support/tickets', data),
  getMyTickets: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/support/tickets/mine', { params }),
  getTicket: (id: string) => api.get(`/support/tickets/${id}`),
  replyToTicket: (id: string, data: { message: string; attachments?: string[]; is_internal_note?: boolean }) =>
    api.post(`/support/tickets/${id}/reply`, data),
  closeTicket: (id: string, data?: { rating?: number; feedback?: string }) =>
    api.post(`/support/tickets/${id}/close`, data || {}),
  reopenTicket: (id: string) => api.post(`/support/tickets/${id}/reopen`),
  // Admin
  getAllTickets: (params?: { status?: string; priority?: string; category?: string; assigned_to?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/support/admin/tickets', { params }),
  getTicketStats: () => api.get('/support/admin/tickets/stats'),
  assignTicket: (id: string, admin_id?: string) =>
    api.post(`/support/admin/tickets/${id}/assign`, admin_id ? { admin_id } : {}),
  updateTicketStatus: (id: string, data: { status?: string; priority?: string }) =>
    api.patch(`/support/admin/tickets/${id}/status`, data),
  /** Upload up to 5 support files (each <= 1 MB). Returns array of uploaded file URLs. */
  uploadFiles: (files: { uri: string; name: string; type: string }[]) => {
    const form = new FormData();
    files.forEach((f) => {
      form.append('files', {
        uri: f.uri,
        name: f.name,
        type: f.type,
      } as any);
    });
    return api.post('/support/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
