import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    NEUTRAL_COLOR,
    GENERIC_ERROR_MESSAGE,
    getAqiCategory,
    buildFeedUrl,
    pickPollutants,
    pickWeather,
    isSafeHttpUrl,
    readCityParam,
    parseGeo,
    parseFeedResponse,
} from '../../docs/js/air-quality.js';

test('getAqiCategory: límites de cada categoría (superior inclusivo)', () => {
    const cases = [
        [0, 'Good', '#449A66'],
        [50, 'Good', '#449A66'],
        [51, 'Moderate', '#1DA488'],
        [100, 'Moderate', '#1DA488'],
        [101, 'Unhealthy for Sensitive Groups', '#F99932'],
        [150, 'Unhealthy for Sensitive Groups', '#F99932'],
        [151, 'Unhealthy', '#CE3B34'],
        [200, 'Unhealthy', '#CE3B34'],
        [201, 'Very Unhealthy', '#6A4299'],
        [300, 'Very Unhealthy', '#6A4299'],
        [301, 'Hazardous', '#7F2223'],
        [500, 'Hazardous', '#7F2223'],
        [999, 'Hazardous', '#7F2223'],
    ];
    for (const [aqi, level, color] of cases) {
        const category = getAqiCategory(aqi);
        assert.equal(category.level, level, `aqi=${aqi}`);
        assert.equal(category.color, color, `aqi=${aqi}`);
    }
});

test('getAqiCategory: textos literales de search.html.twig', () => {
    assert.deepEqual(getAqiCategory(10), {
        level: 'Good',
        healthImplication: 'Air quality is considered satisfactory, and air pollution poses little or no risk',
        cautionaryStatement: 'None',
        color: '#449A66',
    });
    assert.deepEqual(getAqiCategory(75), {
        level: 'Moderate',
        healthImplication: 'Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.',
        color: '#1DA488',
    });
    assert.deepEqual(getAqiCategory(125), {
        level: 'Unhealthy for Sensitive Groups',
        healthImplication: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.',
        color: '#F99932',
    });
    assert.deepEqual(getAqiCategory(175), {
        level: 'Unhealthy',
        healthImplication: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else, especially children, should limit prolonged outdoor exertion',
        color: '#CE3B34',
    });
    assert.deepEqual(getAqiCategory(250), {
        level: 'Very Unhealthy',
        healthImplication: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else, especially children, should limit outdoor exertion.',
        color: '#6A4299',
    });
    assert.deepEqual(getAqiCategory(350), {
        level: 'Hazardous',
        healthImplication: 'Health alert: everyone may experience more serious health effects',
        cautionaryStatement: 'Everyone should avoid all outdoor exertion',
        color: '#7F2223',
    });
});

test('getAqiCategory: acepta strings numéricos', () => {
    assert.equal(getAqiCategory('42').level, 'Good');
});

test('getAqiCategory: null si el AQI no es numérico', () => {
    for (const aqi of ['-', '', '   ', undefined, null, NaN, Infinity, {}]) {
        assert.equal(getAqiCategory(aqi), null, `aqi=${String(aqi)}`);
    }
});

test('constantes', () => {
    assert.equal(NEUTRAL_COLOR, '#949494');
    assert.equal(GENERIC_ERROR_MESSAGE, 'Could not reach aqicn.org. Please try again later.');
});

test('buildFeedUrl codifica ciudad y token', () => {
    assert.equal(buildFeedUrl('Madrid', 'abc'), 'https://api.waqi.info/feed/Madrid/?token=abc');
    assert.equal(buildFeedUrl('New York', 'abc'), 'https://api.waqi.info/feed/New%20York/?token=abc');
    assert.equal(buildFeedUrl('São Paulo', 'abc'), 'https://api.waqi.info/feed/S%C3%A3o%20Paulo/?token=abc');
    assert.equal(buildFeedUrl('a/b', 'x&y'), 'https://api.waqi.info/feed/a%2Fb/?token=x%26y');
});

