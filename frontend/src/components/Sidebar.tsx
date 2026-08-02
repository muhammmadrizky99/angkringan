'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import {
    FiHome, FiShoppingCart, FiPackage, FiUsers, FiTruck,
    FiTrendingUp, FiFileText, FiLogOut, FiMenu, FiX, FiBox, FiCalendar,
    FiChevronLeft, FiChevronRight, FiUpload
} from 'react-icons/fi';
import { useState, useEffect } from 'react';
import ConfirmModal from './ConfirmModal';

const menuSections = [
    {
        label: 'Menu Utama',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: FiHome, roles: ['SUPERADMIN', 'ADMIN'] },
            { href: '/pos', label: 'Point of Sale', icon: FiShoppingCart, roles: ['SUPERADMIN', 'ADMIN'] },
        ],
    },
    {
        label: 'Manajemen',
        items: [
            { href: '/products', label: 'Produk', icon: FiPackage, roles: ['SUPERADMIN'] },
            { href: '/stock', label: 'Stok', icon: FiBox, roles: ['SUPERADMIN', 'ADMIN'] },
            { href: '/suppliers', label: 'Supplier', icon: FiTruck, roles: ['SUPERADMIN'] },
            { href: '/users', label: 'Pengguna', icon: FiUsers, roles: ['SUPERADMIN'] },
            { href: '/import', label: 'Import Data', icon: FiUpload, roles: ['SUPERADMIN'] },
        ],
    },
    {
        label: 'Analitik',
        items: [
            { href: '/predictions', label: 'Prediksi', icon: FiTrendingUp, roles: ['SUPERADMIN', 'ADMIN'] },
            { href: '/daily-records', label: 'Catatan Harian', icon: FiCalendar, roles: ['SUPERADMIN', 'ADMIN'] },
            { href: '/reports', label: 'Laporan', icon: FiFileText, roles: ['SUPERADMIN', 'ADMIN'] },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const getInitials = (name: string) => {
        return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
    };

    const handleLogout = () => {
        setShowLogoutConfirm(false);
        logout();
    };

    const sidebarWidth = isCollapsed ? 'w-20' : 'w-72';

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white shadow-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                aria-label="Toggle menu"
            >
                {isMobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>

            {/* Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full ${sidebarWidth} text-white z-40 transition-all duration-300 flex flex-col border-r border-white/5
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
                style={{ background: 'var(--gradient-hero)' }}
            >
                {/* Logo */}
                <div className="p-5 border-b border-dark-700/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                            <img src="/images/logo1.jpeg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        {!isCollapsed && (
                            <div className="animate-fade-in overflow-hidden">
                                <h1 className="text-base font-bold tracking-tight leading-tight">Angkringan Agoy</h1>
                                <p className="text-[11px] text-dark-400 leading-tight">Sistem Prediksi Stok</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* User info */}
                {!isCollapsed ? (
                    <div className="p-3 mx-3 mt-4 rounded-xl bg-dark-800/60 border border-dark-700/40 flex-shrink-0">
                        <div className="flex items-center gap-3">

                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{user?.name}</p>
                                <span className={`mt-0.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-md
                                    ${user?.role === 'SUPERADMIN' ? 'bg-primary-500/15 text-primary-300' : 'bg-accent-500/15 text-accent-300'}`}>
                                    {user?.role === 'SUPERADMIN' ? 'Super Admin' : 'Admin'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 flex justify-center flex-shrink-0">
                        <div className="w-10 h-10 flex items-center justify-center">
                            <FiUsers size={20} className="text-dark-300" />
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="mt-5 px-3 flex-1 overflow-y-auto space-y-5 scrollbar-thin">
                    {menuSections.map((section) => {
                        const visibleItems = section.items.filter(
                            (item) => user && item.roles.includes(user.role)
                        );
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.label}>
                                {!isCollapsed && (
                                    <p className="text-[10px] font-bold text-dark-500 uppercase tracking-[0.15em] px-3 mb-2">
                                        {section.label}
                                    </p>
                                )}
                                <div className="space-y-0.5">
                                    {visibleItems.map((item) => {
                                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group
                                                    ${isActive
                                                        ? 'bg-primary-500/10 text-primary-400'
                                                        : 'text-dark-400 hover:bg-dark-800/80 hover:text-dark-200'
                                                    }
                                                    ${isCollapsed ? 'justify-center' : ''}`}
                                                title={isCollapsed ? item.label : undefined}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary-400 rounded-r-full" />
                                                )}
                                                <Icon size={18} className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary-400' : ''}`} />
                                                {!isCollapsed && <span>{item.label}</span>}
                                                {isCollapsed && (
                                                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-dark-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-lg z-50">
                                                        {item.label}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="flex-shrink-0 border-t border-dark-700/50 p-3 space-y-1">
                    {/* Collapse toggle (desktop only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={`hidden lg:flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-dark-400 hover:bg-dark-800/80 hover:text-dark-200 transition-all duration-200
                            ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        {isCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
                        {!isCollapsed && 'Tutup Sidebar'}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200
                            ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <FiLogOut size={18} />
                        {!isCollapsed && 'Keluar'}
                    </button>
                </div>
            </aside>

            {/* Logout Confirmation */}
            <ConfirmModal
                isOpen={showLogoutConfirm}
                title="Keluar dari Sistem"
                message="Anda yakin ingin keluar? Sesi Anda akan berakhir dan Anda perlu login kembali."
                confirmText="Ya, Keluar"
                cancelText="Batal"
                variant="warning"
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </>
    );
}
