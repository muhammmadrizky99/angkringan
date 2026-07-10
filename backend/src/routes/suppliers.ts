import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/suppliers
router.get('/', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const suppliers = await prisma.supplier.findMany();
        res.json({ success: true, data: suppliers });
    } catch (error) {
        next(error);
    }
});

// GET /api/suppliers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
        if (!supplier) throw new AppError('Supplier tidak ditemukan', 404);
        res.json({ success: true, data: supplier });
    } catch (error) {
        next(error);
    }
});

// POST /api/suppliers
router.post(
    '/',
    authenticate,
    authorize('SUPERADMIN'),
    [
        body('name').notEmpty().withMessage('Nama supplier wajib diisi'),
        body('phone').notEmpty().withMessage('Telepon wajib diisi'),
        body('address').notEmpty().withMessage('Alamat wajib diisi'),
    ],
    async (req: any, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { name, phone, address } = req.body;

            const existingSupplier = await prisma.supplier.findFirst({
                where: { name: name }
            });

            if (existingSupplier) {
                return res.status(400).json({ success: false, message: 'Supplier dengan nama tersebut sudah ada' });
            }

            const supplier = await prisma.supplier.create({
                data: { name, phone, address },
            });
            res.status(201).json({ success: true, data: supplier });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/suppliers/:id
router.put(
    '/:id',
    authenticate,
    authorize('SUPERADMIN'),
    [
        body('name').optional().notEmpty(),
        body('phone').optional().notEmpty(),
        body('address').optional().notEmpty(),
    ],
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
            if (!supplier) throw new AppError('Supplier tidak ditemukan', 404);

            if (req.body.name) {
                const existingSupplier = await prisma.supplier.findFirst({
                    where: { 
                        name: req.body.name,
                        id: { not: req.params.id }
                    }
                });
                if (existingSupplier) {
                    return res.status(400).json({ success: false, message: 'Supplier dengan nama tersebut sudah ada' });
                }
            }

            const updated = await prisma.supplier.update({
                where: { id: req.params.id },
                data: req.body,
            });
            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/suppliers/:id
router.delete(
    '/:id',
    authenticate,
    authorize('SUPERADMIN'),
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
            if (!supplier) throw new AppError('Supplier tidak ditemukan', 404);

            await prisma.supplier.delete({ where: { id: req.params.id } });
            res.json({ success: true, message: 'Supplier berhasil dihapus' });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
