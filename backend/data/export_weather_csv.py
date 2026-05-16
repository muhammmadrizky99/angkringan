import json
import os
import csv
from datetime import datetime

def export_json_to_csv():
    print("=" * 60)
    print("ETL PROCESS: TRANSFORMING WEATHER JSON CACHE TO CSV")
    print("=" * 60)
    
    base_dir = os.path.dirname(__file__)
    json_path = os.path.join(base_dir, 'real_weather_cache.json')
    
    if not os.path.exists(json_path):
        print(f"❌ ERROR: File cache JSON tidak ditemukan di {json_path}")
        return

    print("1. Mengimpor data JSON mentah dari Open-Meteo API...")
    with open(json_path, 'r') as f:
        weather_data = json.load(f)
        
    # Definisi Event/Hari Libur Nasional (Konteks Fitur ML)
    events = {
        "2025-02-01": ("Imlek 2576 Kongzili", 1),
        "2025-02-28": ("Awal Ramadan 1446H", 1),
        "2025-03-29": ("Idul Fitri 1446H", 1),
        "2025-03-30": ("Cuti Bersama Idul Fitri", 1),
        "2025-04-18": ("Wafat Yesus Kristus", 1),
        "2025-05-01": ("Hari Buruh Internasional", 1),
        "2025-05-12": ("Hari Raya Waisak", 1),
        "2025-05-29": ("Kenaikan Yesus Kristus", 1),
        "2025-06-01": ("Hari Lahir Pancasila", 1),
        "2025-06-06": ("Idul Adha 1446H", 1),
        "2025-06-27": ("Tahun Baru Islam 1447H", 1),
        "2025-08-17": ("Hari Kemerdekaan RI", 1),
        "2025-09-05": ("Maulid Nabi Muhammad SAW", 1),
        "2025-12-25": ("Hari Raya Natal", 1),
        "2026-01-01": ("Tahun Baru 2026", 1),
        "2026-02-17": ("Isra Mikraj Nabi Muhammad SAW", 1),
        "2026-03-19": ("Idul Fitri 1447H", 1),
        "2026-03-20": ("Cuti Bersama Idul Fitri", 1),
    }

    # Pisahkan ke dalam 2 dataset: Training (Feb 25 - Mar 26) dan Testing (Apr 26)
    train_csv_path = os.path.join(base_dir, 'data_cuaca_harian.csv')
    test_csv_path = os.path.join(base_dir, 'data_cuaca_april_2026.csv')

    train_rows = []
    test_rows = []

    print("2. Memproses transformasi struktur dan integrasi kolom Event...")
    sorted_dates = sorted(weather_data.keys())
    
    for dt_str in sorted_dates:
        dt_obj = datetime.strptime(dt_str, '%Y-%m-%d')
        mapped_status = weather_data[dt_str]['mapped']
        
        # Cek event
        event_note, event_flag = events.get(dt_str, ("", 0))
        
        # Format tanggal menjadi M/D/YYYY untuk konsistensi pembacaan Pandas
        formatted_date = f"{dt_obj.month}/{dt_obj.day}/{dt_obj.year}"
        
        row = [formatted_date, mapped_status, event_flag, event_note]
        
        if dt_obj <= datetime(2026, 3, 31):
            train_rows.append(row)
        elif dt_obj <= datetime(2026, 4, 30):
            test_rows.append(row)

    # Simpan CSV Training
    print(f"3. Menulis file CSV Training ({len(train_rows)} baris)...")
    with open(train_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'weather', 'event', 'event_note'])
        writer.writerows(train_rows)

    # Simpan CSV Testing
    print(f"4. Menulis file CSV Testing ({len(test_rows)} baris)...")
    with open(test_csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'weather', 'event', 'event_note'])
        writer.writerows(test_rows)

    print("-" * 60)
    print("✅ PROSES ETL SELESAI!")
    print(f"   - Dataset Training : {train_csv_path}")
    print(f"   - Dataset Testing  : {test_csv_path}")
    print("=" * 60)

if __name__ == "__main__":
    export_json_to_csv()
