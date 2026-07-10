'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiSearch, FiDatabase } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    currentStock: number;
}

const CATEGORY_TABS = ['Semua', 'Nasi', 'Sate', 'Lauk', 'Gorengan', 'Minuman'];

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', category: 'Nasi', price: '', currentStock: '' });
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Semua');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data.data || []);
        } catch {
            toast.error('Gagal memuat produk');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (product?: Product) => {
        if (product) {
            setEditing(product);
            setForm({
                name: product.name,
                category: product.category,
                price: String(product.price),
                currentStock: String(product.currentStock)
            });
        } else {
            setEditing(null);
            setForm({ name: '', category: 'Nasi', price: '', currentStock: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                name: form.name,
                category: form.category,
                price: parseFloat(form.price),
                currentStock: parseInt(form.currentStock)
            };
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
        } catch {
            toast.error('Gagal menghapus produk');
        } finally {
            setDeleteTarget(null);
        }
    };

    // Client-side filtering logic
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Kelola Produk</h1>
                    <p className="text-dark-500 mt-1">Tambah, edit, cari, dan hapus menu kuliner angkringan Anda.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto py-2.5 px-4 font-bold"
                >
                    <FiPlus size={16} /> Tambah Produk
                </button>
            </div>

            {/* Search & Category Filter Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-dark-100 shadow-sm">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400">
                        <FiSearch size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Cari nama produk atau kategori..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10 pr-4 py-2 text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-600"
                        >
                            <FiX size={16} />
                        </button>
                    )}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setSelectedCategory(tab)}
                            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-all duration-200
                                ${selectedCategory === tab
                                    ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/10'
                                    : 'bg-dark-50 text-dark-500 hover:bg-dark-100 hover:text-dark-800'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="card p-0">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama Produk</th>
                                    <th>Kategori</th>
                                    <th>Harga Porsi</th>
                                    <th>Stok Saat Ini</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((p) => (
                                    <tr key={p.id} className="hover:bg-dark-50/40 transition-colors">
                                        <td className="font-bold text-dark-800">{p.name}</td>
                                        <td>
                                            <span className="badge-primary font-semibold">{p.category}</span>
                                        </td>
                                        <td className="font-semibold text-dark-700">{formatCurrency(p.price)}</td>
                                        <td>
                                            <span className={`inline-flex items-center gap-1 font-bold ${p.currentStock < 10 ? 'text-red-500' : 'text-dark-800'}`}>
                                                {p.currentStock} {p.currentStock < 10 ? '(Kritis)' : 'porsi'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => openModal(p)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                                                    title="Ubah Produk"
                                                >
                                                    <FiEdit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(p)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                                    title="Hapus Produk"
                                                >
                                                    <FiTrash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-dark-500 italic">
                                            Tidak ada produk yang cocok dengan kriteria pencarian Anda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Add / Edit Product */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-up">
                        <div className="flex items-center justify-between p-6 border-b border-dark-100">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary-50 text-primary-500 rounded-lg">
                                    <FiDatabase size={18} />
                                </div>
                                <h3 className="text-lg font-bold text-dark-900">
                                    {editing ? 'Sempurnakan Produk' : 'Tambah Produk Kuliner'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-dark-100 rounded-lg transition-colors text-dark-500"
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Nama Produk</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="input-field py-2 text-sm"
                                    placeholder="misal: Nasi Bakar Cumi"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Kategori Menu</label>
                                <select
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="input-field py-2 text-sm"
                                >
                                    <option value="Nasi">Nasi</option>
                                    <option value="Sate">Sate</option>
                                    <option value="Lauk">Lauk</option>
                                    <option value="Gorengan">Gorengan</option>
                                    <option value="Minuman">Minuman</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Harga (Rp)</label>
                                <input
                                    type="number"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    className="input-field py-2 text-sm"
                                    min="0"
                                    placeholder="Harga porsi"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-dark-700 block mb-1">Stok Awal</label>
                                <input
                                    type="number"
                                    value={form.currentStock}
                                    disabled={!!editing}
                                    onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                                    className="input-field py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    min="0"
                                    placeholder="Jumlah porsi tersedia"
                                    required
                                />
                                {editing && (
                                    <p className="text-[10px] text-dark-400 mt-1">
                                        *Untuk mengedit jumlah stok yang aktif, gunakan menu <strong>Kelola Stok</strong>.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-secondary flex-1 py-2 text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 py-2 text-sm font-bold"
                                >
                                    {editing ? 'Simpan Edit' : 'Tambah Produk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Hapus Produk Kuliner"
                message={`Apakah Anda yakin ingin menghapus produk "${deleteTarget?.name}"? Seluruh data penjualan dan mutasi stok berkaitan dengan produk ini akan terpengaruh.`}
                confirmText="Ya, Hapus Permanen"
                cancelText="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
