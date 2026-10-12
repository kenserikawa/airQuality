# AirQuality — Rediseño atmosférico — Diseño

- **Fecha:** 2026-10-12
- **Estado:** pendiente de revisión
- **Repo:** `kenserikawa/airQuality` (rama `master`)
- **URL objetivo:** https://kenserikawa.github.io/airQuality/
- **Proyecto Stitch:** https://stitch.withgoogle.com/projects/8483615672894406869 (sistema de diseño `assets/13677827411413709186`)
- **Sustituye a:** la réplica estática de `docs/` (spec `2026-10-12-static-github-pages-design.md`)

## 1. Contexto y objetivo

La réplica estática publicada reproduce fielmente una web con muy mala experiencia: canvas que se satura de blanco, texto gris sobre blanco, buscador invisible, autocompletado con nombres que la API no conoce ("Unknown station"), números sin contexto, mapa a pantalla completa, sin estado de carga ni diseño móvil.

**Objetivo:** convertirla en una **pieza de portfolio** (prima el impacto visual y que luzca en una demo) con un diseño **atmosférico inmersivo** coordinado en Stitch, y replantear la usabilidad: el aire de tu zona al entrar, búsqueda de estaciones reales, previsión y mapa con capa de AQI.

**Decisiones del usuario:** portfolio; estética atmosférica inmersiva; las cuatro funciones (mi ubicación al entrar, buscador con estaciones reales, previsión, mapa con capa AQI); escritorio primero (responsive); interfaz en inglés; enfoque Vite + Tailwind con despliegue por GitHub Actions; las 4 pantallas de Stitch de §4 como referencia visual.

### Criterios de éxito

1. Al abrir `https://kenserikawa.github.io/airQuality/` se muestra, sin interacción, el AQI de la estación más cercana (o por IP si no hay permiso de ubicación), con el cielo de su categoría.
2. Buscar "madr" lista estaciones reales con su AQI; elegir una cambia cielo y datos con transición y actualiza la URL (`?station=<uid>`), que es compartible y funciona con Atrás/Adelante.
3. Debajo del hero: previsión (6 días), contaminantes, tiempo, mapa con capa AQI y escala explicada.
4. Cada estado tiene su pantalla: localizando, cargando, sin conexión, sin lectura, ubicación no disponible.
5. Visualmente coincide con las referencias de Stitch (§4) en escritorio y se adapta a móvil.
6. `npm test` pasa; el workflow de Actions publica solo si los tests pasan.
7. Consola sin errores y sin 404 en la web publicada.

## 2. Datos reales disponibles (y solo esos)

La interfaz muestra **exclusivamente** datos que la API de WAQI devuelve. Nada de tendencias horarias, punto de rocío, sensación térmica, múltiplos de la OMS ni concentraciones en µg/m³ (Stitch los inventó; se descartan).

Verificado el 2026-10-12 con el token del proyecto (todas las respuestas llevan `access-control-allow-origin: *`):

| Endpoint | Uso | Forma relevante |
|---|---|---|
| `GET /feed/@{uid}/?token=` | Ficha de una estación | `data.aqi` (número o `"-"`), `data.idx` (uid), `data.city.name`, `data.city.geo [lat,lng]`, `data.time.iso` (ISO con zona, p. ej. `2026-10-10T02:00:00+02:00`), `data.dominentpol` (`pm25`…), `data.iaqi.{pm25,pm10,o3,no2,so2,co,t,h,w,p}.v`, `data.forecast.daily.{pm25,pm10,o3}[] {day, avg, min, max}` (**incluye días pasados**), `data.attributions[] {name, url}` |
| `GET /feed/here/?token=` | Ubicación por IP | Igual que `/feed/@uid` |
| `GET /search/?keyword={q}&token=` | Buscador | `data[] {uid, aqi (string, puede ser "-"), station {name, geo, country}, time {stime, tz}}` |
| `GET /map/bounds/?latlng={lat1},{lng1},{lat2},{lng2}&networks=all&token=` | Estación más cercana a unas coordenadas | `data[] {uid, lat, lon, aqi (string, puede ser "-"), station {name, time}}` |
| `https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=` | Capa de color AQI del mapa | PNG 256 px |

**No usar `/feed/geo:lat;lng/`:** para el centro de Madrid (40.42, -3.70) devuelve "Bailen, Spain" (≈300 km). La estación más cercana se calcula con `/map/bounds/` (§5.3).

