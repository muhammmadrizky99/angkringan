import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { fetchCurrentWeather, fetchTomorrowForecast } from '../lib/weather';

const router = Router();

// GET /api/daily-records — list records
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

        const records = await prisma.dailyRecord.findMany({
            where,
            orderBy: { date: 'desc' },
            take: 90,
        });

        res.json({ success: true, data: records });
    } catch (error) {
        next(error);
    }
});

// GET /api/daily-records/today — get or create today's record (auto-fetch weather)
router.get('/today', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let record = await prisma.dailyRecord.findUnique({ where: { date: today } });

        if (!record) {
            // Auto-fetch current weather and create today's record
            const weatherData = await fetchCurrentWeather();
            record = await prisma.dailyRecord.create({
                data: {
                    date: today,
                    weather: weatherData.weather,
                    event: 0,
                },
            });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
});

// GET /api/daily-records/tomorrow-forecast — get forecast for tomorrow
router.get('/tomorrow-forecast', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const forecast = await fetchTomorrowForecast();
        res.json({ success: true, data: forecast });
    } catch (error) {
        next(error);
    }
});

// POST /api/daily-records — create or update a daily record (set event, override weather)
router.post('/', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { date, weather, event, eventNote } = req.body;

        if (date === undefined) {
            return res.status(400).json({ success: false, message: 'date is required' });
        }

        const recordDate = new Date(date);
        recordDate.setHours(0, 0, 0, 0);

        const record = await prisma.dailyRecord.upsert({
            where: { date: recordDate },
            update: {
                ...(weather !== undefined && { weather }),
                ...(event !== undefined && { event }),
                ...(eventNote !== undefined && { eventNote }),
                createdAt: new Date(),
            },
            create: {
                date: recordDate,
                weather: weather ?? 0,
                event: event ?? 0,
                eventNote: eventNote ?? null,
                createdAt: new Date(),
            },
        });

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
});

// POST /api/daily-records/fetch-weather — manually trigger weather fetch for today
router.post('/fetch-weather', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weatherData = await fetchCurrentWeather();

        const record = await prisma.dailyRecord.upsert({
            where: { date: today },
            update: { 
                weather: weatherData.weather,
                createdAt: new Date(),
            },
            create: {
                date: today,
                weather: weatherData.weather,
                event: 0,
                createdAt: new Date(),
            },
        });

        res.json({
            success: true,
            data: record,
            weatherInfo: weatherData,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
