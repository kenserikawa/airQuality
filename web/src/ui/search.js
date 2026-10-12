// Buscador de estaciones (spec §3.3): combobox ARIA 1.2 con espera, cancelación, teclado y atajos.
import { getCategory, splitStationName, textOn } from '../lib/aqi.js';
import { searchStations } from '../lib/waqi.js';
import { clear, el } from './dom.js';
import { icon } from './icons.js';

const MIN_QUERY = 2;
const ID = 'search';

function isTypingTarget(target) {
    return target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function shortcutLabel() {
    return /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '') ? '⌘K' : 'Ctrl K';
}

export function mountSearch(root, { search = searchStations, onSelect, onUseLocation, debounceMs = 300 } = {}) {
    let results = null;
    let message = null;
    let query = '';
    let activeIndex = -1;
    let open = false;
    let timer = 0;
    let controller = null;
    let requestId = 0;

    const input = el('input', {
        id: `${ID}-input`,
        type: 'text',
        role: 'combobox',
        'aria-expanded': 'false',
        'aria-controls': `${ID}-listbox`,
        'aria-autocomplete': 'list',
        'aria-label': 'Search any city or station',
        placeholder: 'Search any city or station',
        autocomplete: 'off',
        spellcheck: 'false',
        class: 'min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/85 focus:outline-none',
    });
    const listbox = el('ul', { id: `${ID}-listbox`, role: 'listbox', 'aria-label': 'Stations', class: 'flex flex-col gap-1' });
    const panel = el('div', { class: 'glass absolute inset-x-0 top-full z-40 mt-3 max-h-[70vh] overflow-y-auto p-3', hidden: true },
        listbox,
        el('p', { class: 'mt-2 flex items-center gap-3 border-t border-white/10 px-2 pt-3 text-xs text-white/85', 'aria-hidden': 'true' },
            el('kbd', { class: 'rounded border border-white/20 px-1.5' }, '↑↓'), 'navigate',
            el('kbd', { class: 'rounded border border-white/20 px-1.5' }, 'Enter'), 'select',
            el('kbd', { class: 'ml-auto rounded border border-white/20 px-1.5' }, 'Esc'), 'close'),
    );

    function entries() {
        return [{ kind: 'location' }, ...(results ?? []).map((station) => ({ kind: 'station', station }))];
    }

    function optionId(entry) {
        return entry.kind === 'location' ? `${ID}-opt-location` : `${ID}-opt-${entry.station.uid}`;
    }

    function locationOption(active) {
        return el('li', {
            id: `${ID}-opt-location`, role: 'option', 'aria-selected': String(active), 'data-index': '0',
            class: `flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 ${active ? 'bg-white/15' : 'hover:bg-white/10'}`,
        },
        el('span', { class: 'glass-pill flex h-10 w-10 shrink-0 items-center justify-center' }, icon('navigation', { size: 18 })),
        el('span', { class: 'flex min-w-0 flex-col' },
            el('span', { class: 'font-semibold' }, 'Use my current location'),
            el('span', { class: 'text-sm text-white/85' }, 'Find the nearest station')),
        el('span', { class: 'label ml-auto rounded-md border border-[var(--accent)] px-2 py-1 text-[11px] text-white' }, 'NEAR YOU'));
    }

    function stationOption(station, index, active) {
        const category = getCategory(station.aqi);
        const { primary, secondary } = splitStationName(station.name);
        const hasReading = station.aqi !== null;
        return el('li', {
            id: `${ID}-opt-${station.uid}`, role: 'option', 'aria-selected': String(active), 'data-index': String(index),
            class: `flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 ${active ? 'bg-white/15' : 'hover:bg-white/10'}`,
        },
        el('span', {
            'data-role': 'chip',
            class: 'flex h-8 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-bold',
            style: hasReading ? { background: category.accent, color: textOn(category.accent) } : { background: 'rgba(255,255,255,0.15)', color: '#FFFFFF' },
        }, hasReading ? String(station.aqi) : '–'),
        el('span', { class: 'min-w-0 flex-1 truncate' },
            el('span', { class: 'font-semibold', 'data-role': 'primary' }, primary),
            secondary ? el('span', { class: 'text-white/85' }, ' · ', el('span', { 'data-role': 'secondary' }, secondary)) : null),
        el('span', { class: `shrink-0 text-sm ${hasReading ? 'text-white/85' : 'italic text-white/85'}` }, hasReading ? category.label : 'Offline'));
    }

    function render() {
        input.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        const list = entries();
        if (activeIndex >= 0 && activeIndex < list.length) {
            input.setAttribute('aria-activedescendant', optionId(list[activeIndex]));
        } else {
            input.removeAttribute('aria-activedescendant');
        }
        clear(listbox);
        listbox.append(locationOption(activeIndex === 0));
        if (results?.length) {
            listbox.append(el('li', { role: 'presentation', class: 'label mt-2 px-3 pt-2 text-white/85' }, `MATCHING STATIONS (${results.length})`));
            results.forEach((station, i) => listbox.append(stationOption(station, i + 1, activeIndex === i + 1)));
        }
        if (message) {
            listbox.append(el('li', { role: 'presentation', 'data-role': 'message', class: 'px-3 py-3 text-sm text-white/85' }, message));
        }
    }

    function openPanel() {
        open = true;
        render();
    }

    function close() {
        open = false;
        activeIndex = -1;
        render();
    }

    function reset() {
        clearTimeout(timer);
        controller?.abort();
        requestId += 1;
        results = null;
        message = null;
    }

    function choose(index) {
        const entry = entries()[index];
        if (!entry) {
            return;
        }
        if (entry.kind === 'location') {
            close();
            onUseLocation?.();
            return;
        }
        input.value = '';
        query = '';
        reset();
        close();
        onSelect?.(entry.station.uid);
    }

    async function run(q) {
        controller?.abort();
        controller = new AbortController();
        const id = ++requestId;
        try {
            const list = await search(q, { signal: controller.signal });
            if (id !== requestId) {
                return;
            }
            results = list;
            message = list.length ? null : `No stations found for “${q}”`;
        } catch (error) {
            if (id !== requestId || error?.name === 'AbortError') {
                return;
            }
            results = [];
            message = 'Search is unavailable right now';
        }
        activeIndex = -1;
        open = true;
        render();
    }

    function onInput() {
        query = input.value.trim();
        reset();
        activeIndex = -1;
        if (query.length >= MIN_QUERY) {
            const q = query;
            timer = setTimeout(() => run(q), debounceMs);
        }
        openPanel();
    }

    function onKeyDown(event) {
        const count = entries().length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            open = true;
            const step = event.key === 'ArrowDown' ? 1 : -1;
            activeIndex = activeIndex === -1 && step === -1 ? count - 1 : (activeIndex + step + count) % count;
            render();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const fallback = results?.length ? 1 : -1;
            choose(activeIndex >= 0 ? activeIndex : fallback);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (event.key === 'Tab') {
            close();
        }
    }

    function onGlobalKey(event) {
        const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
        const isSlash = event.key === '/' && !isTypingTarget(event.target);
        if (isShortcut || isSlash) {
            event.preventDefault();
            input.focus();
        }
    }

    function onFocusOut(event) {
        if (!root.contains(event.relatedTarget)) {
            close();
        }
    }

    listbox.addEventListener('mousedown', (event) => event.preventDefault());
    listbox.addEventListener('click', (event) => {
        const option = event.target.closest?.('[role="option"]');
        if (option) {
            choose(Number(option.dataset.index));
        }
    });
    input.addEventListener('focus', openPanel);
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    root.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onGlobalKey);

    clear(root);
    root.append(el('div', { class: 'relative' },
        el('label', { class: 'glass-pill flex h-12 items-center gap-3 px-4 focus-within:border-white/50' },
            icon('search', { size: 18, className: 'shrink-0 text-white/85' }),
            input,
            el('kbd', { class: 'hidden rounded-md border border-white/20 px-1.5 py-0.5 text-xs text-white/85 sm:inline', 'aria-hidden': 'true' }, shortcutLabel())),
        panel));
    render();

    return {
        focus: () => input.focus(),
        destroy() {
            reset();
            document.removeEventListener('keydown', onGlobalKey);
            clear(root);
        },
    };
}
