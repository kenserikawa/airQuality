// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { madridStation } from '../fixtures/station.js';
import { renderForecast } from '../../src/ui/forecast.js';
import { renderPollutants } from '../../src/ui/pollutants.js';
import { renderWeather } from '../../src/ui/weather.js';
import { renderScale } from '../../src/ui/scale.js';
import { renderFooter } from '../../src/ui/footer.js';

const today = '2026-10-11';
const forecast = {
    pm25: [
        { day: '2026-10-10', avg: 20, min: 10, max: 30 },
        { day: '2026-10-11', avg: 38, min: 30, max: 45 },
        { day: '2026-10-12', avg: 42, min: 35, max: 60 },
        { day: '2026-10-13', avg: 45, min: 40, max: 52 },
        { day: '2026-10-14', avg: 58, min: 44, max: 70 },
        { day: '2026-10-15', avg: 35, min: 30, max: 40 },
        { day: '2026-10-16', avg: 29, min: 20, max: 33 },
        { day: '2026-10-17', avg: 31, min: 25, max: 36 },
    ],
    o3: [{ day: '2026-10-11', avg: 4, min: 2, max: 6 }],
    uvi: [{ day: '2026-10-11', avg: 1, min: 0, max: 3 }],
};

let root;

beforeEach(() => {
    root = document.createElement('section');
    root.hidden = true;
});

const text = () => root.textContent.replace(/\s+/g, ' ');

describe('renderForecast', () => {
    test('6 días desde hoy, pestañas solo con datos y etiquetas accesibles', () => {
        renderForecast(root, madridStation({ forecast }), { today });
        expect(root.hidden).toBe(false);
        expect(root.querySelector('#forecast-title').textContent).toBe('Forecast · next 6 days');
        expect(text()).toContain('Daily average with min–max range');
        expect([...root.querySelectorAll('[role="tab"]')].map((t) => t.textContent)).toEqual(['PM2.5', 'O3']);
        const bars = root.querySelectorAll('[data-role="forecast-day"]');
        expect(bars).toHaveLength(6);
        expect(bars[0].getAttribute('aria-label')).toBe('Sun 11: average 38, min 30, max 45');
        expect(bars[3].textContent).toContain('Moderate');
    });

    test('cambiar de pestaña repinta con esa clave', () => {
        renderForecast(root, madridStation({ forecast }), { today });
        root.querySelectorAll('[role="tab"]')[1].click();
        expect(root.querySelectorAll('[data-role="forecast-day"]')).toHaveLength(1);
        expect(root.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe('O3');
    });

    test('sin previsión, o solo con días pasados, se oculta', () => {
        renderForecast(root, madridStation({ forecast: null }), { today });
        expect(root.hidden).toBe(true);
        renderForecast(root, madridStation({ forecast: { pm25: [{ day: '2026-10-01', avg: 10, min: 5, max: 15 }] } }), { today });
        expect(root.hidden).toBe(true);
    });
});

describe('renderPollutants', () => {
    test('6 casillas con nombre legible y "AQI sub-index"', () => {
        renderPollutants(root, madridStation());
        expect(root.hidden).toBe(false);
        const tiles = root.querySelectorAll('[data-role="pollutant"]');
        expect(tiles).toHaveLength(6);
        expect(tiles[0].textContent).toContain('Fine particles');
        expect(tiles[0].textContent).toContain('PM2.5');
        expect(tiles[0].textContent).toContain('42');
        expect(text()).toContain('AQI sub-index');
        expect(text()).not.toContain('µg');
    });

    test('sin iaqi se oculta', () => {
        renderPollutants(root, madridStation({ iaqi: {} }));
        expect(root.hidden).toBe(true);
    });
});

describe('renderWeather', () => {
    test('4 casillas con unidades', () => {
        renderWeather(root, madridStation());
        expect(root.querySelectorAll('[data-role="weather-tile"]')).toHaveLength(4);
        expect(text()).toContain('1020');
        expect(text()).toContain('hPa');
    });

    test('sin datos se oculta', () => {
        renderWeather(root, madridStation({ iaqi: { pm25: { v: 3 } } }));
        expect(root.hidden).toBe(true);
    });
});

describe('renderScale', () => {
    test('con lectura: título, marcador, categoría activa y explicación', () => {
        renderScale(root, madridStation());
        expect(root.querySelector('#scale-title').textContent).toBe('What does 42 mean?');
        expect(text()).toContain('US EPA Air Quality Index');
        expect(root.querySelector('[data-role="scale-marker"]')).not.toBeNull();
        expect(root.querySelector('[data-active="true"]').textContent).toContain('Good');
        expect(text()).toContain('Air quality is satisfactory, and air pollution poses little or no risk.');
    });

    test('sin lectura: título genérico y sin marcador', () => {
        renderScale(root, madridStation({ aqi: null }));
        expect(root.querySelector('#scale-title').textContent).toBe('What does the AQI mean?');
        expect(root.querySelector('[data-role="scale-marker"]')).toBeNull();
        expect(root.querySelector('[data-active="true"]')).toBeNull();
    });
});

describe('renderFooter', () => {
    test('atribuciones, enlaces seguros y créditos', () => {
        const station = madridStation({
            attributions: [
                { name: 'European Environment Agency', url: 'https://www.eea.europa.eu/' },
                { name: '<b>Evil</b>', url: 'javascript:alert(1)' },
            ],
        });
        renderFooter(root, station);
        expect(text()).toContain('World Air Quality Index Project');
        expect(text()).toContain('European Environment Agency');
        expect(text()).toContain('<b>Evil</b>');
        expect(root.querySelector('b')).toBeNull();
        const hrefs = [...root.querySelectorAll('a')].map((a) => a.getAttribute('href'));
        expect(hrefs).toContain('https://www.eea.europa.eu/');
        expect(hrefs.every((href) => href && !href.startsWith('javascript'))).toBe(true);
        expect(text()).toContain('Map tiles © OpenStreetMap contributors');
        expect(text()).not.toContain('CARTO');
        expect(text()).toContain('AirQuality · GitHub');
    });

    test('sin estación muestra solo los créditos generales', () => {
        renderFooter(root, null);
        expect(text()).toContain('World Air Quality Index Project');
        expect(text()).not.toContain('Station data');
    });
});
