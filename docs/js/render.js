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
