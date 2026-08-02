'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import toast, { Toaster } from 'react-hot-toast';
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff, FiTrendingUp, FiShoppingCart, FiBarChart2 } from 'react-icons/fi';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Email dan password wajib diisi');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            toast.success('Login berhasil, selamat datang!');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Login gagal. Periksa kembali email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            <Toaster position="top-right" toastOptions={{ className: 'toast-custom', duration: 3000 }} />

            {/* Left Panel — Hero */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
                {/* Decorative circles */}
                <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500 rounded-full opacity-[0.1] blur-3xl" />
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-600 rounded-full opacity-[0.08] blur-3xl" />
                <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-yellow-500 rounded-full opacity-[0.06] blur-2xl" />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Top — Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-primary-500/30 border-2 border-white/20 flex items-center justify-center bg-white">
                            <img src="/images/logo1.jpeg" alt="Logo" className="w-full h-full object-cover object-center scale-110" />
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-bold">Angkringan Agoy</h2>
                            <p className="text-white/40 text-xs">Sistem Prediksi Permintaan</p>
                        </div>
                    </div>

                    {/* Center — Tagline */}
                    <div className="max-w-lg animate-fade-in-up">
                        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                            Prediksi stok
                            <span className="block gradient-text mt-1">lebih cerdas</span>
                            dengan AI
                        </h1>
                        <p className="text-white/50 text-base leading-relaxed mb-10">
                            Kelola angkringan Anda dengan sistem prediksi permintaan berbasis XGBoost. 
                            Kurangi pemborosan, tingkatkan pendapatan.
                        </p>

                        {/* Feature cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: FiShoppingCart, label: 'POS Terintegrasi', desc: 'Catat transaksi langsung' },
                                { icon: FiTrendingUp, label: 'Prediksi Akurat', desc: 'Machine learning XGBoost' },
                                { icon: FiBarChart2, label: 'Laporan Real-time', desc: 'Analisis penjualan harian' },
                            ].map((f, i) => (
                                <div
                                    key={i}
                                    className="glass-card-dark p-4 rounded-xl animate-fade-in-up"
                                    style={{ animationDelay: `${(i + 2) * 0.1}s` }}
                                >
                                    <f.icon size={22} className="text-primary-400 mb-3" />
                                    <p className="text-white text-sm font-semibold mb-0.5">{f.label}</p>
                                    <p className="text-white/40 text-xs">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom */}
                    <p className="text-white/20 text-xs">
                        © {new Date().getFullYear()} Angkringan Agoy — Muhammad Rizky
                    </p>
                </div>
            </div>

            {/* Right Panel — Login Form */}
            <div className="w-full lg:w-[45%] flex items-center justify-center bg-white p-6 lg:p-12 relative">
                {/* Mobile logo */}
                <div className="lg:hidden absolute top-8 left-6 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary-100 shadow-sm flex items-center justify-center bg-white">
                        <img src="/images/logo1.jpeg" alt="Logo" className="w-full h-full object-cover object-center scale-110" />
                    </div>
                    <span className="font-bold text-dark-900">Angkringan Agoy</span>
                </div>

                <div className="w-full max-w-sm animate-fade-in-up">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-dark-900 tracking-tight">Selamat Datang</h2>
                        <p className="text-dark-400 mt-2 text-sm">Masuk ke akun Anda untuk melanjutkan</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-sm font-semibold text-dark-700 block mb-2">Email</label>
                            <div className="relative">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field pl-11"
                                    placeholder="nama@angkringan.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-dark-700 block mb-2">Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-11 pr-11"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors"
                                >
                                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary flex items-center justify-center gap-2.5 py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FiLogIn size={18} />
                                    Masuk
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
