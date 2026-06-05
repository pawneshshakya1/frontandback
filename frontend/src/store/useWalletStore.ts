import { create } from 'zustand';
import api from '../services/api';

interface Transaction {
  _id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  status: string;
  description: string;
  createdAt: string;
}

interface WalletState {
  balance: number;
  lockedBalance: number;
  withdrawableBalance: number;
  walletAccountNo: string | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  fetchWallet: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addCash: (amount: number, method: string) => Promise<any>;
  withdraw: (amount: number, method: string, details: object) => Promise<void>;
  refreshBalance: () => Promise<void>;
  clearError: () => void;

  redeem: (amount: number) => Promise<any>;
  requestPinReset: () => Promise<void>;
  verifyPinOtp: (otp: string) => Promise<any>;
  resetPin: (otp: string, newPin: string) => Promise<void>;
  sendGift: (receiverAccountNo: string, amount: number, pin: string) => Promise<any>;
  verifyReceiver: (accountNo: string) => Promise<any>;
  fetchLastDepositSource: () => Promise<any>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  lockedBalance: 0,
  withdrawableBalance: 0,
  walletAccountNo: null,
  transactions: [],
  isLoading: false,
  error: null,

  fetchWallet: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/wallet/my');
      const data = response.data.data;
      set({
        balance: data?.available_balance || 0,
        lockedBalance: data?.locked_balance || 0,
        withdrawableBalance: data?.withdrawable_balance || 0,
        walletAccountNo: data?.wallet_account_no || null,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch wallet' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/wallet/transactions');
      set({ transactions: response.data.data || [] });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch transactions' });
    } finally {
      set({ isLoading: false });
    }
  },

  addCash: async (amount: number, method: string) => {
    try {
      set({ isLoading: true, error: null });

      if (method === 'CASHFREE') {
        const response = await api.post('/payments/initiate-cashfree', {
          amount,
          type: 'DEPOSIT',
        });
        const { payment_session_url } = response.data.data;
        return payment_session_url;
      } else {
        const response = await api.post('/wallet/deposit', { amount });
        const data = response.data.data;
        set({
          balance: data?.available_balance || 0,
          lockedBalance: data?.locked_balance || 0,
          withdrawableBalance: data?.withdrawable_balance || 0,
          walletAccountNo: data?.wallet_account_no || null,
        });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to add cash' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  withdraw: async (amount: number, method: string, details: object) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/wallet/withdraw', { amount, method, details });
      const data = response.data.data;
      set({
        balance: data?.available_balance || 0,
        lockedBalance: data?.locked_balance || 0,
        withdrawableBalance: data?.withdrawable_balance || 0,
        walletAccountNo: data?.wallet_account_no || null,
      });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to withdraw' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshBalance: async () => {
    await get().fetchWallet();
  },

  redeem: async (amount: number) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/wallet/redeem', { amount });
      const data = response.data.data;
      set({
        balance: data?.available_balance || 0,
        lockedBalance: data?.locked_balance || 0,
        withdrawableBalance: data?.withdrawable_balance || 0,
        walletAccountNo: data?.wallet_account_no || null,
      });
      return response.data;
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to redeem amount';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  requestPinReset: async () => {
    try {
      set({ isLoading: true, error: null });
      await api.post('/wallet/request-pin-reset');
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to request PIN reset';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  verifyPinOtp: async (otp: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/wallet/verify-pin-otp', { otp });
      return response.data;
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Invalid OTP';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  resetPin: async (otp: string, newPin: string) => {
    try {
      set({ isLoading: true, error: null });
      await api.post('/wallet/reset-pin', { otp, newPin });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to reset PIN';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  sendGift: async (receiverAccountNo: string, amount: number, pin: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/wallet/send-gift', { receiverAccountNo, amount, pin });
      const data = response.data.data;
      set({
        balance: data?.available_balance || 0,
        lockedBalance: data?.locked_balance || 0,
        withdrawableBalance: data?.withdrawable_balance || 0,
        walletAccountNo: data?.wallet_account_no || null,
      });
      return response.data;
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to send gift';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  verifyReceiver: async (accountNo: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/wallet/verify-receiver', { accountNo });
      return response.data;
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to verify receiver';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchLastDepositSource: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/wallet/last-deposit-source');
      return response.data;
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Failed to fetch last deposit source';
      set({ error: errMsg });
      throw new Error(errMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
