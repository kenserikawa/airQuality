# Réplica estática de AirQuality para GitHub Pages — Diseño

- **Fecha:** 2026-10-12
- **Estado:** pendiente de revisión
- **Repo:** `kenserikawa/airQuality` (rama `master`)
- **URL objetivo:** https://kenserikawa.github.io/airQuality/

## 1. Contexto

AirQuality es una app Symfony 5 + Twig con dos rutas:

| Ruta | Controlador | Qué hace |
|---|---|---|
| `GET /` | `GetAirQualityIndexController` | Portada: animación de nubes en canvas, ilustración, textos y buscador con `<datalist>` de ciudades leídas de `public/files/world_cities.csv`. |
| `POST /search` | `GetCityAirQualityController` | Llama en servidor a `https://api.waqi.info/feed/{city}/?token=…` y pinta AQI, categoría, partículas, meteo, enlace a la fuente y un mapa de Google Maps. Si la API devuelve `status: "error"`, pinta un bloque de error. |

GitHub Pages ya está activo sirviendo la raíz de `master`, pero el `index.html` raíz redirige a `public/index.html`, que no existe: hoy la web acaba en 404.

Hechos verificados:

- `api.waqi.info` responde con `access-control-allow-origin: *` → se puede llamar desde el navegador.
- Bootstrap 4.5.0 en jsDelivr tiene el mismo hash SRI que en StackPath (CDN original, ya heredado).
- Todos los CDN que se usarán responden 200 (Bootstrap 4.5.0, jQuery 3.5.1, Animate.css 4.1.1, Font Awesome 5.14.0, Leaflet 1.9.4).
- El CSV tiene 15.493 filas de datos, 13.504 nombres únicos; como JSON ordenado ocupa ~176 KB.
- Node disponible: v22.13.1 (detecta sintaxis ESM en `.js` sin configuración).

## 2. Objetivo y criterios de éxito

Publicar en GitHub Pages una réplica 100 % estática (sin backend) del sitio, con el mismo aspecto, textos y comportamiento, corrigiendo solo fallos visibles.

Éxito cuando:

1. `https://kenserikawa.github.io/airQuality/` muestra la portada con la animación y el autocompletado de ciudades.
2. Buscar una ciudad (p. ej. "Madrid") muestra AQI, color, tabla de categoría, partículas, meteo, enlace a la fuente y mapa con marcador.
3. Buscar una ciudad inexistente muestra el bloque "That's bad!".
4. No hay errores en la consola del navegador.
5. `node --test tests/js/` pasa.
6. La app Symfony queda intacta.

## 3. Decisiones

| Tema | Decisión | Descartado |
|---|---|---|
| Ubicación | Carpeta `docs/` en `master`; Pages configurado como *Deploy from a branch* → `master` `/docs`. | Raíz del repo (mezcla con Symfony), GitHub Actions (innecesario sin build), rama `gh-pages` (mantenimiento separado). |
| Estructura | Dos páginas que replican las dos rutas: `index.html` y `search.html?city=X`. Formulario `GET`. | SPA con rutas hash; Alpine.js para plantillas. |
| Build | Ninguno. HTML + CSS + JS con módulos ES nativos. | Vite u otro bundler. |
| Mapa | Leaflet 1.9.4 (cdnjs) + teselas de OpenStreetMap. Sin clave. | Google Maps con la clave antigua, con clave nueva o vía iframe sin clave. |
| Fidelidad | Mismo diseño, textos, colores y librerías; se corrigen los fallos listados en §6. | Copia exacta con fallos; mejoras de UX. |
| Iconos | Font Awesome 5.14.0 desde cdnjs (misma versión que `public/css/all.css`). | Copiar `all.css` + ~2 MB de webfonts. |
| Ubicación de spec y plan | `superpowers/specs/` y `superpowers/plans/` en la raíz, para no publicarlos en Pages. | `docs/superpowers/…` (quedaría dentro del sitio publicado). |