test('pickPollutants: orden y etiquetas con todos los campos', () => {
    const iaqi = { co: { v: 6 }, so2: { v: 5 }, no2: { v: 4 }, o3: { v: 3 }, pm10: { v: 2 }, pm25: { v: 1 }, t: { v: 20 } };
    assert.deepEqual(pickPollutants(iaqi), [
        { label: 'PM2.5', value: 1 },
        { label: 'PM10', value: 2 },
        { label: 'O3', value: 3 },
        { label: 'NO2', value: 4 },
        { label: 'SO2', value: 5 },
        { label: 'CO', value: 6 },
    ]);
});

test('pickPollutants: solo los presentes (0 cuenta como presente)', () => {
    assert.deepEqual(pickPollutants({ pm25: { v: 0 }, o3: {}, no2: { v: null } }), [{ label: 'PM2.5', value: 0 }]);
});

test('pickPollutants: iaqi vacío o ausente', () => {
    assert.deepEqual(pickPollutants({}), []);
    assert.deepEqual(pickPollutants(undefined), []);
    assert.deepEqual(pickPollutants(null), []);
});

test('pickWeather: unidades y orden', () => {
    const iaqi = { w: { v: 3.6 }, h: { v: 55 }, t: { v: 21.5 }, p: { v: 1015 }, pm25: { v: 9 } };
    assert.deepEqual(pickWeather(iaqi), [
        { label: 'Pressure', value: '1015 hPa' },
        { label: 'Temperature', value: '21.5 ºC' },
        { label: 'Air humidity', value: '55%' },
        { label: 'Wind', value: '3.6 km/h' },
    ]);
});

test('pickWeather: solo los presentes; vacío si no hay', () => {
    assert.deepEqual(pickWeather({ t: { v: 0 } }), [{ label: 'Temperature', value: '0 ºC' }]);
    assert.deepEqual(pickWeather({}), []);
    assert.deepEqual(pickWeather(undefined), []);
});

test('isSafeHttpUrl', () => {
    assert.equal(isSafeHttpUrl('https://aqicn.org/city/madrid'), true);
    assert.equal(isSafeHttpUrl('http://aqicn.org/'), true);
    assert.equal(isSafeHttpUrl('HTTPS://AQICN.ORG/'), true);
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpUrl(''), false);
    assert.equal(isSafeHttpUrl(undefined), false);
    assert.equal(isSafeHttpUrl(42), false);
});

test('readCityParam decodifica y recorta', () => {
    assert.equal(readCityParam('?city=Madrid'), 'Madrid');
    assert.equal(readCityParam('?city=S%C3%A3o+Paulo'), 'São Paulo');
    assert.equal(readCityParam('?city=%20%20Lima%20'), 'Lima');
    assert.equal(readCityParam('?city='), '');
    assert.equal(readCityParam('?city=+++'), '');
    assert.equal(readCityParam('?other=1'), '');
    assert.equal(readCityParam(''), '');
});

test('parseGeo', () => {
    assert.deepEqual(parseGeo([40.4167754, -3.7037902]), { lat: 40.4167754, lng: -3.7037902 });
    assert.deepEqual(parseGeo(['40.4', '-3.7']), { lat: 40.4, lng: -3.7 });
    assert.equal(parseGeo([40.4]), null);
    assert.equal(parseGeo(['a', 1]), null);
    assert.equal(parseGeo([null, 1]), null);
    assert.equal(parseGeo(undefined), null);
    assert.equal(parseGeo('40,3'), null);
});

test('parseFeedResponse', () => {
    const data = { aqi: 42 };
    assert.deepEqual(parseFeedResponse({ status: 'ok', data }), { kind: 'ok', data });
    assert.deepEqual(parseFeedResponse({ status: 'error', data: 'Unknown station' }), { kind: 'error', message: 'Unknown station' });
    assert.deepEqual(parseFeedResponse({ status: 'error' }), { kind: 'error', message: GENERIC_ERROR_MESSAGE });
    assert.deepEqual(parseFeedResponse({ status: 'ok' }), { kind: 'error', message: GENERIC_ERROR_MESSAGE });
    assert.deepEqual(parseFeedResponse({ status: 'ok', data: 'x' }), { kind: 'error', message: GENERIC_ERROR_MESSAGE });
    assert.deepEqual(parseFeedResponse(null), { kind: 'error', message: GENERIC_ERROR_MESSAGE });
    assert.deepEqual(parseFeedResponse('<html>'), { kind: 'error', message: GENERIC_ERROR_MESSAGE });
});
