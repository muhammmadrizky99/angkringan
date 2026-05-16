'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loadUser, isLoading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 animate-float">
                    <span className="text-white font-bold text-xl">A</span>
                </div>
                <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Toaster
                position="top-right"
                toastOptions={{
                    className: 'toast-custom',
                    success: {
                        iconTheme: { primary: '#22c55e', secondary: '#fff' },
                    },
                    error: {
                        iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    },
                }}
            />
            <Sidebar />
            <main className="lg:ml-72 min-h-screen transition-all duration-300">
                <div className="p-5 lg:p-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
