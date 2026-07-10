'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiSun, FiCloud, FiCloudRain, FiCalendar, FiRefreshCw } from 'react-icons/fi';

interface DailyRecord {
    id: string;
    date: string;
    weather: number;
    event: number;
    eventNote: string | null;
    createdAt?: string;
}

const WEATHER_LABELS = [
    { label: 'Cerah', icon: FiSun, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Berawan', icon: FiCloud, color: 'text-gray-500', bg: 'bg-gray-50' },
    { label: 'Hujan', icon: FiCloudRain, color: 'text-blue-500', bg: 'bg-blue-50' },
];

export default function DailyRecordsPage() {
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayRecord, setTodayRecord] = useState<DailyRecord | null>(null);
    const [fetchingWeather, setFetchingWeather] = useState(false);

    // Form for adding/editing
    const [formDate, setFormDate] = useState('');
    const [formWeather, setFormWeather] = useState(0);
    const [formEvent, setFormEvent] = useState(0);
    const [formEventNote, setFormEventNote] = useState('');

    useEffect(() => {
        fetchRecords();
        fetchToday();
    }, []);

    const fetchRecords = async () => {
        try {
            const res = await api.get('/daily-records');
            setRecords(res.data.data);
        } catch { toast.error('Gagal memuat data'); }
        finally { setLoading(false); }
    };

    const fetchToday = async () => {
        try {
            const res = await api.get('/daily-records/today');
            setTodayRecord(res.data.data);
        } catch { /* ignore */ }
    };

    const handleFetchWeather = async () => {
        setFetchingWeather(true);
        try {
            const res = await api.post('/daily-records/fetch-weather');
            setTodayRecord(res.data.data);
            toast.success(`Cuaca hari ini: ${WEATHER_LABELS[res.data.weatherInfo.weather].label} (${res.data.weatherInfo.description}, ${res.data.weatherInfo.temp}°C)`);
            fetchRecords();
        } catch { toast.error('Gagal mengambil cuaca'); }
        finally { setFetchingWeather(false); }
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formDate) { toast.error('Pilih tanggal'); return; }
        try {
            await api.post('/daily-records', {
                date: formDate,
                weather: formWeather,
                event: formEvent,
                eventNote: formEventNote || null,
            });
            toast.success('Record berhasil disimpan');
            setFormDate('');
            setFormWeather(0);
            setFormEvent(0);
            setFormEventNote('');
            fetchRecords();
        } catch { toast.error('Gagal menyimpan'); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Catatan Harian</h1>
                <p className="text-dark-500 mt-1">Kelola data cuaca & event per hari untuk akurasi prediksi</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Weather Card */}
                <div className="card border-2 border-primary-100">
                    <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                        <FiCalendar className="text-primary-500" /> Cuaca Hari Ini
                    </h3>
                    {todayRecord ? (
                        <div className="text-center py-4">
                            {(() => {
                                const weatherIndex = (todayRecord.weather >= 0 && todayRecord.weather < WEATHER_LABELS.length) ? todayRecord.weather : 0;
                                const w = WEATHER_LABELS[weatherIndex];
                                const Icon = w.icon;
                                return (
                                    <div className={`inline-flex flex-col items-center gap-2 p-6 rounded-2xl ${w.bg}`}>
                                        <Icon size={48} className={w.color} />
                                        <span className="text-lg font-bold text-dark-900">{w.label}</span>
                                        {todayRecord.event === 1 && (
                                            <span className="badge bg-primary-100 text-primary-700">
                                                {todayRecord.eventNote || 'Ada Event'}
                                            </span>
                                        )}
                                        {todayRecord.createdAt && (
                                            <span className="text-[10px] text-dark-400 mt-1 font-semibold flex items-center gap-1">
                                                ⏰ Waktu Catat: {new Date(todayRecord.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <p className="text-dark-400 text-center py-4">Belum ada data hari ini</p>
                    )}
                    <button onClick={handleFetchWeather} disabled={fetchingWeather}
                        className="w-full btn-primary flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                        {fetchingWeather ? (
                            <><FiRefreshCw size={14} className="animate-spin" /> Mengambil cuaca...</>
                        ) : (
                            <><FiRefreshCw size={14} /> Ambil Cuaca dari API</>
                        )}
                    </button>
                </div>

                {/* Add/Edit Record Form */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-dark-900 mb-4">Tambah / Edit Record</h3>
                    <form onSubmit={handleSaveRecord} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-dark-700 block mb-1">Tanggal</label>
                            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="input-field" required />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-dark-700 block mb-1">Cuaca</label>
                            <div className="flex gap-2">
                                {WEATHER_LABELS.map((w, i) => {
                                    const Icon = w.icon;
                                    return (
                                        <button key={i} type="button" onClick={() => setFormWeather(i)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border-2 transition-all
                                                ${formWeather === i ? `${w.bg} border-current ${w.color}` : 'bg-white border-dark-100 text-dark-400'}`}>
                                            <Icon size={14} /> {w.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={formEvent === 1} onChange={(e) => setFormEvent(e.target.checked ? 1 : 0)}
                                    className="w-4 h-4 rounded border-dark-300 text-primary-500 focus:ring-primary-500" />
                                <span className="text-sm font-medium text-dark-700">Ada event</span>
                            </label>
                        </div>
                        {formEvent === 1 && (
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Catatan Event</label>
                                <input value={formEventNote} onChange={(e) => setFormEventNote(e.target.value)}
                                    className="input-field" placeholder="misal: Tahun Baru" />
                            </div>
                        )}
                        <button type="submit" className="w-full btn-primary">Simpan Record</button>
                    </form>
                </div>

                {/* Recent Records Table */}
                <div className="card p-0 lg:col-span-1">
                    <div className="p-6 pb-0">
                        <h3 className="text-lg font-semibold text-dark-900 mb-4">Riwayat 30 Hari</h3>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>
                    ) : (
                        <div className="table-container border-0 rounded-none max-h-[500px] overflow-y-auto">
                            <table>
                                <thead><tr><th>Tanggal / Jam</th><th>Cuaca</th><th>Event</th></tr></thead>
                                <tbody>
                                    {records.slice(0, 30).map((r) => {
                                        const w = WEATHER_LABELS[r.weather];
                                        const Icon = w.icon;
                                        return (
                                            <tr key={r.id}>
                                                <td className="text-sm">
                                                    <div className="font-semibold text-dark-800">
                                                        {new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                    </div>
                                                    {r.createdAt && (
                                                        <div className="text-[10px] text-dark-400 mt-0.5 font-medium flex items-center gap-0.5">
                                                            <span>Jam:</span>
                                                            <span className="text-primary-600 font-semibold">
                                                                {new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`flex items-center gap-1 text-xs font-semibold ${w.color}`}>
                                                        <Icon size={12} /> {w.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {r.event === 1 ? (
                                                        <span className="badge bg-primary-100 text-primary-700 text-xs">
                                                            {r.eventNote || 'Event'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-dark-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
