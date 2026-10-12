// Contaminantes (spec §3.4.2): sub-índices AQI, no concentraciones.
import { pickPollutants, scalePosition, textOn } from '../lib/aqi.js';
import { el } from './dom.js';
import { hideSection, sectionHeader, showSection } from './section.js';

function tile(pollutant) {
    const position = scalePosition(pollutant.value) ?? 0;
    return el('div', { class: 'glass-tile flex flex-col gap-2 p-4', 'data-role': 'pollutant' },
        el('div', { class: 'flex items-start justify-between gap-2' },
            el('p', { class: 'label text-[11px] text-white/85' }, pollutant.name),
            el('span', { class: 'label rounded-md px-1.5 py-0.5 text-[10px]', style: { background: pollutant.category.accent, color: textOn(pollutant.category.accent) } }, pollutant.category.label)),
        el('p', { class: 'font-semibold' }, pollutant.code),
        el('p', { class: 'font-display text-3xl font-semibold' }, String(pollutant.value)),
        el('p', { class: 'text-xs text-white/85' }, 'AQI sub-index'),
        el('div', { class: 'mt-1 h-1.5 w-full rounded-full bg-white/10', 'aria-hidden': 'true' },
            el('span', { class: 'block h-full rounded-full', style: { width: `${Math.max(position * 100, 3)}%`, background: pollutant.category.accent } })));
}

export function renderPollutants(root, station) {
    const pollutants = pickPollutants(station?.iaqi);
    if (pollutants.length === 0) {
        hideSection(root);
        return;
    }
    showSection(root,
        sectionHeader('pollutants-title', 'flask', 'Pollutants', 'Individual AQI for each pollutant'),
        el('div', { class: 'mt-6 grid grid-cols-2 gap-3 md:grid-cols-3' }, pollutants.map(tile)));
}
