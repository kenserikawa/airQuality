import { afterEach, describe, expect, test, vi } from 'vitest';
import { UnlocatedError, locate } from '../../src/lib/location.js';
import { NotFoundError } from '../../src/lib/waqi.js';

const madrid = { uid: 5725, name: 'Madrid' };
const ipStation = { uid: 8484, name: 'Elciego' };

function deps(overrides = {}) {
    return {
        geolocation: {
            getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 40.42, longitude: -3.7 } })),
        },
        findNearestStation: vi.fn(async () => ({ uid: 5725 })),
        fetchStation: vi.fn(async () => madrid),
        fetchHere: vi.fn(async () => ipStation),
        ...overrides,
    };
}

afterEach(() => {
    vi.useRealTimers();
});

describe('locate', () => {
    test('geolocalización concedida → estación más cercana', async () => {
        const d = deps();
        await expect(locate(d)).resolves.toBe(madrid);
        expect(d.findNearestStation).toHaveBeenCalledWith(40.42, -3.7);
        expect(d.fetchStation).toHaveBeenCalledWith(5725);
        expect(d.fetchHere).not.toHaveBeenCalled();
    });

    test('permiso denegado → ubicación por IP', async () => {
        const d = deps({
            geolocation: { getCurrentPosition: vi.fn((success, failure) => failure({ code: 1, message: 'denied' })) },
        });
        await expect(locate(d)).resolves.toBe(ipStation);
        expect(d.findNearestStation).not.toHaveBeenCalled();
    });

    test('sin respuesta en el tiempo límite → ubicación por IP', async () => {
        vi.useFakeTimers();
        const d = deps({ geolocation: { getCurrentPosition: vi.fn() } });
        const pending = locate({ ...d, timeoutMs: 8000 });
        await vi.advanceTimersByTimeAsync(8000);
        await expect(pending).resolves.toBe(ipStation);
    });

    test('sin estaciones cercanas → ubicación por IP', async () => {
        const d = deps({ findNearestStation: vi.fn(async () => { throw new NotFoundError(); }) });
        await expect(locate(d)).resolves.toBe(ipStation);
    });

    test('sin API de geolocalización → ubicación por IP', async () => {
        const d = deps({ geolocation: undefined });
        await expect(locate(d)).resolves.toBe(ipStation);
    });

    test('la IP también falla → UnlocatedError', async () => {
        const d = deps({
            geolocation: undefined,
            fetchHere: vi.fn(async () => { throw new Error('offline'); }),
        });
        await expect(locate(d)).rejects.toBeInstanceOf(UnlocatedError);
    });
});
