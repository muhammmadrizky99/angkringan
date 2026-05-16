"""Audit keaslian data penjualan angkringan — cek apakah terlihat buatan AI"""
import pandas as pd
import numpy as np

df = pd.read_excel(r'd:\angkringan\backend\data\data_penjualan_angkringan_setahun.xlsx')
cuaca = pd.read_csv(r'd:\angkringan\backend\data\data_cuaca_harian.csv')

print('=' * 60)
print('AUDIT KEASLIAN DATA PENJUALAN ANGKRINGAN AGOY')
print('=' * 60)

products = [c for c in df.columns if c != 'tanggal']
all_vals = df[products].values.flatten()
all_vals = all_vals[all_vals > 0]

# 1. Distribusi angka bulat
print('\n[1] DISTRIBUSI ANGKA (apakah terlalu bulat/pola?)')
for mod in [5, 10]:
    pct = (all_vals % mod == 0).sum() / len(all_vals) * 100
    expected = 100 / mod
    print(f'  Kelipatan {mod}: {pct:.1f}% (wajar sekitar {expected:.0f}%)')

# 2. Pengulangan berturut
print('\n[2] PENGULANGAN BERTURUT-TURUT')
for p in ['bakso', 'ceker', 'telur_puyuh', 'sosis_besar']:
    series = df[p].values
    max_repeat = 1
    cur_repeat = 1
    for i in range(1, len(series)):
        if series[i] == series[i-1] and series[i] > 0:
            cur_repeat += 1
            max_repeat = max(max_repeat, cur_repeat)
        else:
            cur_repeat = 1
    print(f'  {p}: max {max_repeat} hari berturut angka sama (wajar: 2-4)')

# 3. Korelasi cuaca
df['tanggal'] = pd.to_datetime(df['tanggal'])
cuaca['date'] = pd.to_datetime(cuaca['date'])
merged = df.merge(cuaca, left_on='tanggal', right_on='date')

print('\n[3] KORELASI CUACA vs PENJUALAN')
for p in ['bakso', 'ceker', 'sosis_besar']:
    avg_cerah = merged[merged['weather'] == 0][p].mean()
    avg_berawan = merged[merged['weather'] == 1][p].mean()
    avg_hujan = merged[merged['weather'] == 2][p].mean()
    print(f'  {p}: Cerah={avg_cerah:.1f}, Berawan={avg_berawan:.1f}, Hujan={avg_hujan:.1f}')

# 4. Weekend vs weekday
print('\n[4] POLA WEEKEND vs WEEKDAY')
merged['dow'] = merged['tanggal'].dt.dayofweek
for p in ['bakso', 'ceker', 'telur_puyuh']:
    avg_wd = merged[merged['dow'] < 5][p].mean()
    avg_we = merged[merged['dow'] >= 5][p].mean()
    diff = (avg_we - avg_wd) / avg_wd * 100
    print(f'  {p}: Weekday={avg_wd:.1f}, Weekend={avg_we:.1f} (diff: {diff:+.1f}%)')

# 5. Ramadan vs non-Ramadan
print('\n[5] POLA RAMADAN (harus NAIK karena bukber)')
# Ramadan 1446H: 28 Feb - 29 Mar 2025
ram_1446_start = pd.Timestamp('2025-02-28')
ram_1446_end = pd.Timestamp('2025-03-29')
# Ramadan 1447H: 19 Feb - 19 Mar 2026
ram_1447_start = pd.Timestamp('2026-02-19')
ram_1447_end = pd.Timestamp('2026-03-19')
merged['is_ram'] = (
    ((merged['tanggal'] >= ram_1446_start) & (merged['tanggal'] <= ram_1446_end)) |
    ((merged['tanggal'] >= ram_1447_start) & (merged['tanggal'] <= ram_1447_end))
)
non_closed = merged[merged['bakso'] > 0]
for p in ['bakso', 'ceker', 'sosis_besar']:
    avg_ram = non_closed[non_closed['is_ram']][p].mean()
    avg_non = non_closed[~non_closed['is_ram']][p].mean()
    diff = (avg_ram - avg_non) / avg_non * 100
    print(f'  {p}: Ramadan={avg_ram:.1f}, Non-Ramadan={avg_non:.1f} (diff: {diff:+.1f}%)')

# 6. Hari tutup
tutup = df[df[products].sum(axis=1) == 0]
print(f'\n[6] HARI TUTUP: {len(tutup)} hari')
for _, row in tutup.iterrows():
    tgl = row['tanggal']
    print(f"  {tgl.strftime('%Y-%m-%d')} ({tgl.strftime('%A')})")

# 7. Distribusi digit terakhir
print('\n[7] DISTRIBUSI DIGIT TERAKHIR (harus merata 0-9)')
digits = all_vals % 10
for d in range(10):
    pct = (digits == d).sum() / len(digits) * 100
    bar = '#' * int(pct)
    print(f'  Digit {d}: {pct:.1f}% {bar}')

# 8. Autokorelasi
print('\n[8] AUTOKORELASI LAG-1 (data riil biasanya 0.3-0.7)')
for p in ['bakso', 'ceker', 'telur_puyuh']:
    ac = non_closed[p].autocorr(lag=1)
    print(f'  {p}: {ac:.3f}')

# 9. Ringkasan sampel Ramadan
print('\n[9] SAMPEL DATA RAMADAN 1447H (19 Feb - 19 Mar 2026)')
ram_data = df[(df['tanggal'] >= '2026-02-19') & (df['tanggal'] <= '2026-03-19')]
print(ram_data[['tanggal', 'bakso', 'ceker', 'telur_puyuh', 'sosis_besar']].to_string(index=False))

print('\n[10] SAMPEL DATA RAMADAN 1446H (28 Feb - 29 Mar 2025)')
ram_data_1446 = df[(df['tanggal'] >= '2025-02-28') & (df['tanggal'] <= '2025-03-29')]
print(ram_data_1446[['tanggal', 'bakso', 'ceker', 'telur_puyuh', 'sosis_besar']].to_string(index=False))

print('\n' + '=' * 60)
print('AUDIT SELESAI')
print('=' * 60)
