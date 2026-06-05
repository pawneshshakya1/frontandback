import EventSource from 'react-native-sse';
import { API_URL } from '../config/config';

export type SSEEvent =
  | { type: 'CONNECTED'; clientId: string; userId: string }
  | { type: 'HEARTBEAT'; ts: number }
  | { type: 'WALLET_UPDATE'; action: string; balance: { available: number; locked: number; withdrawable: number } }
  | { type: 'TRANSACTION_UPDATE'; action: string; userId: string }
  | { type: 'MATCH_UPDATE'; action: string; matchId: string; participants?: number }
  | { type: 'MATCH_PUBLISHED'; matchId: string; title: string; entry_fee: number }
  | { type: 'MATCH_DRAFTED'; matchId: string; title: string }
  | { type: 'MATCH_CANCELLED'; matchId: string; title: string; reason: string }
  | { type: 'MATCH_JOINED'; matchId: string; title: string; joined_by: string }
  | { type: 'MATCH_SHARED'; matchId: string }
  | { type: 'MATCH_INVITED'; matchId: string; title: string; from_user: string }
  | { type: 'PARTNER_SUBSCRIBED'; partner_id: string; subscriber_id: string }
  | { type: 'PARTNER_UNSUBSCRIBED'; partner_id: string; subscriber_id: string }
  | { type: 'NEW_PARTNER_EVENT'; partner_id: string; match_id: string; title: string }
  | { type: 'MATCH_AI_VERDICT_READY'; matchId: string; winner_id: string; confidence: number }
  | { type: 'MATCH_RESULT_APPROVED'; matchId: string; winner_id: string }
  | { type: 'MATCH_RESULT_REJECTED'; matchId: string; reason: string; new_deadline?: string }
  | { type: 'MATCH_RESULT_REVIEW_REQUESTED'; matchId: string }
  | { type: 'WINNER_ANNOUNCED'; matchId: string; winner_id: string; prize: number }
  | { type: 'PARTICIPANT_RESULT_SUBMITTED'; matchId: string; user_id: string }
  | { type: 'SS_UPLOADED'; matchId: string; user_id: string }
  | { type: 'PARTICIPANT_UPDATE'; matchId: string; count: number }
  | { type: 'PARTICIPANT_JOIN'; matchId: string; count: number; participant?: any; user?: any }
  | { type: 'PARTICIPANT_LEAVE'; matchId: string; count: number }
  | { type: 'STATUS_UPDATE'; matchId: string; status: string }
  | { type: 'NOTIFICATION'; data: { _id: string; title: string; body: string; type: string; data: any } }
  | { type: 'PAYMENT_UPDATE'; data: { orderId: string; status: string; amount: number } }
  | { type: 'PASS_UPDATE'; data: { passType: string; status: string; expiry: string } }
  | { type: 'FRIEND_REQUEST'; data: { requester_id: string; requester_username: string; requester_email: string } }
  | { type: 'FRIEND_REQUEST_ACCEPTED'; data: { friend_id: string } }
  | { type: 'FRIEND_EVENT'; data: { match_id: string; creator_username: string; title: string } }
  | { type: 'ACTIVE_USERS_UPDATE'; active: number }
  | { type: 'SPEND_UPDATE'; data: any };

type EventCallback = (data: SSEEvent) => void;

class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private token: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect = false;

  connect(token: string) {
    this.token = token;
    this.isManualDisconnect = false;
    this.disconnect();

    const url = `${API_URL}/sse/events?token=${encodeURIComponent(token)}`;
    console.log('[SSE] Connecting to:', url);

    try {
      this.eventSource = new EventSource(url);
    } catch (err: any) {
      console.error('[SSE] Failed to create EventSource:', err?.message || err);
      this.scheduleReconnect();
      return;
    }

    this.eventSource.addEventListener('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('[SSE] Connected successfully');
    });

    this.eventSource.addEventListener('message', (event: any) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        if (data.type !== 'HEARTBEAT') {
          console.log('[SSE] Event:', data.type);
        }
        this.dispatch(data);
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    });

    this.eventSource.addEventListener('error', (event: any) => {
      const status = event?.status;
      const message = event?.message;
      const xhrState = event?.xhrState;
      console.log('[SSE] Connection error', {
        status,
        message,
        xhrState,
        attempt: this.reconnectAttempts + 1,
      });
      this.isConnected = false;
      this.eventSource?.close();
      this.eventSource = null;
      this.scheduleReconnect();
    });
  }

  private dispatch(data: SSEEvent) {
    const typeListeners = this.listeners.get(data.type);
    if (typeListeners) {
      typeListeners.forEach((fn) => fn(data));
    }
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach((fn) => fn(data));
    }
  }

  private scheduleReconnect() {
    if (this.isManualDisconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[SSE] Max reconnect attempts reached, giving up');
      return;
    }
    if (this.reconnectTimer) return;

    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  on(eventType: string, callback: EventCallback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: EventCallback) {
    this.listeners.get(eventType)?.delete(callback);
  }

  disconnect() {
    this.isManualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const sseService = new SSEService();
