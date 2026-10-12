// Lógica pura del dominio AQI: categorías, cielos, textos y formateo. Sin DOM ni red.

// Cristal oscuro de tarjetas y píldoras (styles.css): con él, el blanco al 85 % cumple 4,5:1 sobre cualquier horizonte.
export const GLASS_COLOR = '#060E20';
export const GLASS_ALPHA = 0.6;
const INK = '#0F172A';

export const NEUTRAL = {
    key: 'neutral',
    label: 'No current reading',
    range: '',
    min: null,
    max: null,
    sky: ['#0F172A', '#334155', '#94A3B8'],
    accent: '#94A3B8',
    implication: '',
    advice: '',
};

export const CATEGORIES = [
    {
        key: 'good',
        label: 'Good',
        range: '0–50',
        min: 0,
        max: 50,
        sky: ['#0B3D4F', '#1E846C', '#9BE7C4'],
        accent: '#449A66',
        implication: 'Air quality is satisfactory, and air pollution poses little or no risk.',
        advice: 'Great day to be outside.',
    },
    {
        key: 'moderate',
        label: 'Moderate',
        range: '51–100',
        min: 51,
        max: 100,
        sky: ['#3B3A1E', '#8F731C', '#F6E7A1'],
        accent: '#E2B33C',
        implication: 'Air quality is acceptable; however, some pollutants may be a moderate concern for a very small number of unusually sensitive people.',
        advice: 'Unusually sensitive people should consider limiting prolonged outdoor exertion.',
    },
    {
        key: 'usg',
        label: 'Unhealthy for Sensitive Groups',
        range: '101–150',
        min: 101,
        max: 150,
        sky: ['#4A2511', '#B1611C', '#F9C784'],
        accent: '#F99932',
        implication: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
        advice: 'Children, older adults and people with lung disease should limit prolonged outdoor exertion.',
    },
    {
        key: 'unhealthy',
        label: 'Unhealthy',
        range: '151–200',
        min: 151,
        max: 200,
        sky: ['#3D0E12', '#C0392B', '#F28B82'],
        accent: '#CE3B34',
        implication: 'Everyone may begin to experience health effects; sensitive groups may experience more serious effects.',
        advice: 'Avoid prolonged outdoor exertion. Consider a mask outdoors.',
    },
    {
        key: 'very-unhealthy',
        label: 'Very Unhealthy',
        range: '201–300',
        min: 201,
        max: 300,
        sky: ['#1E0B33', '#6A3FA0', '#C3A6E8'],
        accent: '#6A4299',
        implication: 'Health alert: the risk of health effects is increased for everyone.',
        advice: 'Avoid outdoor exertion. Keep windows closed.',
    },
    {
        key: 'hazardous',
        label: 'Hazardous',
        range: '301+',
        min: 301,
        max: Infinity,
        sky: ['#1A0606', '#6B1D1D', '#B5654A'],
        accent: '#7F2223',
        implication: 'Health warning of emergency conditions: everyone is more likely to be affected.',
        advice: 'Stay indoors and avoid all physical activity outdoors.',
    },
];

const POLLUTANTS = [
    ['pm25', 'PM2.5', 'Fine particles'],
    ['pm10', 'PM10', 'Coarse particles'],
    ['o3', 'O3', 'Ozone'],
    ['no2', 'NO2', 'Nitrogen dioxide'],
    ['so2', 'SO2', 'Sulphur dioxide'],
    ['co', 'CO', 'Carbon monoxide'],
];

const WEATHER = [
    ['t', 'Temperature', '°C', 1],
    ['h', 'Humidity', '%', 0],
    ['w', 'Wind', 'm/s', 1],
    ['p', 'Pressure', 'hPa', 0],
];

const FORECAST_KEYS = ['pm25', 'pm10', 'o3'];

export function parseAqi(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }
    return null;
}

export function getCategory(aqi) {
    const value = parseAqi(aqi);
    if (value === null) {
        return NEUTRAL;
    }
    return CATEGORIES.find((category) => value <= category.max);
}

