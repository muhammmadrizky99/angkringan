'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { FiSearch, FiDownload } from 'react-icons/fi';

export default function ReportsPage() {
    const { user } = useAuthStore();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        if (!startDate || !endDate) { toast.error('Pilih tanggal awal dan akhir'); return; }
        setLoading(true);
        try {
            const res = await api.get('/reports/sales', { params: { startDate, endDate } });
            setReport(res.data.data);
        } catch { toast.error('Gagal memuat laporan'); }
        finally { setLoading(false); }
    };

    const handleExport = async () => {
        if (!startDate || !endDate) { toast.error('Pilih tanggal terlebih dahulu'); return; }
        try {
            const res = await api.get('/reports/export', {
                params: { startDate, endDate },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `laporan_${startDate}_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Laporan berhasil diexport!');
        } catch { toast.error('Gagal export laporan'); }
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Laporan Penjualan</h1>
                <p className="text-dark-500 mt-1">Filter dan export laporan penjualan</p>
            </div>

            {/* Filter */}
            <div className="card">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="text-sm font-medium text-dark-700 block mb-1">Tanggal Awal</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-dark-700 block mb-1">Tanggal Akhir</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
                    </div>
                    <button onClick={fetchReport} disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                        <FiSearch size={16} /> {loading ? 'Memuat...' : 'Tampilkan'}
                    </button>
                    {user?.role === 'SUPERADMIN' && (
                        <button onClick={handleExport} className="btn-success flex items-center gap-2">
                            <FiDownload size={16} /> Export Excel
                        </button>
                    )}
                </div>
            </div>

            {/* Report Summary */}
            {report && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="card text-center">
                            <p className="text-sm text-dark-500">Periode</p>
                            <p className="text-lg font-bold text-dark-900">{report.period.startDate} — {report.period.endDate}</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-sm text-dark-500">Total Transaksi</p>
                            <p className="text-2xl font-bold text-primary-500">{report.totalTransactions}</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-sm text-dark-500">Total Pendapatan</p>
                            <p className="text-2xl font-bold text-accent-600">{formatCurrency(report.totalRevenue)}</p>
                        </div>
                    </div>

                    {/* Product Sales Table */}
                    <div className="card p-0">
                        <div className="p-6 pb-0">
                            <h3 className="text-lg font-semibold text-dark-900 mb-4">Penjualan Per Produk</h3>
                        </div>
                        <div className="table-container border-0 rounded-none">
                            <table>
                                <thead>
                                    <tr><th>Produk</th><th>Kategori</th><th>Qty Terjual</th><th>Total Pendapatan</th></tr>
                                </thead>
                                <tbody>
                                    {report.productSales?.map((ps: any, i: number) => (
                                        <tr key={i}>
                                            <td className="font-medium">{ps.name}</td>
                                            <td><span className="badge-primary">{ps.category}</span></td>
                                            <td className="font-semibold">{ps.totalQty}</td>
                                            <td className="font-semibold text-accent-600">{formatCurrency(ps.totalRevenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Transaction Detail */}
                    <div className="card p-0">
                        <div className="p-6 pb-0">
                            <h3 className="text-lg font-semibold text-dark-900 mb-4">Detail Transaksi</h3>
                        </div>
                        <div className="table-container border-0 rounded-none">
                            <table>
                                <thead>
                                    <tr><th>Tanggal</th><th>Kasir</th><th>Items</th><th>Total</th></tr>
                                </thead>
                                <tbody>
                                    {report.transactions?.slice(0, 50).map((t: any) => (
                                        <tr key={t.id}>
                                            <td>{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>{t.user?.name}</td>
                                            <td>{t.items?.map((i: any) => `${i.product?.name} x${i.quantity}`).join(', ')}</td>
                                            <td className="font-semibold">{formatCurrency(t.totalAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
