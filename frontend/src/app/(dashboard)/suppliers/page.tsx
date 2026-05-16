'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';

interface Supplier {
    id: string; name: string; phone: string; address: string;
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

    useEffect(() => { fetchSuppliers(); }, []);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data.data);
        } catch { toast.error('Gagal memuat supplier'); }
        finally { setLoading(false); }
    };

    const openModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditing(supplier);
            setForm({ name: supplier.name, phone: supplier.phone, address: supplier.address });
        } else {
            setEditing(null);
            setForm({ name: '', phone: '', address: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/suppliers/${editing.id}`, form);
                toast.success('Supplier berhasil diperbarui');
            } else {
                await api.post('/suppliers', form);
                toast.success('Supplier berhasil ditambahkan');
            }
            setShowModal(false);
            fetchSuppliers();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/suppliers/${deleteTarget.id}`);
            toast.success('Supplier berhasil dihapus');
            fetchSuppliers();
        } catch { toast.error('Gagal menghapus'); }
        finally { setDeleteTarget(null); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Kelola Supplier</h1>
                    <p className="text-dark-500 mt-1">Kelola data supplier bahan baku</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
                    <FiPlus size={16} /> Tambah Supplier
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="card p-0">
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Nama</th><th>Telepon</th><th>Alamat</th><th>Aksi</th></tr></thead>
                            <tbody>
                                {suppliers.map((s) => (
                                    <tr key={s.id}>
                                        <td className="font-medium">{s.name}</td>
                                        <td>{s.phone}</td>
                                        <td className="max-w-xs truncate">{s.address}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button onClick={() => openModal(s)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><FiEdit2 size={16} /></button>
                                                <button onClick={() => setDeleteTarget(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><FiTrash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-dark-100">
                            <h3 className="text-lg font-semibold">{editing ? 'Edit Supplier' : 'Tambah Supplier'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-100 rounded-lg transition-colors"><FiX size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Nama Supplier</label>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Telepon</label>
                                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Alamat</label>
                                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" rows={3} required />
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
                title="Hapus Supplier"
                message={`Anda yakin ingin menghapus supplier "${deleteTarget?.name}"? Data yang sudah dihapus tidak dapat dikembalikan.`}
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
