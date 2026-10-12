export const NEUTRAL_COLOR = '#949494';
export const GENERIC_ERROR_MESSAGE = 'Could not reach aqicn.org. Please try again later.';

// Rangos de aqicn.org; textos literales de templates/search.html.twig.
const CATEGORIES = [
    {
        max: 50,
        level: 'Good',
        healthImplication: 'Air quality is considered satisfactory, and air pollution poses little or no risk',
        cautionaryStatement: 'None',
        color: '#449A66',
    },
    {
        max: 100,
        level: 'Moderate',
        healthImplication: 'Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.',
        color: '#1DA488',
    },
    {
        max: 150,
        level: 'Unhealthy for Sensitive Groups',
        healthImplication: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.',
        color: '#F99932',
    },
    {
        max: 200,
        level: 'Unhealthy',
        healthImplication: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else, especially children, should limit prolonged outdoor exertion',
        color: '#CE3B34',
    },
    {
        max: 300,
        level: 'Very Unhealthy',
        healthImplication: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else, especially children, should limit outdoor exertion.',
        color: '#6A4299',
    },
    {
        max: Infinity,
        level: 'Hazardous',
        healthImplication: 'Health alert: everyone may experience more serious health effects',
        cautionaryStatement: 'Everyone should avoid all outdoor exertion',
        color: '#7F2223',
    },
];

const POLLUTANTS = [
    ['pm25', 'PM2.5'],
    ['pm10', 'PM10'],
    ['o3', 'O3'],
    ['no2', 'NO2'],
    ['so2', 'SO2'],
    ['co', 'CO'],
];

const WEATHER = [
    ['p', 'Pressure', ' hPa'],
    ['t', 'Temperature', ' ºC'],
    ['h', 'Air humidity', '%'],
    ['w', 'Wind', ' km/h'],
];

function toFiniteNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }
    return null;
}

function hasValue(iaqi, key) {
    return iaqi?.[key]?.v != null;
}

export function getAqiCategory(aqi) {
    const value = toFiniteNumber(aqi);
    if (value === null) {
        return null;
    }
    const { max, ...category } = CATEGORIES.find((candidate) => value <= candidate.max);
    return category;
}

export function buildFeedUrl(city, token) {
    return `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${encodeURIComponent(token)}`;
}

export function pickPollutants(iaqi) {
    return POLLUTANTS
        .filter(([key]) => hasValue(iaqi, key))
        .map(([key, label]) => ({ label, value: iaqi[key].v }));
}

export function pickWeather(iaqi) {
    return WEATHER
        .filter(([key]) => hasValue(iaqi, key))
        .map(([key, label, unit]) => ({ label, value: `${iaqi[key].v}${unit}` }));
}

export function isSafeHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

export function readCityParam(search) {
    return (new URLSearchParams(search).get('city') ?? '').trim();
}

export function parseGeo(geo) {
    if (!Array.isArray(geo) || geo.length < 2) {
        return null;
    }
    const lat = toFiniteNumber(geo[0]);
    const lng = toFiniteNumber(geo[1]);
    return lat === null || lng === null ? null : { lat, lng };
}

export function parseFeedResponse(json) {
    if (json?.status === 'ok' && json.data && typeof json.data === 'object') {
        return { kind: 'ok', data: json.data };
    }
    if (json?.status === 'error' && typeof json.data === 'string') {
        return { kind: 'error', message: json.data };
    }
    return { kind: 'error', message: GENERIC_ERROR_MESSAGE };
}