function readValue(iaqi, key) {
    const value = iaqi?.[key]?.v;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

export function pickPollutants(iaqi) {
    return POLLUTANTS
        .filter(([key]) => readValue(iaqi, key) !== null)
        .map(([key, code, name]) => {
            const value = readValue(iaqi, key);
            return { key, code, name, value, category: getCategory(value) };
        });
}

export function pickWeather(iaqi) {
    return WEATHER
        .filter(([key]) => readValue(iaqi, key) !== null)
        .map(([key, label, unit, decimals]) => ({ key, label, value: round(readValue(iaqi, key), decimals), unit }));
}

export function pollutantLabel(code) {
    const match = POLLUTANTS.find(([key]) => key === code);
    return match ? match[1] : String(code).toUpperCase();
}

function dayLabel(day) {
    const date = new Date(`${day}T00:00:00Z`);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    return `${weekday} ${date.getUTCDate()}`;
}

export function forecastKeys(daily) {
    return FORECAST_KEYS.filter((key) => Array.isArray(daily?.[key]) && daily[key].length > 0);
}

export function forecastDays(daily, key, today) {
    const days = Array.isArray(daily?.[key]) ? daily[key] : [];
    return days
        .filter((entry) => typeof entry?.day === 'string' && entry.day >= today)
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(0, 6)
        .map(({ day, avg, min, max }) => ({ day, label: dayLabel(day), avg, min, max, category: getCategory(avg) }));
}

function plural(value, unit) {
    return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

export function relativeTime(iso, now = new Date()) {
    const time = Date.parse(iso);
    if (Number.isNaN(time)) {
        return '';
    }
    const seconds = Math.max(0, (now.getTime() - time) / 1000);
    if (seconds < 60) {
        return 'just now';
    }
    if (seconds < 3600) {
        return plural(Math.floor(seconds / 60), 'minute');
    }
    if (seconds < 86400) {
        return plural(Math.floor(seconds / 3600), 'hour');
    }
    return plural(Math.floor(seconds / 86400), 'day');
}

export function isStale(iso, now = new Date()) {
    const time = Date.parse(iso);
    return !Number.isNaN(time) && now.getTime() - time > 24 * 3600 * 1000;
}

export function splitStationName(name) {
    const text = String(name ?? '');
    const comma = text.indexOf(',');
    if (comma === -1) {
        return { primary: text.trim(), secondary: '' };
    }
    return { primary: text.slice(0, comma).trim(), secondary: text.slice(comma + 1).trim() };
}

function toRgb(hex) {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function toHex(rgb) {
    return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function luminance(hex) {
    const [r, g, b] = toRgb(hex).map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA, hexB) {
    const [light, dark] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
}

export function blend(hexBase, hexOver, alpha) {
    const base = toRgb(hexBase);
    const over = toRgb(hexOver);
    return toHex(base.map((channel, i) => over[i] * alpha + channel * (1 - alpha)));
}

// Posición 0..1 en la barra de 6 tramos iguales (0–50, 50–100, 100–150, 150–200, 200–300, 300–500).
const SCALE_BREAKS = [0, 50, 100, 150, 200, 300, 500];

export function scalePosition(aqi) {
    const value = parseAqi(aqi);
    if (value === null) {
        return null;
    }
    const clamped = Math.min(Math.max(value, 0), 500);
    const segments = SCALE_BREAKS.length - 1;
    const index = Math.min(SCALE_BREAKS.findIndex((limit, i) => clamped <= SCALE_BREAKS[i + 1]), segments - 1);
    const [low, high] = [SCALE_BREAKS[index], SCALE_BREAKS[index + 1]];
    return (index + (clamped - low) / (high - low)) / segments;
}

// Color de texto (blanco o tinta) con más contraste sobre un fondo de color sólido, p. ej. los chips de categoría.
export function textOn(hex) {
    return contrastRatio('#FFFFFF', hex) >= contrastRatio(INK, hex) ? '#FFFFFF' : INK;
}
