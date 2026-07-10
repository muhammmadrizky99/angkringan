'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import {
    FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiCheck,
    FiSearch, FiX, FiCheckCircle, FiBox
} from 'react-icons/fi';

interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    currentStock: number;
}

interface CartItem {
    product: Product;
    quantity: number;
}



export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastTotal, setLastTotal] = useState(0);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data.data);
        } catch {
            toast.error('Gagal memuat produk');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product: Product) => {
        const existing = cart.find((item) => item.product.id === product.id);
        if (existing) {
            if (existing.quantity >= product.currentStock) {
                toast.error(`Stok ${product.name} tidak mencukupi`);
                return;
            }
            setCart(cart.map((item) =>
                item.product.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            if (product.currentStock <= 0) {
                toast.error(`${product.name} habis`);
                return;
            }
            setCart([...cart, { product, quantity: 1 }]);
        }
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map((item) => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return item;
                if (newQty > item.product.currentStock) {
                    toast.error('Melebihi stok tersedia');
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter((item) => item.product.id !== productId));
    };

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error('Keranjang kosong');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/transactions', {
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                })),
            });
            setLastTotal(total);
            setShowReceipt(true);
            setCart([]);
            fetchProducts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Transaksi gagal');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
    };

    const categories = useMemo(() =>
        Array.from(new Set(products.map((p) => p.category))),
        [products]
    );

    const filtered = useMemo(() =>
        products.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchCategory = !activeCategory || p.category === activeCategory;
            return matchSearch && matchCategory;
        }),
        [products, search, activeCategory]
    );

    return (
        <div className="space-y-5">
            <PageHeader
                title="Point of Sale"
                description="Catat transaksi penjualan"
                icon={<FiShoppingCart size={20} className="text-white" />}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari produk..."
                            className="input-field pl-11 pr-10"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 transition-colors">
                                <FiX size={16} />
                            </button>
                        )}
                    </div>

                    {/* Category pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                                ${!activeCategory ? 'bg-dark-900 text-white shadow-sm' : 'bg-white text-dark-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            Semua
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                                    ${activeCategory === cat ? 'bg-dark-900 text-white shadow-sm' : 'bg-white text-dark-500 border border-slate-200 hover:bg-slate-50'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Products grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="skeleton h-28 rounded-2xl" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={<FiSearch size={28} />}
                            title="Produk tidak ditemukan"
                            description="Coba ubah kata kunci atau filter kategori"
                        />
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filtered.map((product) => {
                                const inCart = cart.find(c => c.product.id === product.id);
                                const soldOut = product.currentStock <= 0;
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={soldOut}
                                        className={`card text-left p-4 group transition-all duration-200 relative
                                            ${soldOut ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary-300 hover:shadow-card-hover cursor-pointer active:scale-[0.98]'}
                                            ${inCart ? 'border-primary-200 bg-primary-50/30' : ''}`}
                                    >
                                        {inCart && (
                                            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold animate-scale-in">
                                                {inCart.quantity}
                                            </div>
                                        )}
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                                            <FiBox className="text-slate-400" size={20} />
                                        </div>
                                        <p className="font-semibold text-dark-900 text-sm group-hover:text-primary-600 transition-colors leading-tight">{product.name}</p>
                                        <p className="text-primary-500 font-bold mt-1.5 text-sm">{formatCurrency(product.price)}</p>
                                        <p className={`text-xs mt-1 ${product.currentStock < 10 ? 'text-red-400' : 'text-dark-400'}`}>
                                            {soldOut ? 'Habis' : `Stok: ${product.currentStock}`}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Cart */}
                <div className="card h-fit lg:sticky lg:top-4 animate-slide-in-right">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                            <FiShoppingCart size={18} className="text-primary-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-dark-900 text-sm">Keranjang</h3>
                            {cart.length > 0 && (
                                <p className="text-xs text-dark-400">{totalItems} item</p>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
                                Hapus Semua
                            </button>
                        )}
                    </div>

                    {cart.length === 0 ? (
                        <div className="text-center py-10 text-dark-300">
                            <FiShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Ketuk produk untuk menambahkan</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {cart.map((item) => (
                                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl animate-fade-in">
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                        <FiBox size={14} className="text-dark-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-dark-900 text-sm truncate">{item.product.name}</p>
                                        <p className="text-xs text-primary-500 font-semibold">{formatCurrency(item.product.price)}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => updateQuantity(item.product.id, -1)}
                                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-dark-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                        >
                                            <FiMinus size={12} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.product.id, 1)}
                                            className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 text-primary-600 flex items-center justify-center hover:bg-primary-100 transition-colors"
                                        >
                                            <FiPlus size={12} />
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-dark-900 w-20 text-right">{formatCurrency(item.product.price * item.quantity)}</p>
                                    <button
                                        onClick={() => removeFromCart(item.product.id)}
                                        className="text-dark-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            <div className="pt-4 border-t border-slate-100 mt-3 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-dark-500">Total ({totalItems} item)</span>
                                    <span className="text-2xl font-bold gradient-text">{formatCurrency(total)}</span>
                                </div>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="btn-success w-full flex items-center justify-center gap-2.5 py-3.5 disabled:opacity-50 text-base"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <FiCheck size={20} />
                                            Bayar {formatCurrency(total)}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="modal-backdrop" onClick={() => setShowReceipt(false)}>
                    <div className="modal-content text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="w-16 h-16 rounded-full bg-accent-50 flex items-center justify-center mx-auto mb-4">
                            <FiCheckCircle size={32} className="text-accent-500" />
                        </div>
                        <h3 className="text-xl font-bold text-dark-900 mb-1">Transaksi Berhasil</h3>
                        <p className="text-dark-400 text-sm mb-4">Pembayaran telah dicatat ke dalam sistem</p>
                        <div className="bg-slate-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-dark-500">Total Pembayaran</p>
                            <p className="text-3xl font-bold gradient-text mt-1">{formatCurrency(lastTotal)}</p>
                        </div>
                        <button onClick={() => setShowReceipt(false)} className="btn-primary w-full">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
