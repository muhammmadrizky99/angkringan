'use client';

import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { useEffect } from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const variantStyles = {
    danger: {
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        btnClass: 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200',
    },
    warning: {
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-500',
        btnClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200',
    },
    info: {
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        btnClass: 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200',
    },
};

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    variant = 'danger',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const styles = variantStyles[variant];

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        if (isOpen) document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-dark-300 hover:text-dark-600 transition-colors"
                >
                    <FiX size={18} />
                </button>

                <div className={`w-14 h-14 rounded-2xl ${styles.iconBg} flex items-center justify-center mx-auto mb-4`}>
                    <FiAlertTriangle size={26} className={styles.iconColor} />
                </div>

                <h3 className="text-lg font-bold text-dark-900 text-center mb-2">{title}</h3>
                <p className="text-sm text-dark-400 text-center leading-relaxed mb-6">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-dark-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${styles.btnClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
