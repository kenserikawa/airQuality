// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mountMap } from '../../src/ui/map.js';

let root;
let L;
let mapObject;
let marker;
let trigger;
let observe;

function chain(object) {
    return Object.assign(object, { addTo: vi.fn(() => object) });
}

beforeEach(() => {
    root = document.createElement('section');
    root.hidden = true;
    mapObject = { setView: vi.fn(() => mapObject), remove: vi.fn(), invalidateSize: vi.fn() };
    marker = chain({ bindTooltip: vi.fn(() => marker), setLatLng: vi.fn(() => marker), setStyle: vi.fn(() => marker), setTooltipContent: vi.fn(() => marker) });
    L = {
        map: vi.fn(() => mapObject),
        tileLayer: vi.fn(() => chain({})),
        circleMarker: vi.fn(() => marker),
    };
    trigger = null;
    observe = vi.fn((element, callback) => {
        trigger = callback;
        return () => {};
    });
});

const madrid = { geo: { lat: 40.4167754, lng: -3.7037902 }, label: 'Madrid', aqi: 42 };

describe('mountMap', () => {
    test('sin coordenadas válidas se oculta y no carga Leaflet', () => {
        const loadLeaflet = vi.fn();
        mountMap(root, { geo: null, label: 'X', aqi: 1, loadLeaflet, observe });
        expect(root.hidden).toBe(true);
        expect(loadLeaflet).not.toHaveBeenCalled();
    });

    test('no carga Leaflet hasta que la sección entra en pantalla', async () => {
        const loadLeaflet = vi.fn(async () => ({ default: L }));
        mountMap(root, { ...madrid, loadLeaflet, observe });
        expect(root.hidden).toBe(false);
        expect(root.querySelector('#map-title').textContent).toBe('Nearby stations');
        expect(loadLeaflet).not.toHaveBeenCalled();
        await trigger();
        expect(loadLeaflet).toHaveBeenCalledOnce();
    });

    test('crea el mapa sin zoom con rueda, con base oscura, capa AQI y marcador', async () => {
        mountMap(root, { ...madrid, loadLeaflet: async () => ({ default: L }), observe });
        await trigger();
        expect(L.map).toHaveBeenCalledOnce();
        expect(L.map.mock.calls[0][1]).toMatchObject({ scrollWheelZoom: false });
        expect(mapObject.setView).toHaveBeenCalledWith([40.4167754, -3.7037902], 11);
        const urls = L.tileLayer.mock.calls.map((call) => call[0]);
        expect(urls.some((url) => url.includes('basemaps.cartocdn.com/dark_all'))).toBe(true);
        expect(urls.some((url) => url.includes('tiles.waqi.info/tiles/usepa-aqi'))).toBe(true);
        expect(L.circleMarker.mock.calls[0][0]).toEqual([40.4167754, -3.7037902]);
        expect(marker.bindTooltip.mock.calls[0][0]).toBe('Madrid · 42');
    });

    test('update mueve vista y marcador sin recrear el mapa', async () => {
        const instance = mountMap(root, { ...madrid, loadLeaflet: async () => ({ default: L }), observe });
        await trigger();
        instance.update({ geo: { lat: 41.38, lng: 2.17 }, label: 'Barcelona', aqi: 64 });
        expect(L.map).toHaveBeenCalledOnce();
        expect(mapObject.setView).toHaveBeenLastCalledWith([41.38, 2.17], 11);
        expect(marker.setLatLng).toHaveBeenCalledWith([41.38, 2.17]);
        expect(marker.setTooltipContent).toHaveBeenCalledWith('Barcelona · 64');
    });

    test('update antes de cargar usa los datos nuevos al crear el mapa', async () => {
        const instance = mountMap(root, { ...madrid, loadLeaflet: async () => ({ default: L }), observe });
        instance.update({ geo: { lat: 41.38, lng: 2.17 }, label: 'Barcelona', aqi: null });
        await trigger();
        expect(mapObject.setView).toHaveBeenCalledWith([41.38, 2.17], 11);
        expect(marker.bindTooltip.mock.calls[0][0]).toBe('Barcelona · –');
    });

    test('update con coordenadas inválidas oculta la sección', async () => {
        const instance = mountMap(root, { ...madrid, loadLeaflet: async () => ({ default: L }), observe });
        instance.update({ geo: null, label: 'X', aqi: 1 });
        expect(root.hidden).toBe(true);
    });

    test('si se vio sin coordenadas, una estación con coordenadas crea el mapa', async () => {
        const instance = mountMap(root, { geo: null, label: 'X', aqi: 1, loadLeaflet: async () => ({ default: L }), observe });
        await trigger();
        expect(L.map).not.toHaveBeenCalled();
        instance.update(madrid);
        await vi.waitFor(() => expect(L.map).toHaveBeenCalledOnce());
        expect(root.hidden).toBe(false);
    });
});
