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

            // Group items by productId to prevent bypassing stock check with duplicate item entries
            const aggregatedItems: Record<string, number> = {};
            for (const item of items) {
                const qty = Number(item.quantity);
                if (aggregatedItems[item.productId]) {
                    aggregatedItems[item.productId] += qty;
                } else {
                    aggregatedItems[item.productId] = qty;
                }
            }

            // Calculate total and validate stock
            let totalAmount = 0;
            const itemsData: any[] = [];

            for (const [productId, quantity] of Object.entries(aggregatedItems)) {
                const product = await prisma.product.findUnique({
                    where: { id: productId },
                });

                if (!product) {
                    throw new AppError(`Produk tidak ditemukan`, 404);
                }

                if (product.currentStock < quantity) {
                    throw new AppError(
                        `Stok ${product.name} tidak mencukupi (tersedia: ${product.currentStock}, diminta: ${quantity})`,
                        400
                    );
                }

                const price = product.price;
                totalAmount += price * quantity;
                itemsData.push({
                    productId: productId,
                    quantity: quantity,
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

// DELETE /api/transactions/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!transaction) {
            throw new AppError('Transaksi tidak ditemukan', 404);
        }

        await prisma.$transaction(async (tx) => {
            // Revert stock for each item
            for (const item of transaction.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { currentStock: { increment: item.quantity } },
                });

                // Create stock movement for the returned items
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: 'IN',
                        quantity: item.quantity,
                    },
                });
            }

            // TransactionItems are cascade deleted by Prisma if configured, 
            // but let's delete them explicitly just to be safe
            await tx.transactionItem.deleteMany({
                where: { transactionId: id }
            });

            // Delete transaction
            await tx.transaction.delete({
                where: { id },
            });
        });

        res.json({ success: true, message: 'Transaksi berhasil dihapus dan stok telah dikembalikan' });
    } catch (error) {
        next(error);
    }
});

// PUT /api/transactions/:id
router.put(
    '/:id',
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

            const { id } = req.params;
            const { items, date } = req.body;

            const existingTransaction = await prisma.transaction.findUnique({
                where: { id },
                include: { items: true },
            });

            if (!existingTransaction) {
                throw new AppError('Transaksi tidak ditemukan', 404);
            }

            // Perform everything in a single transaction
            const updatedTransaction = await prisma.$transaction(async (tx) => {
                // 1. Revert old items stock
                for (const oldItem of existingTransaction.items) {
                    await tx.product.update({
                        where: { id: oldItem.productId },
                        data: { currentStock: { increment: oldItem.quantity } },
                    });
                    
                    await tx.stockMovement.create({
                        data: { productId: oldItem.productId, type: 'IN', quantity: oldItem.quantity }
                    });
                }

                // 2. Delete old items
                await tx.transactionItem.deleteMany({
                    where: { transactionId: id }
                });

                // 3. Process new items and calculate total
                let totalAmount = 0;
                const newItemsData: any[] = [];

                // Group items by productId to prevent bypassing stock check with duplicate item entries
                const aggregatedItems: Record<string, number> = {};
                for (const item of items) {
                    const qty = Number(item.quantity);
                    if (aggregatedItems[item.productId]) {
                        aggregatedItems[item.productId] += qty;
                    } else {
                        aggregatedItems[item.productId] = qty;
                    }
                }

                for (const [productId, quantity] of Object.entries(aggregatedItems)) {
                    const product = await tx.product.findUnique({
                        where: { id: productId },
                    });

                    if (!product) {
                        throw new AppError(`Produk tidak ditemukan`, 404);
                    }

                    // Check if stock is sufficient. Note: We temporarily add the old stock quantity in our frontend check,
                    // but since we are inside db transaction, the old stock is already reverted (incremented) in step 1!
                    // So product.currentStock here represents the live stock AFTER reverting old items.
                    if (product.currentStock < quantity) {
                        throw new AppError(
                            `Stok ${product.name} tidak mencukupi (tersedia: ${product.currentStock}, diminta: ${quantity})`,
                            400
                        );
                    }

                    const price = product.price;
                    totalAmount += price * quantity;
                    newItemsData.push({
                        productId: productId,
                        quantity: quantity,
                        price,
                    });

                    // Decrement stock for new items
                    await tx.product.update({
                        where: { id: productId },
                        data: { currentStock: { decrement: quantity } },
                    });

                    await tx.stockMovement.create({
                        data: { productId: productId, type: 'OUT', quantity: quantity }
                    });
                }

                // 4. Update transaction
                const updateData: any = {
                    totalAmount,
                    items: {
                        create: newItemsData,
                    },
                };
                
                if (date) {
                    updateData.date = new Date(date);
                }

                const trx = await tx.transaction.update({
                    where: { id },
                    data: updateData,
                    include: {
                        items: { include: { product: true } },
                    },
                });

                return trx;
            });

            res.json({ success: true, data: updatedTransaction });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
