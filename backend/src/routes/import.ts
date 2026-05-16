
import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Mapping teknis: Nama Kolom Excel -> Nama Produk di DB
const COLUMN_TO_DB_NAME: { [key: string]: string } = {
    'buntut': 'Buntut',
    'telur_puyuh': 'Telur Puyuh',
    'tahu': 'Tahu',
    'ampela': 'Ampela',
    'usus': 'Usus',
    'ceker': 'Ceker',
    'leher': 'Leher',
    'cikua': 'Cikua',
    'sosis_kecil': 'Sosis Kecil',
    'sosis_besar': 'Sosis Besar',
    'bakso': 'Bakso',
    'rais_boll_ayam_suwir': 'Rais Boll Ayam Suwir',
    'rais_boll_cumi_asin': 'Rais Boll Cumi Asin',
    'tahu_bacem': 'Tahu Bacem',
    'tempe_bacem': 'Tempe Bacem',
    'nasi_kucing_ayam_suwir': 'Nasi Kucing Ayam Suwir',
    'nasi_kucing_cumi_asin': 'Nasi Kucing Cumi Asin',
    // Alias jika ada penulisan berbeda di excel
    'risol_ayam_suwir': 'Rais Boll Ayam Suwir',
    'risol_cumi_asin': 'Rais Boll Cumi Asin'
};

router.post('/excel', authenticate, authorize('SUPERADMIN'), upload.single('file'), async (req: any, res: any, next: any) => {
    try {
        if (!req.file) throw new AppError('File tidak ditemukan', 400);

        // Baca file dengan opsi cellDates agar tanggal terbaca sebagai objek Date
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: 0 });

        if (data.length === 0) throw new AppError('File Excel kosong atau format tidak didukung', 400);

        const products = await prisma.product.findMany();
        const productDbMap: { [key: string]: { id: string, price: number } } = {};
        products.forEach(p => {
            productDbMap[p.name] = { id: p.id, price: p.price };
        });

        let importedDays = 0;

        // Gunakan transaksi database (Transaction) agar lebih aman
        await prisma.$transaction(async (tx) => {
            for (const row of data) {
                // Cari kolom tanggal (bisa 'tanggal' atau 'Date' dsb)
                const rawDate = row.tanggal || row.Date || row.date;
                if (!rawDate) continue;
                
                const date = new Date(rawDate);
                if (isNaN(date.getTime())) continue;

                // Set ke jam 00:00:00 agar konsisten
                date.setUTCHours(0, 0, 0, 0);

                // 1. Bersihkan data lama di tanggal tersebut
                const existingTx = await tx.transaction.findMany({ where: { date: date } });
                for (const t of existingTx) {
                    await tx.transactionItem.deleteMany({ where: { transactionId: t.id } });
                    await tx.transaction.delete({ where: { id: t.id } });
                }
                
                // 2. Siapkan data item transaksi
                let totalAmount = 0;
                const itemsToCreate = [];

                for (const [colName, val] of Object.entries(row)) {
                    const dbName = COLUMN_TO_DB_NAME[colName.toLowerCase()];
                    const qty = parseInt(val as string) || 0;

                    if (dbName && qty > 0 && productDbMap[dbName]) {
                        const price = productDbMap[dbName].price;
                        totalAmount += qty * price;
                        itemsToCreate.push({
                            productId: productDbMap[dbName].id,
                            quantity: qty,
                            price: price
                        });
                    }
                }

                // 3. Simpan jika ada item
                if (itemsToCreate.length > 0) {
                    await tx.transaction.create({
                        data: {
                            date: date,
                            totalAmount: totalAmount,
                            createdBy: (req as AuthRequest).user!.id,
                            items: { create: itemsToCreate }
                        }
                    });

                    // Update DailyRecord (Cuaca) - default cerah
                    await tx.dailyRecord.upsert({
                        where: { date: date },
                        update: {},
                        create: { date: date, weather: 0, event: 0 }
                    });

                    importedDays++;
                }
            }
        }, { timeout: 30000 }); // Beri waktu lebih lama untuk data banyak

        res.json({ 
            success: true, 
            message: `Berhasil mengimport data untuk ${importedDays} hari ke database.`,
            count: importedDays 
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        next(new AppError(error.message || 'Terjadi kesalahan saat proses import', 500));
    }
});

export default router;
