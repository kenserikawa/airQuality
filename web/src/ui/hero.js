// Hero (spec §3.2): número AQI, categoría, chips, mensaje de salud, escala y tarjeta "Right now".
import { getCategory, isStale, pickWeather, pollutantLabel, relativeTime } from '../lib/aqi.js';
import { clear, el } from './dom.js';
import { icon } from './icons.js';
import { aqiScaleBar } from './scale-bar.js';

const WEATHER_ICONS = { t: 'thermometer', h: 'droplet', w: 'wind', p: 'gauge' };
const CALM_CATEGORIES = new Set(['good', 'moderate']);
const COUNT_DURATION_MS = 900;

function countUp(node, value, reducedMotion) {
    const from = Number(node.dataset.value) || 0;
    node.dataset.value = String(value);
    if (reducedMotion || typeof requestAnimationFrame !== 'function' || from === value) {
        node.textContent = String(value);
        return;
    }
    const start = performance.now();
    const tick = (time) => {
        const progress = Math.min((time - start) / COUNT_DURATION_MS, 1);
        const eased = 1 - (1 - progress) ** 3;
        node.textContent = String(Math.round(from + (value - from) * eased));
        if (progress < 1 && node.dataset.value === String(value)) {
            requestAnimationFrame(tick);
        }
    };
    node.textContent = String(from);
    requestAnimationFrame(tick);
}

function chip(iconName, text, extraClass = '') {
    return el('span', { class: `glass-pill inline-flex items-center gap-2 px-3.5 py-2 text-sm ${extraClass}` },
        icon(iconName, { size: 16 }), text);
}

function locationChip(station, now) {
    if (!station.time) {
        return chip('map-pin', station.name);
    }
    if (isStale(station.time, now)) {
        return chip('clock', `${station.name} · Last reading ${relativeTime(station.time, now)}`, 'text-white/85');
    }
    return chip('map-pin', `${station.name} · Updated ${relativeTime(station.time, now)}`);
}

function healthBox(category) {
    const calm = CALM_CATEGORIES.has(category.key);
    return el('div', { class: 'glass max-w-xl p-5', 'data-role': 'health' },
        el('p', { class: 'text-lg leading-relaxed' }, category.implication),
        el('p', { class: 'mt-4 flex items-start gap-3 border-t border-white/15 pt-4 text-white/85' },
            icon(calm ? 'check-circle' : 'alert-triangle', { size: 20, className: 'mt-0.5 shrink-0 text-[var(--accent)]' }),
            category.advice),
    );
}

function rightNow(station) {
    const weather = pickWeather(station.iaqi);
    if (weather.length === 0) {
        return null;
    }
    return el('aside', { class: 'glass w-full p-6 lg:max-w-md lg:justify-self-end', 'data-role': 'right-now', 'aria-label': 'Weather right now' },
        el('h2', { class: 'flex items-center gap-2 font-display text-xl font-semibold' },
            el('span', { class: 'accent-dot !h-2 !w-2' }), 'Right now'),
        el('div', { class: 'mt-5 grid grid-cols-2 gap-3' },
            weather.map((item) => el('div', { class: 'glass-tile p-4', 'data-role': 'now-tile' },
                el('p', { class: 'label flex items-center gap-2 text-white/85' }, icon(WEATHER_ICONS[item.key], { size: 15 }), item.label),
                el('p', { class: 'mt-3 font-display text-3xl font-light' }, String(item.value),
                    el('span', { class: 'ml-1 text-base text-white/85' }, item.unit)),
            ))),
    );
}

// Un botón en vez de un enlace #fragmento: el fragmento crearía una entrada de historial y dispararía popstate.
function scrollToDetails(reducedMotion) {
    document.querySelector('main section:not([hidden]):not(#hero)')
        ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

export function renderHero(root, { station, now = new Date(), reducedMotion = false }) {
    const category = getCategory(station.aqi);
    const hasReading = station.aqi !== null;
    const number = el('p', { class: 'hero-num text-[120px] lg:text-[220px]', 'data-role': 'aqi', 'aria-hidden': 'true' });
    const previous = root.querySelector('[data-role="aqi"]');
    if (previous?.dataset.value) {
        number.dataset.value = previous.dataset.value;
    }

    clear(root);
    root.append(
        el('h1', { id: 'hero-title', class: 'sr-only' }, `Air quality in ${station.name}`),
        el('div', { class: 'grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]' },
            el('div', { class: 'flex min-w-0 flex-col gap-6' },
                el('span', { class: 'glass-pill label inline-flex w-fit items-center gap-2 px-3 py-1.5 text-white/85' },
                    el('span', { class: 'accent-dot !h-2 !w-2' }), 'AIR QUALITY INDEX'),
                el('div', { class: 'flex flex-wrap items-end gap-x-6 gap-y-2' },
                    number,
                    el('div', { class: 'pb-3 lg:pb-6' },
                        el('p', { class: 'flex items-center gap-3 font-display text-3xl font-semibold lg:text-[40px]' },
                            el('span', { class: 'accent-dot' }), category.label),
                        hasReading ? el('p', { class: 'label mt-2 text-white' }, `AQI RANGE (${category.range})`) : null,
                    ),
                ),
                el('div', { class: 'flex flex-wrap gap-3' },
                    locationChip(station, now),
                    station.dominant ? chip('wind', `Dominant: ${pollutantLabel(station.dominant)}`) : null,
                ),
                hasReading ? healthBox(category) : null,
                hasReading ? el('div', { class: 'max-w-xl' }, aqiScaleBar(station.aqi)) : null,
            ),
            rightNow(station),
        ),
        el('button', {
            type: 'button',
            'data-role': 'scroll-cue',
            class: 'glass-pill float-cue mx-auto mt-12 flex w-fit items-center gap-2 px-4 py-2 text-sm text-white/85',
            onClick: () => scrollToDetails(reducedMotion),
        }, 'Forecast, pollutants & map', icon('chevron-down', { size: 16 })),
    );

    if (hasReading) {
        countUp(number, station.aqi, reducedMotion);
    } else {
        number.dataset.value = '';
        number.textContent = '–';
    }
}
