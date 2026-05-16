import urllib.request
import json
import os

def fetch_weather_data():
    # Koordinat Padang Panjang
    LATITUDE = -0.4607
    LONGITUDE = 100.4011
    START_DATE = "2025-02-01"
    END_DATE = "2026-04-30"
    
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={LATITUDE}&longitude={LONGITUDE}&start_date={START_DATE}&end_date={END_DATE}&daily=precipitation_sum,weathercode&timezone=Asia%2FJakarta"
    
    print("=" * 60)
    print("PROSES PENARIKAN DATA CUACA HISTORIS - OPEN METEO API")
    print(f"Periode: {START_DATE} s/d {END_DATE}")
    print("=" * 60)
    
    print("Menghubungi server Open-Meteo...")
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
        
        times = data['daily']['time']
        codes = data['daily']['weathercode']
        precips = data['daily']['precipitation_sum']
        
        weather_dict = {}
        
        print(f"Berhasil menarik {len(times)} hari data.")
        print("Sedang melakukan mapping kode WMO ke format sistem...")

        for t, c, p in zip(times, codes, precips):
            if c is None: c = 0
            
            # Mapping Kode WMO
            # 0, 1 = Cerah
            # 2, 3 = Berawan
            # >= 50 = Hujan/Gerimis
            if c <= 1:
                mapped = 0
            elif c <= 3:
                mapped = 1
            else:
                mapped = 2
                
            weather_dict[t] = {
                'wmo_code': c,
                'precipitation_mm': p,
                'mapped_status': mapped
            }

        # Simpan ke JSON
        output_path = os.path.join(os.path.dirname(__file__), 'real_weather_cache.json')
        with open(output_path, 'w') as f:
            json.dump(weather_dict, f, indent=2)
            
        print("-" * 60)
        print(f"✅ SUKSES! Data cuaca disimpan di: {output_path}")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ ERROR: Terjadi kegagalan saat mengambil data: {e}")

if __name__ == "__main__":
    fetch_weather_data()
