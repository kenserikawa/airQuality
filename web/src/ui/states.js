// Estados sin datos (spec §3.6) en el hero y esqueletos de carga para las secciones.
import { clear, el } from './dom.js';
import { icon } from './icons.js';

const STATES = {
    locating: {
        title: 'Finding the air around you…',
        body: 'Allow location access for the nearest station, or search any city.',
        icon: 'navigation',
        pulse: true,
    },
    offline: {
        title: "Can't reach the air quality service",
        body: 'Check your connection and try again.',
        icon: 'cloud-off',
        retry: true,
    },
    'not-found': {
        title: "We couldn't find air data for that station",
        body: 'Try searching for another city or station.',
        icon: 'help',
    },
    unlocated: {
        title: 'Search for a city to get started',
        body: "We couldn't detect your location. Use the search above to find any city or station.",
        icon: 'search',
    },
};

export function renderState(root, status, { onRetry } = {}) {
    const state = STATES[status];
    if (!state) {
        throw new Error(`Unknown state: ${status}`);
    }
    clear(root);
    root.append(el('div', { class: 'flex max-w-2xl flex-col gap-6' },
        el('span', { class: 'glass-pill flex h-14 w-14 items-center justify-center' }, icon(state.icon, { size: 24 })),
        el('h1', { id: 'hero-title', class: `font-display text-4xl font-semibold leading-tight lg:text-6xl ${state.pulse ? 'pulse-soft' : ''}` }, state.title),
        el('p', { class: 'text-lg text-white/85' }, state.body),
        state.retry ? el('button', {
            type: 'button',
            class: 'glass-pill flex w-fit items-center gap-2 px-5 py-3 font-semibold',
            onClick: () => onRetry?.(),
        }, icon('refresh', { size: 18 }), 'Retry') : null,
    ));
}

export function renderSkeleton(root) {
    root.hidden = false;
    root.setAttribute('aria-busy', 'true');
    clear(root);
    root.append(
        el('div', { class: 'skeleton h-7 w-56' }),
        el('div', { class: 'mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3' },
            [1, 2, 3].map(() => el('div', { class: 'skeleton h-28' }))),
    );
}
