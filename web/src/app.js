// Orquestación (spec §5.4): estado de la app, carga de estaciones, ubicación, historial y vistas.
import { NEUTRAL, getCategory } from './lib/aqi.js';
import { NotFoundError, fetchStation as realFetchStation } from './lib/waqi.js';
import { locate as realLocate } from './lib/location.js';
import * as urlState from './lib/url-state.js';
import { applySky } from './ui/sky.js';
import { startParticles as realStartParticles } from './ui/particles.js';
import { icon } from './ui/icons.js';
import { renderHero } from './ui/hero.js';
import { renderSkeleton, renderState } from './ui/states.js';
import { mountSearch as realMountSearch } from './ui/search.js';
import { renderForecast } from './ui/forecast.js';
import { renderPollutants } from './ui/pollutants.js';
import { renderWeather } from './ui/weather.js';
import { renderScale } from './ui/scale.js';
import { renderFooter } from './ui/footer.js';
import { mountMap as realMountMap } from './ui/map.js';
import { hideSection } from './ui/section.js';

const STATE_TITLES = {
    offline: "Can't reach the air quality service",
    'not-found': "We couldn't find air data for that station",
    unlocated: 'Search for a city to get started',
};
const DEFAULT_TITLE = 'AirQuality — Air quality near you';

function prefersReducedMotion() {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function startApp({
    now = () => new Date(),
    reducedMotion = prefersReducedMotion(),
    fetchStation = realFetchStation,
    locate = realLocate,
    readStationId = urlState.readStationId,
    pushStationId = urlState.pushStationId,
    replaceStationId = urlState.replaceStationId,
    onStationIdChange = urlState.onStationIdChange,
    mountSearch = realMountSearch,
    mountMap = realMountMap,
    startParticles = realStartParticles,
} = {}) {
    const $ = (id) => document.getElementById(id);
    const hero = $('hero');
    const sections = { forecast: $('forecast'), pollutants: $('pollutants'), weather: $('weather'), scale: $('scale') };
    const mapRoot = $('map');
    const footer = $('footer');
    const announcer = $('announcer');
    const searchRoot = $('search');
    const locateButton = $('locate');

    let current = null;
    let request = 0;
    let lastAction = () => {};
    let map = null;

    $('logo-mark')?.replaceChildren(icon('wind', { size: 20 }));
    locateButton.prepend(icon('navigation', { size: 16 }));
    const particles = startParticles($('particles'), { reducedMotion });
    applySky(NEUTRAL);
    renderFooter(footer, null);

    function announce(text) {
        announcer.textContent = text;
    }

    function setThemeColor(color) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    }

    function hideData() {
        Object.values(sections).forEach(hideSection);
        mapRoot.hidden = true;
    }

    function showStation(station) {
        current = station;
        const category = getCategory(station.aqi);
        hero.classList.remove('dimmed');
        hero.removeAttribute('aria-busy');
        searchRoot.removeAttribute('data-highlight');
        applySky(category);
        setThemeColor(category.sky[0]);
        particles.setDensity(station.iaqi?.pm25?.v ?? 0);
        renderHero(hero, { station, now: now(), reducedMotion });
        renderForecast(sections.forecast, station);
        renderPollutants(sections.pollutants, station);
        renderWeather(sections.weather, station);
        renderScale(sections.scale, station);
        const mapData = { geo: station.geo, label: station.name, aqi: station.aqi };
        if (map) {
            map.update(mapData);
        } else {
            map = mountMap(mapRoot, mapData);
        }
        renderFooter(footer, station);
        if (station.aqi === null) {
            document.title = `${station.name} — AirQuality`;
            announce(`Air quality in ${station.name}: no current reading`);
        } else {
            document.title = `${station.aqi} ${category.label} · ${station.name} — AirQuality`;
            announce(`Air quality in ${station.name}: ${station.aqi}, ${category.label}`);
        }
    }

    function showProblem(status) {
        current = null;
        hero.classList.remove('dimmed');
        hero.removeAttribute('aria-busy');
        applySky(NEUTRAL);
        setThemeColor(NEUTRAL.sky[0]);
        particles.setDensity(0);
        hideData();
        renderFooter(footer, null);
        renderState(hero, status, { onRetry: () => lastAction() });
        if (status === 'unlocated') {
            searchRoot.setAttribute('data-highlight', 'true');
        }
        document.title = DEFAULT_TITLE;
        announce(STATE_TITLES[status]);
    }

    function startLoading() {
        if (current) {
            hero.classList.add('dimmed');
            hero.setAttribute('aria-busy', 'true');
            Object.values(sections).filter((section) => !section.hidden).forEach(renderSkeleton);
        } else {
            renderSkeleton(hero);
        }
    }

    async function loadStation(uid, { history = 'none' } = {}) {
        const id = ++request;
        lastAction = () => loadStation(uid, { history });
        startLoading();
        try {
            const station = await fetchStation(uid);
            if (id !== request) {
                return;
            }
            showStation(station);
            if (history === 'push') pushStationId(station.uid);
            if (history === 'replace') replaceStationId(station.uid);
        } catch (error) {
            if (id === request) {
                showProblem(error instanceof NotFoundError ? 'not-found' : 'offline');
            }
        }
    }

    async function useLocation({ history = 'push' } = {}) {
        const id = ++request;
        lastAction = () => useLocation({ history });
        current = null;
        applySky(NEUTRAL);
        renderState(hero, 'locating');
        announce('Finding the air around you…');
        try {
            const station = await locate();
            if (id !== request) {
                return;
            }
            showStation(station);
            if (history === 'push') pushStationId(station.uid);
            if (history === 'replace') replaceStationId(station.uid);
        } catch {
            if (id === request) {
                showProblem('unlocated');
            }
        }
    }

    mountSearch(searchRoot, {
        onSelect: (uid) => loadStation(uid, { history: 'push' }),
        onUseLocation: () => useLocation({ history: 'push' }),
    });
    locateButton.addEventListener('click', () => useLocation({ history: 'push' }));
    onStationIdChange((uid) => (uid === null ? useLocation({ history: 'none' }) : loadStation(uid)));

    const initial = readStationId();
    if (initial === null) {
        useLocation({ history: 'replace' });
    } else {
        loadStation(initial, { history: 'replace' });
    }
}
