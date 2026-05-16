import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'SPK Angkringan - Prediksi Permintaan Produk',
    description: 'Sistem Pendukung Keputusan Prediksi Permintaan Produk Harian pada Angkringan Berbasis XGBoost',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id">
            <body>{children}</body>
        </html>
    );
}
