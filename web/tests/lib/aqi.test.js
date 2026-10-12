import { describe, expect, test } from 'vitest';
import {
    CATEGORIES, NEUTRAL, blend, contrastRatio, forecastDays, forecastKeys, getCategory, isStale,
    parseAqi, pickPollutants, pickWeather, pollutantLabel, relativeTime, splitStationName,
} from '../../src/lib/aqi.js';

describe('getCategory', () => {
    test.each([
        [0, 'good'], [50, 'good'], [51, 'moderate'], [100, 'moderate'], [101, 'usg'], [150, 'usg'],
        [151, 'unhealthy'], [200, 'unhealthy'], [201, 'very-unhealthy'], [300, 'very-unhealthy'],
        [301, 'hazardous'], [500, 'hazardous'], ['42', 'good'],
    ])('%s → %s', (aqi, key) => expect(getCategory(aqi).key).toBe(key));

    test.each(['-', '', null, undefined, NaN, Infinity, {}])('%s → neutral', (aqi) => {
        expect(getCategory(aqi)).toBe(NEUTRAL);
        expect(parseAqi(aqi)).toBeNull();
    });

    test('textos de la spec §4.2', () => {
        const good = getCategory(10);
        expect(good.label).toBe('Good');
        expect(good.range).toBe('0–50');
        expect(good.implication).toBe('Air quality is satisfactory, and air pollution poses little or no risk.');
        expect(good.advice).toBe('Great day to be outside.');
        expect(getCategory(175).advice).toBe('Avoid prolonged outdoor exertion. Consider a mask outdoors.');
        expect(getCategory(400).label).toBe('Hazardous');
    });
});

describe('contraste WCAG con texto blanco', () => {
    test.each([NEUTRAL, ...CATEGORIES])('$key', ({ sky: [top, middle, horizon] }) => {
        expect(contrastRatio('#FFFFFF', top)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#FFFFFF', middle)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#FFFFFF', blend(horizon, '#060E20', 0.55))).toBeGreaterThanOrEqual(4.5);
    });

    test('contrastRatio y blend conocidos', () => {
        expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
        expect(blend('#FFFFFF', '#000000', 0.5)).toBe('#808080');
    });
});

describe('pickPollutants / pickWeather', () => {
    const iaqi = { co: { v: 0.1 }, so2: { v: 0.6 }, no2: { v: 16 }, o3: { v: 4.5 }, pm10: { v: 20 }, pm25: { v: 42 }, t: { v: 12.7 }, h: { v: 56.8 }, w: { v: 0.2 }, p: { v: 1020.3 } };

    test('contaminantes en orden con nombre legible', () => {
        expect(pickPollutants(iaqi).map((p) => [p.code, p.name, p.value])).toEqual([
            ['PM2.5', 'Fine particles', 42], ['PM10', 'Coarse particles', 20], ['O3', 'Ozone', 4.5],
            ['NO2', 'Nitrogen dioxide', 16], ['SO2', 'Sulphur dioxide', 0.6], ['CO', 'Carbon monoxide', 0.1],
        ]);
        expect(pickPollutants(iaqi)[0].category.key).toBe('good');
    });

    test('solo presentes; 0 cuenta; vacío si falta', () => {
        expect(pickPollutants({ pm25: { v: 0 }, o3: {}, no2: { v: null } }).map((p) => p.code)).toEqual(['PM2.5']);
        expect(pickPollutants(undefined)).toEqual([]);
        expect(pickWeather(null)).toEqual([]);
    });

    test('meteo con unidades', () => {
        expect(pickWeather(iaqi)).toEqual([
            { key: 't', label: 'Temperature', value: 12.7, unit: '°C' },
            { key: 'h', label: 'Humidity', value: 57, unit: '%' },
            { key: 'w', label: 'Wind', value: 0.2, unit: 'm/s' },
            { key: 'p', label: 'Pressure', value: 1020, unit: 'hPa' },
        ]);
    });
});

describe('previsión', () => {
    const daily = {
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
        o3: [{ day: '2026-10-12', avg: 4, min: 2, max: 6 }],
    };

    test('filtra días pasados y limita a 6', () => {
        const days = forecastDays(daily, 'pm25', '2026-10-11');
        expect(days.map((d) => d.day)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
        expect(days[0].label).toBe('Sun 11');
        expect(days[3].category.key).toBe('moderate');
    });

    test('claves con datos en orden', () => {
        expect(forecastKeys(daily)).toEqual(['pm25', 'o3']);
        expect(forecastKeys(undefined)).toEqual([]);
        expect(forecastDays(undefined, 'pm25', '2026-10-11')).toEqual([]);
    });
});

describe('tiempo y nombres', () => {
    const now = new Date('2026-10-12T12:00:00Z');

    test.each([
        ['2026-10-12T11:59:40Z', 'just now'],
        ['2026-10-12T11:55:00Z', '5 minutes ago'],
        ['2026-10-12T11:00:00Z', '1 hour ago'],
        ['2026-10-12T10:00:00+00:00', '2 hours ago'],
        ['2026-10-10T02:00:00+02:00', '2 days ago'],
    ])('%s → %s', (iso, text) => expect(relativeTime(iso, now)).toBe(text));

    test('isStale > 24 h', () => {
        expect(isStale('2026-10-11T11:59:00Z', now)).toBe(true);
        expect(isStale('2026-10-11T12:30:00Z', now)).toBe(false);
        expect(isStale(undefined, now)).toBe(false);
    });

    test('splitStationName y pollutantLabel', () => {
        expect(splitStationName('Cuatro Caminos, Madrid, Spain')).toEqual({ primary: 'Cuatro Caminos', secondary: 'Madrid, Spain' });
        expect(splitStationName('Madrid')).toEqual({ primary: 'Madrid', secondary: '' });
        expect(pollutantLabel('pm25')).toBe('PM2.5');
        expect(pollutantLabel('xx')).toBe('XX');
    });
});
