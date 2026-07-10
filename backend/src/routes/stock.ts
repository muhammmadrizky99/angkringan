import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/stock/movements
router.get('/movements', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { productId, type, startDate, endDate } = req.query;
        const where: any = {};

        if (productId) where.productId = productId;
        if (type) where.type = type;
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        const movements = await prisma.stockMovement.findMany({
            where,
            include: { product: true },
            orderBy: { date: 'desc' },
        });
        res.json({ success: true, data: movements });
    } catch (error) {
        next(error);
    }
});

// POST /api/stock/in
router.post(
    '/in',
    authenticate,
    [
        body('productId').notEmpty().withMessage('Product ID wajib'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity minimal 1'),
    ],
    async (req: any, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { productId, quantity } = req.body;

            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (!product) throw new AppError('Produk tidak ditemukan', 404);

            const [movement] = await prisma.$transaction([
                prisma.stockMovement.create({
                    data: { productId, type: 'IN', quantity },
                    include: { product: true },
                }),
                prisma.product.update({
                    where: { id: productId },
                    data: { currentStock: { increment: quantity } },
                }),
            ]);

            res.status(201).json({ success: true, data: movement });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/stock/out
router.post(
    '/out',
    authenticate,
    [
        body('productId').notEmpty().withMessage('Product ID wajib'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity minimal 1'),
    ],
    async (req: any, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { productId, quantity } = req.body;

            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (!product) throw new AppError('Produk tidak ditemukan', 404);

            if (product.currentStock < quantity) {
                throw new AppError(
                    `Stok tidak mencukupi (tersedia: ${product.currentStock})`,
                    400
                );
            }

            const [movement] = await prisma.$transaction([
                prisma.stockMovement.create({
                    data: { productId, type: 'OUT', quantity },
                    include: { product: true },
                }),
                prisma.product.update({
                    where: { id: productId },
                    data: { currentStock: { decrement: quantity } },
                }),
            ]);

            res.status(201).json({ success: true, data: movement });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/stock/movements/:id
router.delete('/movements/:id', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { id } = req.params;

        const movement = await prisma.stockMovement.findUnique({
            where: { id },
        });

        if (!movement) {
            throw new AppError('Pergerakan stok tidak ditemukan', 404);
        }

        await prisma.$transaction(async (tx) => {
            if (movement.type === 'IN') {
                // Reverting IN means subtracting from stock. Ensure it doesn't drop below 0.
                const product = await tx.product.findUnique({ where: { id: movement.productId } });
                if (!product) throw new AppError('Produk tidak ditemukan', 404);
                if (product.currentStock < movement.quantity) {
                    throw new AppError(
                        `Gagal menghapus! Pembatalan stok masuk ini akan menyebabkan stok ${product.name} menjadi negatif (Stok saat ini: ${product.currentStock}, Jumlah dibatalkan: ${movement.quantity})`,
                        400
                    );
                }
                await tx.product.update({
                    where: { id: movement.productId },
                    data: { currentStock: { decrement: movement.quantity } },
                });
            } else {
                // Reverting OUT means returning stock
                await tx.product.update({
                    where: { id: movement.productId },
                    data: { currentStock: { increment: movement.quantity } },
                });
            }

            await tx.stockMovement.delete({
                where: { id },
            });
        });

        res.json({ success: true, message: 'Riwayat pergerakan stok berhasil dihapus' });
    } catch (error) {
        next(error);
    }
});

// PUT /api/stock/movements/:id
router.put(
    '/movements/:id',
    authenticate,
    [
        body('productId').notEmpty().withMessage('Product ID wajib'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantity minimal 1'),
        body('type').isIn(['IN', 'OUT']).withMessage('Tipe harus IN atau OUT'),
    ],
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { id } = req.params;
            const { productId, quantity, type } = req.body;

            const existingMovement = await prisma.stockMovement.findUnique({
                where: { id },
            });

            if (!existingMovement) {
                throw new AppError('Pergerakan stok tidak ditemukan', 404);
            }

            const updatedMovement = await prisma.$transaction(async (tx) => {
                // 1. Revert old movement stock
                const oldProduct = await tx.product.findUnique({ where: { id: existingMovement.productId } });
                if (!oldProduct) throw new AppError('Produk lama tidak ditemukan', 404);

                if (existingMovement.type === 'IN') {
                    // Reverting old IN = decrement. Verify it won't go negative if we revert it first.
                    // Note: If oldProduct is the SAME as the new product and new type is IN, it's fine, but let's check
                    // intermediate safety or check final stock. To be safe, we temporarily revert.
                    if (oldProduct.currentStock < existingMovement.quantity) {
                        throw new AppError(
                            `Gagal mengubah! Pembatalan pergerakan lama akan membuat stok ${oldProduct.name} menjadi negatif`,
                            400
                        );
                    }
                    await tx.product.update({
                        where: { id: existingMovement.productId },
                        data: { currentStock: { decrement: existingMovement.quantity } }
                    });
                } else {
                    // Reverting old OUT = increment
                    await tx.product.update({
                        where: { id: existingMovement.productId },
                        data: { currentStock: { increment: existingMovement.quantity } }
                    });
                }

                // 2. Fetch new product live stock (post-revert)
                const targetProduct = await tx.product.findUnique({ where: { id: productId } });
                if (!targetProduct) throw new AppError('Produk target tidak ditemukan', 404);

                // 3. Apply new movement stock
                if (type === 'IN') {
                    await tx.product.update({
                        where: { id: productId },
                        data: { currentStock: { increment: quantity } }
                    });
                } else {
                    // OUT = decrement. Verify new product has enough stock.
                    if (targetProduct.currentStock < quantity) {
                        throw new AppError(
                            `Stok ${targetProduct.name} tidak mencukupi untuk pergerakan keluar ini (tersedia: ${targetProduct.currentStock}, diminta: ${quantity})`,
                            400
                        );
                    }
                    await tx.product.update({
                        where: { id: productId },
                        data: { currentStock: { decrement: quantity } }
                    });
                }

                // 4. Update movement record
                const updated = await tx.stockMovement.update({
                    where: { id },
                    data: {
                        productId,
                        quantity,
                        type,
                    },
                    include: { product: true },
                });

                return updated;
            });

            res.json({ success: true, data: updatedMovement });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
