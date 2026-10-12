// Cabecera común de las tarjetas de sección y helper para ocultar secciones vacías.
import { clear, el } from './dom.js';
import { icon } from './icons.js';

export function sectionHeader(id, iconName, title, subtitle, extra = null) {
    return el('div', { class: 'flex flex-wrap items-start justify-between gap-4' },
        el('div', {},
            el('h2', { id, class: 'flex items-center gap-3 font-display text-xl font-semibold lg:text-[22px]' },
                icon(iconName, { size: 20, className: 'text-[var(--accent)]' }), title),
            subtitle ? el('p', { class: 'mt-1 text-sm text-white/70' }, subtitle) : null),
        extra);
}

export function hideSection(root) {
    clear(root);
    root.hidden = true;
    root.removeAttribute('aria-busy');
}

export function showSection(root, ...children) {
    clear(root);
    root.hidden = false;
    root.removeAttribute('aria-busy');
    root.append(...children);
}
