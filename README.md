# SPK Prediksi Permintaan Produk Harian Angkringan

Sistem Pendukung Keputusan untuk Prediksi Permintaan Produk Harian pada Angkringan Berbasis XGBoost.

## 🏗️ Arsitektur

```
/frontend  → Next.js (App Router, TypeScript, TailwindCSS)
/backend   → Express.js + Prisma ORM
/ml        → Python (XGBoost, Flask)
```

## ⚡ Quick Start

### 1. Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **Python** >= 3.9
- **npm** atau **yarn**

### 2. Setup Database

```sql
CREATE DATABASE spk_angkringan;
```

### 3. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env → sesuaikan DATABASE_URL dengan kredensial PostgreSQL Anda

# Generate Prisma client & push schema ke database
npx prisma generate
npx prisma db push

# Buat admin user
npx ts-node src/create_admin.ts

# Import data penjualan (424 hari, Feb 2025 - Mar 2026)
npx ts-node src/import_data.ts

# Jalankan server
npm run dev
```

Server berjalan di `http://localhost:5000`

### 4. Setup ML Service

```bash
cd ml
pip install -r requirements.txt

# Generate dummy data CSV
python generate_dummy_data.py

# Train model XGBoost
python train_model.py

# Jalankan prediction service
python predict_service.py
```

ML Service berjalan di `http://localhost:5001`

### 5. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`

### 6. Login

| Role | Email | Password |
|------|-------|----------|
| Superadmin | superadmin@angkringan.com | password123 |
| Admin | admin@angkringan.com | password123 |

## 👥 Role & Fitur

### Superadmin (Pemilik)
- Dashboard lengkap (grafik penjualan, prediksi vs aktual)
- CRUD Produk, Supplier, User/Admin
- Melihat seluruh laporan & export Excel
- Generate & lihat prediksi XGBoost

### Admin (Operasional)
- Input transaksi harian (POS)
- Kelola stok masuk & keluar
- Lihat rekomendasi produksi besok
- Lihat laporan harian

## 🗄️ Database Schema

| Tabel | Deskripsi |
|-------|-----------|
| users | Akun user (uuid, name, email, password, role) |
| products | Produk angkringan (nama, kategori, harga, stok) |
| suppliers | Data supplier bahan baku |
| transactions | Header transaksi (tanggal, total, kasir) |
| transaction_items | Detail item per transaksi |
| stock_movements | Riwayat pergerakan stok (IN/OUT) |
| daily_records | Data harian cuaca & event |
| predictions | Hasil prediksi XGBoost per produk |

## 🧠 Machine Learning

**Model:** XGBRegressor (per produk)

**Features:**
- `day_of_week` — hari dalam seminggu (0-6)
- `is_weekend` — weekend flag (0/1)
- `month` — bulan (1-12)
- `day_of_month` — tanggal dalam bulan (1-31)
- `is_ramadan` — flag bulan Ramadan (0/1)
- `lag_1` — penjualan 1 hari sebelumnya
- `lag_3` — penjualan 3 hari sebelumnya
- `lag_7` — penjualan 7 hari sebelumnya
- `rolling_mean_7` — rata-rata 7 hari terakhir
- `rolling_mean_14` — rata-rata 14 hari terakhir
- `rolling_std_7` — standar deviasi 7 hari terakhir
- `weather` — cuaca (encoded: 0=cerah, 1=berawan, 2=hujan)
- `event` — ada event/tidak (0/1)

**Evaluasi:** MAE, RMSE, MAPE

## 📊 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register user |
| GET | /api/auth/me | Get current user |
| GET/POST/PUT/DELETE | /api/products | CRUD produk |
| GET/POST/PUT/DELETE | /api/suppliers | CRUD supplier |
| GET/POST/PUT/DELETE | /api/users | CRUD user |
| GET/POST | /api/transactions | List & create transaksi |
| GET | /api/transactions/daily | Laporan harian |
| POST | /api/stock/in | Stok masuk |
| POST | /api/stock/out | Stok keluar |
| GET | /api/stock/movements | Riwayat stok |
| POST | /api/predictions/generate | Generate prediksi |
| GET | /api/predictions | List prediksi |
| GET | /api/predictions/latest | Prediksi terbaru |
| GET | /api/dashboard/* | Data dashboard |
| GET | /api/reports/sales | Laporan penjualan |
| GET | /api/reports/export | Export Excel |

## 🛠️ Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/spk_angkringan"
JWT_SECRET="your-secret-key"
PORT=5000
ML_SERVICE_URL="http://localhost:5001"
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📝 Lisensi

MIT License
