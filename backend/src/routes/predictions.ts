import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { fetchTomorrowForecast } from '../lib/weather';
import axios from 'axios';

const router = Router();

// POST /api/predictions/generate
router.post('/generate', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { weather: overrideWeather, event: overrideEvent } = req.body;

        const products = await prisma.product.findMany();

        if (products.length === 0) {
            throw new AppError('Tidak ada produk untuk diprediksi', 400);
        }

        // Fetch tomorrow's weather forecast (or use override from frontend)
        let tomorrowWeather = 0;
        let tomorrowEvent = overrideEvent ?? 0;

        if (overrideWeather !== undefined) {
            tomorrowWeather = overrideWeather;
        } else {
            const forecast = await fetchTomorrowForecast();
            tomorrowWeather = forecast.weather;
        }

        // Get all daily records for weather/event history
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const dailyRecords = await prisma.dailyRecord.findMany({
            where: { date: { gte: sixMonthsAgo } },
            orderBy: { date: 'asc' },
        });

        // Build a lookup map: dateString -> { weather, event }
        const recordMap: { [key: string]: { weather: number; event: number } } = {};
        dailyRecords.forEach((r) => {
            const key = r.date.toISOString().split('T')[0];
            recordMap[key] = { weather: r.weather, event: r.event };
        });

        const predictions: any[] = [];

        for (const product of products) {
            // Get historical sales data (last 180 days for better accuracy)
            const salesData = await prisma.transactionItem.findMany({
                where: {
                    productId: product.id,
                    transaction: {
                        date: { gte: sixMonthsAgo },
                    },
                },
                include: { transaction: true },
                orderBy: { transaction: { date: 'asc' } },
            });

            // Aggregate sales by date WITH weather and event data
            const dailySales: { [key: string]: { quantity: number; weather: number; event: number } } = {};
            salesData.forEach((item) => {
                const dateKey = item.transaction.date.toISOString().split('T')[0];
                if (!dailySales[dateKey]) {
                    const record = recordMap[dateKey];
                    dailySales[dateKey] = {
                        quantity: 0,
                        weather: record?.weather ?? 0,
                        event: record?.event ?? 0,
                    };
                }
                dailySales[dateKey].quantity += item.quantity;
            });

            // Convert to array format enriched with weather & event
            const salesArray = Object.entries(dailySales).map(([date, data]) => ({
                date,
                quantity: data.quantity,
                weather: data.weather,
                event: data.event,
            }));

            if (salesArray.length < 14) {
                // Not enough data, use simple average
                const avgQuantity =
                    salesArray.length > 0
                        ? salesArray.reduce((sum, s) => sum + s.quantity, 0) / salesArray.length
                        : 0;

                const prediction = await prisma.prediction.create({
                    data: {
                        productId: product.id,
                        predictionDate: new Date(new Date().setDate(new Date().getDate() + 1)),
                        predictedQuantity: Math.round(avgQuantity),
                        mae: null,
                        rmse: null,
                        mape: null,
                        method: 'simple_average',
                        weather: tomorrowWeather,
                    },
                    include: { product: true },
                });
                predictions.push(prediction);
                continue;
            }

            try {
                // Call ML service with enriched data
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL || 'http://localhost:5001'}/predict`,
                    {
                        product_id: product.id,
                        product_name: product.name,
                        sales_data: salesArray,
                        tomorrow_weather: tomorrowWeather,
                        tomorrow_event: tomorrowEvent,
                    }
                );

                const result = mlResponse.data;

                const prediction = await prisma.prediction.create({
                    data: {
                        productId: product.id,
                        predictionDate: new Date(new Date().setDate(new Date().getDate() + 1)),
                        predictedQuantity: result.predicted_quantity,
                        mae: result.mae,
                        rmse: result.rmse,
                        mape: result.mape,
                        method: result.method || 'xgboost',
                        weather: tomorrowWeather,
                    },
                    include: { product: true },
                });
                predictions.push(prediction);
            } catch (mlError) {
                // Fallback: use simple moving average
                const last7 = salesArray.slice(-7);
                const avgQuantity =
                    last7.reduce((sum, s) => sum + s.quantity, 0) / last7.length;

                const prediction = await prisma.prediction.create({
                    data: {
                        productId: product.id,
                        predictionDate: new Date(new Date().setDate(new Date().getDate() + 1)),
                        predictedQuantity: Math.round(avgQuantity),
                        mae: null,
                        rmse: null,
                        mape: null,
                        method: 'moving_average_fallback',
                        weather: tomorrowWeather,
                    },
                    include: { product: true },
                });
                predictions.push(prediction);
            }
        }

        res.json({
            success: true,
            data: predictions,
            meta: {
                tomorrowWeather,
                tomorrowEvent,
                weatherLabel: tomorrowWeather === 0 ? 'Cerah' : tomorrowWeather === 1 ? 'Berawan' : 'Hujan',
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/predictions/latest
router.get('/latest', authenticate, async (_req: AuthRequest, res: any, next: any) => {
    try {
        // Get the latest prediction for each product
        const products = await prisma.product.findMany();
        const latestPredictions: any[] = [];

        for (const product of products) {
            const prediction = await prisma.prediction.findFirst({
                where: { productId: product.id },
                include: { product: true },
                orderBy: { predictionDate: 'desc' },
            });
            if (prediction) {
                latestPredictions.push(prediction);
            }
        }

        res.json({ success: true, data: latestPredictions });
    } catch (error) {
        next(error);
    }
});

// GET /api/predictions
router.get('/', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const { date } = req.query;
        const where: any = {};

        if (date) {
            const startOfDay = new Date(date as string);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date as string);
            endOfDay.setHours(23, 59, 59, 999);
            where.predictionDate = { gte: startOfDay, lte: endOfDay };
        }

        const predictions = await prisma.prediction.findMany({
            where,
            include: { product: true },
            orderBy: { predictionDate: 'desc' },
        });
        res.json({ success: true, data: predictions });
    } catch (error) {
        next(error);
    }
});

export default router;
