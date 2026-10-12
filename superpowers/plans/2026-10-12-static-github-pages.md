# Réplica estática de AirQuality para GitHub Pages — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en `https://kenserikawa.github.io/airQuality/` una réplica sin backend de la app Symfony AirQuality, servida por GitHub Pages desde `master` → `/docs`.

**Architecture:** Dos páginas estáticas en `docs/` que replican las dos rutas Symfony: `index.html` (portada) y `search.html?city=X` (resultados). El navegador llama directamente a `api.waqi.info` (CORS `*` verificado) y pinta el resultado con módulos ES nativos: lógica pura en `air-quality.js` (testeada con `node --test`) y DOM en `render.js`. Sin build.

**Tech Stack:** HTML + CSS + JS (módulos ES nativos), Bootstrap 4.5.0, jQuery 3.5.1, Animate.css 4.1.1, Font Awesome 5.14.0, Leaflet 1.9.4 + teselas OpenStreetMap, Python 3 (solo para generar `cities.json`), Node ≥ 22.7 (solo para tests; hay v22.13.1).

**Spec:** `superpowers/specs/2026-10-12-static-github-pages-design.md`

## Global Constraints

- Sin paso de build, sin `package.json`, sin dependencias npm ni pip.
- Todo `docs/` usa rutas **relativas** (`css/…`, `js/…`, `data/…`, `images/…`, `index.html`, `search.html`). Nunca rutas que empiecen por `/`.
- No se modifican `src/`, `templates/`, `public/`, `config/`, `tests/Unit/`, `tests/Functional/`.
- Datos de la API: solo se insertan como texto (`textContent`, `append(string)`) o como propiedad (`link.href = …` tras `isSafeHttpUrl`). **Nunca `innerHTML`** con datos externos.
- Textos visibles en inglés, idénticos al original salvo las correcciones de la tabla §6 de la spec.
- Mensaje genérico de error, literal: `Could not reach aqicn.org. Please try again later.`
- `<title>AirQuality</title>` en ambas páginas.
- CDN exactos con SRI (`crossorigin="anonymous"` en todos):
  - Bootstrap CSS `https://cdn.jsdelivr.net/npm/bootstrap@4.5.0/dist/css/bootstrap.min.css` — `sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk`
  - Bootstrap JS `https://cdn.jsdelivr.net/npm/bootstrap@4.5.0/dist/js/bootstrap.min.js` — `sha384-OgVRvuATP1z7JjHLkuOU7Xw704+h835Lr+6QL9UvYjZE3Ipu6Tp75j7Bh/kR0JKI`
  - jQuery `https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js` — `sha512-bLT0Qm9VnAYZDflyKcBaQ2gg0hSYNQrJ8RilYldYQ1FxQYoCLtUjuuRuZo+fjqhx/qtq/1itJ0C2ejDxltZVFg==`
  - Animate.css `https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css` — `sha384-Gu3KVV2H9d+yA4QDpVB7VcOyhJlAVrcXd0thEjr4KznfaFPLe0xQJyonVxONa4ZC`
  - Font Awesome `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css` — `sha384-HzLeBuhoNPvSl5KYnjx0BT+WB0QEEqLprO+NBkkk5gbc67FTaL7XIGa2w1L0Xbgc`
  - Leaflet CSS `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css` — `sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb`
  - Leaflet JS `https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js` — `sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO`
- Token WAQI: `f97650a3d94724f1ff358b1d74ea439ade569714` (verificado activo el 2026-10-12).
- Commits en `master`, mensaje en minúsculas e imperativo como el historial (`add …`), terminando con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `git push` **solo** tras confirmación explícita del usuario.
- En esta máquina el hook RTK recorta la salida de `curl`; para ver respuestas completas usar `rtk proxy curl …`.

### Procedimiento compartido: servidor local bajo `/airQuality/`

Usado en las Tasks 3 y 4. Simula el subpath de GitHub Pages para detectar rutas absolutas.

1. `ccres comprobar puerto:8765`. Si está ocupado por otra sesión, no usarlo: avisar al usuario con el titular que indique.
2. `ccres reservar puerto:8765 --hasta 2h --motivo "servidor local réplica estática airQuality"`
3. Crear el enlace. `SCRATCH` es la ruta del scratchpad de la sesión (la indica el system prompt). Hay que definirla **en el mismo comando**, porque el estado del shell no persiste entre llamadas:
   ```bash
   SCRATCH=<ruta-del-scratchpad-de-la-sesión>; mkdir -p "$SCRATCH/site" && ln -sfn /home/ken/Desktop/html/airQuality/docs "$SCRATCH/site/airQuality"
   ```
4. Arrancar en segundo plano (Bash con `run_in_background: true`):
   ```bash
   SCRATCH=<ruta-del-scratchpad-de-la-sesión>; python3 -m http.server 8765 --bind 127.0.0.1 --directory "$SCRATCH/site"
   ```
5. URL base: `http://127.0.0.1:8765/airQuality/`

Para pararlo: detener la tarea en segundo plano y `ccres liberar puerto:8765`.

## Review Focus