Los valores de `iaqi` de contaminantes son **sub-índices AQI**, no concentraciones: se etiquetan "AQI sub-index", sin unidades. Unidades meteo: `t` °C, `h` %, `w` m/s, `p` hPa.

Token: `f97650a3d94724f1ff358b1d74ea439ade569714` (público desde el origen del proyecto; riesgo aceptado). Se define en un único módulo de configuración.

## 3. Experiencia

Una sola página. Estructura vertical: **cabecera fija → hero (primer viewport) → secciones al hacer scroll → pie**.

### 3.1 Cabecera (fija)

Logo cuadrado con glifo de viento + "AirQuality" (izquierda) · cápsula de búsqueda de cristal centrada "Search any city or station" con atajo `⌘K` visible · píldora de cristal "Use my location" (derecha). Sin menú de navegación.

### 3.2 Hero

- Píldora "AIR QUALITY INDEX".
- Número AQI enorme (Sora fina) con animación de conteo al cargar o cambiar de estación.
- Categoría ("Good") con punto de color y debajo "AQI RANGE (0–50)".
- Chips: "{nombre} · Updated {hace X}" y "Dominant: {PM2.5|PM10|O3|NO2|SO2|CO}" (este chip se omite si no hay `dominentpol`).
- Caja de mensaje: implicación para la salud + línea con icono con la recomendación de la categoría.
- Barra de escala AQI (6 segmentos) con marcador en el valor.
- Tarjeta de cristal "Right now" (derecha): 2×2 Temperature / Humidity / Wind / Pressure; cada casilla se omite si falta el dato; si faltan todas, la tarjeta no se pinta.
- Pista de scroll "Forecast, pollutants & map" con chevrón.
- Dato antiguo: si `time.iso` tiene más de 24 h, el chip dice "Last reading {hace X}" con un icono de reloj y tono atenuado.

### 3.3 Buscador

- Combobox accesible (patrón ARIA 1.2: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, lista `role="listbox"`).
- Foco con clic, `⌘K`/`Ctrl+K` o `/`.
- Al escribir ≥ 2 caracteres: espera 300 ms sin teclear → `/search`; cancela la petición anterior (AbortController); una respuesta antigua nunca sustituye a una más reciente.
- Desplegable de cristal: primera fila fija "Use my current location · Find the nearest station" (badge "NEAR YOU"); separador "MATCHING STATIONS (n)"; filas con chip AQI coloreado (gris y "–" si `"-"`), nombre principal (texto antes de la primera coma) y resto en tono secundario, categoría a la derecha ("Offline" si no hay lectura); máximo 8 resultados.
- Teclado: ↑/↓ mueve la opción activa (con vuelta), Enter elige, Esc cierra y devuelve el foco, Tab cierra. Pie con la ayuda de teclas.
- Sin resultados: fila "No stations found for “{q}”". Error de red: fila "Search is unavailable right now".
- Al elegir: cierra, limpia el campo, carga la estación (§5.4) y hace `pushState` con `?station=<uid>`.

### 3.4 Secciones bajo el hero (tarjetas de cristal, contenedor 1200 px)

1. **Forecast · next 6 days** — subtítulo "Daily average with min–max range"; pestañas PM2.5 / PM10 / O3 (solo las que tengan datos; la sección se omite si no hay ninguna). Por día (desde hoy, máx. 6): valor medio y su categoría arriba, barra vertical redondeada de min a max con punto en la media, coloreada por categoría; etiqueta "Sat 11" abajo.
2. **Pollutants** — rejilla 3×2 de los contaminantes presentes, en orden PM2.5, PM10, O3, NO2, SO2, CO: nombre legible ("Fine particles", "Coarse particles", "Ozone", "Nitrogen dioxide", "Sulphur dioxide", "Carbon monoxide") + código, chip de categoría, valor grande, "AQI sub-index" y barra de escala con la posición del valor. Se omite si no hay ninguno.
3. **Weather** — mismas cuatro magnitudes que "Right now" en 2×2. Se omite si no hay ninguna.
4. **Nearby stations** — subtítulo "Colored by current AQI"; mapa Leaflet de ~360 px de alto: base oscura + capa de teselas AQI de WAQI + marcador de la estación con etiqueta "{nombre} · {aqi}"; zoom 11; sin zoom con la rueda; controles +/−. Se carga al acercarse al viewport. Se omite si no hay coordenadas válidas.
5. **What does {aqi} mean?** — subtítulo "US EPA Air Quality Index"; barra de 6 segmentos con marcador; 6 casillas con nombre y rango, la actual resaltada; caja con el nombre de la categoría y su implicación para la salud. Con AQI sin lectura: "What does the AQI mean?" sin marcador.

