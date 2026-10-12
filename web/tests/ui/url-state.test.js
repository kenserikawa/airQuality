// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { onStationIdChange, pushStationId, readStationId, replaceStationId } from '../../src/lib/url-state.js';

afterEach(() => {
    window.history.replaceState(null, '', '/');
});

describe('url-state', () => {
    test('lee ?station= numérico', () => {
        window.history.replaceState(null, '', '/?station=5725');
        expect(readStationId()).toBe(5725);
    });

    test('acepta uid negativos (sensores ciudadanos de WAQI)', () => {
        window.history.replaceState(null, '', '/?station=-2460868');
        expect(readStationId()).toBe(-2460868);
    });

    test('ignora valores no numéricos o ausentes', () => {
        window.history.replaceState(null, '', '/?station=abc');
        expect(readStationId()).toBeNull();
        window.history.replaceState(null, '', '/?station=1.5');
        expect(readStationId()).toBeNull();
        window.history.replaceState(null, '', '/');
        expect(readStationId()).toBeNull();
    });

    test('pushStationId añade una entrada al historial', () => {
        const before = window.history.length;
        pushStationId(3229);
        expect(window.location.search).toBe('?station=3229');
        expect(window.history.length).toBe(before + 1);
    });

    test('replaceStationId no añade entrada', () => {
        const before = window.history.length;
        replaceStationId(42);
        expect(window.location.search).toBe('?station=42');
        expect(window.history.length).toBe(before);
    });

    test('popstate avisa con el id leído y se puede desuscribir', () => {
        const callback = vi.fn();
        const unsubscribe = onStationIdChange(callback);
        window.history.replaceState(null, '', '/?station=777');
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(callback).toHaveBeenCalledWith(777);
        unsubscribe();
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
