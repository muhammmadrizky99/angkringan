'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowUp, FiArrowDown, FiEdit, FiTrash2, FiPlus, FiMinus, FiDatabase } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';

interface Product {
    id: string;
    name: string;
    category: string;
    currentStock: number;
}

interface Movement {
    id: string;
    productId: string;
    type: string;
    quantity: number;
    date: string;
    product: { name: string; category: string };
}

export default function StockPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ productId: '', quantity: '', type: 'IN' });
    const [submitting, setSubmitting] = useState(false);

    // Edit & Delete Modal States
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
    const [editForm, setEditForm] = useState({ productId: '', quantity: '', type: 'IN' });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pRes, mRes] = await Promise.all([
                api.get('/products'),
                api.get('/stock/movements'),
            ]);
            setProducts(pRes.data.data || []);
            setMovements(mRes.data.data || []);
        } catch {
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.productId || !form.quantity) {
            toast.error('Lengkapi form terlebih dahulu');
            return;
        }

        // Stock safety check for OUT movement in frontend
        if (form.type === 'OUT') {
            const prod = products.find(p => p.id === form.productId);
            if (prod && prod.currentStock < parseInt(form.quantity)) {
                toast.error(`Stok tidak mencukupi! ${prod.name} hanya tersedia ${prod.currentStock} porsi.`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const endpoint = form.type === 'IN' ? '/stock/in' : '/stock/out';
            await api.post(endpoint, { productId: form.productId, quantity: parseInt(form.quantity) });
            toast.success(`Stok ${form.type === 'IN' ? 'masuk' : 'keluar'} berhasil disimpan`);
            setForm({ productId: '', quantity: '', type: 'IN' });
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan data stok');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (m: Movement) => {
        setEditingMovement(m);
        setEditForm({
            productId: m.productId,
            quantity: m.quantity.toString(),
            type: m.type
        });
    };

    const handleSaveEdit = async () => {
        if (!editForm.productId || !editForm.quantity) {
            toast.error('Lengkapi form edit terlebih dahulu');
            return;
        }

        setUpdating(true);
        try {
            await api.put(`/stock/movements/${editingMovement!.id}`, {
                productId: editForm.productId,
                quantity: parseInt(editForm.quantity),
                type: editForm.type
            });
            toast.success('Riwayat pergerakan stok berhasil diperbarui');
            setEditingMovement(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal memperbarui pergerakan stok');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteMovement = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/stock/movements/${deleteId}`);
            toast.success('Riwayat pergerakan stok berhasil dihapus');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menghapus pergerakan stok');
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <>
            <div className="space-y-6 animate-fade-in-up">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Kelola Stok</h1>
                    <p className="text-dark-500 mt-1">Catat, edit, dan awasi alur keluar-masuk stok barang angkringan secara aman.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Input */}
                    <div className="card h-fit">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-primary-50 text-primary-500 rounded-lg">
                                <FiDatabase size={18} />
                            </div>
                            <h3 className="text-lg font-semibold text-dark-900">Input Mutasi Stok</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex gap-2 p-1 bg-dark-50 rounded-xl border border-dark-100">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, type: 'IN' })}
                                    className={`flex-1 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all
                                        ${form.type === 'IN'
                                            ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/10'
                                            : 'text-dark-500 hover:text-dark-800'}`}
                                >
                                    <FiArrowDown size={14} /> Stok Masuk
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, type: 'OUT' })}
                                    className={`flex-1 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all
                                        ${form.type === 'OUT'
                                            ? 'bg-red-500 text-white shadow-sm shadow-red-500/10'
                                            : 'text-dark-500 hover:text-dark-800'}`}
                                >
                                    <FiArrowUp size={14} /> Stok Keluar
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Pilih Produk</label>
                                <select
                                    value={form.productId}
                                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                                    className="input-field py-2 text-sm"
                                    required
                                >
                                    <option value="">-- Pilih Produk --</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} (Stok saat ini: {p.currentStock})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Jumlah Porsi</label>
                                <input
                                    type="number"
                                    value={form.quantity}
                                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                    className="input-field py-2 text-sm"
                                    min="1"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all 
                                    ${form.type === 'IN'
                                        ? 'bg-accent-600 hover:bg-accent-700'
                                        : 'bg-red-500 hover:bg-red-600'} disabled:opacity-50`}
                            >
                                {submitting ? 'Memproses...' : `Simpan Stok ${form.type === 'IN' ? 'Masuk' : 'Keluar'}`}
                            </button>
                        </form>
                    </div>

                    {/* Movement History Table */}
                    <div className="lg:col-span-2 card p-0">
                        <div className="p-6 pb-2">
                            <h3 className="text-lg font-semibold text-dark-900">Riwayat Pergerakan Stok</h3>
                            <p className="text-xs text-dark-500 mt-0.5">Daftar mutasi stock terbaru serta penyesuaian otomatis database.</p>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="table-container border-0 rounded-none">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Produk</th>
                                            <th>Tipe</th>
                                            <th>Jumlah</th>
                                            <th className="text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.slice(0, 50).map((m) => (
                                            <tr key={m.id} className="hover:bg-dark-50/50 transition-colors">
                                                <td>{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                <td className="font-semibold text-dark-800">{m.product?.name || 'Produk Terhapus'}</td>
                                                <td>
                                                    {m.type === 'IN' ? (
                                                        <span className="badge-success inline-flex items-center gap-1"><FiArrowDown size={10} /> Masuk</span>
                                                    ) : (
                                                        <span className="badge-danger inline-flex items-center gap-1"><FiArrowUp size={10} /> Keluar</span>
                                                    )}
                                                </td>
                                                <td className="font-bold text-dark-900">{m.quantity} porsi</td>
                                                <td>
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenEdit(m)}
                                                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Riwayat"
                                                        >
                                                            <FiEdit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(m.id)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Hapus Riwayat"
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {movements.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-dark-500 italic">Belum ada mutasi pergerakan stok dicatat</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteId}
                title="Hapus Mutasi Stok"
                message="Apakah Anda yakin ingin menghapus catatan mutasi stok ini? Stok produk di database akan disesuaikan (dikurangi/dikembalikan) secara otomatis."
                confirmText="Hapus Riwayat"
                cancelText="Batal"
                onConfirm={handleDeleteMovement}
                onCancel={() => setDeleteId(null)}
            />

            {/* Modal Edit Mutasi Stok */}
            {editingMovement && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-dark-100 animate-scale-up">
                        <div className="mb-4 text-center">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-100">
                                <FiEdit size={22} />
                            </div>
                            <h3 className="text-lg font-bold text-dark-900">Ubah Riwayat Mutasi Stok</h3>
                            <p className="text-xs text-dark-500 mt-1">Ubah catatan jumlah atau tipe pergerakan stok.</p>
                        </div>

                        <div className="space-y-4 my-4">
                            <div className="flex gap-2 p-1 bg-dark-50 rounded-xl border border-dark-100">
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, type: 'IN' })}
                                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all
                                        ${editForm.type === 'IN'
                                            ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/10'
                                            : 'text-dark-500'}`}
                                >
                                    Stok Masuk
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, type: 'OUT' })}
                                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all
                                        ${editForm.type === 'OUT'
                                            ? 'bg-red-500 text-white shadow-sm shadow-red-500/10'
                                            : 'text-dark-500'}`}
                                >
                                    Stok Keluar
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Produk</label>
                                <select
                                    value={editForm.productId}
                                    onChange={(e) => setEditForm({ ...editForm, productId: e.target.value })}
                                    className="input-field py-1.5 text-xs w-full"
                                >
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Stok: {p.currentStock})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Jumlah Porsi</label>
                                <input
                                    type="number"
                                    value={editForm.quantity}
                                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                    className="input-field py-1.5 text-xs w-full"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingMovement(null)}
                                disabled={updating}
                                className="btn-secondary flex-1 py-2 text-xs"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={updating}
                                className="btn-primary flex-1 py-2 text-xs font-bold disabled:opacity-50"
                            >
                                {updating ? 'Menyimpan...' : 'Simpan Edit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