## 4. Estructura de ficheros

```
docs/
├── .nojekyll                  # Pages sirve los ficheros tal cual, sin Jekyll
├── index.html                 # base.html.twig + index.html.twig
├── search.html                # base.html.twig + search.html.twig
├── css/styles.css             # copia de public/css/styles.css
├── images/cloud_data.svg      # copia de public/images/cloud_data.svg
├── data/cities.json           # array JSON de nombres únicos ordenados
└── js/
    ├── config.js              # export const WAQI_TOKEN
    ├── air-quality.js         # lógica pura (sin DOM), testeable con Node
    ├── render.js              # funciones DOM, una por macro Twig
    ├── cities.js              # carga data/cities.json y rellena <datalist id="cities_list">
    ├── canvas-animation.js    # copia literal de public/js/canvas-animation.js (script clásico)
    └── search-page.js         # punto de entrada de search.html
scripts/build-cities.py        # CSV → docs/data/cities.json (se ejecuta una vez; salida versionada)
tests/js/air-quality.test.mjs  # node --test, sin dependencias
```

Cambios fuera de `docs/`:

- Se **borra** `index.html` de la raíz (redirección rota, ya no se servirá).
- Se **actualiza** `README.md`: enlace a la demo y cómo servir `docs/` en local.
- No se tocan `src/`, `templates/`, `public/`, `config/`, `tests/Unit`, `tests/Functional`.

### Reglas comunes a ambas páginas

- Rutas relativas (`css/styles.css`, `js/…`, `data/…`), nunca absolutas, para funcionar bajo `/airQuality/`.
- `<title>AirQuality</title>` (el original lo dejaba vacío).
- `<head>`: Bootstrap 4.5.0 CSS (jsDelivr, SRI `sha384-9aIt2nRpC12Uk9gS9baDl411NQApFmC26EwAOH8WgZl5MYYxFfc+NcPb1dKGj7Sk`), Font Awesome 5.14.0, `css/styles.css`, Animate.css 4.1.1. Todos con `integrity` + `crossorigin="anonymous"`; los hashes que no estén en esta spec se calculan al implementar.
- Final del `<body>`: jQuery 3.5.1 y Bootstrap 4.5.0 JS (mismos SRI que `templates/base.html.twig`), luego los scripts propios.
- Canvas `#drawing-surface`, `<datalist id="cities_list">` vacío y footer "Powered by aqicn.org" idénticos al original.

## 5. Comportamiento

### 5.1 Portada (`docs/index.html`)

- Marcado idéntico a `index.html.twig` dentro del layout de `base.html.twig`, incluido el `<style>` que hace transparente el `input`.
- Formulario del buscador: `action="search.html" method="GET"`, input `name="city"` (antes `search`), `list="cities_list"`; botón con `fa-arrow-right`.
- Scripts: `js/canvas-animation.js` (clásico) y `js/cities.js` (módulo).

### 5.2 Autocompletado (`docs/js/cities.js`)

- `fetch('data/cities.json')` → por cada nombre, un `<option value="…">` añadido al `#cities_list` (vía `DocumentFragment`).
- Si falla la carga, no hace nada visible: el buscador funciona sin sugerencias.
- Se usa en ambas páginas.

### 5.3 Resultados (`docs/search.html` + `docs/js/search-page.js`)

`search.html` contiene el layout base, el navbar de `displayNavbar()` (marca "AirQuality" enlazando a `index.html` y el mismo formulario GET), un contenedor vacío para el resultado y el `<style>` que pone el `body` en blanco. Carga Leaflet CSS/JS desde cdnjs.

Flujo de `search-page.js`:

