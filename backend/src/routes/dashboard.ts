import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/sales-chart
router.get('/sales-chart', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const transactions = await prisma.transaction.findMany({
            where: { date: { gte: thirtyDaysAgo } },
            include: { items: true },
            orderBy: { date: 'asc' },
        });

        // Aggregate by date
        const dailyData: { [key: string]: { revenue: number; items: number } } = {};

        // Fill in all 30 days
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyData[key] = { revenue: 0, items: 0 };
        }

        transactions.forEach((t) => {
            const key = t.date.toISOString().split('T')[0];
            if (dailyData[key]) {
                dailyData[key].revenue += t.totalAmount;
                dailyData[key].items += t.items.reduce((sum, item) => sum + item.quantity, 0);
            }
        });

        const chartData = Object.entries(dailyData).map(([date, data]) => ({
            date,
            revenue: Math.round(data.revenue),
            items: data.items,
        }));

        res.json({ success: true, data: chartData });
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/prediction-chart
router.get('/prediction-chart', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get actual sales data
        const transactions = await prisma.transaction.findMany({
            where: { date: { gte: thirtyDaysAgo } },
            include: { items: true },
        });

        const actualSales: { [key: string]: number } = {};
        transactions.forEach((t) => {
            const key = t.date.toISOString().split('T')[0];
            actualSales[key] = (actualSales[key] || 0) + t.items.reduce((sum, i) => sum + i.quantity, 0);
        });

        // Get predictions
        const predictions = await prisma.prediction.findMany({
            where: { predictionDate: { gte: thirtyDaysAgo } },
        });

        const predictedSales: { [key: string]: number } = {};
        predictions.forEach((p) => {
            const key = p.predictionDate.toISOString().split('T')[0];
            predictedSales[key] = (predictedSales[key] || 0) + p.predictedQuantity;
        });

        // Merge and fill
        const chartData: any[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            chartData.push({
                date: key,
                actual: actualSales[key] || 0,
                predicted: predictedSales[key] || 0,
            });
        }

        res.json({ success: true, data: chartData });
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/stock-summary
router.get('/stock-summary', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                category: true,
                currentStock: true,
                price: true,
            },
            orderBy: { currentStock: 'asc' },
        });

        const lowStock = products.filter((p) => p.currentStock < 10);
        const totalProducts = products.length;
        const totalStockValue = products.reduce((sum, p) => sum + p.currentStock * p.price, 0);

        res.json({
            success: true,
            data: {
                products,
                lowStock,
                totalProducts,
                totalStockValue: Math.round(totalStockValue),
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/summary
router.get('/summary', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todayTransactions, totalProducts, totalSuppliers, totalUsers] = await Promise.all([
            prisma.transaction.findMany({
                where: { date: { gte: today, lt: tomorrow } },
            }),
            prisma.product.count(),
            prisma.supplier.count(),
            prisma.user.count(),
        ]);

        const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

        res.json({
            success: true,
            data: {
                todayRevenue: Math.round(todayRevenue),
                todayTransactions: todayTransactions.length,
                totalProducts,
                totalSuppliers,
                totalUsers,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
