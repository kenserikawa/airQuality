import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import madrid from '../fixtures/madrid.json';
import search from '../fixtures/search.json';
import { WAQI_TOKEN } from '../../src/config.js';
import {
    NotFoundError, OfflineError, fetchHere, fetchStation, findNearestStation, searchStations,
} from '../../src/lib/waqi.js';

function jsonResponse(body) {
    return { ok: true, json: async () => body };
}

let fetchMock;

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchStation', () => {
    test('pide /feed/@uid con el token y normaliza la respuesta', async () => {
        fetchMock.mockResolvedValue(jsonResponse(madrid));
        const station = await fetchStation(5725);

        expect(fetchMock.mock.calls[0][0]).toBe(`https://api.waqi.info/feed/@5725/?token=${WAQI_TOKEN}`);
        expect(station).toMatchObject({
            uid: 5725,
            aqi: 42,
            name: 'Madrid',
            geo: { lat: 40.4167754, lng: -3.7037902 },
            time: '2026-10-10T02:00:00+02:00',
            dominant: 'pm25',
        });
        expect(station.iaqi.pm25.v).toBe(42);
        expect(Object.keys(station.forecast)).toContain('pm25');
        const names = station.attributions.map((a) => a.name);
        expect(new Set(names).size).toBe(names.length);
        expect(names).toContain('World Air Quality Index Project');
    });

    test('aqi "-" → null y geo ausente → null', async () => {
        const body = structuredClone(madrid);
        body.data.aqi = '-';
        delete body.data.city.geo;
        delete body.data.forecast;
        fetchMock.mockResolvedValue(jsonResponse(body));
        const station = await fetchStation(5725);
        expect(station.aqi).toBeNull();
        expect(station.geo).toBeNull();
        expect(station.forecast).toBeNull();
    });

    test('status error → NotFoundError', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'error', data: 'Unknown station' }));
        await expect(fetchStation(1)).rejects.toBeInstanceOf(NotFoundError);
    });

    test('fallo de red, cuerpo no JSON y timeout → OfflineError', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(fetchStation(1)).rejects.toBeInstanceOf(OfflineError);

        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } });
        await expect(fetchStation(1)).rejects.toBeInstanceOf(OfflineError);

        fetchMock.mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'));
        await expect(fetchStation(1)).rejects.toBeInstanceOf(OfflineError);
    });

    test('pasa una señal con timeout a fetch', async () => {
        fetchMock.mockResolvedValue(jsonResponse(madrid));
        await fetchStation(5725);
        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });
});

describe('fetchHere', () => {
    test('pide /feed/here/', async () => {
        fetchMock.mockResolvedValue(jsonResponse(madrid));
        const station = await fetchHere();
        expect(fetchMock.mock.calls[0][0]).toBe(`https://api.waqi.info/feed/here/?token=${WAQI_TOKEN}`);
        expect(station.name).toBe('Madrid');
    });
});

describe('searchStations', () => {
    test('codifica la búsqueda, normaliza aqi y limita a 8', async () => {
        fetchMock.mockResolvedValue(jsonResponse(search));
        const results = await searchStations('são paulo', {});
        expect(fetchMock.mock.calls[0][0]).toBe(`https://api.waqi.info/search/?keyword=s%C3%A3o%20paulo&token=${WAQI_TOKEN}`);
        expect(results.length).toBeLessThanOrEqual(8);
        const cuatro = results.find((r) => r.uid === 3229);
        expect(cuatro).toEqual({ uid: 3229, aqi: 59, name: 'Cuatro Caminos, Madrid, Spain' });
        expect(results.find((r) => r.name === 'Madrid').aqi).toBeNull();
    });

    test('abortar la señal del llamador rechaza con AbortError', async () => {
        const controller = new AbortController();
        fetchMock.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason));
        }));
        const pending = searchStations('madr', { signal: controller.signal });
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });
});

describe('findNearestStation', () => {
    const station = (uid, lat, lon, aqi) => ({ uid, lat, lon, aqi, station: { name: `S${uid}` } });

    test('recuadro ±0,25° y la más cercana con lectura', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'ok', data: [
            station(1, 40.421, -3.701, '-'),
            station(2, 40.45, -3.70, '53'),
            station(3, 40.60, -3.70, '20'),
        ] }));
        await expect(findNearestStation(40.42, -3.70)).resolves.toEqual({ uid: 2 });
        expect(fetchMock.mock.calls[0][0]).toBe(`https://api.waqi.info/map/bounds/?latlng=40.17,-3.95,40.67,-3.45&networks=all&token=${WAQI_TOKEN}`);
    });

    test('si ninguna tiene lectura, la más cercana del recuadro', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'ok', data: [
            station(7, 40.50, -3.70, '-'),
            station(5, 40.421, -3.701, '-'),
        ] }));
        await expect(findNearestStation(40.42, -3.70)).resolves.toEqual({ uid: 5 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('recuadro vacío → amplía a ±1°', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse({ status: 'ok', data: [] }))
            .mockResolvedValueOnce(jsonResponse({ status: 'ok', data: [station(9, 41.0, -3.5, '30')] }));
        await expect(findNearestStation(40.42, -3.70)).resolves.toEqual({ uid: 9 });
        expect(fetchMock.mock.calls[1][0]).toContain('latlng=39.42,-4.7,41.42,-2.7');
    });

    test('sin estaciones en ningún recuadro → NotFoundError', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ status: 'ok', data: [] }));
        await expect(findNearestStation(0, 0)).rejects.toBeInstanceOf(NotFoundError);
    });
});