### 3.5 Pie

Una línea: "Data: World Air Quality Index Project · aqicn.org" + atribuciones de la estación (`data.attributions[].name` enlazadas a su `url` si es http(s), sin duplicados) a la izquierda; "AirQuality · GitHub" (enlace al repo) a la derecha. Incluye también la atribución de la base cartográfica.

### 3.6 Estados

| Estado | Qué se ve |
|---|---|
| `locating` | Cielo neutro; hero con "Finding the air around you…" y pulso suave; buscador operativo |
| `loading` (al cambiar de estación) | El hero conserva la estación anterior atenuada; esqueletos con brillo en las secciones |
| `ready` | Todo lo anterior |
| `no-reading` (`aqi` = `"-"`) | Cielo neutro, número "–", "No current reading", sin escala ni mensaje de salud; el resto de secciones con lo que haya |
| `offline` (red/timeout) | Cielo neutro; "Can't reach the air quality service" + "Check your connection and try again." + botón **Retry** (repite la última acción) |
| `not-found` (`status: "error"` de la API) | Cielo neutro; "We couldn't find air data for that station" + sugerencia de buscar otra |
| `unlocated` (sin geolocalización ni IP) | Cielo neutro; "Search for a city to get started" con el buscador resaltado |

### 3.7 Accesibilidad y movimiento

- `prefers-reduced-motion: reduce` → sin partículas, sin conteo animado (valor directo), transiciones de cielo instantáneas.
- Contraste (WCAG AA, ≥ 4,5:1): todo el texto es blanco. El cielo es fijo (ocupa el viewport y el contenido se desplaza por encima). El texto que va directamente sobre el cielo (hero) solo ocupa las zonas superior y media, que cumplen 4,5:1 con blanco. Cualquier texto que pueda pasar por encima del horizonte (todas las tarjetas, píldoras y la pista de scroll) va sobre cristal oscuro (§4.1), que cumple 4,5:1 incluso sobre el horizonte más claro. Ambas cosas se validan con tests (§7.1).
- Región `aria-live="polite"` que anuncia "Air quality in {nombre}: {aqi}, {categoría}".
- Navegación completa con teclado; foco visible en todos los controles.
- `<html lang="en">`; `<title>` "AirQuality — Air quality near you" (actualizado a "{aqi} {categoría} · {nombre} — AirQuality" con datos).

### 3.8 Responsive

Escritorio primero (referencias a 1280–1440 px). Por debajo de 1024 px: una columna; número AQI ~120 px; "Right now" bajo el hero; buscador a todo el ancho bajo el logo; botón de ubicación solo con icono; rejilla de contaminantes 2×3; previsión con desplazamiento horizontal si no cabe. Sin scroll horizontal de página a 360 px.

## 4. Referencias visuales (Stitch)

Guardadas en `design/stitch/` (JPG 1280 px + HTML exportado con Tailwind como referencia de clases; no se publica):

| Fichero | Pantalla Stitch | Uso |
|---|---|---|
| `good-hero.jpg/.html` | Good Hero (AQI 42) — `ba63307e11be4351af53c9a7a427b875` | **Referencia principal del hero y la cabecera** |
| `unhealthy-hero.jpg/.html` | Unhealthy Hero (AQI 168) — `e9e2d5cb86d7441f8f9403075233ed93` | Solo color y ambiente de una categoría mala. Su export es anterior a la edición: ignorar tendencia de 6 h, "Heat index", "Dew point", "33.6× WHO", "µg/m³" y badges "Live"; el layout correcto es el de `good-hero` |
| `search-open.jpg/.html` | Search Open Hero View (Moderate 64) — `a266bcf27c8c4e0b900d5a70274c8b7b` | Buscador abierto y desplegable |
| `details.jpg/.html` | Below the Fold Scrolled View (Updated) — `1bf631a85cd34a0a8a1fc967a8fc6342` | Estructura de las secciones. Ignorar el gris de la mitad superior (el cielo continúa oscuro arriba) y el mapa ilustrado (será Leaflet real) |

El `<title>` de `good-hero.html` aún dice "Aether AQI": no usar.

### 4.1 Tokens

