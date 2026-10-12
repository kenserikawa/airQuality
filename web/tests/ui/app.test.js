// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { madridStation } from '../fixtures/station.js';
import { NotFoundError, OfflineError } from '../../src/lib/waqi.js';
import { UnlocatedError } from '../../src/lib/location.js';
import { startApp } from '../../src/app.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');

const barcelona = madridStation({ uid: 3229, aqi: 64, name: 'Barcelona' });
let deps;
let search;
let popstate;

function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

const heroText = () => document.getElementById('hero').textContent.replace(/\s+/g, ' ');

beforeEach(() => {
    document.body.innerHTML = body;
    document.title = 'AirQuality — Air quality near you';
    search = {};
    popstate = null;
    deps = {
        now: () => new Date('2026-10-12T10:00:00Z'),
        reducedMotion: true,
        fetchStation: vi.fn(async (uid) => (uid === 3229 ? barcelona : madridStation())),
        locate: vi.fn(async () => madridStation()),
        readStationId: vi.fn(() => null),
        pushStationId: vi.fn(),
        replaceStationId: vi.fn(),
        onStationIdChange: vi.fn((callback) => { popstate = callback; return () => {}; }),
        mountSearch: vi.fn((root, options) => { Object.assign(search, options); return { focus: vi.fn(), destroy() {} }; }),
        mountMap: vi.fn(() => ({ update: vi.fn(), destroy() {} })),
        startParticles: vi.fn(() => ({ setDensity: vi.fn(), stop() {} })),
    };
});

describe('arranque', () => {
    test('sin ?station localiza, pinta la estación y sustituye la URL', async () => {
        startApp(deps);
        expect(heroText()).toContain('Finding the air around you…');
        await flush();
        expect(deps.locate).toHaveBeenCalledOnce();
        expect(heroText()).toContain('Madrid');
        expect(document.querySelector('[data-role="aqi"]').textContent).toBe('42');
        expect(deps.replaceStationId).toHaveBeenCalledWith(5725);
        expect(deps.pushStationId).not.toHaveBeenCalled();
        expect(document.title).toBe('42 Good · Madrid — AirQuality');
        expect(document.getElementById('announcer').textContent).toBe('Air quality in Madrid: 42, Good');
        expect(document.documentElement.dataset.category).toBe('good');
        expect(document.getElementById('pollutants').hidden).toBe(false);
        expect(deps.mountMap).toHaveBeenCalledOnce();
    });

    test('con ?station carga esa estación sin localizar', async () => {
        deps.readStationId.mockReturnValue(3229);
        startApp(deps);
        await flush();
        expect(deps.fetchStation).toHaveBeenCalledWith(3229);
        expect(deps.locate).not.toHaveBeenCalled();
        expect(heroText()).toContain('Barcelona');
    });

    test('sin ubicación → "Search for a city to get started"', async () => {
        deps.locate.mockRejectedValue(new UnlocatedError());
        startApp(deps);
        await flush();
        expect(heroText()).toContain('Search for a city to get started');
        expect(document.documentElement.dataset.category).toBe('neutral');
        expect(document.getElementById('pollutants').hidden).toBe(true);
    });
});

describe('errores', () => {
    test('sin conexión → offline y Retry repite la carga', async () => {
        deps.readStationId.mockReturnValue(3229);
        deps.fetchStation.mockRejectedValueOnce(new OfflineError());
        startApp(deps);
        await flush();
        expect(heroText()).toContain("Can't reach the air quality service");
        document.querySelector('#hero button').click();
        await flush();
        expect(deps.fetchStation).toHaveBeenCalledTimes(2);
        expect(heroText()).toContain('Barcelona');
    });

    test('estación inexistente → not-found', async () => {
        deps.readStationId.mockReturnValue(1);
        deps.fetchStation.mockRejectedValueOnce(new NotFoundError());
        startApp(deps);
        await flush();
        expect(heroText()).toContain("We couldn't find air data for that station");
    });
});

describe('navegación', () => {
    test('elegir en el buscador carga la estación y añade entrada al historial', async () => {
        startApp(deps);
        await flush();
        search.onSelect(3229);
        expect(document.getElementById('hero').classList.contains('dimmed')).toBe(true);
        await flush();
        expect(heroText()).toContain('Barcelona');
        expect(document.getElementById('hero').classList.contains('dimmed')).toBe(false);
        expect(deps.pushStationId).toHaveBeenCalledWith(3229);
    });

    test('"Use my location" del buscador y de la cabecera vuelven a localizar', async () => {
        deps.readStationId.mockReturnValue(3229);
        startApp(deps);
        await flush();
        search.onUseLocation();
        await flush();
        expect(deps.locate).toHaveBeenCalledTimes(1);
        expect(deps.pushStationId).toHaveBeenCalledWith(5725);
        document.getElementById('locate').click();
        await flush();
        expect(deps.locate).toHaveBeenCalledTimes(2);
    });

    test('Atrás/Adelante carga la estación de la URL sin tocar el historial', async () => {
        startApp(deps);
        await flush();
        popstate(3229);
        await flush();
        expect(heroText()).toContain('Barcelona');
        expect(deps.pushStationId).not.toHaveBeenCalled();
    });

    test('una respuesta antigua no pisa a la más reciente', async () => {
        let resolveSlow;
        deps.fetchStation.mockImplementationOnce(() => new Promise((resolve) => { resolveSlow = resolve; }));
        deps.readStationId.mockReturnValue(5725);
        startApp(deps);
        search.onSelect(3229);
        await flush();
        resolveSlow(madridStation());
        await flush();
        expect(heroText()).toContain('Barcelona');
    });
});
