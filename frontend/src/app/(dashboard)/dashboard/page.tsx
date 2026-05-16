'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import StatCard from '@/components/StatCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { FiDollarSign, FiShoppingBag, FiPackage, FiTrendingUp, FiArrowRight, FiSun, FiCloud, FiCloudRain } from 'react-icons/fi';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import Link from 'next/link';

interface Summary {
    todayRevenue: number;
    todayTransactions: number;
    totalProducts: number;
    totalUsers: number;
    totalSuppliers: number;
}

const weatherIcons: Record<number, { icon: typeof FiSun; label: string; color: string }> = {
    0: { icon: FiSun, label: 'Cerah', color: 'text-yellow-500' },
    1: { icon: FiCloud, label: 'Berawan', color: 'text-gray-400' },
    2: { icon: FiCloudRain, label: 'Hujan', color: 'text-blue-400' },
};

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-100 px-4 py-3 shadow-lg">
            <p className="text-xs font-semibold text-dark-500 mb-1.5">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-dark-500">{entry.name}:</span>
                    <span className="font-semibold text-dark-900">
                        {formatter ? formatter(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [salesChart, setSalesChart] = useState<any[]>([]);
    const [predictionChart, setPredictionChart] = useState<any[]>([]);
    const [stockData, setStockData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [summaryRes, salesRes, predRes, stockRes] = await Promise.all([
                api.get('/dashboard/summary'),
                api.get('/dashboard/sales-chart'),
                api.get('/dashboard/prediction-chart'),
                api.get('/dashboard/stock-summary'),
            ]);
            setSummary(summaryRes.data.data);
            setSalesChart(salesRes.data.data);
            setPredictionChart(predRes.data.data);
            setStockData(stockRes.data.data);
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 11) return 'Selamat Pagi';
        if (hour < 15) return 'Selamat Siang';
        if (hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    };

    const todayDate = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-fade-in">
                    <div className="skeleton h-8 w-72 mb-2" />
                    <div className="skeleton h-4 w-48" />
                </div>
                <LoadingSkeleton variant="cards" count={4} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LoadingSkeleton variant="chart" />
                    <LoadingSkeleton variant="chart" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Greeting */}
            <div className="animate-fade-in-down">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-dark-900 tracking-tight">
                            {getGreeting()}, {user?.name?.split(' ')[0]}
                        </h1>
                        <p className="text-dark-400 mt-1 text-sm">{todayDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/pos" className="btn-primary flex items-center gap-2 text-sm">
                            <FiShoppingBag size={16} />
                            Buat Transaksi
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Pendapatan Hari Ini"
                    value={formatCurrency(summary?.todayRevenue || 0)}
                    icon={<FiDollarSign size={22} className="text-white" />}
                    gradient="from-primary-400 to-primary-600"
                    delay={0}
                />
                <StatCard
                    label="Transaksi Hari Ini"
                    value={summary?.todayTransactions || 0}
                    icon={<FiShoppingBag size={22} className="text-white" />}
                    gradient="from-accent-400 to-accent-600"
                    delay={1}
                />
                <StatCard
                    label="Total Produk"
                    value={summary?.totalProducts || 0}
                    icon={<FiPackage size={22} className="text-white" />}
                    gradient="from-blue-400 to-blue-600"
                    delay={2}
                />
                <StatCard
                    label="Produk Stok Rendah"
                    value={stockData?.lowStock?.length || 0}
                    icon={<FiTrendingUp size={22} className="text-white" />}
                    gradient="from-red-400 to-red-500"
                    delay={3}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Chart */}
                <div className="card animate-fade-in-up stagger-3">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-semibold text-dark-900">Pendapatan 30 Hari</h3>
                            <p className="text-xs text-dark-400 mt-0.5">Tren pendapatan harian</p>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesChart}>
                                <defs>
                                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ee7711" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ee7711" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip formatter={(v: number) => formatCurrency(v)} />} />
                                <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#ee7711" strokeWidth={2.5} fill="url(#salesGradient)" dot={false} activeDot={{ r: 5, fill: '#ee7711', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Prediction vs Actual */}
                <div className="card animate-fade-in-up stagger-4">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-semibold text-dark-900">Prediksi vs Aktual</h3>
                            <p className="text-xs text-dark-400 mt-0.5">Perbandingan akurasi model</p>
                        </div>
                        <Link href="/predictions" className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 transition-colors">
                            Detail <FiArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={predictionChart} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                                    iconType="circle"
                                    iconSize={8}
                                />
                                <Bar dataKey="actual" name="Aktual" fill="#ee7711" radius={[6, 6, 0, 0]} barSize={18} />
                                <Bar dataKey="predicted" name="Prediksi" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {stockData && stockData.lowStock.length > 0 && (
                <div className="card border-l-4 border-l-red-400 animate-fade-in-up stagger-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-semibold text-dark-900">Stok Rendah</h3>
                            <p className="text-xs text-dark-400 mt-0.5">Produk yang perlu segera di-restock</p>
                        </div>
                        <Link href="/stock" className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 transition-colors">
                            Kelola Stok <FiArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stockData.lowStock.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3.5 bg-red-50/60 rounded-xl border border-red-100/60 hover:bg-red-50 transition-colors">
                                <div>
                                    <p className="font-semibold text-dark-900 text-sm">{p.name}</p>
                                    <p className="text-xs text-dark-400 mt-0.5">{p.category}</p>
                                </div>
                                <span className="badge-danger">{p.currentStock} pcs</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up stagger-6">
                {[
                    { href: '/pos', label: 'Transaksi Baru', desc: 'Catat penjualan', icon: FiShoppingBag, gradient: 'from-primary-400 to-primary-600' },
                    { href: '/predictions', label: 'Generate Prediksi', desc: 'Prediksi stok besok', icon: FiTrendingUp, gradient: 'from-accent-400 to-accent-600' },
                    { href: '/reports', label: 'Lihat Laporan', desc: 'Analisis penjualan', icon: FiDollarSign, gradient: 'from-blue-400 to-blue-600' },
                ].map((action) => (
                    <Link key={action.href} href={action.href} className="card group flex items-center gap-4 hover:border-primary-200 transition-all">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                            <action.icon size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-dark-900 text-sm group-hover:text-primary-600 transition-colors">{action.label}</p>
                            <p className="text-xs text-dark-400">{action.desc}</p>
                        </div>
                        <FiArrowRight size={16} className="text-dark-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
