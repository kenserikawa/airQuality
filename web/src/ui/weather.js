// Tiempo (spec §3.4.3): las mismas magnitudes que "Right now".
import { pickWeather } from '../lib/aqi.js';
import { el } from './dom.js';
import { icon } from './icons.js';
import { hideSection, sectionHeader, showSection } from './section.js';

const ICONS = { t: 'thermometer', h: 'droplet', w: 'wind', p: 'gauge' };

export function renderWeather(root, station) {
    const weather = pickWeather(station?.iaqi);
    if (weather.length === 0) {
        hideSection(root);
        return;
    }
    showSection(root,
        sectionHeader('weather-title', 'thermometer', 'Weather', 'Measured at the station'),
        el('div', { class: 'mt-6 grid grid-cols-2 gap-3' },
            weather.map((item) => el('div', { class: 'glass-tile p-4', 'data-role': 'weather-tile' },
                el('p', { class: 'label flex items-center justify-between text-[11px] text-white/70' }, item.label, icon(ICONS[item.key], { size: 16 })),
                el('p', { class: 'mt-3 font-display text-2xl font-semibold' }, String(item.value),
                    el('span', { class: 'ml-1 text-sm font-normal text-white/70' }, item.unit))))));
}
