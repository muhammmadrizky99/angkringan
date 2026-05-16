'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';

interface Product {
    id: string; name: string; category: string; currentStock: number;
}

interface Movement {
    id: string; productId: string; type: string; quantity: number; date: string;
    product: { name: string; category: string };
}

export default function StockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ productId: '', quantity: '', type: 'IN' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [pRes, mRes] = await Promise.all([
                api.get('/products'),
                api.get('/stock/movements'),
            ]);
            setProducts(pRes.data.data);
            setMovements(mRes.data.data);
        } catch { toast.error('Gagal memuat data'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.productId || !form.quantity) { toast.error('Lengkapi form'); return; }
        setSubmitting(true);
        try {
            const endpoint = form.type === 'IN' ? '/stock/in' : '/stock/out';
            await api.post(endpoint, { productId: form.productId, quantity: parseInt(form.quantity) });
            toast.success(`Stok ${form.type === 'IN' ? 'masuk' : 'keluar'} berhasil`);
            setForm({ productId: '', quantity: '', type: 'IN' });
            fetchData();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Kelola Stok</h1>
                <p className="text-dark-500 mt-1">Catat stok masuk dan stok keluar</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-dark-900 mb-4">Input Stok</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setForm({ ...form, type: 'IN' })}
                                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                  ${form.type === 'IN' ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25' : 'bg-dark-100 text-dark-500'}`}>
                                <FiArrowDown size={16} /> Stok Masuk
                            </button>
                            <button type="button" onClick={() => setForm({ ...form, type: 'OUT' })}
                                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all
                  ${form.type === 'OUT' ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-dark-100 text-dark-500'}`}>
                                <FiArrowUp size={16} /> Stok Keluar
                            </button>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-dark-700 block mb-1">Produk</label>
                            <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="input-field" required>
                                <option value="">Pilih produk</option>
                                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stok: {p.currentStock})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-dark-700 block mb-1">Jumlah</label>
                            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="input-field" min="1" required />
                        </div>
                        <button type="submit" disabled={submitting} className={`w-full ${form.type === 'IN' ? 'btn-success' : 'btn-danger'} disabled:opacity-50`}>
                            {submitting ? 'Memproses...' : `Simpan Stok ${form.type === 'IN' ? 'Masuk' : 'Keluar'}`}
                        </button>
                    </form>
                </div>

                {/* Movement History */}
                <div className="lg:col-span-2 card p-0">
                    <div className="p-6 pb-0">
                        <h3 className="text-lg font-semibold text-dark-900 mb-4">Riwayat Pergerakan Stok</h3>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>
                    ) : (
                        <div className="table-container border-0 rounded-none">
                            <table>
                                <thead><tr><th>Tanggal</th><th>Produk</th><th>Tipe</th><th>Jumlah</th></tr></thead>
                                <tbody>
                                    {movements.slice(0, 50).map((m) => (
                                        <tr key={m.id}>
                                            <td>{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="font-medium">{m.product.name}</td>
                                            <td>
                                                {m.type === 'IN' ? (
                                                    <span className="badge-success flex items-center gap-1 w-fit"><FiArrowDown size={12} /> Masuk</span>
                                                ) : (
                                                    <span className="badge-danger flex items-center gap-1 w-fit"><FiArrowUp size={12} /> Keluar</span>
                                                )}
                                            </td>
                                            <td className="font-semibold">{m.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
