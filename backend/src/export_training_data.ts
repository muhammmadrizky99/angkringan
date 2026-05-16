import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching data from database...');
    const products = await prisma.product.findMany();
    const records = await prisma.dailyRecord.findMany();

    const recordMap = new Map();
    records.forEach(r => {
        recordMap.set(r.date.toISOString().split('T')[0], r);
    });

    const csvRows = ['date,product_name,quantity,weather,event'];

    for (const p of products) {
        const items = await prisma.transactionItem.findMany({
            where: { productId: p.id },
            include: { transaction: true }
        });

        const dailyMap = new Map();
        items.forEach(item => {
            const dateStr = item.transaction.date.toISOString().split('T')[0];
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + item.quantity);
        });

        // Loop through all dates in recordMap to include 0 sales days if they exist
        // or just output the dates with sales. But we need 0 sales for days without sales?
        // Let's output all dates between min and max date
        if (dailyMap.size === 0) continue;

        const dates = Array.from(dailyMap.keys()).sort();
        const minDate = new Date(dates[0]);
        const maxDate = new Date(dates[dates.length - 1]);

        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const qty = dailyMap.get(dateStr) || 0;
            const r = recordMap.get(dateStr);
            const weather = r ? r.weather : 0;
            const event = r ? r.event : 0;

            csvRows.push(`${dateStr},"${p.name}",${qty},${weather},${event}`);
        }
    }

    const outPath = path.join(__dirname, '..', 'data', 'merged_training_data.csv');
    fs.writeFileSync(outPath, csvRows.join('\n'));
    console.log(`✅ Data exported to ${outPath}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
