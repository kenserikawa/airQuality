// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { el } from '../../src/ui/dom.js';
import { icon } from '../../src/ui/icons.js';

describe('el', () => {
    test('los hijos string se insertan como texto, nunca como HTML', () => {
        const node = el('p', {}, '<img src=x onerror=alert(1)>');
        expect(node.textContent).toBe('<img src=x onerror=alert(1)>');
        expect(node.querySelector('img')).toBeNull();
    });

    test('atributos, clases, aria, data, style y eventos', () => {
        const onClick = vi.fn();
        const node = el('button', {
            class: 'glass-pill px-4', id: 'locate', 'aria-label': 'Use my location', 'data-x': '1',
            style: { color: 'red' }, onClick,
        }, 'Go');
        expect(node.className).toBe('glass-pill px-4');
        expect(node.id).toBe('locate');
        expect(node.getAttribute('aria-label')).toBe('Use my location');
        expect(node.dataset.x).toBe('1');
        expect(node.style.color).toBe('red');
        node.click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    test('href solo http(s) o relativo interno', () => {
        expect(el('a', { href: 'https://aqicn.org/' }).getAttribute('href')).toBe('https://aqicn.org/');
        expect(el('a', { href: 'javascript:alert(1)' }).hasAttribute('href')).toBe(false);
        expect(el('a', { href: ' JavaScript:alert(1)' }).hasAttribute('href')).toBe(false);
        expect(el('a', { href: '?station=5725' }).getAttribute('href')).toBe('?station=5725');
    });

    test('ignora hijos null/false y acepta nodos y arrays', () => {
        const node = el('div', {}, null, false, el('span', {}, 'a'), ['b', el('i', {}, 'c')]);
        expect(node.textContent).toBe('abc');
        expect(node.children).toHaveLength(2);
    });
});

describe('icon', () => {
    test('devuelve un SVG decorativo', () => {
        const svg = icon('search', { size: 18 });
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('width')).toBe('18');
    });

    test('lanza con un nombre desconocido', () => {
        expect(() => icon('nope')).toThrow();
    });
});