- **Fuentes:** Sora (titulares y número; número en peso 200–300, `letter-spacing: -0.055em`, `tabular-nums`) y Manrope (texto y etiquetas; etiquetas en mayúsculas con `+0.08em`).
- **Cristal oscuro** (tarjetas, píldoras, desplegable, pista de scroll): fondo `rgba(6,14,32,0.55)`, `backdrop-filter: blur(28px)` (píldoras 24 px), borde `1px rgba(255,255,255,0.18)`, sombra `0 20px 50px rgba(7,30,39,0.25)` + `inset 0 1px 0 rgba(255,255,255,0.22)`, radio 24 px (píldoras: completo). Es más oscuro que el `rgba(255,255,255,0.08)` de Stitch porque, con cielo fijo, las tarjetas pasan sobre horizontes claros: con `#060E20` al 55 % el texto blanco alcanza ≥ 4,5:1 sobre todos los horizontes (el mínimo calculado es 0,52, en Moderate).
- **Cielos** (arriba → medio → horizonte) y **acentos** por categoría. Las zonas medias de Good, Moderate y USG están oscurecidas respecto a la propuesta inicial (mismo tono) para que el texto blanco del hero alcance 4,5:1:

| Categoría | Rango | Cielo | Acento |
|---|---|---|---|
| Neutral (localizando / sin lectura / error) | — | `#0F172A → #334155 → #94A3B8` | `#94A3B8` |
| Good | 0–50 | `#0B3D4F → #1E846C → #9BE7C4` | `#449A66` |
| Moderate | 51–100 | `#3B3A1E → #8F731C → #F6E7A1` | `#E2B33C` |
| Unhealthy for Sensitive Groups | 101–150 | `#4A2511 → #B1611C → #F9C784` | `#F99932` |
| Unhealthy | 151–200 | `#3D0E12 → #C0392B → #F28B82` | `#CE3B34` |
| Very Unhealthy | 201–300 | `#1E0B33 → #6A3FA0 → #C3A6E8` | `#6A4299` |
| Hazardous | 301+ | `#1A0606 → #6B1D1D → #B5654A` | `#7F2223` |

  El degradado pone las paradas en 0 % / 70 % / 100 % de la altura del viewport. Todo texto que vaya directamente sobre el cielo (número, categoría, rango, etiquetas de la escala) queda en el 70 % superior: ahí el color es una mezcla de las paradas superior y media, y como ambas cumplen 4,5:1 con blanco, la mezcla también (pasar de sRGB a luminancia es convexo, así que la mezcla nunca es más clara que la más clara de las dos).
- **Movimiento:** cielo con fundido de 1,2 s entre categorías; partículas lentas (deriva de 18–22 s); pista de scroll flotante de 2,4 s.

### 4.2 Textos por categoría

Implicación para la salud (de aqicn.org, como en la réplica) y recomendación corta:

| Categoría | Implicación | Recomendación (línea con icono) |
|---|---|---|
| Good | Air quality is satisfactory, and air pollution poses little or no risk. | Great day to be outside. |
| Moderate | Air quality is acceptable; however, some pollutants may be a moderate concern for a very small number of unusually sensitive people. | Unusually sensitive people should consider limiting prolonged outdoor exertion. |
| Unhealthy for Sensitive Groups | Members of sensitive groups may experience health effects. The general public is not likely to be affected. | Children, older adults and people with lung disease should limit prolonged outdoor exertion. |
| Unhealthy | Everyone may begin to experience health effects; sensitive groups may experience more serious effects. | Avoid prolonged outdoor exertion. Consider a mask outdoors. |
| Very Unhealthy | Health alert: the risk of health effects is increased for everyone. | Avoid outdoor exertion. Keep windows closed. |
| Hazardous | Health warning of emergency conditions: everyone is more likely to be affected. | Stay indoors and avoid all physical activity outdoors. |

## 5. Arquitectura

### 5.1 Ubicación y herramientas

- Proyecto Vite en **`web/`** (separado de la app Symfony de la raíz, que no se toca).
- Dependencias: `vite` 8, `tailwindcss` 4 + `@tailwindcss/vite`, `leaflet` 1.9.4, `@fontsource/sora`, `@fontsource/manrope`; dev: `vitest` 5, `jsdom`. Versiones exactas fijadas en `web/package-lock.json`; al instalar, elegir en cada major la última versión publicada hace ≥ 14 días.
- Node ≥ 22.12 (hay 22.13.1).
- `vite.config.js`: `base: '/airQuality/'`, plugin de Tailwind, Vitest con entorno `jsdom` para `tests/ui/**`.
- Iconos: ~10 SVG inline copiados de Lucide (ISC), en `src/ui/icons.js`. Sin fuente de Material Symbols.
- Base cartográfica oscura: CARTO `dark_all` (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) con atribución "© OpenStreetMap contributors © CARTO"; encima, teselas AQI de WAQI con opacidad ~0,8.

