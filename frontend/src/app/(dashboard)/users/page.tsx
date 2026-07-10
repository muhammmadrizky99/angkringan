'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';

interface User {
    id: string; name: string; email: string; role: string; createdAt: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data.data);
        } catch { toast.error('Gagal memuat pengguna'); }
        finally { setLoading(false); }
    };

    const openModal = (user?: User) => {
        if (user) {
            setEditing(user);
            setForm({ name: user.name, email: user.email, password: '', role: user.role });
        } else {
            setEditing(null);
            setForm({ name: '', email: '', password: '', role: 'ADMIN' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data: any = { name: form.name, email: form.email, role: form.role };
            if (form.password) data.password = form.password;

            if (editing) {
                await api.put(`/users/${editing.id}`, data);
                toast.success('Pengguna berhasil diperbarui');
            } else {
                if (!form.password) { toast.error('Password wajib diisi'); return; }
                data.password = form.password;
                await api.post('/users', data);
                toast.success('Pengguna berhasil ditambahkan');
            }
            setShowModal(false);
            fetchUsers();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/users/${deleteTarget.id}`);
            toast.success('Pengguna berhasil dihapus');
            fetchUsers();
        } catch { toast.error('Gagal menghapus'); }
        finally { setDeleteTarget(null); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Kelola Pengguna</h1>
                    <p className="text-dark-500 mt-1">Kelola akun pengguna sistem</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
                    <FiPlus size={16} /> Tambah Pengguna
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="card p-0">
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Dibuat</th><th className="text-center">Aksi</th></tr></thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="font-medium">{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={u.role === 'SUPERADMIN' ? 'badge bg-primary-100 text-primary-700' : 'badge bg-accent-100 text-accent-700'}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>{new Date(u.createdAt).toLocaleDateString('id-ID')}</td>
                                        <td className="text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button onClick={() => openModal(u)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><FiEdit2 size={16} /></button>
                                                <button onClick={() => setDeleteTarget(u)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><FiTrash2 size={16} /></button>
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
                            <h3 className="text-lg font-semibold">{editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-dark-100 rounded-lg transition-colors"><FiX size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Nama</label>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Email</label>
                                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Password {editing && '(kosongkan jika tidak diubah)'}</label>
                                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" {...(!editing && { required: true })} minLength={6} />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-dark-700 block mb-1">Role</label>
                                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPERADMIN">Superadmin</option>
                                </select>
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
                title="Hapus Pengguna"
                message={`Anda yakin ingin menghapus pengguna "${deleteTarget?.name}"? Akun ini akan dihapus secara permanen.`}
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