1. `city = new URLSearchParams(location.search).get('city')`, recortado. Si está vacío → `location.replace('index.html')`.
2. `fetch(buildFeedUrl(city, WAQI_TOKEN))` y `response.json()`.
3. Según el resultado:
   - `status === "ok"` → pinta, en este orden y con las mismas clases Bootstrap que `search.html.twig`:
     1. `renderMain` — caja con el AQI sobre su color, nombre de ciudad, `Updated at {time.s}`.
     2. `renderDescription` — tabla "Air Pollution Level / Health Implications / Cautionary Statement (for PM2.5)" con los textos de la categoría. No se pinta si el AQI no es numérico.
     3. `renderGases` — "Air particles": filas solo para los contaminantes presentes, en orden PM2.5, PM10, O3, NO2, SO2, CO.
     4. `renderWeather` — "Weather data": filas solo para los campos presentes: Pressure (`{p} hPa`), Temperature (`{t} ºC`), Air humidity (`{h}%`), Wind (`{w} km/h`). Si no hay ninguno, el bloque no se pinta.
     5. `renderSource` — "Source from: {city.url}" como enlace, solo si la URL empieza por `http://` o `https://`; si no, texto plano.
     6. Mapa: `div#map` (mismas clases que el original, con altura explícita para que Leaflet lo dibuje), `L.map` centrado en `city.geo` con zoom 13, teselas OSM con atribución, marcador con título "Your city". Si `geo` no son dos números finitos, no se pinta el mapa.
   - `status === "error"` → `renderError(data)`: bloque "That's bad!" con los mismos textos del original y `Message: {data}`.
   - Fallo de red, respuesta no JSON o forma inesperada → `renderError` con mensaje genérico ("Could not reach aqicn.org. Please try again later.").
4. Todo dato de la API se inserta con `textContent` o atributos asignados por propiedad; nunca con `innerHTML` sobre datos externos.

### 5.4 Lógica pura (`docs/js/air-quality.js`)

Exporta funciones sin dependencias de DOM:

- `getAqiCategory(aqi)` → `{ level, healthImplication, cautionaryStatement, color }` o `null` si `aqi` no es un número finito (p. ej. `"-"`, `undefined`). Acepta números y strings numéricos.

  Comparaciones con límite superior inclusivo: `aqi <= 50`, `<= 100`, `<= 150`, `<= 200`, `<= 300`, resto.

  | AQI | `level` | `color` |
  |---|---|---|
  | ≤ 50 | Good | `#449A66` |
  | 51–100 | Moderate | `#1DA488` |
  | 101–150 | Unhealthy for Sensitive Groups | `#F99932` |
  | 151–200 | Unhealthy | `#CE3B34` |
  | 201–300 | Very Unhealthy | `#6A4299` |
  | > 300 | Hazardous | `#7F2223` |

  Textos `healthImplication` / `cautionaryStatement`: literales de `search.html.twig`, sin cambios.
- `NEUTRAL_COLOR` = `#949494` (el gris `.silver` del CSS), usado por `renderMain` cuando `getAqiCategory` devuelve `null`.
- `buildFeedUrl(city, token)` → `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${encodeURIComponent(token)}`.
- `pickPollutants(iaqi)` → `[{ label, value }]` para las claves presentes con `.v` definido, en orden `pm25→"PM2.5"`, `pm10→"PM10"`, `o3→"O3"`, `no2→"NO2"`, `so2→"SO2"`, `co→"CO"`.
- `pickWeather(iaqi)` → `[{ label, value }]` con el valor ya formateado con su unidad, en orden `p→"Pressure"`, `t→"Temperature"`, `h→"Air humidity"`, `w→"Wind"`.
- `isSafeHttpUrl(url)` → `true` solo para strings que empiezan por `http://` o `https://`.

`iaqi` ausente o `null` → ambas `pick*` devuelven `[]`.

### 5.5 `cities.json` (`scripts/build-cities.py`)