### 5.2 Módulos (`web/src/`)

| Módulo | Responsabilidad | Interfaz |
|---|---|---|
| `config.js` | Token y URLs base | `WAQI_TOKEN`, `WAQI_API`, `WAQI_TILES` |
| `lib/aqi.js` | Lógica pura: categorías (incl. neutral), cielos, acentos, textos (§4.2), contaminantes legibles, meteo con unidades, previsión filtrada, tiempo relativo, contraste WCAG | `getCategory(aqi)`, `NEUTRAL`, `CATEGORIES`, `pickPollutants(iaqi)`, `pickWeather(iaqi)`, `forecastDays(daily, key, today)`, `relativeTime(iso, now)`, `isStale(iso, now)`, `contrastRatio(hexA, hexB)`, `blend(hexBase, hexOver, alpha)`, `splitStationName(name)` |
| `lib/waqi.js` | Cliente HTTP; timeout 10 s (`AbortSignal.timeout`) combinado con la señal del llamador; normaliza respuestas; distingue errores | `fetchStation(uid)`, `fetchHere()`, `searchStations(q, {signal})`, `findNearestStation(lat, lng)`; errores tipados `OfflineError`, `NotFoundError` |
| `lib/location.js` | Geolocalización (timeout 8 s, `maximumAge` 10 min) → `findNearestStation`; si falla → `fetchHere()`; si falla → `unlocated` | `locate()` → `{ station }` o lanza `UnlocatedError` |
| `lib/url-state.js` | `?station=<uid>` | `readStationId()`, `pushStationId(uid)`, `onStationIdChange(cb)` |
| `lib/store.js` | Estado único y suscripción | `createStore(initial)` → `{ get, set, subscribe }` |
| `ui/sky.js` | Variables CSS del degradado y tono de texto por categoría, con transición | `applySky(category)` |
| `ui/particles.js` | Canvas de partículas; densidad según PM2.5; pausa con pestaña oculta; desactivado con reduced-motion | `startParticles(canvas)`, `setDensity(pm25)` |
| `ui/search.js` | Combobox §3.3 | `mountSearch(root, { onSelect, onUseLocation })` |
| `ui/hero.js` | Hero + "Right now" + conteo | `renderHero(root, state)` |
| `ui/forecast.js`, `ui/pollutants.js`, `ui/weather.js`, `ui/scale.js`, `ui/footer.js` | Secciones §3.4–3.5 | `render*(root, feed)` |
| `ui/map.js` | Leaflet bajo demanda (`import()` al entrar en viewport con IntersectionObserver) | `mountMap(root, { geo, label, aqi })` |
| `ui/states.js` | Esqueletos y mensajes §3.6 | `renderState(root, status, { onRetry })` |
| `ui/dom.js` | Helper `el()` que añade hijos string como texto | `el(tag, attrs, ...children)` |
| `main.js` | Arranque y orquestación | — |

`lib/*` no toca el DOM; `ui/*` no hace peticiones.

### 5.3 Estación más cercana

`findNearestStation(lat, lng)`: pide `/map/bounds/` con un recuadro de ±0,25°; descarta estaciones con `aqi` no numérico; elige la de menor distancia (haversine); si no hay ninguna, repite con ±1°; si sigue sin haber, lanza `NotFoundError` (y `locate()` pasa a `fetchHere()`). Después carga `fetchStation(uid)`.

### 5.4 Flujo

1. Arranque: si la URL trae `?station=<uid>` válido → `loading` → `fetchStation(uid)`. Si no → `locating` → `locate()`.
2. Resultado → `ready` o `no-reading`; aplica cielo, partículas, hero, secciones, título y anuncio `aria-live`.
3. Buscador → `onSelect(uid)` → `loading` → `fetchStation` → `pushStationId`.
4. "Use my location" (cabecera o buscador) → `locating` → `locate()` → `pushStationId`.
5. Atrás/Adelante → `onStationIdChange` → carga sin `pushState`.
6. Errores → estado correspondiente (§3.6); Retry repite la última acción.

### 5.5 Seguridad

Datos externos solo como texto (`textContent`/hijos string de `el()`); `href` solo si `^https?://`. El token es público por diseño.

## 6. Despliegue

