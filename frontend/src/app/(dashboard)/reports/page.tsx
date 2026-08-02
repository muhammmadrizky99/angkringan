'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { FiSearch, FiDownload, FiTrash2, FiEdit, FiPlus, FiMinus, FiTrash, FiCalendar, FiFileText, FiClock } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';

export default function ReportsPage() {
    const { user } = useAuthStore();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    // All available products for adding new items during Edit
    const [allProducts, setAllProducts] = useState<any[]>([]);

    // Modals & Actions States
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const [editItems, setEditItems] = useState<any[]>([]);
    const [editDate, setEditDate] = useState('');
    const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
    const [originalQuantities, setOriginalQuantities] = useState<{ [productId: string]: number }>({});

    // Export Modal & Custom Export Dates State
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await api.get('/reports/sales', { params });
            setReport(res.data.data);
        } catch {
            toast.error('Gagal memuat laporan');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setAllProducts(res.data.data || []);
        } catch (err) {
            console.error('Gagal memuat produk', err);
        }
    };

    // Load default report and products on mount
    useEffect(() => {
        fetchReport();
        fetchProducts();
    }, []);

    // Date Range Calculators
    const getTodayRange = () => {
        const today = new Date().toISOString().split('T')[0];
        return { start: today, end: today };
    };

    const getWeekRange = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        
        const startDate = new Date(now.setDate(diff));
        const endDate = new Date(startDate.getTime());
        endDate.setDate(startDate.getDate() + 6);
        
        return { 
            start: startDate.toISOString().split('T')[0], 
            end: endDate.toISOString().split('T')[0] 
        };
    };

    const getMonthRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        return { start, end };
    };

    const getYearRange = () => {
        const now = new Date();
        const start = `${now.getFullYear()}-01-01`;
        const end = `${now.getFullYear()}-12-31`;
        return { start, end };
    };

    const handleQuickFilter = async (type: 'today' | 'week' | 'month' | 'year') => {
        let range = { start: '', end: '' };
        let label = '';

        if (type === 'today') {
            range = getTodayRange();
            label = 'Hari Ini';
        } else if (type === 'week') {
            range = getWeekRange();
            label = 'Minggu Ini';
        } else if (type === 'month') {
            range = getMonthRange();
            label = 'Bulan Ini';
        } else if (type === 'year') {
            range = getYearRange();
            label = 'Tahun Ini';
        }

        setStartDate(range.start);
        setEndDate(range.end);

        setLoading(true);
        try {
            const res = await api.get('/reports/sales', { params: { startDate: range.start, endDate: range.end } });
            setReport(res.data.data);
            toast.success(`Menampilkan data ${label}`);
        } catch {
            toast.error('Gagal memuat laporan');
        } finally {
            setLoading(false);
        }
    };

    const openExportModalWithDates = () => {
        // Pre-populate export modal dates with current filter values or default to current month
        if (startDate && endDate) {
            setExportStartDate(startDate);
            setExportEndDate(endDate);
        } else {
            const range = getMonthRange();
            setExportStartDate(range.start);
            setExportEndDate(range.end);
        }
        setShowExportModal(true);
    };

    const handleExport = async () => {
        if (!exportStartDate || !exportEndDate) {
            toast.error('Pilih tanggal awal dan akhir ekspor');
            return;
        }

        setExporting(true);
        try {
            const res = await api.get('/reports/export', {
                params: { startDate: exportStartDate, endDate: exportEndDate },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `laporan_penjualan_${exportStartDate}_${exportEndDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Laporan penjualan berhasil diekspor!');
            setShowExportModal(false);
        } catch {
            toast.error('Gagal mengekspor laporan');
        } finally {
            setExporting(false);
        }
    };

    const handleDeleteTransaction = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/transactions/${deleteId}`);
            toast.success('Transaksi dihapus, stok telah dikembalikan');
            fetchReport();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal menghapus transaksi');
        } finally {
            setDeleteId(null);
        }
    };

    const handleOpenEdit = (t: any) => {
        setEditingTransaction(t);

        // Map original quantities to track stock allowance
        const origMap: { [productId: string]: number } = {};
        const items = t.items.map((i: any) => {
            origMap[i.productId] = i.quantity;
            return {
                productId: i.productId,
                name: i.product?.name || 'Produk',
                price: i.price,
                quantity: i.quantity
            };
        });

        setOriginalQuantities(origMap);
        setEditItems(items);
        setSelectedProductToAdd('');

        // Set date to datetime-local format (YYYY-MM-DDTHH:MM)
        const d = new Date(t.date);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        setEditDate(localISOTime);
    };

    const getMaxStockAllowed = (productId: string) => {
        const prod = allProducts.find(p => p.id === productId);
        const originalQty = originalQuantities[productId] || 0;
        return prod ? (prod.currentStock + originalQty) : 999;
    };

    const handleUpdateQuantity = (productId: string, delta: number) => {
        const maxStock = getMaxStockAllowed(productId);

        setEditItems(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = item.quantity + delta;
                if (newQty > maxStock) {
                    toast.error(`Stok tidak mencukupi! Batas maksimum porsi untuk produk ini adalah ${maxStock}`);
                    return item;
                }
                return { ...item, quantity: Math.max(1, newQty) };
            }
            return item;
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setEditItems(prev => prev.filter(item => item.productId !== productId));
    };

    const handleAddItem = () => {
        if (!selectedProductToAdd) return;
        const prod = allProducts.find(p => p.id === selectedProductToAdd);
        if (!prod) return;

        const exists = editItems.find(i => i.productId === prod.id);
        if (exists) {
            toast.error('Produk sudah ada di keranjang edit');
            return;
        }

        if (prod.currentStock < 1) {
            toast.error(`Stok ${prod.name} sedang kosong!`);
            return;
        }

        setEditItems(prev => [
            ...prev,
            {
                productId: prod.id,
                name: prod.name,
                price: prod.price,
                quantity: 1
            }
        ]);
        setSelectedProductToAdd('');
    };

    const handleSaveEdit = async () => {
        if (editItems.length === 0) {
            toast.error('Minimal harus ada 1 produk dalam transaksi');
            return;
        }

        for (const item of editItems) {
            const maxAllowed = getMaxStockAllowed(item.productId);
            if (item.quantity > maxAllowed) {
                toast.error(`Gagal menyimpan! Jumlah ${item.name} (${item.quantity}) melebihi stok yang tersedia (${maxAllowed})`);
                return;
            }
        }

        const payload = {
            items: editItems.map(i => ({
                productId: i.productId,
                quantity: i.quantity
            })),
            date: editDate ? new Date(editDate).toISOString() : undefined
        };

        try {
            await api.put(`/transactions/${editingTransaction.id}`, payload);
            toast.success('Transaksi berhasil diperbarui dan stok telah disesuaikan');
            setEditingTransaction(null);
            fetchReport();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Gagal memperbarui transaksi');
        }
    };

    const calculateEditTotal = () => {
        return editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    return (
        <>
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Laporan Penjualan</h1>
                        <p className="text-dark-500 mt-1">Kelola transaksi harian, periodik, dan unduhan dokumen Excel.</p>
                    </div>

                    {/* Quick Filters Row */}
                    <div className="flex flex-wrap gap-2 bg-dark-800/20 p-1.5 rounded-xl border border-dark-700/10 w-fit">
                        <button
                            onClick={() => handleQuickFilter('today')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-dark-50 text-dark-800 shadow-sm border border-dark-200/60 transition-all flex items-center gap-1.5"
                        >
                            <FiClock size={12} className="text-primary-500" /> Hari Ini
                        </button>
                        <button
                            onClick={() => handleQuickFilter('week')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-dark-50 text-dark-800 shadow-sm border border-dark-200/60 transition-all flex items-center gap-1.5"
                        >
                            <FiCalendar size={12} className="text-accent-500" /> Minggu Ini
                        </button>
                        <button
                            onClick={() => handleQuickFilter('month')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-dark-50 text-dark-800 shadow-sm border border-dark-200/60 transition-all flex items-center gap-1.5"
                        >
                            <FiCalendar size={12} className="text-green-500" /> Bulan Ini
                        </button>
                        <button
                            onClick={() => handleQuickFilter('year')}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-dark-50 text-dark-800 shadow-sm border border-dark-200/60 transition-all flex items-center gap-1.5"
                        >
                            <FiCalendar size={12} className="text-purple-500" /> Tahun Ini
                        </button>
                    </div>
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
                            <FiSearch size={16} /> {loading ? 'Memuat...' : 'Cari'}
                        </button>
                        {user?.role === 'SUPERADMIN' && (
                            <button onClick={openExportModalWithDates} className="btn-success flex items-center gap-2">
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
                                        {report.productSales?.length > 0 ? (
                                            report.productSales.map((ps: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="font-medium">{ps.name}</td>
                                                    <td><span className="badge-primary">{ps.category}</span></td>
                                                    <td className="font-semibold">{ps.totalQty}</td>
                                                    <td className="font-semibold text-accent-600">{formatCurrency(ps.totalRevenue)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="text-center py-6 text-dark-500">Belum ada penjualan pada periode ini</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Transaction Detail */}
                        <div className="card p-0">
                            <div className="p-6 pb-0">
                                <h3 className="text-lg font-semibold text-dark-900 mb-4">Riwayat Transaksi</h3>
                            </div>
                            <div className="table-container border-0 rounded-none">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Kasir</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.transactions?.length > 0 ? (
                                            report.transactions.map((t: any) => (
                                                <tr key={t.id}>
                                                    <td>{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td>{t.user?.name || 'Admin'}</td>
                                                    <td>{t.items?.map((i: any) => `${i.product?.name} x${i.quantity}`).join(', ')}</td>
                                                    <td className="font-semibold">{formatCurrency(t.totalAmount)}</td>
                                                    <td>
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => handleOpenEdit(t)}
                                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="Edit Transaksi"
                                                            >
                                                                <FiEdit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteId(t.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Hapus Transaksi"
                                                            >
                                                                <FiTrash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-6 text-dark-500">Belum ada riwayat transaksi</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Delete */}
            <ConfirmModal
                isOpen={!!deleteId}
                title="Hapus Transaksi"
                message="Apakah Anda yakin ingin menghapus transaksi ini? Seluruh stok produk di dalam transaksi ini akan dikembalikan secara otomatis ke dalam database."
                confirmText="Hapus Transaksi"
                cancelText="Batal"
                onConfirm={handleDeleteTransaction}
                onCancel={() => setDeleteId(null)}
            />

            {/* Modal Edit Transaksi */}
            {editingTransaction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-dark-100 flex flex-col max-h-[90vh]">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-dark-900">Sempurnakan Detail Transaksi</h3>
                            <p className="text-xs text-dark-500">Anda dapat mengubah waktu transaksi, menambahkan produk, atau mengubah kuantitas porsi.</p>
                        </div>

                        {/* Edit Date Section */}
                        <div className="mb-4 p-3 rounded-xl bg-primary-50/50 border border-primary-100 flex items-center gap-3">
                            <div className="p-2 bg-primary-500 text-white rounded-lg">
                                <FiCalendar size={18} />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-primary-700 block mb-0.5">Waktu Transaksi</label>
                                <input
                                    type="datetime-local"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="bg-transparent border-0 font-semibold text-sm text-primary-950 focus:ring-0 p-0 w-full"
                                />
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-2">
                            <label className="text-xs font-semibold text-dark-700 block">Daftar Item Transaksi</label>
                            {editItems.map((item) => {
                                const maxStock = getMaxStockAllowed(item.productId);
                                return (
                                    <div key={item.productId} className="flex items-center justify-between p-3 rounded-xl bg-dark-50 border border-dark-100">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-sm text-dark-900 truncate">{item.name}</p>
                                            <p className="text-xs text-dark-500">
                                                {formatCurrency(item.price)} • <span className="text-[10px] bg-dark-200 px-1.5 py-0.5 rounded text-dark-700">Maks: {maxStock} porsi</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 bg-white border border-dark-200 rounded-lg p-1">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.productId, -1)}
                                                    className="p-1 text-dark-600 hover:bg-dark-100 rounded"
                                                >
                                                    <FiMinus size={12} />
                                                </button>
                                                <span className="text-sm font-semibold w-6 text-center text-dark-900">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.productId, 1)}
                                                    className="p-1 text-dark-600 hover:bg-dark-100 rounded"
                                                >
                                                    <FiPlus size={12} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.productId)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <FiTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {editItems.length === 0 && (
                                <p className="text-center py-4 text-xs text-red-400 font-medium">Belum ada produk. Silakan tambahkan produk di bawah.</p>
                            )}
                        </div>

                        {/* Add New Product Section */}
                        <div className="mt-4 pt-4 border-t border-dark-100 space-y-2">
                            <label className="text-xs font-semibold text-dark-700 block">Tambah Produk Lain</label>
                            <div>
                                {allProducts.filter(p => !editItems.some(item => item.productId === p.id) && p.currentStock > 0).length > 0 ? (
                                    <select
                                        value={selectedProductToAdd}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val) {
                                                const prod = allProducts.find(p => p.id === val);
                                                if (prod) {
                                                    setEditItems(prev => [
                                                        ...prev,
                                                        {
                                                            productId: prod.id,
                                                            name: prod.name,
                                                            price: prod.price,
                                                            quantity: 1
                                                        }
                                                    ]);
                                                    toast.success(`${prod.name} ditambahkan ke transaksi`);
                                                }
                                            }
                                        }}
                                        className="input-field py-2 text-sm w-full cursor-pointer bg-primary-50/20 hover:bg-primary-50/40 border-primary-200/60 focus:border-primary-500 transition-colors"
                                    >
                                        <option value="">+ Klik untuk memilih & menambah produk...</option>
                                        {allProducts
                                            .filter(p => !editItems.some(item => item.productId === p.id) && p.currentStock > 0)
                                            .map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} — {formatCurrency(p.price)} (Tersedia: {p.currentStock})
                                                </option>
                                            ))
                                        }
                                    </select>
                                ) : (
                                    <p className="text-xs text-dark-400 italic bg-dark-50 p-2.5 rounded-lg border border-dark-150 text-center">
                                        Semua produk yang tersedia sudah ditambahkan ke dalam transaksi ini.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Summary & Save */}
                        <div className="mt-6 pt-4 border-t border-dark-100">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-dark-600">Total Harga Baru:</span>
                                <span className="text-xl font-bold text-accent-600">{formatCurrency(calculateEditTotal())}</span>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingTransaction(null)}
                                    className="btn-secondary py-2 px-4 text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="btn-primary py-2 px-4 text-sm"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Export Confirmation with custom range select */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-dark-100 animate-scale-up">
                        <div className="mb-5 text-center">
                            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-100">
                                <FiFileText size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-dark-900">Atur Periode Ekspor Excel</h3>
                            <p className="text-xs text-dark-500 mt-1">Silakan sesuaikan rentang tanggal khusus untuk file laporan Excel Anda.</p>
                        </div>

                        {/* Custom Export Date Selection */}
                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-dark-700 block mb-1">Tanggal Mulai</label>
                                    <input
                                        type="date"
                                        value={exportStartDate}
                                        onChange={(e) => setExportStartDate(e.target.value)}
                                        className="input-field py-1.5 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-dark-700 block mb-1">Tanggal Selesai</label>
                                    <input
                                        type="date"
                                        value={exportEndDate}
                                        onChange={(e) => setExportEndDate(e.target.value)}
                                        className="input-field py-1.5 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-green-50/40 rounded-xl border border-green-100 text-xs text-green-800 space-y-1">
                                <p className="font-semibold">Tips Ekspor:</p>
                                <p>File akan diunduh dalam format **Excel (.xlsx)** berisi baris tanggal, kasir, produk, porsi, dan subtotal.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowExportModal(false)}
                                disabled={exporting}
                                className="btn-secondary flex-1 py-2 text-sm"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="btn-success flex-1 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 font-bold"
                            >
                                <FiDownload size={16} /> {exporting ? 'Mengekspor...' : 'Ekspor Laporan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
