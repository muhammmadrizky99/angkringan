
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiUpload, FiFileText, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await api.post('/import/excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult({ success: true, message: res.data.message, count: res.data.count });
            toast.success(res.data.message);
            setFile(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Gagal mengimport data';
            setResult({ success: false, message: msg });
            toast.error(msg);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl lg:text-3xl font-bold text-dark-900">Import Data Excel</h1>
                <p className="text-dark-500">Masukkan data riwayat penjualan angkringan dari file Excel</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Instruksi Card */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="card bg-blue-50 border-blue-100">
                        <div className="flex gap-3">
                            <FiInfo className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-2">Panduan Import</h3>
                                <ul className="text-sm text-blue-800 space-y-2 list-disc pl-4">
                                    <li>Format file: <strong>.xlsx</strong> atau <strong>.csv</strong></li>
                                    <li>Kolom pertama harus bernama <strong>tanggal</strong> (format: YYYY-MM-DD)</li>
                                    <li>Nama kolom lainnya harus sesuai dengan nama teknis produk (contoh: <code>buntut</code>, <code>bakso</code>, <code>ceker</code>)</li>
                                    <li>Baris berisi jumlah terjual setiap harinya</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Card */}
                <div className="lg:col-span-2">
                    <div className="card h-full flex flex-col">
                        <form onSubmit={handleUpload} className="space-y-6 flex-1 flex flex-col">
                            <div 
                                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-colors
                                    ${file ? 'border-primary-500 bg-primary-50' : 'border-dark-200 hover:border-primary-400 hover:bg-dark-50'}`}
                            >
                                <input 
                                    type="file" 
                                    id="file-upload" 
                                    className="hidden" 
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                />
                                <label 
                                    htmlFor="file-upload" 
                                    className="cursor-pointer flex flex-col items-center text-center"
                                >
                                    <div className={`p-4 rounded-full mb-4 ${file ? 'bg-primary-500 text-white' : 'bg-dark-100 text-dark-500'}`}>
                                        {file ? <FiCheckCircle size={32} /> : <FiUpload size={32} />}
                                    </div>
                                    {file ? (
                                        <div>
                                            <p className="font-semibold text-primary-900">{file.name}</p>
                                            <p className="text-sm text-primary-600">File siap diunggah</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-semibold text-dark-900 text-lg">Pilih file Excel</p>
                                            <p className="text-sm text-dark-500">Klik atau seret file ke sini</p>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {result && (
                                <div className={`p-4 rounded-xl flex gap-3 ${result.success ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                                    {result.success ? <FiCheckCircle size={20} className="mt-0.5" /> : <FiAlertCircle size={20} className="mt-0.5" />}
                                    <p className="text-sm font-medium">{result.message}</p>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={!file || uploading}
                                className={`btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 
                                    ${(!file || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <FiFileText size={20} />
                                        Mulai Import Data
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
