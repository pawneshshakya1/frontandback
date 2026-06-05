import { create } from 'zustand';
import api from '../services/api';

interface Match {
  _id: string;
  title: string;
  banner_url: string;
  game_type: string;
  mode: string;
  max_players: number;
  map: string;
  entry_fee: number;
  prize_pool: number;
  match_date: string;
  match_time: string;
  status: string;
  isPublished: boolean;
  participants: any[];
  room_id?: string;
  room_password?: string;
  createdAt: string;
}

interface MatchState {
  matches: Match[];
  joinedMatches: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  error: string | null;

  fetchMatches: (filters?: object) => Promise<void>;
  fetchJoinedMatches: () => Promise<void>;
  fetchMatchDetail: (matchId: string) => Promise<void>;
  joinMatch: (matchId: string, paymentMethod: string) => Promise<void>;
  updateMatchFromSSE: (matchId: string, data: any) => void;
  clearError: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  matches: [],
  joinedMatches: [],
  currentMatch: null,
  isLoading: false,
  error: null,

  fetchMatches: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/matches', { params: filters });
      set({ matches: response.data.data || [] });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch matches' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchJoinedMatches: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/matches/my-matches');
      set({ joinedMatches: response.data.data || [] });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch joined matches' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchMatchDetail: async (matchId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get(`/matches/${matchId}`);
      set({ currentMatch: response.data.data });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch match detail' });
    } finally {
      set({ isLoading: false });
    }
  },

  joinMatch: async (matchId: string, paymentMethod: string) => {
    try {
      set({ isLoading: true, error: null });

      if (paymentMethod === 'WALLET') {
        await api.post('/matches/join', {
          roomId: matchId,
          paymentMethod: 'WALLET',
        });
      } else {
        const response = await api.post('/matches/initiate-payment', {
          matchId,
          paymentMethod: 'CASHFREE',
        });
        return response.data.data;
      }

      await get().fetchMatchDetail(matchId);
      await get().fetchJoinedMatches();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to join match' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateMatchFromSSE: (matchId: string, data: any) => {
    set((state) => {
      const updatedMatches = state.matches.map((m) =>
        m._id === matchId ? { ...m, ...data } : m
      );
      const updatedJoined = state.joinedMatches.map((m) =>
        m._id === matchId ? { ...m, ...data } : m
      );
      const updatedCurrent =
        state.currentMatch?._id === matchId
          ? { ...state.currentMatch, ...data }
          : state.currentMatch;

      return {
        matches: updatedMatches,
        joinedMatches: updatedJoined,
        currentMatch: updatedCurrent,
      };
    });
  },

  clearError: () => set({ error: null }),
}));
