// Previsión (spec §3.4.1): barras de mínimo a máximo con punto en la media, por contaminante.
import { forecastDays, forecastKeys, pollutantLabel } from '../lib/aqi.js';
import { el } from './dom.js';
import { hideSection, sectionHeader, showSection } from './section.js';

// Fecha local del usuario en formato YYYY-MM-DD (en-CA usa ese formato).
function todayIso(now = new Date()) {
    return now.toLocaleDateString('en-CA');
}

function dayBar(day, scaleMax) {
    const toPercent = (value) => `${Math.min(Math.max(value / scaleMax, 0), 1) * 100}%`;
    return el('div', {
        class: 'glass-tile flex min-w-[88px] flex-1 flex-col items-center gap-3 px-3 py-4',
        'data-role': 'forecast-day',
        role: 'img',
        'aria-label': `${day.label}: average ${day.avg}, min ${day.min}, max ${day.max}`,
    },
    el('p', { class: 'font-display text-2xl font-semibold', 'data-role': 'forecast-avg' }, String(day.avg)),
    el('p', { class: 'label text-[10px] text-white/85' }, day.category.label),
    el('div', { class: 'relative my-1 h-28 w-2 rounded-full bg-white/10' },
        el('span', {
            class: 'absolute inset-x-0 rounded-full',
            style: { bottom: toPercent(day.min), top: `calc(100% - ${toPercent(day.max)})`, background: day.category.accent },
        }),
        el('span', {
            class: 'absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white',
            style: { bottom: toPercent(day.avg), background: day.category.accent },
        })),
    el('p', { class: 'text-sm font-semibold' }, day.label));
}

const PANEL_ID = 'forecast-panel';

export function renderForecast(root, station, { today = todayIso(), activeKey, focusTab = false } = {}) {
    const keys = forecastKeys(station?.forecast).filter((key) => forecastDays(station.forecast, key, today).length > 0);
    if (keys.length === 0) {
        hideSection(root);
        return;
    }
    const key = keys.includes(activeKey) ? activeKey : keys[0];
    const days = forecastDays(station.forecast, key, today);
    const scaleMax = Math.max(50, ...days.map((day) => day.max));

    const select = (k) => renderForecast(root, station, { today, activeKey: k, focusTab: true });
    const onKeyDown = (event) => {
        const index = keys.indexOf(key);
        const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: keys.length - 1 }[event.key];
        if (target !== undefined) {
            event.preventDefault();
            select(keys[(target + keys.length) % keys.length]);
        }
    };
    const tabs = el('div', { role: 'tablist', 'aria-label': 'Pollutant', class: 'glass-pill flex p-1', onKeydown: onKeyDown },
        keys.map((k) => el('button', {
            type: 'button',
            role: 'tab',
            id: `forecast-tab-${k}`,
            'aria-selected': String(k === key),
            'aria-controls': PANEL_ID,
            tabindex: k === key ? '0' : '-1',
            class: `rounded-full px-4 py-1.5 text-sm font-semibold ${k === key ? 'bg-white text-slate-900' : 'text-white/85 hover:text-white'}`,
            onClick: () => select(k),
        }, pollutantLabel(k))));

    showSection(root,
        sectionHeader('forecast-title', 'calendar', 'Forecast · next 6 days', 'Daily average with min–max range', tabs),
        el('div', {
            id: PANEL_ID,
            role: 'tabpanel',
            'aria-labelledby': `forecast-tab-${key}`,
            class: 'mt-6 flex gap-3 overflow-x-auto pb-1',
        }, days.map((day) => dayBar(day, scaleMax))));
    if (focusTab) {
        root.querySelector(`#forecast-tab-${key}`)?.focus();
    }
}
