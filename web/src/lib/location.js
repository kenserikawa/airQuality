// "Mi ubicación": geolocalización del navegador → estación más cercana; si falla, ubicación por IP.
import { fetchHere as realFetchHere, fetchStation as realFetchStation, findNearestStation as realFindNearest } from './waqi.js';

export class UnlocatedError extends Error {
    constructor(message = 'Could not determine your location', options) {
        super(message, options);
        this.name = 'UnlocatedError';
    }
}

const GEOLOCATION_TIMEOUT_MS = 8000;

function currentPosition(geolocation, timeoutMs) {
    return new Promise((resolve, reject) => {
        if (!geolocation?.getCurrentPosition) {
            reject(new Error('Geolocation unavailable'));
            return;
        }
        // Temporizador propio: algunos navegadores ignoran la opción timeout mientras esperan el permiso.
        const timer = setTimeout(() => reject(new Error('Geolocation timed out')), timeoutMs);
        geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timer);
                resolve(position.coords);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
            { timeout: timeoutMs, maximumAge: 10 * 60 * 1000 },
        );
    });
}

export async function locate({
    geolocation = globalThis.navigator?.geolocation,
    findNearestStation = realFindNearest,
    fetchStation = realFetchStation,
    fetchHere = realFetchHere,
    timeoutMs = GEOLOCATION_TIMEOUT_MS,
} = {}) {
    try {
        const { latitude, longitude } = await currentPosition(geolocation, timeoutMs);
        const { uid } = await findNearestStation(latitude, longitude);
        return await fetchStation(uid);
    } catch {
        // Sigue con la ubicación por IP.
    }
    try {
        return await fetchHere();
    } catch (error) {
        throw new UnlocatedError(undefined, { cause: error });
    }
}
