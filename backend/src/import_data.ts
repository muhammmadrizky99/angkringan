
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// Mapping column name (excel) -> Product info (harga dari owner langsung)
const PRODUCT_MAP: { [key: string]: { name: string; price: number; category: string } } = {
    'buntut': { name: 'Buntut', price: 2000, category: 'Sate' },
    'telur_puyuh': { name: 'Telur Puyuh', price: 2000, category: 'Sate' },
    'tahu': { name: 'Tahu', price: 2000, category: 'Sate' },
    'ampela': { name: 'Ampela', price: 2000, category: 'Sate' },
    'usus': { name: 'Usus', price: 2000, category: 'Sate' },
    'ceker': { name: 'Ceker', price: 3000, category: 'Sate' },
    'leher': { name: 'Leher', price: 2000, category: 'Sate' },
    'cikua': { name: 'Cikua', price: 2000, category: 'Sate' },
    'sosis_kecil': { name: 'Sosis Kecil', price: 2000, category: 'Sate' },
    'sosis_besar': { name: 'Sosis Besar', price: 3000, category: 'Sate' },
    'bakso': { name: 'Bakso', price: 2000, category: 'Sate' },
    'risol_ayam_suwir': { name: 'Rais Boll Ayam Suwir', price: 15000, category: 'Nasi' },
    'risol_cumi_asin': { name: 'Rais Boll Cumi Asin', price: 15000, category: 'Nasi' },
    'tahu_bacem': { name: 'Tahu Bacem', price: 2000, category: 'Lauk' },
    'tempe_bacem': { name: 'Tempe Bacem', price: 2000, category: 'Lauk' },
    'nasi_kucing_ayam_suwir': { name: 'Nasi Kucing Ayam Suwir', price: 5000, category: 'Nasi' },
    'nasi_kucing_cumi_asin': { name: 'Nasi Kucing Cumi Asin', price: 5000, category: 'Nasi' },
};

interface WeatherRecord {
    date: string;
    weather: number;
    event: number;
    event_note: string;
}

function loadWeatherCSV(csvPath: string): Map<string, WeatherRecord> {
    const map = new Map<string, WeatherRecord>();
    if (!fs.existsSync(csvPath)) {
        console.warn('   Tidak ada file cuaca CSV, weather/event akan default 0');
        return map;
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    // skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 4) {
            const dateStr = parts[0].trim();
            map.set(dateStr, {
                date: dateStr,
                weather: parseInt(parts[1]) || 0,
                event: parseInt(parts[2]) || 0,
                event_note: parts.slice(3).join(',').trim(),
            });
        }
    }
    return map;
}

async function main() {
    const filePath = path.join(__dirname, '../data/data_penjualan_angkringan_setahun.xlsx');
    const weatherPath = path.join(__dirname, '../data/data_cuaca_harian.csv');

    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        console.log('Jalankan generate_realistic_data.py dulu di backend/data/');
        return;
    }

    // Load cuaca dari CSV
    const weatherMap = loadWeatherCSV(weatherPath);
    console.log(`   Loaded ${weatherMap.size} weather records`);

    // === STEP 0: Hapus data lama ===
    console.log('Menghapus data lama...');
    await prisma.transactionItem.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.prediction.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.dailyRecord.deleteMany({});
    await prisma.product.deleteMany({});
    console.log('   Data lama berhasil dihapus.');

    // === STEP 1: Baca Excel ===
    console.log('Membaca file Excel...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`   Ditemukan ${data.length} baris data.`);

    // === STEP 2: Buat Produk ===
    console.log('Membuat produk...');
    const productDbMap: { [key: string]: string } = {};

    for (const [col, info] of Object.entries(PRODUCT_MAP)) {
        const product = await prisma.product.create({
            data: {
                name: info.name,
                category: info.category,
                price: info.price,
                currentStock: 50,
            },
        });
        productDbMap[col] = product.id;
        console.log(`   + ${info.name} (Rp ${info.price.toLocaleString()})`);
    }

    // === STEP 3: Cari Admin User ===
    let admin = await prisma.user.findFirst({ where: { email: 'admin@angkringan.com' } });
    if (!admin) {
        admin = await prisma.user.findFirst({ where: { role: 'SUPERADMIN' } });
    }
    if (!admin) {
        admin = await prisma.user.findFirst();
    }
    if (!admin) {
        console.error('Tidak ada user di database. Jalankan create_admin dulu.');
        return;
    }
    console.log(`Menggunakan user: ${admin.name} (${admin.email})`);

    // === STEP 4: Import Transaksi + DailyRecord (cuaca & event) ===
    console.log('Mengimpor transaksi...');
    let transactionCount = 0;

    for (const row of data as any[]) {
        const dateStr = row['tanggal'];
        if (!dateStr) continue;

        let date: Date;
        if (typeof dateStr === 'number') {
            // Excel serial date
            date = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
        } else {
            date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
            console.warn(`   Tanggal invalid: ${dateStr}, dilewati`);
            continue;
        }

        // Set to midnight UTC
        date.setHours(0, 0, 0, 0);

        const items: { productId: string; quantity: number; price: number }[] = [];
        let totalAmount = 0;

        for (const [col, productId] of Object.entries(productDbMap)) {
            const qty = row[col];
            if (qty && typeof qty === 'number' && qty > 0) {
                const price = PRODUCT_MAP[col].price;
                items.push({ productId, quantity: qty, price });
                totalAmount += qty * price;
            }
        }

        // Lookup weather data
        const dateKey = date.toISOString().split('T')[0];
        const wr = weatherMap.get(dateKey);
        const weatherVal = wr ? wr.weather : 0;
        const eventVal = wr ? wr.event : 0;
        const eventNote = wr ? wr.event_note : '';

        if (items.length > 0) {
            await prisma.transaction.create({
                data: {
                    date: date,
                    totalAmount: totalAmount,
                    createdBy: admin.id,
                    items: {
                        create: items.map(i => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            price: i.price,
                        })),
                    },
                },
            });

            transactionCount++;
        }

        // Buat DailyRecord dengan cuaca & event dari CSV
        await prisma.dailyRecord.upsert({
            where: { date },
            update: {
                weather: weatherVal,
                event: eventVal,
                eventNote: eventNote || null,
            },
            create: {
                date,
                weather: weatherVal,
                event: eventVal,
                eventNote: eventNote || null,
            },
        });
    }

    console.log(`\nSelesai! ${transactionCount} transaksi harian berhasil diimpor.`);
    console.log(`${Object.keys(PRODUCT_MAP).length} produk aktif.`);
    console.log(`${weatherMap.size} DailyRecord (cuaca + event) di-import.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