- Lee `public/files/world_cities.csv` con el módulo `csv` (soporta comas entre comillas, p. ej. "Islamorada, Village of Islands"), descarta la cabecera, toma la columna `city`, elimina duplicados y ordena.
- Escribe `docs/data/cities.json` en UTF-8 (`ensure_ascii=False`), compacto.
- Uso: `python3 scripts/build-cities.py`.

## 6. Fallos del original que se corrigen

| # | Fallo | Corrección |
|---|---|---|
| 1 | AQI ≥ 500 sin color ni descripción. | Entra en "Hazardous". |
| 2 | Límites 100/150/200/300 caen en la categoría siguiente (`<` en vez de `<=`). | Rangos oficiales de aqicn.org (§5.4). |
| 3 | Bloque de meteo con valores vacíos si falta un campo. | Solo se pintan los campos presentes. |
| 4 | Etiquetas "03" y "PA". | "O3" y "hPa". |
| 5 | Ciudad sin codificar en la URL de la API. | `encodeURIComponent`. |
| 6 | `<div id="map">` mal cerrado (`<div>` en vez de `</div>`). | HTML bien formado. |
| 7 | La cabecera "city" del CSV aparece en el autocompletado; ~2.000 duplicados. | Se descarta la cabecera y se deduplica. |
| 8 | `<title>` vacío. | "AirQuality". |
| 9 | Error de red → 500. | Bloque de error con mensaje genérico. |
| 10 | AQI `"-"` sin tratar. | Se muestra "-" sobre gris neutro, sin tabla. |

## 7. Tests y verificación

### 7.1 Unitarios (`node --test tests/js/`)

Escritos antes de la implementación (TDD). Importan `../../docs/js/air-quality.js`.

- `getAqiCategory`: límites 0, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301, 500, 999; string numérico `"42"`; `"-"`, `undefined`, `null`, `NaN` → `null`.
- `buildFeedUrl`: "Madrid", "New York", "São Paulo", nombre con `/`.
- `pickPollutants` / `pickWeather`: todos los campos, algunos, ninguno, `iaqi` ausente; orden y etiquetas.
- `isSafeHttpUrl`: `https://…`, `http://…`, `javascript:…`, `""`, no-string.

### 7.2 Navegador (servidor local + Chrome DevTools)

- Servir el repo de forma que `docs/` quede bajo `/airQuality/` (p. ej. enlace simbólico en el scratchpad + `python3 -m http.server`), para cazar rutas absolutas.
- Portada: animación visible, `#cities_list` con ~13.500 opciones, sin errores de consola.
- `search.html?city=Madrid`: todos los bloques de §5.3 y el mapa con marcador.
- `search.html?city=zzzz-no-existe`: bloque "That's bad!".
- `search.html` sin parámetro: redirige a la portada.
- Comparación visual con la versión PHP **si** se puede arrancar en local; si no, se indica.

### 7.3 En vivo

Tras publicar, repetir 7.2 contra `https://kenserikawa.github.io/airQuality/`.

## 8. Despliegue

1. Commits en `master`, uno por bloque lógico.
2. `git push origin master` — con confirmación previa del usuario.
3. **Usuario:** GitHub → Settings → Pages → *Deploy from a branch* → `master` / `/docs`. (`gh` no está autenticado en la máquina; alternativa: `gh auth login` y configurarlo por API.)
4. Verificación en vivo (§7.3).

## 9. Riesgos

- **Token WAQI público:** queda en `docs/js/config.js`. Ya era público en el repo. Si se abusa, WAQI puede limitarlo; mitigación: pedir un token nuevo y sustituirlo en un único fichero.
- **Disponibilidad de CDN / teselas OSM:** dependencia externa, igual que el original con Bootstrap y Google.
- **Política de uso de teselas OSM:** tráfico bajo y atribución incluida; aceptable para una demo.

## 10. Fuera de alcance

Cambios en la app Symfony, arreglar los tests PHP existentes (ya rotos), ramas de dependabot, diseño responsive, estados de carga, i18n.
