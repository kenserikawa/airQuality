// Cliente de la API de WAQI: peticiones con timeout, errores tipados y respuestas normalizadas.
import { REQUEST_TIMEOUT_MS, WAQI_API, WAQI_TOKEN } from '../config.js';
import { parseAqi } from './aqi.js';

export class OfflineError extends Error {
    constructor(message = "Can't reach the air quality service", options) {
        super(message, options);
        this.name = 'OfflineError';
    }
}

export class NotFoundError extends Error {
    constructor(message = 'Station not found', options) {
        super(message, options);
        this.name = 'NotFoundError';
    }
}

const MAX_SEARCH_RESULTS = 8;
const NEAR_BOX = 0.25;
const WIDE_BOX = 1;

function url(path, params = {}) {
    const query = Object.entries({ ...params, token: WAQI_TOKEN })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
    return `${WAQI_API}${path}?${query}`;
}

async function fetchJson(target, signal) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let body;
    try {
        const response = await fetch(target, { signal: combined });
        body = await response.json();
    } catch (error) {
        // Un aborto pedido por el llamador no es un fallo de red: se propaga tal cual.
        if (signal?.aborted) {
            throw signal.reason;
        }
        throw new OfflineError(undefined, { cause: error });
    }
    if (body?.status === 'ok') {
        return body.data;
    }
    if (body?.status === 'error') {
        throw new NotFoundError(typeof body.data === 'string' ? body.data : undefined);
    }
    throw new OfflineError('Unexpected response from the air quality service');
}

function normalizeGeo(geo) {
    if (!Array.isArray(geo) || geo.length < 2) {
        return null;
    }
    const [lat, lng] = geo.map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function normalizeAttributions(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
        .filter((item) => typeof item?.name === 'string' && item.name.trim() !== '')
        .filter((item) => !seen.has(item.name) && seen.add(item.name))
        .map((item) => ({ name: item.name, url: typeof item.url === 'string' ? item.url : '' }));
}

function normalizeStation(data) {
    if (!data || typeof data !== 'object') {
        throw new OfflineError('Unexpected response from the air quality service');
    }
    return {
        uid: Number(data.idx),
        aqi: parseAqi(data.aqi),
        name: String(data.city?.name ?? ''),
        geo: normalizeGeo(data.city?.geo),
        time: typeof data.time?.iso === 'string' ? data.time.iso : null,
        dominant: typeof data.dominentpol === 'string' && data.dominentpol ? data.dominentpol : null,
        iaqi: data.iaqi && typeof data.iaqi === 'object' ? data.iaqi : {},
        forecast: data.forecast?.daily && typeof data.forecast.daily === 'object' ? data.forecast.daily : null,
        attributions: normalizeAttributions(data.attributions),
    };
}

export async function fetchStation(uid) {
    return normalizeStation(await fetchJson(url(`/feed/@${uid}/`)));
}

export async function fetchHere() {
    return normalizeStation(await fetchJson(url('/feed/here/')));
}

export async function searchStations(query, { signal } = {}) {
    const data = await fetchJson(url('/search/', { keyword: query }), signal);
    return (Array.isArray(data) ? data : [])
        .filter((item) => Number.isFinite(Number(item?.uid)))
        .slice(0, MAX_SEARCH_RESULTS)
        .map((item) => ({ uid: Number(item.uid), aqi: parseAqi(item.aqi), name: String(item.station?.name ?? '') }));
}

function coordinate(value) {
    return String(Number(value.toFixed(2)));
}

function boundsUrl(lat, lng, delta) {
    const box = [lat - delta, lng - delta, lat + delta, lng + delta].map(coordinate).join(',');
    return `${WAQI_API}/map/bounds/?latlng=${box}&networks=all&token=${WAQI_TOKEN}`;
}

function distanceKm(lat1, lng1, lat2, lng2) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
}

// /map/bounds/ marca con "-" las estaciones cuya lectura es antigua aunque su ficha tenga el último valor:
// se prefiere la más cercana con lectura y, si no hay ninguna, la más cercana a secas.
export async function findNearestStation(lat, lng) {
    for (const delta of [NEAR_BOX, WIDE_BOX]) {
        const data = await fetchJson(boundsUrl(lat, lng, delta));
        const stations = (Array.isArray(data) ? data : [])
            .filter((item) => Number.isFinite(Number(item?.uid)) && Number.isFinite(item?.lat) && Number.isFinite(item?.lon))
            .map((item) => ({ uid: Number(item.uid), aqi: parseAqi(item.aqi), distance: distanceKm(lat, lng, item.lat, item.lon) }))
            .sort((a, b) => a.distance - b.distance);
        if (stations.length > 0) {
            const best = stations.find((item) => item.aqi !== null) ?? stations[0];
            return { uid: best.uid };
        }
    }
    throw new NotFoundError('No stations near this location');
}
