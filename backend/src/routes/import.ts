
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

// GET /api/import/template
router.get('/template', authenticate, async (req: AuthRequest, res: any, next: any) => {
    try {
        const headers = [
            'tanggal',
            'buntut',
            'telur_puyuh',
            'tahu',
            'ampela',
            'usus',
            'ceker',
            'leher',
            'cikua',
            'sosis_kecil',
            'sosis_besar',
            'bakso',
            'rais_boll_ayam_suwir',
            'rais_boll_cumi_asin',
            'tahu_bacem',
            'tempe_bacem',
            'nasi_kucing_ayam_suwir',
            'nasi_kucing_cumi_asin'
        ];

        const rows = [
            {
                tanggal: '2026-05-01',
                buntut: 12,
                telur_puyuh: 15,
                tahu: 8,
                ampela: 10,
                usus: 20,
                ceker: 15,
                leher: 5,
                cikua: 10,
                sosis_kecil: 12,
                sosis_besar: 8,
                bakso: 15,
                rais_boll_ayam_suwir: 10,
                rais_boll_cumi_asin: 12,
                tahu_bacem: 6,
                tempe_bacem: 8,
                nasi_kucing_ayam_suwir: 15,
                nasi_kucing_cumi_asin: 15
            },
            {
                tanggal: '2026-05-02',
                buntut: 8,
                telur_puyuh: 10,
                tahu: 5,
                ampela: 12,
                usus: 15,
                ceker: 10,
                leher: 8,
                cikua: 8,
                sosis_kecil: 10,
                sosis_besar: 5,
                bakso: 12,
                rais_boll_ayam_suwir: 8,
                rais_boll_cumi_asin: 10,
                tahu_bacem: 5,
                tempe_bacem: 6,
                nasi_kucing_ayam_suwir: 12,
                nasi_kucing_cumi_asin: 10
            }
        ];

        const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import');

        // Set custom column widths for readability
        const wscols = headers.map(h => ({ wch: Math.max(h.length + 3, 12) }));
        ws['!cols'] = wscols;

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=template_import_angkringan.xlsx'
        );
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

router.post('/excel', authenticate, authorize('SUPERADMIN'), upload.single('file'), async (req: any, res: any, next: any) => {
    try {
        if (!req.file) throw new AppError('File tidak ditemukan', 400);

        // Validasi ekstensi file
        const originalName = req.file.originalname?.toLowerCase() || '';
        if (!originalName.endsWith('.xlsx') && !originalName.endsWith('.xls') && !originalName.endsWith('.csv')) {
            throw new AppError('Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv', 400);
        }

        // Baca file dengan opsi cellDates agar tanggal terbaca sebagai objek Date
        let workbook;
        try {
            workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        } catch (parseError) {
            throw new AppError('File tidak dapat dibaca. Pastikan file adalah spreadsheet yang valid (.xlsx/.xls/.csv)', 400);
        }

        const sheetName = workbook.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: 0 });

        if (data.length === 0) throw new AppError('File Excel kosong atau tidak memiliki data pada sheet pertama', 400);

        // ===== VALIDASI FORMAT KOLOM =====
        const fileColumns = Object.keys(data[0]).map(c => c.toLowerCase().trim());

        // 1. Cek kolom tanggal wajib ada
        const hasDateColumn = fileColumns.some(c => ['tanggal', 'date'].includes(c));
        if (!hasDateColumn) {
            throw new AppError(
                'Kolom "tanggal" tidak ditemukan di file. ' +
                'Kolom pertama harus bernama "tanggal" (format: YYYY-MM-DD). ' +
                'Kolom yang ditemukan: ' + fileColumns.join(', ') + '. ' +
                'Silakan unduh template Excel untuk melihat format yang benar.',
                400
            );
        }

        // 2. Cek apakah ada kolom produk yang dikenali
        const validProductColumns = Object.keys(COLUMN_TO_DB_NAME);
        const matchedColumns = fileColumns.filter(c => validProductColumns.includes(c));
        const unmatchedColumns = fileColumns.filter(c => 
            !validProductColumns.includes(c) && !['tanggal', 'date'].includes(c)
        );

        if (matchedColumns.length === 0) {
            throw new AppError(
                'Tidak ada kolom produk yang dikenali di file. ' +
                'Kolom yang ditemukan: ' + fileColumns.join(', ') + '. ' +
                'Nama kolom produk harus sesuai format teknis (contoh: buntut, telur_puyuh, bakso, ceker, dll). ' +
                'Silakan unduh template Excel untuk melihat nama kolom yang benar.',
                400
            );
        }

        // 3. Validasi format tanggal pada baris pertama
        const firstRow = data[0];
        const rawDateSample = firstRow.tanggal || firstRow.Tanggal || firstRow.Date || firstRow.date;
        const dateSample = new Date(rawDateSample);
        if (!rawDateSample || isNaN(dateSample.getTime())) {
            throw new AppError(
                'Format tanggal pada baris pertama tidak valid: "' + String(rawDateSample) + '". ' +
                'Gunakan format YYYY-MM-DD (contoh: 2026-05-01).',
                400
            );
        }

        // 4. Validasi nilai produk harus berupa angka (cek baris pertama)
        for (const col of matchedColumns) {
            const val = firstRow[col] ?? firstRow[col.charAt(0).toUpperCase() + col.slice(1)];
            if (val !== undefined && val !== 0 && isNaN(parseInt(String(val)))) {
                throw new AppError(
                    `Nilai pada kolom "${col}" baris pertama bukan angka: "${val}". ` +
                    'Setiap kolom produk harus berisi jumlah porsi terjual (angka bulat).',
                    400
                );
            }
        }

        const products = await prisma.product.findMany();
        const productDbMap: { [key: string]: { id: string, price: number } } = {};
        products.forEach(p => {
            productDbMap[p.name] = { id: p.id, price: p.price };
        });

        let importedDays = 0;
        let skippedRows = 0;
        let invalidDateRows: string[] = [];

        // Gunakan transaksi database (Transaction) agar lebih aman
        await prisma.$transaction(async (tx) => {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];

                // Cari kolom tanggal (bisa 'tanggal' atau 'Date' dsb)
                const rawDate = row.tanggal || row.Tanggal || row.Date || row.date;
                if (!rawDate) {
                    skippedRows++;
                    continue;
                }
                
                const date = new Date(rawDate);
                if (isNaN(date.getTime())) {
                    invalidDateRows.push(`Baris ${i + 2}: "${String(rawDate)}"`);
                    skippedRows++;
                    continue;
                }

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
                } else {
                    skippedRows++;
                }
            }
        }, { timeout: 30000 }); // Beri waktu lebih lama untuk data banyak

        // Jika tidak ada satupun data yang berhasil diimport
        if (importedDays === 0) {
            throw new AppError(
                'Tidak ada data yang berhasil diimport. ' +
                'Pastikan file berisi kolom "tanggal" dengan format YYYY-MM-DD dan ' +
                'kolom produk dengan nama yang sesuai (contoh: buntut, telur_puyuh, bakso). ' +
                (invalidDateRows.length > 0 
                    ? 'Tanggal tidak valid: ' + invalidDateRows.slice(0, 5).join('; ') + '. '
                    : '') +
                'Silakan unduh template Excel untuk melihat format yang benar.',
                400
            );
        }

        // Susun pesan respons
        let message = `Berhasil mengimport data untuk ${importedDays} hari ke database.`;
        if (unmatchedColumns.length > 0) {
            message += ` Peringatan: ${unmatchedColumns.length} kolom tidak dikenali dan diabaikan (${unmatchedColumns.join(', ')}).`;
        }
        if (skippedRows > 0) {
            message += ` ${skippedRows} baris dilewati karena format tidak sesuai.`;
        }

        res.json({ 
            success: true, 
            message,
            count: importedDays 
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        if (error instanceof AppError) {
            next(error);
        } else {
            next(new AppError(error.message || 'Terjadi kesalahan saat proses import', 500));
        }
    }
});

export default router;
