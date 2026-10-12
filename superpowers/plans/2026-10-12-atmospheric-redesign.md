# AirQuality — Rediseño atmosférico — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir la réplica estática por una web atmosférica de portfolio (Vite + Tailwind en `web/`) que muestra el aire de tu zona al entrar, busca estaciones reales y ofrece previsión, contaminantes, tiempo, mapa con capa AQI y escala, desplegada en GitHub Pages con Actions.

**Architecture:** Proyecto Vite en `web/` con lógica pura en `src/lib/` (sin DOM, testeada con Vitest) y vistas en `src/ui/` (sin red, testeadas con Vitest + jsdom); `main.js` orquesta un estado único. El build (`base: '/airQuality/'`) lo publica un workflow de GitHub Actions solo si pasan los tests.

**Tech Stack:** Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), Vitest 5 + jsdom, Leaflet 1.9.4 (carga diferida), `@fontsource/sora`, `@fontsource/manrope`, Node 22.13.

**Spec:** `superpowers/specs/2026-10-12-atmospheric-redesign-design.md` (autoridad en datos, comportamiento, tokens y tests). Referencias visuales: `design/stitch/*.jpg`.

## Global Constraints

- Todo el código nuevo vive en `web/` y `.github/workflows/`; la app Symfony (`src/ templates/ public/ config/` de la raíz) no se toca.
- Solo datos de la API listados en la spec §2. Nada inventado (tendencias horarias, punto de rocío, µg/m³…).
- Interfaz en inglés; textos por categoría literales de la spec §4.2.
- Datos externos solo como texto (`el()` añade hijos string como nodos de texto); `href` solo si `^https?://`. Nunca `innerHTML` con datos externos.
- Tokens visuales de la spec §4.1 (cielos con medias corregidas, cristal oscuro `rgba(6,14,32,0.55)`, paradas 0/70/100 %). Texto siempre blanco.
- Todas las peticiones con timeout de 10 s; geolocalización con timeout de 8 s.
- `prefers-reduced-motion` desactiva partículas, conteo y transiciones de cielo.
- Versiones exactas en `web/package-lock.json`; en cada major, la última versión publicada hace ≥ 14 días.
- Rutas de assets relativas a `base` (`/airQuality/`); nada absoluto a la raíz del dominio.
- Commits en `master` en minúsculas e imperativo, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git push` solo con confirmación del usuario.
- Verificación en navegador con Chrome headless propio (perfil aislado en el scratchpad) y una página harness del mismo origen; `rtk proxy curl` para respuestas HTTP completas.
- Test command de cada tarea: `cd web && npx vitest run` (salvo que la tarea indique otro).

## Review Focus

1. **Geolocalización denegada o lenta y luego IP fallida**: debe acabar en `unlocated` con el buscador resaltado, nunca en un spinner infinito. → Tests de `location` (Task 4) + estado `unlocated` (Task 6) + orquestación (Task 10).
2. **Búsquedas rápidas que se solapan** (teclear "ma", "mad", "madr" seguidos): solo la última respuesta pinta la lista; ninguna petición cancelada produce error visible. → Tests de `search` (Task 7).
3. **Estación con `aqi: "-"`, sin `iaqi`, sin `forecast` o sin `geo`**: hero neutral "No current reading" y secciones vacías omitidas, sin excepciones. → Tests de `hero`/secciones (Tasks 6 y 8) + `mountMap` con geo inválida (Task 9).
4. **Datos con HTML en nombres de estación o atribuciones**: se ven como texto. → Test XSS (Task 5) y en hero/footer (Tasks 6 y 8).
5. **Servido bajo `/airQuality/` y con `?station=` + Atrás/Adelante**: assets 200 y la estación correcta tras navegar en el historial. → Verificación en navegador (Task 10) y en vivo (Task 11).

---

### Task 1: Andamiaje de `web/`

**Files:**
- Create: `web/package.json`, `web/package-lock.json` (generado), `web/vite.config.js`, `web/index.html`, `web/src/main.js`, `web/src/styles.css`, `web/tests/smoke.test.js`, `web/.gitignore`

**Interfaces:**
- Produces: scripts `npm run dev`, `npm run build`, `npm run preview`, `npm test` (= `vitest run`); `base: '/airQuality/'`; entorno de test `jsdom` para `tests/ui/**` y `node` para el resto.

- [ ] **Step 1:** Elegir versiones: para `vite`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@fontsource/sora`, `@fontsource/manrope` tomar la última versión de su major actual publicada hace ≥ 14 días (`npm view <pkg> time --json`); `leaflet` 1.9.4.
- [ ] **Step 2:** Crear `web/package.json` (`"type": "module"`, `"private": true`, scripts) e instalar con versiones exactas (`npm install --save-exact`).
- [ ] **Step 3:** `vite.config.js`:

```js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: '/airQuality/',
    plugins: [tailwindcss()],
    test: {
        environment: 'node',
        environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    },
});
```

  Si Vitest 5 ya no admite `environmentMatchGlobs`, usar `test.projects` con dos proyectos (`lib`/node y `ui`/jsdom) y registrar el cambio en el ledger.
- [ ] **Step 4:** `index.html` mínimo (`lang="en"`, `<title>AirQuality — Air quality near you</title>`, `<div id="app">`, `<script type="module" src="/src/main.js">`), `styles.css` con `@import "tailwindcss";`, `main.js` que importa `styles.css`.
- [ ] **Step 5:** `tests/smoke.test.js` (`expect(1 + 1).toBe(2)`) → `npm test` PASS; `npm run build` genera `dist/` con assets bajo `/airQuality/`.
- [ ] **Step 6:** Commit `scaffold vite + tailwind project for redesign`.

### Task 2: `lib/aqi.js` (lógica pura)

**Files:** Create `web/src/lib/aqi.js`; Test `web/tests/lib/aqi.test.js`

**Interfaces (Produces):**
- `NEUTRAL: Category`, `CATEGORIES: Category[]` donde `Category = { key, label, range, min, max, sky: [top, middle, horizon], accent, implication, advice }` (keys: `good`, `moderate`, `usg`, `unhealthy`, `very-unhealthy`, `hazardous`; `NEUTRAL.key = 'neutral'`).
- `parseAqi(value) → number | null`; `getCategory(aqi) → Category` (neutral si no numérico).
- `pickPollutants(iaqi) → [{ key, code, name, value, category }]` en orden pm25, pm10, o3, no2, so2, co.
- `pickWeather(iaqi) → [{ key, label, value, unit }]` en orden t (°C), h (%), w (m/s), p (hPa).
- `forecastDays(daily, key, today) → [{ day, label, avg, min, max, category }]` (días ≥ `today` `YYYY-MM-DD`, máx. 6; `label` "Sat 11").
- `forecastKeys(daily) → string[]` (subconjunto ordenado de `['pm25','pm10','o3']` con datos).
- `relativeTime(iso, now) → string`; `isStale(iso, now) → boolean` (> 24 h).
- `contrastRatio(hexA, hexB) → number`; `blend(hexBase, hexOver, alpha) → hex`.
- `splitStationName(name) → { primary, secondary }`; `pollutantLabel(code) → 'PM2.5' | …`.

- [ ] **Step 1: Tests que fallan** (`web/tests/lib/aqi.test.js`):

```js
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
```

- [ ] **Step 2:** `npx vitest run tests/lib/aqi.test.js` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `aqi.js` con los datos de la spec §4.1/§4.2 (cielos con medias corregidas). Humedad y presión se redondean a entero en `pickWeather`; temperatura y viento conservan un decimal.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `add aqi domain logic for redesign`.

### Task 3: `config.js` + `lib/waqi.js`

**Files:** Create `web/src/config.js`, `web/src/lib/waqi.js`; Test `web/tests/lib/waqi.test.js`

**Interfaces (Produces):**
- `config.js`: `WAQI_TOKEN`, `WAQI_API = 'https://api.waqi.info'`, `WAQI_TILES = 'https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=' + WAQI_TOKEN`.
- `class OfflineError extends Error`, `class NotFoundError extends Error`.
- `fetchStation(uid) → Promise<Station>`, `fetchHere() → Promise<Station>` con `Station = { uid, aqi (number|null), name, geo ({lat,lng}|null), time (iso|null), dominant (string|null), iaqi (object), forecast (object|null), attributions ([{name,url}]) }`.
- `searchStations(q, { signal }) → Promise<[{ uid, aqi, name }]>` (máx. 8).
- `findNearestStation(lat, lng) → Promise<{ uid }>` (spec §5.3).
- Todas usan `fetchJson(url, signal)`: `AbortSignal.any([signal, AbortSignal.timeout(10000)])`; error de red/timeout/no-JSON → `OfflineError`; `status: "error"` → `NotFoundError`; aborto por la señal del llamador se propaga como `AbortError` (no se convierte).

- [ ] **Step 1: Tests que fallan** con `vi.stubGlobal('fetch', vi.fn())`:
  - `fetchStation(5725)` llama a `https://api.waqi.info/feed/@5725/?token=…` y normaliza la respuesta de Madrid (fixture `web/tests/fixtures/madrid.json` copiada de una respuesta real): `aqi 42`, `name 'Madrid'`, `geo {lat: 40.4167754, lng: -3.7037902}`, `time '2026-10-10T02:00:00+02:00'`, `dominant 'pm25'`, atribuciones deduplicadas por nombre.
  - `aqi: "-"` → `aqi: null`; `geo` ausente → `null`.
  - `{status:'error', data:'Unknown station'}` → `NotFoundError`.
  - `fetch` rechaza con `TypeError` → `OfflineError`; respuesta no JSON → `OfflineError`; timeout (`DOMException` `TimeoutError`) → `OfflineError`.
  - `searchStations('madr', {signal})` → URL con `keyword=madr` codificado; mapea `aqi: '59'` → 59 y `'-'` → null; corta a 8; abortar la señal → rechaza con `name === 'AbortError'`.
  - `findNearestStation(40.42, -3.70)`: con fixture de bounds elige la más cercana con `aqi` numérico (ignora una `'-'` más cercana); si la primera respuesta solo trae `'-'`, hace una segunda petición con ±1°; si tampoco, `NotFoundError`. URL de la primera: `latlng=40.17,-3.95,40.67,-3.45`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `add waqi api client`.

### Task 4: `lib/location.js`, `lib/url-state.js`, `lib/store.js`

**Files:** Create los tres módulos; Tests `web/tests/lib/location.test.js`, `web/tests/ui/url-state.test.js` (jsdom), `web/tests/lib/store.test.js`

**Interfaces (Produces):**
- `class UnlocatedError extends Error`; `locate({ geolocation, findNearestStation, fetchHere, fetchStation, timeoutMs = 8000 }) → Promise<Station>` (dependencias inyectables; por defecto las reales).
- `readStationId() → number | null`; `pushStationId(uid)`; `onStationIdChange(cb) → unsubscribe`.
- `createStore(initial) → { get(), set(patch), subscribe(fn) → unsubscribe }` (notifica con el estado nuevo).

- [ ] **Step 1: Tests que fallan:**
  - `locate`: geolocalización concedida → `findNearestStation(lat,lng)` → `fetchStation(uid)`; denegada → `fetchHere()`; sin respuesta en `timeoutMs` (fake timers) → `fetchHere()`; `findNearestStation` lanza `NotFoundError` → `fetchHere()`; `fetchHere` lanza → `UnlocatedError`; sin `navigator.geolocation` → `fetchHere()`.
  - `url-state`: `?station=5725` → 5725; `?station=abc` y ausente → null; `pushStationId(3229)` cambia `location.search` a `?station=3229`; `popstate` dispara el callback con el id leído.
  - `store`: `set` mezcla y notifica; `unsubscribe` deja de notificar.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `add location, url state and store`.

### Task 5: Base visual: `ui/dom.js`, `ui/icons.js`, `ui/sky.js`, `ui/particles.js`, estilos y layout

**Files:** Create `web/src/ui/dom.js`, `web/src/ui/icons.js`, `web/src/ui/sky.js`, `web/src/ui/particles.js`; Modify `web/src/styles.css`, `web/index.html`; Tests `web/tests/ui/dom.test.js`, `web/tests/ui/sky.test.js`

**Interfaces (Produces):**
- `el(tag, attrs, ...children)`: `attrs` admite `class`, `text`, `aria-*`, `data-*`, `role`, `id`, `href` (solo `^https?://` o rutas relativas internas), `style` (objeto), `on<Event>`; hijos string → nodos de texto; `null`/`false` se ignoran.
- `icon(name, { size })` → `SVGElement` para: `wind`, `search`, `navigation`, `thermometer`, `droplet`, `gauge`, `chevron-down`, `check-circle`, `alert-triangle`, `clock`, `map-pin`, `refresh`, `x`.
- `applySky(category, { root = document.documentElement, reducedMotion })`: fija `--sky-top`, `--sky-middle`, `--sky-horizon`, `--accent` y `data-category`.
- `startParticles(canvas, { reducedMotion }) → { setDensity(pm25), stop() }` (no hace nada con reduced motion; pausa con `visibilitychange`).
- `index.html`: estructura semántica — `<canvas id="particles">`, `<header>` (logo, `#search`, botón `#locate`), `<main>` con `#hero`, `#forecast`, `#pollutants`, `#weather`, `#map`, `#scale`, `<footer id="footer">`, región `#announcer` `aria-live="polite"`.
- `styles.css`: `@theme` con fuentes (Sora, Manrope vía `@fontsource`), clases `.sky` (degradado fijo con paradas 0/70/100 % y transición de 1,2 s salvo reduced motion), `.glass` y `.glass-pill` (cristal oscuro de la spec §4.1), `.hero-num`, esqueletos con brillo, foco visible.

- [ ] **Step 1: Tests que fallan:** `el('p', {}, '<img src=x onerror=alert(1)>')` → `textContent` igual al string y sin `<img>`; `href: 'javascript:alert(1)'` no se asigna; `applySky(getCategory(42))` fija las cuatro variables con los colores de Good y `data-category="good"`.
- [ ] **Step 2–4:** FAIL → implementar → PASS (las partículas se verifican en navegador, Task 10).
- [ ] **Step 5:** Commit `add visual foundation: sky, glass, particles, layout`.

### Task 6: `ui/hero.js` y `ui/states.js`

**Files:** Create ambos; Tests `web/tests/ui/hero.test.js`, `web/tests/ui/states.test.js`

**Interfaces (Produces):**
- `renderHero(root, { station, now, reducedMotion })`: pinta spec §3.2 (número con conteo salvo reduced motion; con `aqi null` → "–" y "No current reading", sin rango/escala/mensaje); "Right now" con las casillas presentes; chip "Last reading" si `isStale`.
- `renderState(root, status, { onRetry })` para `locating`, `offline`, `not-found`, `unlocated` (spec §3.6); `renderSkeletons(sections)` para `loading`.

- [ ] **Step 1: Tests que fallan:** hero Good con fixture Madrid (número 42 tras conteo con reduced motion, "Good", "AQI RANGE (0–50)", "Madrid", "Dominant: PM2.5", textos de salud, 4 casillas); `aqi null` → "No current reading" y sin `.aqi-scale`; sin `dominant` → sin chip; `iaqi` sin `t` → 3 casillas; dato de hace 2 días → "Last reading 2 days ago"; nombre con HTML → texto. Estados: cada uno con su título de la spec; `offline` llama a `onRetry` al pulsar "Retry"; `unlocated` muestra "Search for a city to get started".
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `add hero and state views`.

### Task 7: `ui/search.js` (combobox)

**Files:** Create `web/src/ui/search.js`; Test `web/tests/ui/search.test.js`

**Interfaces (Produces):** `mountSearch(root, { search, onSelect, onUseLocation, debounceMs = 300 }) → { focus(), destroy() }` donde `search(q, { signal })` es inyectable (por defecto `searchStations`).

- [ ] **Step 1: Tests que fallan** (fake timers):
  - estructura ARIA: input `role="combobox"`, `aria-expanded="false"`, `aria-controls` → `role="listbox"`; al abrir `aria-expanded="true"`.
  - con foco y vacío: lista con solo "Use my current location".
  - < 2 caracteres no busca; "madr" busca una sola vez tras 300 ms.
  - escribir "ma", "mad", "madr" en < 300 ms → una llamada con "madr".
  - respuesta lenta de "mad" que llega después de la de "madr" no sustituye la lista (la petición anterior recibe `abort`).
  - ↓ activa la primera estación (`aria-activedescendant`), ↓↓ y vuelta al principio, ↑ al final; Enter llama a `onSelect(uid)` y cierra; Enter sobre "Use my current location" llama a `onUseLocation`; Esc cierra y conserva el foco; Tab cierra.
  - sin resultados → "No stations found for “zzz”"; `search` lanza `OfflineError` → "Search is unavailable right now"; `AbortError` no muestra nada.
  - chips: `aqi null` → "–" y "Offline"; nombre partido en principal/secundario.
  - atajos `⌘K`/`Ctrl+K` y `/` (fuera de campos de texto) enfocan el input.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `add accessible station search`.

### Task 8: Secciones: `ui/forecast.js`, `ui/pollutants.js`, `ui/weather.js`, `ui/scale.js`, `ui/footer.js`

**Files:** Create los cinco; Test `web/tests/ui/sections.test.js`

**Interfaces (Produces):** `renderForecast(root, station, { today })`, `renderPollutants(root, station)`, `renderWeather(root, station)`, `renderScale(root, station)`, `renderFooter(root, station)`; cada una vacía `root` y lo oculta (`hidden`) si no hay datos.

- [ ] **Step 1: Tests que fallan:** previsión con fixture (6 días desde `today`, pestañas solo de claves con datos, cambiar de pestaña repinta, barras con `aria-label` "Sun 11: average 38, min 30, max 45"); sin `forecast` → oculta; contaminantes 6 tiles con nombre y "AQI sub-index"; sin `iaqi` → oculta; meteo 4 casillas; escala con marcador en Good y caja de texto; `aqi null` → "What does the AQI mean?" sin marcador; footer con atribuciones deduplicadas, enlaces solo http(s) y nombre con HTML como texto, "AirQuality · GitHub" y atribución cartográfica.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `add forecast, pollutants, weather, scale and footer`.

### Task 9: `ui/map.js` (Leaflet diferido)

**Files:** Create `web/src/ui/map.js`; Test `web/tests/ui/map.test.js`

**Interfaces (Produces):** `mountMap(root, { geo, label, aqi, loadLeaflet = () => import('leaflet') , observe = intersectionObserverFactory }) → { update(station), destroy() }`; base CARTO `dark_all` + capa WAQI (opacidad 0,8), zoom 11, `scrollWheelZoom: false`, marcador con tooltip permanente "{label} · {aqi}". Con `geo` inválida oculta `root` y no llama a `loadLeaflet`.

- [ ] **Step 1: Tests que fallan:** con `geo` null → `root.hidden` y `loadLeaflet` no llamado; con `geo` válida no carga hasta que el observador notifica intersección; al cargar crea el mapa con `scrollWheelZoom: false` y las dos capas (Leaflet simulado en la frontera); `update` mueve vista y marcador sin recrear el mapa.
- [ ] **Step 2–4:** FAIL → implementar → PASS. **Step 5:** Commit `add lazy leaflet map with aqi tiles`.

### Task 10: `main.js` (orquestación) y verificación en navegador

**Files:** Modify `web/src/main.js`; Test `web/tests/ui/main.test.js`

**Interfaces (Consumes):** todo lo anterior. **Produces:** app completa.

- [ ] **Step 1: Tests que fallan** (módulos de red y ubicación simulados con `vi.mock`):
  - sin `?station` → estado `locating` → `locate()` → hero de la estación, `pushStationId` no se llama en la carga inicial (se usa `replaceState`), título "42 Good · Madrid — AirQuality", anuncio `aria-live`.
  - con `?station=3229` → `fetchStation(3229)` sin `locate`.
  - `locate` lanza `UnlocatedError` → estado `unlocated`.
  - `fetchStation` lanza `OfflineError` → `offline`; Retry repite.
  - `onSelect(3229)` desde el buscador → `loading` (hero anterior atenuado) → nueva estación y `pushStationId(3229)`.
  - `popstate` con otro id → carga sin `pushState`.
- [ ] **Step 2–4:** FAIL → implementar → PASS (suite completa).
- [ ] **Step 5: Verificación en navegador** (`npm run build && npx vite preview --port 8765`, puerto reservado con `ccres`; harness del mismo origen; Chrome headless con perfil aislado):
  - 1440×900: Madrid (`?station=5725`) — comparar con `design/stitch/good-hero.jpg`; scroll a secciones — comparar con `details.jpg`; buscador abierto con "madr" — comparar con `search-open.jpg`; una estación de categoría alta (buscar una con AQI > 150 en `/search` o simular respuesta) — comparar con `unhealthy-hero.jpg`.
  - 390×844: sin scroll horizontal, una columna.
  - Geolocalización simulada (`--use-fake-ui-for-media-stream` no aplica; usar `Emulation.setGeolocationOverride` vía harness o conceder permiso con coordenadas de Madrid) → estación de Madrid.
  - Consola sin errores; sin 404; Leaflet no se pide hasta hacer scroll al mapa; `?station=` + Atrás restaura la estación anterior.
- [ ] **Step 6:** Commit `wire up redesigned app`.

### Task 11: Despliegue y limpieza

**Files:** Create `.github/workflows/pages.yml`; Modify `README.md`; Delete (tras verificación en vivo) `docs/`, `tests/js/`, `scripts/build-cities.py`

- [ ] **Step 1:** Workflow (spec §6): `on: push: branches: [master]` + `workflow_dispatch`; jobs `build` (checkout, setup-node 22 con `cache: npm` y `cache-dependency-path: web/package-lock.json`, `npm ci`, `npm test`, `npm run build` en `web/`, `actions/upload-pages-artifact` con `web/dist`) y `deploy` (`actions/deploy-pages`, `environment: github-pages`); `permissions: { contents: read, pages: write, id-token: write }`; `concurrency: { group: pages, cancel-in-progress: false }`. Usar las versiones mayores actuales de cada action.
- [ ] **Step 2:** README: demo, stack, `cd web && npm install && npm run dev`, `npm test`, despliegue por Actions; sección Symfony intacta.
- [ ] **Step 3:** Commit `add pages deployment workflow and update readme`.
- [ ] **Step 4:** Revisión final de todos los cambios (antes del push).
- [ ] **Step 5:** Pedir confirmación → `git push origin master`.
- [ ] **Step 6:** Usuario: Settings → Pages → Source: **GitHub Actions**; relanzar el workflow (`workflow_dispatch` o push).
- [ ] **Step 7:** Verificación en vivo (spec §7.4).
- [ ] **Step 8:** Borrar `docs/`, `tests/js/`, `scripts/build-cities.py`; commit `remove static replica`; pedir confirmación y push.