- Workflow `.github/workflows/pages.yml`: en push a `master` (y manual): checkout → setup-node 22 con caché npm → `npm ci` → `npm test` → `npm run build` (en `web/`) → `upload-pages-artifact` con `web/dist` → `deploy-pages`. Permisos `pages: write`, `id-token: write`; `concurrency: pages`.
- **Usuario, una vez:** Settings → Pages → Source: **GitHub Actions**.
- Tras verificar la web nueva en vivo: borrar `docs/`, `tests/js/` y `scripts/build-cities.py` (ya no se usan) y actualizar el README (demo, desarrollo con `npm run dev`, tests, despliegue).
- `git push` solo con confirmación del usuario.

## 7. Tests y verificación

### 7.1 Unitarios (Vitest, `web/tests/lib/`)

- `aqi`: límites 0/50/51/100/101/150/151/200/201/300/301/500; `"-"`, `""`, `null`, `NaN` → neutral; textos §4.2; `pickPollutants` (orden, nombres, solo presentes, 0 cuenta); `pickWeather` (unidades, solo presentes); `forecastDays` (filtra días anteriores a hoy, máx. 6, orden); `relativeTime` ("just now", "5 minutes ago", "2 hours ago", "2 days ago"); `isStale` (> 24 h); `splitStationName`; **contraste**: para cada uno de los 7 cielos, `contrastRatio('#FFFFFF', top) ≥ 4.5`, `contrastRatio('#FFFFFF', middle) ≥ 4.5` y `contrastRatio('#FFFFFF', blend(horizon, '#060E20', 0.55)) ≥ 4.5` (con `blend` exportado por `lib/aqi.js`).
- `waqi` (`fetch` simulado en la frontera): normalización de cada endpoint; `aqi` string → número o `null`; `status: "error"` → `NotFoundError`; red/timeout → `OfflineError`; cancelación por señal; `findNearestStation` (elige la más cercana con lectura, ignora `"-"`, amplía a ±1°, lanza si no hay).
- `location` (`navigator.geolocation` simulado): concedido → estación cercana; denegado → IP; sin respuesta en 8 s → IP; IP falla → `UnlocatedError`.
- `url-state`: lectura, escritura y `popstate`; uid no numérico se ignora.

### 7.2 UI (Vitest + jsdom, `web/tests/ui/`)

- `search`: no busca con < 2 caracteres; espera 300 ms; ↑/↓/Enter/Esc/Tab; ARIA (`aria-expanded`, `aria-activedescendant`, `role`s); primera opción "Use my location"; respuesta antigua descartada; "No stations found"; error de red.
- `hero`: cada categoría pinta número, nombre, rango y textos; chip "Dominant" omitido si falta; dato antiguo → "Last reading"; casillas de "Right now" omitidas si faltan.
- `states`: cada estado de §3.6 con su texto y Retry que invoca el callback.
- Seguridad: nombre de estación `<img src=x onerror=alert(1)>` aparece como texto y no crea `<img>`.

### 7.3 Navegador

`npm run build && npm run preview` bajo `/airQuality/`, Chrome headless propio (perfil aislado) con página harness del mismo origen:
- Capturas a 1440×900 de: Good (Madrid), una categoría mala, buscador abierto, secciones; comparación lado a lado con `design/stitch/*.jpg`.
- Captura a 390×844 (móvil) sin scroll horizontal.
- Consola sin errores; sin 404; Leaflet no se descarga hasta llegar al mapa; `?station=` funciona y Atrás restaura.
- Geolocalización simulada (permiso concedido con coordenadas de Madrid) → estación "Madrid" o una de sus barrios.

### 7.4 En vivo

Tras el despliegue por Actions, repetir 7.3 contra la URL pública.

## 8. Riesgos

- **Generaciones de Stitch inconsistentes:** las referencias son guía visual; la spec manda en datos y comportamiento.
- **Tiles de CARTO y WAQI:** dependencias externas con políticas de uso; tráfico de demo bajo, atribución incluida.
- **Cambio del origen de Pages:** hasta que el usuario cambie a "GitHub Actions", Pages seguirá sirviendo `docs/`; por eso `docs/` se borra solo después de verificar la nueva web.
- **Token público:** si se abusa, cambiarlo en `config.js`.
- **Datos antiguos de estaciones:** se señalan como "Last reading" (§3.2).

## 9. Fuera de alcance

Diseño móvil propio en Stitch (solo responsive), modo claro, selector de idioma, favoritos/historial, comparar ciudades, datos históricos (la API no los ofrece), PWA/offline, cambios en la app Symfony.
