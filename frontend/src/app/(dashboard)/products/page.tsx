'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';

interface Product {
    id: string; name: string; category: string; price: number; currentStock: number;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', category: 'Nasi', price: '', currentStock: '' });
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data.data);
        } catch { toast.error('Gagal memuat produk'); }
        finally { setLoading(false); }
    };

    const openModal = (product?: Product) => {
        if (product) {
            setEditing(product);
            setForm({ name: product.name, category: product.category, price: String(product.price), currentStock: String(product.currentStock) });
        } else {
            setEditing(null);
            setForm({ name: '', category: 'Nasi', price: '', currentStock: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = { name: form.name, category: form.category, price: parseFloat(form.price), currentStock: parseInt(form.currentStock) };
            if (editing) {
                await api.put(`/products/${editing.id}`, data);
                toast.success('Produk berhasil diperbarui');
            } else {
                await api.post('/products', data);
                toast.success('Produk berhasil ditambahkan');
            }
            setShowModal(false);
            fetchProducts();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/products/${deleteTarget.id}`);
            toast.success('Produk berhasil dihapus');
            fetchProducts();
        } catch { toast.error('Gagal menghapus produk'); }
        finally { setDeleteTarget(null); }
    };

    const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Kelola Produk</h1>
                    <p className="text-dark-500 mt-1">Tambah, edit, dan hapus produk angkringan</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
                    <FiPlus size={16} /> Tambah Produk
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="card p-0">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Nama</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id}>
                                        <td className="font-medium">{p.name}</td>
                                        <td><span className="badge-primary">{p.category}</span></td>
                                        <td>{formatCurrency(p.price)}</td>
                                        <td>
                                            <span className={p.currentStock < 10 ? 'text-red-500 font-semibold' : ''}>{p.currentStock}</span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button onClick={() => openModal(p)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><FiEdit2 size={16} /></button>
                                                <button onClick={() => setDeleteTarget(p)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><FiTrash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-dark-100">
                            <h3 className="text-lg font-semibold">{editing ? 'Edit Produk' : 'Tambah Produk'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-100 rounded-lg transition-colors"><FiX size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Nama Produk</label>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Kategori</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                                    <option value="Nasi">Nasi</option>
                                    <option value="Sate">Sate</option>
                                    <option value="Lauk">Lauk</option>
                                    <option value="Gorengan">Gorengan</option>
                                    <option value="Minuman">Minuman</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Harga (Rp)</label>
                                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" min="0" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Stok Awal</label>
                                <input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} className="input-field" min="0" required />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Batal</button>
                                <button type="submit" className="btn-primary flex-1">{editing ? 'Simpan' : 'Tambah'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Hapus Produk"
                message={`Anda yakin ingin menghapus produk "${deleteTarget?.name}"? Data yang sudah dihapus tidak dapat dikembalikan.`}
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
