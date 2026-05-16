import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/transactions
router.get('/', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { startDate, endDate } = req.query;
        const where: any = {};

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                items: { include: { product: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { date: 'desc' },
        });
        res.json({ success: true, data: transactions });
    } catch (error) {
        next(error);
    }
});

// POST /api/transactions (POS)
router.post(
    '/',
    authenticate,
    [
        body('items').isArray({ min: 1 }).withMessage('Minimal 1 item transaksi'),
        body('items.*.productId').notEmpty().withMessage('Product ID wajib'),
        body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity minimal 1'),
    ],
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { items } = req.body;

            // Calculate total and validate stock
            let totalAmount = 0;
            const itemsData: any[] = [];

            for (const item of items) {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                });

                if (!product) {
                    throw new AppError(`Produk dengan ID ${item.productId} tidak ditemukan`, 404);
                }

                if (product.currentStock < item.quantity) {
                    throw new AppError(
                        `Stok ${product.name} tidak mencukupi (tersedia: ${product.currentStock}, diminta: ${item.quantity})`,
                        400
                    );
                }

                const price = product.price;
                totalAmount += price * item.quantity;
                itemsData.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    price,
                });
            }

            // Create transaction and update stock in a transaction
            const transaction = await prisma.$transaction(async (tx) => {
                const trx = await tx.transaction.create({
                    data: {
                        totalAmount,
                        createdBy: req.user!.id,
                        items: {
                            create: itemsData,
                        },
                    },
                    include: {
                        items: { include: { product: true } },
                    },
                });

                // Decrement stock and create stock movements
                for (const item of itemsData) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { currentStock: { decrement: item.quantity } },
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: 'OUT',
                            quantity: item.quantity,
                        },
                    });
                }

                return trx;
            });

            res.status(201).json({ success: true, data: transaction });
        } catch (error) {
            next(error);
        }
    }
);

// GET /api/transactions/daily
router.get('/daily', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const dateStr = req.query.date as string;
        const date = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: { gte: startOfDay, lte: endOfDay },
            },
            include: {
                items: { include: { product: true } },
                user: { select: { id: true, name: true } },
            },
            orderBy: { date: 'desc' },
        });

        const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
        const totalTransactions = transactions.length;

        res.json({
            success: true,
            data: {
                date: startOfDay.toISOString().split('T')[0],
                totalRevenue,
                totalTransactions,
                transactions,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
