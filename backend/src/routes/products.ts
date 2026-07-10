import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/products
router.get('/', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: products });
    } catch (error) {
        next(error);
    }
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
        });
        if (!product) throw new AppError('Produk tidak ditemukan', 404);
        res.json({ success: true, data: product });
    } catch (error) {
        next(error);
    }
});

// POST /api/products
router.post(
    '/',
    authenticate,
    authorize('SUPERADMIN'),
    [
        body('name').notEmpty().withMessage('Nama produk wajib diisi'),
        body('category').notEmpty().withMessage('Kategori wajib diisi'),
        body('price').isFloat({ min: 0 }).withMessage('Harga harus angka positif'),
        body('currentStock').isInt({ min: 0 }).withMessage('Stok harus angka non-negatif'),
    ],
    async (req: any, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { name, category, price, currentStock } = req.body;

            const existingProduct = await prisma.product.findFirst({
                where: { name: name }
            });

            if (existingProduct) {
                return res.status(400).json({ success: false, message: 'Produk dengan nama tersebut sudah ada' });
            }

            const product = await prisma.product.create({
                data: { 
                    name, 
                    category, 
                    price: Number(price), 
                    currentStock: Number(currentStock) 
                },
            });
            res.status(201).json({ success: true, data: product });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/products/:id
router.put(
    '/:id',
    authenticate,
    authorize('SUPERADMIN'),
    [
        body('name').optional().notEmpty().withMessage('Nama produk tidak boleh kosong'),
        body('category').optional().notEmpty().withMessage('Kategori tidak boleh kosong'),
        body('price').optional().isFloat({ min: 0 }).withMessage('Harga harus angka positif'),
        body('currentStock').optional().isInt({ min: 0 }).withMessage('Stok harus angka non-negatif'),
    ],
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const product = await prisma.product.findUnique({ where: { id: req.params.id } });
            if (!product) throw new AppError('Produk tidak ditemukan', 404);

            const updateData: any = { ...req.body };

            if (updateData.name) {
                const existingProduct = await prisma.product.findFirst({
                    where: { 
                        name: updateData.name,
                        id: { not: req.params.id }
                    }
                });
                if (existingProduct) {
                    return res.status(400).json({ success: false, message: 'Produk dengan nama tersebut sudah ada' });
                }
            }

            if (updateData.price !== undefined) updateData.price = Number(updateData.price);
            if (updateData.currentStock !== undefined) updateData.currentStock = Number(updateData.currentStock);

            const updated = await prisma.product.update({
                where: { id: req.params.id },
                data: updateData,
            });
            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/products/:id
router.delete(
    '/:id',
    authenticate,
    authorize('SUPERADMIN'),
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const product = await prisma.product.findUnique({ where: { id: req.params.id } });
            if (!product) throw new AppError('Produk tidak ditemukan', 404);

            // Cascade delete: Hapus data yang terikat dengan produk ini agar tidak error constraint
            await prisma.prediction.deleteMany({ where: { productId: req.params.id } });
            await prisma.stockMovement.deleteMany({ where: { productId: req.params.id } });
            await prisma.transactionItem.deleteMany({ where: { productId: req.params.id } });

            await prisma.product.delete({ where: { id: req.params.id } });
            res.json({ success: true, message: 'Produk berhasil dihapus' });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
