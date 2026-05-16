import { create } from 'zustand';
import api from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'SUPERADMIN' | 'ADMIN';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    loadUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,

    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isLoading: false });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isLoading: false });
        window.location.href = '/login';
    },

    loadUser: () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            if (token && userStr) {
                try {
                    const user = JSON.parse(userStr);
                    set({ user, token, isLoading: false });
                } catch {
                    set({ isLoading: false });
                }
            } else {
                set({ isLoading: false });
            }
        }
    },
}));
