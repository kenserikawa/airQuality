// "What does X mean?" (spec §3.4.5): la escala AQI explicada, con la categoría actual resaltada.
import { CATEGORIES, getCategory } from '../lib/aqi.js';
import { el } from './dom.js';
import { icon } from './icons.js';
import { aqiScaleBar } from './scale-bar.js';
import { sectionHeader, showSection } from './section.js';

export function renderScale(root, station) {
    const aqi = station?.aqi ?? null;
    const current = getCategory(aqi);
    const title = aqi === null ? 'What does the AQI mean?' : `What does ${aqi} mean?`;
    showSection(root,
        sectionHeader('scale-title', 'help', title, 'US EPA Air Quality Index'),
        el('div', { class: 'mt-6' }, aqiScaleBar(aqi, { height: 'h-3', ticks: false })),
        el('ul', { class: 'mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6' },
            CATEGORIES.map((category) => {
                const active = category.key === current.key;
                return el('li', {
                    class: `glass-tile p-3 ${active ? '!border-[var(--accent)] bg-white/10' : ''}`,
                    'data-active': active ? 'true' : null,
                },
                el('p', { class: 'flex items-center gap-2 text-sm font-semibold' },
                    el('span', { class: 'h-2.5 w-2.5 rounded-full', style: { background: category.accent } }), category.label),
                el('p', { class: 'mt-1 text-xs text-white/85' }, category.range));
            })),
        aqi === null ? null : el('div', { class: 'glass-tile mt-6 flex gap-4 border-l-4 !border-l-[var(--accent)] p-5' },
            icon('check-circle', { size: 22, className: 'shrink-0 text-[var(--accent)]' }),
            el('div', {},
                el('p', { class: 'font-display text-lg font-semibold' }, current.label),
                el('p', { class: 'mt-1 text-white/85' }, current.implication))));
}
