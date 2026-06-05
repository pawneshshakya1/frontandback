import { create } from 'zustand';

export type UserRole = 'admin' | 'user' | 'partner' | 'mediator' | null;

interface AuthState {
    role: UserRole;
    isAuthenticated: boolean;
    token: string | null;
    setAuth: (role: UserRole, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    role: null,
    isAuthenticated: false,
    token: null,

    setAuth: (role, token) => set({ role, isAuthenticated: true, token }),
    logout: () => set({ role: null, isAuthenticated: false, token: null }),
}));
