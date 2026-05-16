
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Backfill cuaca historis (Feb 2025 - Mar 2026) dari Open-Meteo Archive API
 * ke tabel DailyRecord di database.
 * 
 * Open-Meteo Archive API menggunakan data stasiun meteorologi lokal (BMKG)
 * Lokasi: Padang Panjang, Sumatera Barat
 * 
 * CATATAN: Script import_data.ts sudah mengimpor cuaca dari CSV generator.
 * Jalankan script ini HANYA jika ingin menimpa dengan data cuaca asli dari API
 * (hanya bisa untuk tanggal yang sudah lewat karena Archive API).
 */

const LAT = process.env.WEATHER_LAT || '-0.4648';
const LON = process.env.WEATHER_LON || '100.3983';

function encodeWmoWeather(code: number): number {
    // 0 = cerah, 1 = berawan, 2 = hujan
    if (code === 0) return 0;                    // Clear sky
    if (code >= 1 && code <= 3) return 1;        // Mainly clear, partly cloudy, overcast
    if (code >= 45 && code <= 48) return 1;      // Fog
    if (code >= 51 && code <= 57) return 2;      // Drizzle
    if (code >= 61 && code <= 67) return 2;      // Rain
    if (code >= 71 && code <= 77) return 2;      // Snow (unlikely in Padang Panjang)
    if (code >= 80 && code <= 82) return 2;      // Rain showers
    if (code >= 85 && code <= 86) return 2;      // Snow showers
    if (code >= 95 && code <= 99) return 2;      // Thunderstorm
    return 0;
}

function getWeatherLabel(code: number): string {
    switch (code) {
        case 0: return 'Cerah';
        case 1: return 'Berawan';
        case 2: return 'Hujan';
        default: return 'Cerah';
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Backfill Cuaca Historis - Open-Meteo Archive API');
    console.log('Lokasi: Padang Panjang, Sumatera Barat');
    console.log('='.repeat(60));

    // Tentukan range — Archive API hanya tersedia hingga ~5 hari lalu
    const startDate = '2025-02-01';
    // Gunakan tanggal kemarin sebagai end date (Archive API tidak support hari ini)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const endDate = yesterday.toISOString().split('T')[0];

    // Jangan melebihi periode data
    const maxEndDate = '2026-03-31';
    const effectiveEndDate = endDate < maxEndDate ? endDate : maxEndDate;

    console.log(`\nFetching weather data: ${startDate} -> ${effectiveEndDate}...`);

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${startDate}&end_date=${effectiveEndDate}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Jakarta`;

    const res = await axios.get(url);
    const daily = res.data.daily;

    if (!daily || !daily.time || daily.time.length === 0) {
        console.error('Tidak ada data cuaca dari API');
        return;
    }

    console.log(`Diterima ${daily.time.length} hari data cuaca\n`);

    // Stats tracking
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const weatherCounts = { 0: 0, 1: 0, 2: 0 };

    for (let i = 0; i < daily.time.length; i++) {
        const dateStr = daily.time[i];
        const wmoCode = daily.weather_code[i] ?? 0;
        const weatherCode = encodeWmoWeather(wmoCode);
        const tempMax = daily.temperature_2m_max[i] ?? 0;
        const tempMin = daily.temperature_2m_min[i] ?? 0;

        weatherCounts[weatherCode as keyof typeof weatherCounts]++;

        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        try {
            const existing = await prisma.dailyRecord.findUnique({ where: { date } });

            if (existing) {
                await prisma.dailyRecord.update({
                    where: { date },
                    data: { weather: weatherCode },
                });
                updated++;
            } else {
                await prisma.dailyRecord.create({
                    data: {
                        date,
                        weather: weatherCode,
                        event: 0,
                    },
                });
                created++;
            }

            // Log progress every 30 days
            if ((i + 1) % 30 === 0 || i === daily.time.length - 1) {
                console.log(`   ${dateStr}: ${getWeatherLabel(weatherCode)} (WMO:${wmoCode}, ${tempMin}-${tempMax}C) [${i + 1}/${daily.time.length}]`);
            }
        } catch (err) {
            skipped++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Backfill selesai!');
    console.log(`   Updated: ${updated} records`);
    console.log(`   Created: ${created} records`);
    console.log(`   Skipped: ${skipped} records`);
    console.log('\nDistribusi Cuaca Historis:');
    console.log(`   Cerah:   ${weatherCounts[0]} hari (${(weatherCounts[0] / daily.time.length * 100).toFixed(1)}%)`);
    console.log(`   Berawan: ${weatherCounts[1]} hari (${(weatherCounts[1] / daily.time.length * 100).toFixed(1)}%)`);
    console.log(`   Hujan:   ${weatherCounts[2]} hari (${(weatherCounts[2] / daily.time.length * 100).toFixed(1)}%)`);
    console.log('='.repeat(60));
}

main()
    .catch((e) => {
        console.error('Error:', e.message || e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
