// Barra de la escala AQI (6 tramos iguales) con marcador en el valor; la usan el hero y "What does X mean?".
import { CATEGORIES, scalePosition } from '../lib/aqi.js';
import { el } from './dom.js';

const TICKS = ['0', '50', '100', '150', '200', '300+'];

export function aqiScaleBar(aqi, { height = 'h-2', ticks = true } = {}) {
    const position = scalePosition(aqi);
    const bar = el('div', { class: `relative flex ${height} w-full overflow-visible rounded-full` },
        CATEGORIES.map((category, i) => el('span', {
            class: `h-full flex-1 ${i === 0 ? 'rounded-l-full' : ''} ${i === CATEGORIES.length - 1 ? 'rounded-r-full' : ''}`,
            style: { background: category.accent },
        })),
        position === null ? null : el('span', {
            class: 'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--accent)] shadow-[0_0_12px_rgba(255,255,255,0.6)]',
            style: { left: `${position * 100}%` },
            'data-role': 'scale-marker',
        }),
    );
    return el('div', {
        class: 'aqi-scale w-full',
        role: 'img',
        'aria-label': position === null ? 'AQI scale from 0 to 500' : `AQI ${aqi} on a scale from 0 to 500`,
    },
    bar,
    ticks ? el('div', { class: 'mt-2 flex justify-between text-[11px] font-semibold text-white/70', 'aria-hidden': 'true' },
        TICKS.map((tick) => el('span', {}, tick))) : null,
    );
}
