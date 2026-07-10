import { Router } from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users
router.get(
    '/',
    authenticate,
    authorize('SUPERADMIN'),
    async (_req: AuthRequest, res: any, next: any) => {
        try {
            const users = await prisma.user.findMany({
                select: { id: true, name: true, email: true, role: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            });
            res.json({ success: true, data: users });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/users
router.post(
    '/',
    authenticate,
    authorize('SUPERADMIN'),
    [
        body('name').notEmpty().withMessage('Nama wajib diisi'),
        body('email').isEmail().withMessage('Email tidak valid'),
        body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
        body('role').isIn(['SUPERADMIN', 'ADMIN']).withMessage('Role tidak valid'),
    ],
    async (req: any, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { name, email, password, role } = req.body;

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) throw new AppError('Email sudah terdaftar', 400);

            const existingName = await prisma.user.findFirst({ where: { name } });
            if (existingName) throw new AppError('Nama pengguna sudah terdaftar', 400);

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({
                data: { name, email, password: hashedPassword, role },
                select: { id: true, name: true, email: true, role: true, createdAt: true },
            });
            res.status(201).json({ success: true, data: user });
        } catch (error) {
            next(error);
        }
    }
);

// PUT /api/users/:id
router.put(
    '/:id',
    authenticate,
    authorize('SUPERADMIN'),
    [
        body('name').optional().notEmpty(),
        body('email').optional().isEmail(),
        body('password').optional().isLength({ min: 6 }),
        body('role').optional().isIn(['SUPERADMIN', 'ADMIN']),
    ],
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const user = await prisma.user.findUnique({ where: { id: req.params.id } });
            if (!user) throw new AppError('User tidak ditemukan', 404);

            const data: any = { ...req.body };
            
            if (data.email) {
                const existingEmail = await prisma.user.findFirst({
                    where: { email: data.email, id: { not: req.params.id } }
                });
                if (existingEmail) throw new AppError('Email sudah terdaftar untuk pengguna lain', 400);
            }

            if (data.name) {
                const existingName = await prisma.user.findFirst({
                    where: { name: data.name, id: { not: req.params.id } }
                });
                if (existingName) throw new AppError('Nama pengguna sudah terdaftar', 400);
            }

            if (data.password) {
                data.password = await bcrypt.hash(data.password, 10);
            }

            const updated = await prisma.user.update({
                where: { id: req.params.id },
                data,
                select: { id: true, name: true, email: true, role: true, createdAt: true },
            });
            res.json({ success: true, data: updated });
        } catch (error) {
            next(error);
        }
    }
);

// DELETE /api/users/:id
router.delete(
    '/:id',
    authenticate,
    authorize('SUPERADMIN'),
    async (req: AuthRequest, res: any, next: any) => {
        try {
            const user = await prisma.user.findUnique({ where: { id: req.params.id } });
            if (!user) throw new AppError('User tidak ditemukan', 404);

            await prisma.user.delete({ where: { id: req.params.id } });
            res.json({ success: true, message: 'User berhasil dihapus' });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