1. **Ciudad con espacios, tildes o `+` desde el formulario** (`search.html?city=S%C3%A3o+Paulo`): debe leerse como "São Paulo" y llegar a la API como `/feed/S%C3%A3o%20Paulo/`. → Test `readCityParam` y `buildFeedUrl` (Task 1) + comprobación en navegador (Task 4, paso b).
2. **Respuesta `ok` con `aqi: "-"` y sin `iaqi`**: caja gris con "-", sin tabla, sin cajas vacías y sin excepciones. → Tests `getAqiCategory`/`pick*` (Task 1) + evaluación de `render.js` en navegador (Task 4, paso e).
3. **`city.geo` ausente o no numérico, o Leaflet sin cargar**: el resto de la página se pinta y el mapa se omite sin lanzar excepciones. → Test `parseGeo` (Task 1) + `mountMap` con `window.L = undefined` (Task 4, paso e).
4. **Respuesta `ok` sin `data`, cuerpo no JSON o fallo de red**: bloque de error con el mensaje genérico, nunca pantalla en blanco. → Test `parseFeedResponse` (Task 1); `search-page.js` envuelve fetch + parseo en `try/catch` (Task 4).
5. **Servido bajo `/airQuality/`**: todos los assets propios devuelven 200. → Revisión de red en local (Tasks 3 y 4) y en vivo (Task 5).

---

### Task 1: Lógica pura (`air-quality.js`) con tests

**Files:**
- Create: `docs/js/air-quality.js`
- Test: `tests/js/air-quality.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces (todas exportadas desde `docs/js/air-quality.js`):
  - `NEUTRAL_COLOR: string` = `'#949494'`
  - `GENERIC_ERROR_MESSAGE: string` = `'Could not reach aqicn.org. Please try again later.'`
  - `getAqiCategory(aqi: unknown) → { level: string, healthImplication: string, cautionaryStatement: string, color: string } | null`
  - `buildFeedUrl(city: string, token: string) → string`
  - `pickPollutants(iaqi: object | null | undefined) → Array<{ label: string, value: number }>`
  - `pickWeather(iaqi: object | null | undefined) → Array<{ label: string, value: string }>`
  - `isSafeHttpUrl(url: unknown) → boolean`
  - `readCityParam(search: string) → string` (decodificado y recortado; `''` si falta)
  - `parseGeo(geo: unknown) → { lat: number, lng: number } | null`
  - `parseFeedResponse(json: unknown) → { kind: 'ok', data: object } | { kind: 'error', message: string }`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/js/air-quality.test.mjs`:

```js
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
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `node --test tests/js/`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` / `Cannot find module '…/docs/js/air-quality.js'`.

- [ ] **Step 3: Implementar `docs/js/air-quality.js`**

```js
export const NEUTRAL_COLOR = '#949494';
export const GENERIC_ERROR_MESSAGE = 'Could not reach aqicn.org. Please try again later.';

// Rangos de aqicn.org; textos literales de templates/search.html.twig.
const CATEGORIES = [
    {
        max: 50,
        level: 'Good',
        healthImplication: 'Air quality is considered satisfactory, and air pollution poses little or no risk',
        cautionaryStatement: 'None',
        color: '#449A66',
    },
    {
        max: 100,
        level: 'Moderate',
        healthImplication: 'Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.',
        color: '#1DA488',
    },
    {
        max: 150,
        level: 'Unhealthy for Sensitive Groups',
        healthImplication: 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.',
        color: '#F99932',
    },
    {
        max: 200,
        level: 'Unhealthy',
        healthImplication: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else, especially children, should limit prolonged outdoor exertion',
        color: '#CE3B34',
    },
    {
        max: 300,
        level: 'Very Unhealthy',
        healthImplication: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
        cautionaryStatement: 'Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else, especially children, should limit outdoor exertion.',
        color: '#6A4299',
    },
    {
        max: Infinity,
        level: 'Hazardous',
        healthImplication: 'Health alert: everyone may experience more serious health effects',
        cautionaryStatement: 'Everyone should avoid all outdoor exertion',
        color: '#7F2223',
    },
];

const POLLUTANTS = [
    ['pm25', 'PM2.5'],
    ['pm10', 'PM10'],
    ['o3', 'O3'],
    ['no2', 'NO2'],
    ['so2', 'SO2'],
    ['co', 'CO'],
];

const WEATHER = [
    ['p', 'Pressure', ' hPa'],
    ['t', 'Temperature', ' ºC'],
    ['h', 'Air humidity', '%'],
    ['w', 'Wind', ' km/h'],
];

function toFiniteNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }
    return null;
}

function hasValue(iaqi, key) {
    return iaqi?.[key]?.v != null;
}

export function getAqiCategory(aqi) {
    const value = toFiniteNumber(aqi);
    if (value === null) {
        return null;
    }
    const { max, ...category } = CATEGORIES.find((candidate) => value <= candidate.max);
    return category;
}

export function buildFeedUrl(city, token) {
    return `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${encodeURIComponent(token)}`;
}

export function pickPollutants(iaqi) {
    return POLLUTANTS
        .filter(([key]) => hasValue(iaqi, key))
        .map(([key, label]) => ({ label, value: iaqi[key].v }));
}

export function pickWeather(iaqi) {
    return WEATHER
        .filter(([key]) => hasValue(iaqi, key))
        .map(([key, label, unit]) => ({ label, value: `${iaqi[key].v}${unit}` }));
}

export function isSafeHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

export function readCityParam(search) {
    return (new URLSearchParams(search).get('city') ?? '').trim();
}

export function parseGeo(geo) {
    if (!Array.isArray(geo) || geo.length < 2) {
        return null;
    }
    const lat = toFiniteNumber(geo[0]);
    const lng = toFiniteNumber(geo[1]);
    return lat === null || lng === null ? null : { lat, lng };
}

export function parseFeedResponse(json) {
    if (json?.status === 'ok' && json.data && typeof json.data === 'object') {
        return { kind: 'ok', data: json.data };
    }
    if (json?.status === 'error' && typeof json.data === 'string') {
        return { kind: 'error', message: json.data };
    }
    return { kind: 'error', message: GENERIC_ERROR_MESSAGE };
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `node --test tests/js/`
Expected: PASS, `# pass 15`, `# fail 0`. Si Node avisa de `MODULE_TYPELESS_PACKAGE_JSON` o similar, es solo un aviso; no añadir `package.json` (restricción global).

