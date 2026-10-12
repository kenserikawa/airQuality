// Mapa (spec §3.4.4): Leaflet bajo demanda, base de OpenStreetMap oscurecida con CSS + capa AQI de WAQI y marcador.
import { getCategory } from '../lib/aqi.js';
import { WAQI_TILES } from '../config.js';
import { el } from './dom.js';
import { sectionHeader, showSection } from './section.js';

const ZOOM = 11;
// CARTO dark_all ahora exige clave; las teselas estándar de OSM se oscurecen con .basemap-dark (styles.css).
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const WAQI_ATTRIBUTION = 'Air quality &copy; <a href="https://aqicn.org/">aqicn.org</a>';

function isValidGeo(geo) {
    return Number.isFinite(geo?.lat) && Number.isFinite(geo?.lng);
}

// Leaflet trata los strings de los tooltips como HTML: se pasa un nodo para que el nombre de la estación sea texto.
function tooltipContent({ label, aqi }) {
    return el('span', {}, `${label} · ${aqi ?? '–'}`);
}

function observeVisibility(element, callback) {
    if (typeof IntersectionObserver !== 'function') {
        callback();
        return () => {};
    }
    const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            callback();
        }
    }, { rootMargin: '300px' });
    observer.observe(element);
    return () => observer.disconnect();
}

export function mountMap(root, { geo, label, aqi, loadLeaflet = () => import('leaflet'), observe = observeVisibility }) {
    let current = { geo, label, aqi };
    let map = null;
    let marker = null;
    let loading = false;
    let seen = false;

    const canvas = el('div', { class: 'mt-6 h-[360px] overflow-hidden rounded-2xl', 'aria-label': 'Map of nearby air quality stations', role: 'region' });
    showSection(root, sectionHeader('map-title', 'map', 'Nearby stations', 'Colored by current AQI'), canvas);

    function style() {
        const color = getCategory(current.aqi).accent;
        return { radius: 10, color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1 };
    }

    async function create() {
        if (map || loading || !isValidGeo(current.geo)) {
            return;
        }
        loading = true;
        const module = await loadLeaflet();
        const L = module.default ?? module;
        const center = [current.geo.lat, current.geo.lng];
        map = L.map(canvas, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(center, ZOOM);
        L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19, className: 'basemap-dark' }).addTo(map);
        L.tileLayer(WAQI_TILES, { attribution: WAQI_ATTRIBUTION, opacity: 0.8, maxZoom: 19 }).addTo(map);
        marker = L.circleMarker(center, style())
            .addTo(map)
            .bindTooltip(tooltipContent(current), { permanent: true, direction: 'top', offset: [0, -12], className: 'station-label' });
        loading = false;
    }

    function apply(next) {
        current = next;
        if (!isValidGeo(current.geo)) {
            root.hidden = true;
            return;
        }
        root.hidden = false;
        if (!map && seen) {
            create();
        }
        if (map) {
            const center = [current.geo.lat, current.geo.lng];
            map.setView(center, ZOOM);
            map.invalidateSize?.();
            marker.setLatLng(center);
            marker.setStyle(style());
            marker.setTooltipContent(tooltipContent(current));
        }
    }

    apply(current);
    const stopObserving = observe(canvas, () => {
        seen = true;
        return create();
    });

    return {
        update: apply,
        destroy() {
            stopObserving?.();
            map?.remove();
        },
    };
}
