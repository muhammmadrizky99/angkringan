'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';
import { FiTrendingUp, FiRefreshCw, FiSun, FiCloud, FiCloudRain, FiInfo, FiZap } from 'react-icons/fi';

interface Prediction {
    id: string;
    productId: string;
    predictionDate: string;
    predictedQuantity: number;
    mae: number | null;
    rmse: number | null;
    mape: number | null;
    method: string | null;
    weather: number | null;
    product: { name: string; category: string; currentStock: number };
}

const WEATHER_OPTIONS = [
    { value: 0, label: 'Cerah', icon: FiSun, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200', activeBg: 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200', emoji: '☀️' },
    { value: 1, label: 'Berawan', icon: FiCloud, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', activeBg: 'bg-gray-100 border-gray-400 ring-2 ring-gray-200', emoji: '⛅' },
    { value: 2, label: 'Hujan', icon: FiCloudRain, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', activeBg: 'bg-blue-100 border-blue-400 ring-2 ring-blue-200', emoji: '🌧️' },
];

export default function PredictionsPage() {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const [selectedWeather, setSelectedWeather] = useState<number>(0);
    const [isEvent, setIsEvent] = useState(false);
    const [eventNote, setEventNote] = useState('');
    const [forecastLoading, setForecastLoading] = useState(true);
    const [forecastInfo, setForecastInfo] = useState<{ description: string; temp: number } | null>(null);

    useEffect(() => {
        fetchPredictions();
        fetchTomorrowForecast();
    }, []);

    const fetchPredictions = async () => {
        try {
            const res = await api.get('/predictions/latest');
            setPredictions(res.data.data);
        } catch { toast.error('Gagal memuat prediksi'); }
        finally { setLoading(false); }
    };

    const fetchTomorrowForecast = async () => {
        setForecastLoading(true);
        try {
            const res = await api.get('/daily-records/tomorrow-forecast');
            const data = res.data.data;
            setSelectedWeather(data.weather);
            setForecastInfo({ description: data.description, temp: data.temp });
        } catch {
            setSelectedWeather(0);
        } finally {
            setForecastLoading(false);
        }
    };

    const generatePredictions = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/predictions/generate', {
                weather: selectedWeather,
                event: isEvent ? 1 : 0,
            });
            setPredictions(res.data.data);
            toast.success(`Prediksi berhasil! (${WEATHER_OPTIONS[selectedWeather].emoji} ${WEATHER_OPTIONS[selectedWeather].label})`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal generate prediksi');
        } finally {
            setGenerating(false);
        }
    };

    const getRecommendation = (predicted: number, stock: number) => {
        const diff = predicted - stock;
        if (diff > 0) return { text: `Tambah ${diff} unit`, color: 'text-red-600', bg: 'bg-red-50 border-red-100', ring: 'ring-red-100' };
        if (diff === 0) return { text: 'Stok pas', color: 'text-accent-600', bg: 'bg-accent-50 border-accent-100', ring: 'ring-accent-100' };
        return { text: 'Stok cukup', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', ring: 'ring-blue-100' };
    };

    const getMethodBadge = (method: string | null) => {
        switch (method) {
            case 'xgboost': return <span className="badge-primary text-[10px]">⚡ XGBoost</span>;
            case 'simple_average': return <span className="badge-warning text-[10px]">📊 Rata-rata</span>;
            case 'moving_average_fallback': return <span className="badge bg-orange-50 text-orange-700 border border-orange-100 text-[10px]">↩ Fallback</span>;
            default: return <span className="badge bg-gray-50 text-gray-600 border border-gray-100 text-[10px]">{method || 'N/A'}</span>;
        }
    };

    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Prediksi Permintaan"
                description="Prediksi jumlah produk yang dibutuhkan besok"
                icon={<FiTrendingUp size={20} className="text-white" />}
            />

            {/* Control Panel */}
            <div className="card border-primary-100 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                        <FiZap size={16} className="text-primary-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-dark-900 text-sm">Konfigurasi Prediksi</h3>
                        <p className="text-xs text-dark-400">Untuk: {tomorrowDate}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weather Picker */}
                    <div>
                        <label className="text-sm font-semibold text-dark-700 block mb-2.5">
                            Prakiraan Cuaca Besok
                            {forecastInfo && !forecastLoading && (
                                <span className="text-xs text-dark-400 font-normal ml-2">
                                    ({forecastInfo.description}, {forecastInfo.temp}°C)
                                </span>
                            )}
                        </label>
                        <div className="flex gap-3">
                            {WEATHER_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const safeWeather = (selectedWeather >= 0 && selectedWeather < WEATHER_OPTIONS.length) ? selectedWeather : 0;
                                const isActive = safeWeather === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => setSelectedWeather(opt.value)}
                                        className={`flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200
                                            ${isActive ? opt.activeBg : opt.bg + ' hover:opacity-80'}`}
                                    >
                                        <span className="text-2xl">{opt.emoji}</span>
                                        <span className={`text-xs ${isActive ? 'text-dark-900' : 'text-dark-500'}`}>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {forecastLoading && (
                            <p className="text-xs text-dark-400 mt-2 animate-pulse">Mengambil prakiraan cuaca...</p>
                        )}
                    </div>

                    {/* Event Toggle */}
                    <div>
                        <label className="text-sm font-semibold text-dark-700 block mb-2.5">Event / Acara Khusus</label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={isEvent}
                                        onChange={(e) => setIsEvent(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-12 h-7 rounded-full transition-colors duration-200 ${isEvent ? 'bg-primary-500' : 'bg-dark-200'}`}>
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 absolute top-1 ${isEvent ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-dark-700">
                                        {isEvent ? 'Ada event besok' : 'Tidak ada event'}
                                    </span>
                                    <p className="text-xs text-dark-400">Event bisa memengaruhi jumlah pembeli</p>
                                </div>
                            </label>
                            {isEvent && (
                                <input
                                    type="text"
                                    placeholder="Contoh: Tahun Baru, Pasar Malam"
                                    value={eventNote}
                                    onChange={(e) => setEventNote(e.target.value)}
                                    className="input-field text-sm animate-fade-in"
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100">
                    <button
                        onClick={generatePredictions}
                        disabled={generating}
                        className="btn-primary flex items-center gap-2.5 disabled:opacity-50"
                    >
                        {generating ? (
                            <><FiRefreshCw size={16} className="animate-spin" /> Memproses Prediksi...</>
                        ) : (
                            <><FiTrendingUp size={16} /> Generate Prediksi Besok</>
                        )}
                    </button>
                </div>
            </div>

            {/* Info Banner */}
            <div className="card bg-blue-50/50 border-blue-100 animate-fade-in-up stagger-2">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FiInfo size={16} className="text-blue-600" />
                    </div>
                    <div className="text-sm text-dark-600">
                        <p className="font-semibold text-dark-800 mb-1">Tentang Prediksi</p>
                        <p className="leading-relaxed">
                            Model <strong>XGBoost</strong> menggunakan 13 fitur: hari, weekend, bulan, tanggal, Ramadan, lag penjualan (1, 3 & 7 hari), rolling mean & std (7 & 14 hari),
                            <strong> cuaca</strong>, dan <strong>event</strong>. Evaluasi: MAE, RMSE, MAPE.
                        </p>
                    </div>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="skeleton h-56 rounded-2xl" />
                    ))}
                </div>
            ) : predictions.length === 0 ? (
                <EmptyState
                    icon={<FiTrendingUp size={32} />}
                    title="Belum ada prediksi"
                    description="Pilih cuaca besok dan klik 'Generate Prediksi Besok' untuk memulai."
                    action={
                        <button onClick={generatePredictions} className="btn-primary flex items-center gap-2 mx-auto">
                            <FiTrendingUp size={16} /> Generate Sekarang
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {predictions.map((p, idx) => {
                        const rec = getRecommendation(p.predictedQuantity, p.product.currentStock);
                        return (
                            <div
                                key={p.id}
                                className="card hover:shadow-card-hover transition-all duration-300 animate-fade-in-up"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h4 className="font-semibold text-dark-900 leading-tight">{p.product.name}</h4>
                                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                            <span className="text-[10px] text-dark-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{p.product.category}</span>
                                            {getMethodBadge(p.method)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold gradient-text leading-none">{Math.round(p.predictedQuantity)}</p>
                                        <p className="text-[10px] text-dark-400 mt-1">unit/hari</p>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {[
                                        { label: 'MAE', value: p.mae },
                                        { label: 'RMSE', value: p.rmse },
                                        { label: 'MAPE', value: p.mape, suffix: '%' },
                                    ].map((metric) => (
                                        <div key={metric.label} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100/70">
                                            <p className="text-[10px] text-dark-400 uppercase font-semibold tracking-wide">{metric.label}</p>
                                            <p className="text-sm font-bold text-dark-700 mt-0.5">
                                                {metric.value !== null ? `${metric.value.toFixed(metric.suffix ? 1 : 2)}${metric.suffix || ''}` : '-'}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Recommendation */}
                                <div className={`rounded-xl p-3.5 border ${rec.bg}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-dark-500 uppercase font-semibold tracking-wide">Rekomendasi</p>
                                            <p className={`text-sm font-bold ${rec.color}`}>{rec.text}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-dark-500">Stok saat ini</p>
                                            <p className="text-sm font-semibold text-dark-800">{p.product.currentStock} unit</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
