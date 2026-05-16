import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Email tidak valid'),
        body('password').notEmpty().withMessage('Password wajib diisi'),
    ],
    async (req: any, res: any, next: any) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array() });
            }

            const { email, password } = req.body;
            const user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                throw new AppError('Email atau password salah', 401);
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new AppError('Email atau password salah', 401);
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, name: user.name },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

// POST /api/auth/register (Superadmin only - initial setup)
router.post(
    '/register',
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

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                throw new AppError('Email sudah terdaftar', 400);
            }

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

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        if (!user) {
            throw new AppError('User tidak ditemukan', 404);
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

export default router;