- [ ] **Step 5: Commit**

```bash
git add docs/js/air-quality.js tests/js/air-quality.test.mjs
git commit -m "$(printf 'add pure air quality logic for static site\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 2: Lista de ciudades (`cities.json`)

**Files:**
- Create: `scripts/build-cities.py`
- Create (generado): `docs/data/cities.json`

**Interfaces:**
- Consumes: `public/files/world_cities.csv` (cabecera `"city","city_ascii","lat",…`).
- Produces: `docs/data/cities.json` — array JSON de strings, único y ordenado, UTF-8 sin escapar. Lo consume `docs/js/cities.js` (Task 3) con `fetch('data/cities.json')`.

- [ ] **Step 1: Escribir la comprobación que falla**

Run:
```bash
python3 -I -c "
import json
cities = json.load(open('docs/data/cities.json', encoding='utf-8'))
assert len(cities) == 13504, len(cities)
assert cities == sorted(set(cities)), 'no ordenado o con duplicados'
assert 'city' not in cities, 'se coló la cabecera'
assert 'Islamorada, Village of Islands' in cities, 'coma entre comillas mal parseada'
assert 'São Paulo' in cities, 'UTF-8 roto'
print('ok', len(cities))
"
```
Expected: FAIL con `FileNotFoundError: … 'docs/data/cities.json'`.

- [ ] **Step 2: Crear `scripts/build-cities.py`**

```python
#!/usr/bin/env python3
"""Genera docs/data/cities.json a partir de public/files/world_cities.csv."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "files" / "world_cities.csv"
TARGET = ROOT / "docs" / "data" / "cities.json"


def main() -> None:
    with SOURCE.open(encoding="utf-8", newline="") as handle:
        cities = sorted({row["city"] for row in csv.DictReader(handle)})
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(
        json.dumps(cities, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"{len(cities)} cities -> {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Generar el fichero**

Run: `python3 scripts/build-cities.py`
Expected: `13504 cities -> docs/data/cities.json`

- [ ] **Step 4: Repetir la comprobación del Step 1**

Expected: `ok 13504`. Además `ls -l docs/data/cities.json` ≈ 176 KB.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-cities.py docs/data/cities.json
git commit -m "$(printf 'add city list generator and cities.json for static site\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 3: Portada (`docs/index.html`)

**Files:**
- Create: `docs/.nojekyll` (vacío)
- Create: `docs/css/styles.css` (copia de `public/css/styles.css`)
- Create: `docs/images/cloud_data.svg` (copia de `public/images/cloud_data.svg`)
- Create: `docs/js/canvas-animation.js` (copia literal de `public/js/canvas-animation.js`)
- Create: `docs/js/cities.js`
- Create: `docs/index.html`

**Interfaces:**
- Consumes: `docs/data/cities.json` (Task 2).
- Produces: `docs/js/cities.js` — módulo sin exports con efecto: rellena `#cities_list` si existe. Lo reutiliza `search.html` (Task 4). Formulario `GET` → `search.html?city=<texto>`, que consume Task 4.

- [ ] **Step 1: Copiar los assets sin cambios**

```bash
mkdir -p docs/css docs/images docs/js
touch docs/.nojekyll
cp public/css/styles.css docs/css/styles.css
cp public/images/cloud_data.svg docs/images/cloud_data.svg
cp public/js/canvas-animation.js docs/js/canvas-animation.js
cmp public/css/styles.css docs/css/styles.css && cmp public/images/cloud_data.svg docs/images/cloud_data.svg && cmp public/js/canvas-animation.js docs/js/canvas-animation.js && echo identical
```
Expected: `identical`

- [ ] **Step 2: Crear `docs/js/cities.js`**

```js
const CITIES_URL = 'data/cities.json';

async function fillCitiesList() {
    const list = document.getElementById('cities_list');
    if (!list) {
        return;
    }
    try {
        const response = await fetch(CITIES_URL);
        if (!response.ok) {
            return;
        }
        const cities = await response.json();
        const fragment = document.createDocumentFragment();
        for (const city of cities) {
            const option = document.createElement('option');
            option.value = city;
            fragment.append(option);
        }
        list.append(fragment);
    } catch {
        // Sin sugerencias: el buscador sigue funcionando.
    }
}

fillCitiesList();
```

- [ ] **Step 3: Crear `docs/index.html`**

Replica `templates/base.html.twig` + `templates/index.html.twig`. Cambios respecto al original: `<title>`, CDN de Bootstrap a jsDelivr (mismo SRI), Font Awesome por CDN, formulario `GET` a `search.html` con `name="city"`, botón sin `name` (evita `&submit=` en la URL), `<datalist>` vacío que rellena `cities.js`.

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>AirQuality</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.0/dist/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css" integrity="sha384-HzLeBuhoNPvSl5KYnjx0BT+WB0QEEqLprO+NBkkk5gbc67FTaL7XIGa2w1L0Xbgc" crossorigin="anonymous">
        <link rel="stylesheet" href="css/styles.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" integrity="sha384-Gu3KVV2H9d+yA4QDpVB7VcOyhJlAVrcXd0thEjr4KznfaFPLe0xQJyonVxONa4ZC" crossorigin="anonymous">
        <style>
        input {
            background-color:transparent !important;
            border: transparent !important;
        }
        </style>
    </head>
    <body>
        <canvas id="drawing-surface" style="position:absolute; left: 0; top: 0;"></canvas>
        <datalist id="cities_list"></datalist>

        <div class="container pb-5 h-100">
            <div class="container h-100 animate__animated animate__slideInRight">
                <div class="row h-25"></div>
                <div class="row h-50">
                    <div class="col-4 align-middle my-auto text-right">
                        <img class="img-fluid" src="images/cloud_data.svg" alt="">
                    </div>
                    <div class="col-8  align-middle my-auto text-left">
                        <h4 class="display-3 silver">AirQuality</h4>
                        <br>
                        <p class="silver h4">
                        A simple website where you can check the air quality
                        of most cities all around the world!
                        </p>
                        <p class="silver h4">
                        Type your <strong>city</strong> and <strong>submit</strong>!
                        </p>
                        <div class="w-100 text-center mt-4">
                            <div class="" id="navbarSupportedContent" style="position:relative">
                                <form action="search.html" method="GET" class="form-inline my-2 my-lg-0">
                                    <input class="form-control mr-sm-2 input-lg" list="cities_list" type="search" name="city" placeholder="City" aria-label="Search">
                                    <button class="btn my-2 my-sm-0 silver submit-button" type="submit">
                                        <i class="fas fa-arrow-right fa-lg"></i>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="footer" style="background-color: transparent !important">
            <div class="container text-center">
                Powered by <a href="https://aqicn.org/">aqicn.org</a>
            </div>
        </footer>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js" integrity="sha512-bLT0Qm9VnAYZDflyKcBaQ2gg0hSYNQrJ8RilYldYQ1FxQYoCLtUjuuRuZo+fjqhx/qtq/1itJ0C2ejDxltZVFg==" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.0/dist/js/bootstrap.min.js" integrity="sha384-OgVRvuATP1z7JjHLkuOU7Xw704+h835Lr+6QL9UvYjZE3Ipu6Tp75j7Bh/kR0JKI" crossorigin="anonymous"></script>
        <script src="js/canvas-animation.js"></script>
        <script type="module" src="js/cities.js"></script>
    </body>
</html>
```

- [ ] **Step 4: Comprobar que no hay rutas absolutas**

Run: `grep -nE '(src|href|action)="/' docs/index.html docs/js/*.js || echo "sin rutas absolutas"`
Expected: `sin rutas absolutas`

- [ ] **Step 5: Verificar en el navegador**

Arrancar el servidor (procedimiento compartido). Con Chrome DevTools MCP:
1. `navigate_page` → `http://127.0.0.1:8765/airQuality/`
2. `evaluate_script`: `() => document.querySelectorAll('#cities_list option').length` → Expected: `13504`. La carga es asíncrona: si da `0`, reintentar tras un segundo.
3. `list_console_messages` → Expected: sin errores.
4. `list_network_requests` → Expected: todas las peticiones a `127.0.0.1:8765/airQuality/…` y a los CDN con 200 (ningún 404).
5. `take_screenshot` → Expected: fondo gris, nubes blancas animadas, ilustración a la izquierda, título "AirQuality", textos y buscador con la flecha animada; footer "Powered by aqicn.org".
6. `fill` el input con `Madrid` y `click` en el botón → Expected: la URL pasa a `http://127.0.0.1:8765/airQuality/search.html?city=Madrid`. El 404 es esperado en esta fase porque `search.html` aún no existe.

Dejar el servidor arrancado para la Task 4.

- [ ] **Step 6: Commit**

```bash
git add docs/.nojekyll docs/css/styles.css docs/images/cloud_data.svg docs/js/canvas-animation.js docs/js/cities.js docs/index.html
git commit -m "$(printf 'add static landing page for GitHub Pages\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 4: Página de resultados (`docs/search.html`)

**Files:**
- Create: `docs/js/config.js`
- Create: `docs/js/render.js`
- Create: `docs/js/search-page.js`
- Create: `docs/search.html`

**Interfaces:**
- Consumes de `docs/js/air-quality.js` (Task 1): `NEUTRAL_COLOR`, `getAqiCategory`, `isSafeHttpUrl`, `pickPollutants`, `pickWeather`, `parseGeo`, `buildFeedUrl`, `parseFeedResponse`, `readCityParam`. De Task 3: `docs/js/cities.js`, `docs/css/styles.css`.
- Produces:
  - `docs/js/config.js`: `export const WAQI_TOKEN: string`
  - `docs/js/render.js`:
    - `renderMain(data: object) → HTMLElement`
    - `renderDescription(aqi: unknown) → HTMLElement | null`
    - `renderGases(iaqi: unknown) → HTMLElement | null`
    - `renderWeather(iaqi: unknown) → HTMLElement | null`
    - `renderSource(url: unknown) → HTMLElement | null`
    - `renderError(message: string) → HTMLElement`
    - `mountMap(parent: HTMLElement, geo: unknown) → boolean` (añade `div#map` a `parent` e inicializa Leaflet; `false` si `geo` no es válido o `window.L` no existe)
  - `docs/js/search-page.js`: punto de entrada sin exports.

Nota de diseño: "Air particles" sigue la misma regla que "Weather data" (spec §5.3): si no hay ninguna fila, la caja no se pinta, para no dejar cajas vacías.

- [ ] **Step 1: Crear `docs/js/config.js`**

```js
// Token público de aqicn.org (el mismo que usa src/AirQuality/Application/AirQualityFinder.php).
export const WAQI_TOKEN = 'f97650a3d94724f1ff358b1d74ea439ade569714';
```

- [ ] **Step 2: Crear `docs/js/render.js`**

Cada función corresponde a una macro de `templates/search.html.twig`, con las mismas clases Bootstrap.

```js
import {
    NEUTRAL_COLOR,
    getAqiCategory,
    isSafeHttpUrl,
    parseGeo,
    pickPollutants,
    pickWeather,
} from './air-quality.js';

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Los hijos string se añaden como nodos de texto: nunca se interpretan como HTML.
function el(tag, className, ...children) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    node.append(...children);
    return node;
}

function renderDataTable(title, containerClass, rows) {
    if (rows.length === 0) {
        return null;
    }
    const box = el('div', containerClass,
        el('div', 'row p-2', el('div', 'col-12', el('h4', '', title))),
    );
    for (const { label, value } of rows) {
        box.append(el('div', 'row border-top p-3',
            el('div', 'col-6', el('h6', '', label)),
            el('div', 'col-6', el('h6', '', String(value))),
        ));
    }
    return box;
}

// macro displayMain
export function renderMain(data) {
    const category = getAqiCategory(data.aqi);
    const badge = el('div', 'text-white p-4 mr-3 border rounded',
        el('h1', 'display-4', String(data.aqi ?? '-')),
    );
    badge.style.backgroundColor = category ? category.color : NEUTRAL_COLOR;

    const info = el('div', 'align-middle my-auto w-100',
        el('h1', 'align-middle my-auto', String(data.city?.name ?? '')),
        document.createElement('br'),
    );
    if (data.time?.s) {
        info.append(el('em', '', `Updated at ${data.time.s}`));
    }
    return el('div', 'd-flex mb-2', badge, info);
}

// macros airQualityDescription + airPollutionStatus
export function renderDescription(aqi) {
    const category = getAqiCategory(aqi);
    if (!category) {
        return null;
    }
    const box = el('div', 'container text-white border rounded box-shadow',
        el('div', 'row border-bottom rounded pb-3 pt-3',
            el('div', 'col-3 font-weight-bold', 'Air Pollution Level'),
            el('div', 'col-5 font-weight-bold', 'Health Implications'),
            el('div', 'col-4 font-weight-bold', 'Cautionary Statement (for PM2.5)'),
        ),
        el('div', 'row border-0 rounded pb-4 pt-4',
            el('div', 'col-3', el('strong', '', category.level)),
            el('div', 'col-5', el('strong', '', category.healthImplication)),
            el('div', 'col-4', el('strong', '', category.cautionaryStatement)),
        ),
    );
    box.style.backgroundColor = category.color;
    return box;
}

// macro setGases
export function renderGases(iaqi) {
    return renderDataTable('Air particles', 'container mt-5 pr-3 pl-3 border rounded box-shadow', pickPollutants(iaqi));
}

// macro setWeather
export function renderWeather(iaqi) {
    return renderDataTable('Weather data', 'container mt-5 mb-2 pr-3 pl-3 border rounded box-shadow', pickWeather(iaqi));
}

// macro displayUrlSource
export function renderSource(url) {
    if (!url) {
        return null;
    }
    const source = el('em', 'float-right mt-3 mb-5', 'Source from: ');
    if (isSafeHttpUrl(url)) {
        const link = el('a', 'text-decoration-none', url);
        link.href = url;
        source.append(link);
    } else {
        source.append(String(url));
    }
    return source;
}

// rama {% elseif object.status == "error" %}
export function renderError(message) {
    const link = el('a', '', 'aqicn.org');
    link.href = 'https://aqicn.org/';
    return el('div', 'text-center',
        el('h1', 'display-2', "That's bad!"),
        el('h1', '', "The city you're trying to find is not registered on ", link),
        el('p', '', "Maybe there's no form to calculate the data, or not resources to know it."),
        el('em', '', `Message: ${message}`),
    );
}

// Sustituye a init-google-maps.js: mismo zoom (13) y mismo título del marcador.
export function mountMap(parent, geo) {
    const position = parseGeo(geo);
    if (!position || typeof window.L === 'undefined') {
        return false;
    }
    const mapElement = el('div', 'h-100 w-100 border-rounded rounded mb-5 box-shadow');
    mapElement.id = 'map';
    mapElement.style.minHeight = '400px';
    parent.append(mapElement);

    const center = [position.lat, position.lng];
    const map = window.L.map(mapElement).setView(center, 13);
    window.L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    window.L.marker(center, { title: 'Your city' }).addTo(map);
    return true;
}
```

- [ ] **Step 3: Crear `docs/js/search-page.js`**

```js
import { WAQI_TOKEN } from './config.js';
import { buildFeedUrl, parseFeedResponse, readCityParam } from './air-quality.js';
import {
    mountMap,
    renderDescription,
    renderError,
    renderGases,
    renderMain,
    renderSource,
    renderWeather,
} from './render.js';

async function fetchFeed(city) {
    try {
        const response = await fetch(buildFeedUrl(city, WAQI_TOKEN));
        return parseFeedResponse(await response.json());
    } catch {
        // Red caída o cuerpo no JSON.
        return parseFeedResponse(null);
    }
}

async function main() {
    const city = readCityParam(window.location.search);
    if (!city) {
        window.location.replace('index.html');
        return;
    }

    const root = document.getElementById('result');
    const result = await fetchFeed(city);
    if (result.kind === 'error') {
        root.append(renderError(result.message));
        return;
    }

    const { data } = result;
    const details = document.createElement('div');
    details.className = 'container';
    details.append(...[
        renderMain(data),
        renderDescription(data.aqi),
        renderGases(data.iaqi),
        renderWeather(data.iaqi),
        renderSource(data.city?.url),
    ].filter(Boolean));
    root.append(details);
    mountMap(root, data.city?.geo);
}

main();
```

- [ ] **Step 4: Crear `docs/search.html`**

Replica `base.html.twig` + `search.html.twig` (navbar de `displayNavbar()`, fondo blanco). Leaflet se carga como script clásico **antes** de los módulos; los módulos son diferidos y se ejecutan después, con `window.L` ya disponible.

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>AirQuality</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.0/dist/css/bootstrap.min.css" integrity="sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk" crossorigin="anonymous">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.14.0/css/all.min.css" integrity="sha384-HzLeBuhoNPvSl5KYnjx0BT+WB0QEEqLprO+NBkkk5gbc67FTaL7XIGa2w1L0Xbgc" crossorigin="anonymous">
        <link rel="stylesheet" href="css/styles.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" integrity="sha384-Gu3KVV2H9d+yA4QDpVB7VcOyhJlAVrcXd0thEjr4KznfaFPLe0xQJyonVxONa4ZC" crossorigin="anonymous">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" integrity="sha384-c6Rcwz4e4CITMbu/NBmnNS8yN2sC3cUElMEMfP3vqqKFp7GOYaaBBCqmaWBjmkjb" crossorigin="anonymous">
        <style>
            body {
                background-color: white !important;
            }
        </style>
    </head>
    <body>
        <canvas id="drawing-surface" style="position:absolute; left: 0; top: 0;"></canvas>
        <datalist id="cities_list"></datalist>

        <div class="container pb-5 h-100">
            <nav class="navbar ">
                <a class="navbar-brand silver" href="index.html">
                    <i class="fas fa-cloud"></i>
                    AirQuality
                </a>
                <button class="navbar-toggler border-0" type="button" data-toggle="collapse"
                    data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="" id="navbarSupportedContent" style="position:relative">
                    <form action="search.html" method="GET" class="form-inline my-2 my-lg-0">
                        <input class="form-control mr-sm-2 input-lg" list="cities_list" type="search" name="city" placeholder="City" aria-label="Search">
                        <button class="btn my-2 my-sm-0 silver submit-button" type="submit">
                            <i class="fas fa-arrow-right fa-lg"></i>
                        </button>
                    </form>
                </div>
            </nav>
            <div id="result" class="h-100"></div>
        </div>

        <footer class="footer" style="background-color: transparent !important">
            <div class="container text-center">
                Powered by <a href="https://aqicn.org/">aqicn.org</a>
            </div>
        </footer>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js" integrity="sha512-bLT0Qm9VnAYZDflyKcBaQ2gg0hSYNQrJ8RilYldYQ1FxQYoCLtUjuuRuZo+fjqhx/qtq/1itJ0C2ejDxltZVFg==" crossorigin="anonymous"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.0/dist/js/bootstrap.min.js" integrity="sha384-OgVRvuATP1z7JjHLkuOU7Xw704+h835Lr+6QL9UvYjZE3Ipu6Tp75j7Bh/kR0JKI" crossorigin="anonymous"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" integrity="sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO" crossorigin="anonymous"></script>
        <script type="module" src="js/cities.js"></script>
        <script type="module" src="js/search-page.js"></script>
    </body>
</html>
```

- [ ] **Step 5: Comprobaciones estáticas**

Run:
```bash
grep -nE '(src|href|action)="/' docs/*.html docs/js/*.js || echo "sin rutas absolutas"
grep -n 'innerHTML' docs/js/*.js || echo "sin innerHTML"
node --test tests/js/
```
Expected: `sin rutas absolutas`, `sin innerHTML`, tests `# fail 0`.

- [ ] **Step 6: Verificar en el navegador**

Servidor arrancado (procedimiento compartido). Con Chrome DevTools MCP, base `http://127.0.0.1:8765/airQuality/`:

a. **Ciudad válida.** `navigate_page` → `search.html?city=Madrid`; esperar a que exista `#map .leaflet-marker-icon` (`wait_for` o reintentar); `evaluate_script`:
```js
() => ({
    aqi: document.querySelector('#result .display-4')?.textContent,
    badge: getComputedStyle(document.querySelector('#result .display-4').parentElement).backgroundColor,
    city: document.querySelector('#result h1.my-auto')?.textContent,
    updated: document.querySelector('#result em')?.textContent,
    level: document.querySelector('#result .row.border-0 strong')?.textContent,
    titles: [...document.querySelectorAll('#result h4')].map((h) => h.textContent),
    rows: [...document.querySelectorAll('#result .row.border-top h6')].map((h) => h.textContent),
    source: document.querySelector('#result em.float-right a')?.href,
    marker: Boolean(document.querySelector('#map .leaflet-marker-icon')),
    tiles: document.querySelectorAll('#map img.leaflet-tile-loaded').length,
})
```
Expected: `aqi` numérico; `badge` = color de su categoría (p. ej. AQI 42 → `rgb(68, 154, 102)`); `city` "Madrid"; `updated` empieza por "Updated at"; `level` coincide con la categoría; `titles` = `["Air particles", "Weather data"]`; `rows` incluye "O3" y algún valor con "hPa"; `source` `https://aqicn.org/city/madrid`; `marker: true`; `tiles > 0`. `list_console_messages` sin errores; `take_screenshot`: caja de color, tabla, dos cajas con sombra, enlace a la fuente y mapa con marcador.

b. **Tildes y `+` (Review Focus 1).** `navigate_page` → `search.html?city=S%C3%A3o+Paulo`. `list_network_requests` → Expected: una petición a `https://api.waqi.info/feed/S%C3%A3o%20Paulo/?token=…` con 200. Se pinta un resultado (el nombre de la estación lo da la API) y la consola no tiene errores.

c. **Ciudad inexistente.** `navigate_page` → `search.html?city=zzzz-no-existe`; `evaluate_script`: `() => document.querySelector('#result').innerText` → Expected: contiene "That's bad!" y "Message: Unknown station".

d. **Sin ciudad.** `navigate_page` → `search.html` y después `search.html?city=%20` → Expected en ambos casos: `location.href` final `http://127.0.0.1:8765/airQuality/index.html`.

e. **Renderizado degradado (Review Focus 2 y 3).** Desde cualquier `search.html?city=…` cargada, `evaluate_script`:
```js
async () => {
    const m = await import(new URL('js/render.js', location.href).href);
    const main = m.renderMain({ aqi: '-', city: { name: 'Nowhere' } });
    const savedL = window.L;
    window.L = undefined;
    const mapWithoutLeaflet = m.mountMap(document.createElement('div'), [40.4, -3.7]);
    window.L = savedL;
    return {
        badgeColor: main.querySelector('.border.rounded').style.backgroundColor,
        badgeText: main.querySelector('.display-4').textContent,
        hasUpdated: Boolean(main.querySelector('em')),
        description: m.renderDescription('-'),
        gases: m.renderGases(undefined),
        weather: m.renderWeather({}),
        unsafeSourceLink: m.renderSource('javascript:alert(1)').querySelector('a'),
        mapWithBadGeo: m.mountMap(document.createElement('div'), null),
        mapWithoutLeaflet,
    };
}
```
Expected: `{ badgeColor: "rgb(148, 148, 148)", badgeText: "-", hasUpdated: false, description: null, gases: null, weather: null, unsafeSourceLink: null, mapWithBadGeo: false, mapWithoutLeaflet: false }`.

f. **Navegación.** En `search.html?city=Madrid`, `fill` el input del navbar con `Lima` y `click` en el botón → Expected: `search.html?city=Lima` con resultado de Lima. `click` en la marca "AirQuality" → Expected: `index.html`.

g. **Red.** `list_network_requests` en (a) → Expected: ningún 404; los iconos del marcador se cargan desde `cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/`.

- [ ] **Step 7 (opcional): comparación visual con la versión PHP**

Solo si `php --version` y `composer --version` funcionan: `composer install` (tope de 5 minutos). Si termina, `php -S 127.0.0.1:8000 -t public/` en segundo plano (antes, `ccres comprobar puerto:8000` y reservarlo) y capturar `/` y la búsqueda "Madrid" para compararlas con las capturas del Step 6. Si `composer install` falla, no insistir: anotar "comparación PHP no realizada: <motivo>" para el informe final. Al terminar, parar el servidor PHP y `ccres liberar puerto:8000`.

- [ ] **Step 8: Parar el servidor local**

Detener la tarea en segundo plano de `http.server` y ejecutar `ccres liberar puerto:8765`.

- [ ] **Step 9: Commit**

```bash
git add docs/js/config.js docs/js/render.js docs/js/search-page.js docs/search.html
git commit -m "$(printf 'add static search results page with leaflet map\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

---

### Task 5: Limpieza, README y publicación en GitHub Pages

**Files:**
- Delete: `index.html` (raíz; redirección rota a `public/index.html`)
- Modify: `README.md`

**Interfaces:**
- Consumes: todo `docs/` (Tasks 1–4).
- Produces: sitio publicado en `https://kenserikawa.github.io/airQuality/`.

- [ ] **Step 1: Borrar la redirección de la raíz**

```bash
git rm index.html
```

- [ ] **Step 2: Actualizar `README.md`**

Sustituir el contenido por:

````markdown
##  Air Quality 
### API Rest implementation with a simple template for displaying data of each city available

**Live demo (static version):** https://kenserikawa.github.io/airQuality/

#### Static version (GitHub Pages)
The `docs/` folder holds a backend-free replica that calls the aqicn.org API directly from the browser. GitHub Pages publishes it from `master` → `/docs`.

Run it locally:
```
python3 -m http.server 8000 --directory docs
```
Then open `http://127.0.0.1:8000/`.

- Logic tests: `node --test tests/js/`
- Regenerate the city list: `python3 scripts/build-cities.py`

#### Symfony version
1. Clone repo 
2. Launch server:
```
# Native php server
php -S 127.0.0.1:8000 public/
# Web server bundle
bin/console server:start
```
3. Once you get into the route `http://127.0.0.1:8000/` try typing your city on the input and submit it.
````

- [ ] **Step 3: Comprobación final antes de publicar**

Run:
```bash
node --test tests/js/
git status --short
git diff --stat 8145129 -- src templates public config tests/Unit tests/Functional
```
Expected: tests `# fail 0`; `git status` solo muestra `D  index.html` y ` M README.md`; el `git diff --stat` contra `8145129` (commit de la spec, anterior a la Task 1) está vacío sobre las carpetas de Symfony.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "$(printf 'remove broken root redirect and document static site\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')"
```

- [ ] **Step 5: Pedir confirmación y hacer push**

Preguntar al usuario: "¿Hago `git push origin master`? Publica los commits de las Tasks 1–5 en GitHub." Solo con un sí explícito:
```bash
git push origin master
```
Expected: `master -> master` sin errores.

- [ ] **Step 6: El usuario configura Pages**

Pedir al usuario: GitHub → repo `airQuality` → **Settings → Pages** → *Build and deployment* → Source: **Deploy from a branch** → Branch: **master**, carpeta **/docs** → **Save**. Esperar su confirmación.

- [ ] **Step 7: Esperar al despliegue**

Usar Monitor con un bucle until (sin `sleep` en primer plano), tope de 10 minutos:
```bash
until [ "$(rtk proxy curl -s -o /dev/null -w '%{http_code}' https://kenserikawa.github.io/airQuality/search.html)" = "200" ]; do sleep 20; done; echo deployed
```
Expected: `deployed`. Si a los 10 minutos sigue sin 200, revisar con el usuario la pestaña Actions (workflow `pages-build-deployment`) antes de seguir.

- [ ] **Step 8: Verificación en vivo (Review Focus 5)**

Con Chrome DevTools MCP, base `https://kenserikawa.github.io/airQuality/`:
1. Portada: `#cities_list` con `13504` opciones, consola sin errores, `list_network_requests` sin 404.
2. `search.html?city=Madrid`: repetir el `evaluate_script` del paso (a) de la Task 4 con los mismos criterios.
3. `search.html?city=zzzz-no-existe`: "That's bad!" + "Message: Unknown station".
4. `search.html`: redirige a `https://kenserikawa.github.io/airQuality/index.html`.
5. `take_screenshot` de la portada y de Madrid para el informe final.

Informar al usuario con la URL, el resultado de cada comprobación y las incidencias (incluida la comparación PHP del Step 7 de la Task 4 si no se hizo).
