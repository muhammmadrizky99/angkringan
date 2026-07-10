import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as XLSX from 'xlsx';

const router = Router();

// GET /api/reports/sales
router.get('/sales', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { startDate, endDate } = req.query;

        let start: Date;
        let end: Date;

        if (!startDate || !endDate) {
            // Default to current month
            const now = new Date();
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else {
            start = new Date(startDate as string);
            start.setHours(0, 0, 0, 0);
            end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
        }

        const transactions = await prisma.transaction.findMany({
            where: { date: { gte: start, lte: end } },
            include: {
                items: { include: { product: true } },
                user: { select: { name: true } },
            },
            orderBy: { date: 'asc' },
        });

        // Aggregate by product
        const productSales: { [key: string]: { name: string; category: string; totalQty: number; totalRevenue: number } } = {};

        transactions.forEach((t) => {
            t.items.forEach((item) => {
                const key = item.productId;
                if (!productSales[key]) {
                    productSales[key] = {
                        name: item.product.name,
                        category: item.product.category,
                        totalQty: 0,
                        totalRevenue: 0,
                    };
                }
                productSales[key].totalQty += item.quantity;
                productSales[key].totalRevenue += item.price * item.quantity;
            });
        });

        const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

        res.json({
            success: true,
            data: {
                period: {
                    startDate: startDate ? startDate as string : start.toISOString().split('T')[0],
                    endDate: endDate ? endDate as string : end.toISOString().split('T')[0]
                },
                totalTransactions: transactions.length,
                totalRevenue: Math.round(totalRevenue),
                productSales: Object.values(productSales),
                transactions,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/reports/export
router.get(
    '/export',
    authenticate,
    authorize('SUPERADMIN'),
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const { startDate, endDate } = req.query;

            let start: Date;
            let end: Date;

            if (!startDate || !endDate) {
                const now = new Date();
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            } else {
                start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
            }

            const transactions = await prisma.transaction.findMany({
                where: { date: { gte: start, lte: end } },
                include: {
                    items: { include: { product: true } },
                    user: { select: { name: true } },
                },
                orderBy: { date: 'asc' },
            });

            // Prepare Excel data
            const rows: any[] = [];
            transactions.forEach((t) => {
                t.items.forEach((item) => {
                    rows.push({
                        Tanggal: t.date.toISOString().split('T')[0],
                        'ID Transaksi': t.id.slice(0, 8),
                        Kasir: t.user.name,
                        Produk: item.product.name,
                        Kategori: item.product.category,
                        Jumlah: item.quantity,
                        Harga: item.price,
                        Subtotal: item.price * item.quantity,
                    });
                });
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');

            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=laporan_${startDate || 'default'}_${endDate || 'default'}.xlsx`
            );
            res.send(buffer);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
