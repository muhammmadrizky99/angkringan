import axios from 'axios';

/**
 * Weather Service using Open-Meteo API
 * 
 * Open-Meteo menggunakan data dari stasiun meteorologi lokal
 * termasuk BMKG untuk wilayah Indonesia.
 * Gratis, tanpa API key, resolusi tinggi.
 * 
 * Lokasi: Angkringan Agoy, Padang Panjang, Sumatera Barat
 */

const LAT = process.env.WEATHER_LAT || '-0.4648';
const LON = process.env.WEATHER_LON || '100.3983';

interface WeatherResult {
    weather: number; // 0=cerah, 1=berawan, 2=hujan
    description: string;
    temp: number;
    icon: string;
}

/**
 * Encode WMO Weather Code to our 0/1/2 scale
 * WMO codes: https://open-meteo.com/en/docs
 * 0     = Clear sky
 * 1-3   = Mainly clear, partly cloudy, overcast
 * 45-48 = Fog
 * 51-57 = Drizzle
 * 61-67 = Rain
 * 71-77 = Snow
 * 80-82 = Rain showers
 * 85-86 = Snow showers
 * 95-99 = Thunderstorm
 */
function encodeWmoWeather(code: number): { weatherCode: number; label: string; icon: string } {
    if (code === 0) {
        return { weatherCode: 0, label: 'Cerah', icon: '☀️' };
    }
    if (code >= 1 && code <= 3) {
        return { weatherCode: 1, label: 'Berawan', icon: '⛅' };
    }
    if (code >= 45 && code <= 48) {
        return { weatherCode: 1, label: 'Berkabut', icon: '🌫️' };
    }
    if (code >= 51 && code <= 57) {
        return { weatherCode: 2, label: 'Gerimis', icon: '🌧️' };
    }
    if (code >= 61 && code <= 67) {
        return { weatherCode: 2, label: 'Hujan', icon: '🌧️' };
    }
    if (code >= 71 && code <= 77) {
        return { weatherCode: 2, label: 'Hujan', icon: '🌧️' };
    }
    if (code >= 80 && code <= 82) {
        return { weatherCode: 2, label: 'Hujan Lebat', icon: '⛈️' };
    }
    if (code >= 85 && code <= 86) {
        return { weatherCode: 2, label: 'Hujan Lebat', icon: '⛈️' };
    }
    if (code >= 95 && code <= 99) {
        return { weatherCode: 2, label: 'Badai Petir', icon: '⛈️' };
    }
    return { weatherCode: 0, label: 'Cerah', icon: '☀️' };
}

/**
 * Fetch current weather from Open-Meteo (data stasiun lokal / BMKG)
 */
export async function fetchCurrentWeather(): Promise<WeatherResult> {
    try {
        const res = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia/Jakarta`
        );

        const current = res.data.current;
        const wmoCode = current.weather_code ?? 0;
        const encoded = encodeWmoWeather(wmoCode);

        return {
            weather: encoded.weatherCode,
            description: `${encoded.label} (WMO: ${wmoCode})`,
            temp: Math.round(current.temperature_2m ?? 25),
            icon: encoded.icon,
        };
    } catch (error) {
        console.error('Open-Meteo API error:', error);
        return { weather: 0, description: 'Cerah (API error)', temp: 25, icon: '☀️' };
    }
}

/**
 * Fetch tomorrow's weather forecast from Open-Meteo
 */
export async function fetchTomorrowForecast(): Promise<WeatherResult> {
    try {
        const res = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Jakarta&forecast_days=2`
        );

        const daily = res.data.daily;
        // Index 1 = tomorrow
        const tomorrowIdx = daily.time.length > 1 ? 1 : 0;
        const wmoCode = daily.weather_code[tomorrowIdx] ?? 0;
        const encoded = encodeWmoWeather(wmoCode);
        const tempMax = daily.temperature_2m_max[tomorrowIdx] ?? 28;
        const tempMin = daily.temperature_2m_min[tomorrowIdx] ?? 20;
        const avgTemp = Math.round((tempMax + tempMin) / 2);

        return {
            weather: encoded.weatherCode,
            description: `${encoded.label} (${tempMin}°–${tempMax}°C, WMO: ${wmoCode})`,
            temp: avgTemp,
            icon: encoded.icon,
        };
    } catch (error) {
        console.error('Open-Meteo Forecast error:', error);
        return { weather: 0, description: 'Cerah (API error)', temp: 25, icon: '☀️' };
    }
}

/**
 * Get weather label from code
 */
export function getWeatherLabel(code: number): string {
    switch (code) {
        case 0: return 'Cerah';
        case 1: return 'Berawan';
        case 2: return 'Hujan';
        default: return 'Cerah';
    }
}
