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

export default router;
