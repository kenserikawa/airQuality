// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OfflineError } from '../../src/lib/waqi.js';
import { mountSearch } from '../../src/ui/search.js';

const RESULTS = [
    { uid: 3229, aqi: 59, name: 'Cuatro Caminos, Madrid, Spain' },
    { uid: 3227, aqi: 50, name: 'Escuelas Aguirre, Madrid, Spain' },
    { uid: 5725, aqi: null, name: 'Madrid' },
];

let root;
let search;
let onSelect;
let onUseLocation;
let instance;

function input() {
    return root.querySelector('input');
}

function type(value) {
    input().value = value;
    input().dispatchEvent(new Event('input', { bubbles: true }));
}

function key(name, options = {}) {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options }));
}

function options() {
    return [...root.querySelectorAll('[role="option"]')];
}

beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement('div');
    document.body.append(root);
    search = vi.fn(async () => RESULTS);
    onSelect = vi.fn();
    onUseLocation = vi.fn();
    instance = mountSearch(root, { search, onSelect, onUseLocation });
});

afterEach(() => {
    instance.destroy();
    root.remove();
    vi.useRealTimers();
});

describe('estructura y apertura', () => {
    test('combobox ARIA enlazado a un listbox', () => {
        const box = input();
        expect(box.getAttribute('role')).toBe('combobox');
        expect(box.getAttribute('aria-expanded')).toBe('false');
        const listbox = document.getElementById(box.getAttribute('aria-controls'));
        expect(listbox.getAttribute('role')).toBe('listbox');
    });

    test('al enfocar se abre con "Use my current location" como única opción', () => {
        input().focus();
        input().dispatchEvent(new FocusEvent('focus'));
        expect(input().getAttribute('aria-expanded')).toBe('true');
        expect(options()).toHaveLength(1);
        expect(options()[0].textContent).toContain('Use my current location');
    });
});

describe('búsqueda', () => {
    test('no busca con menos de 2 caracteres', async () => {
        type('m');
        await vi.advanceTimersByTimeAsync(400);
        expect(search).not.toHaveBeenCalled();
    });

    test('espera 300 ms y busca una sola vez', async () => {
        type('madr');
        await vi.advanceTimersByTimeAsync(299);
        expect(search).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(search).toHaveBeenCalledTimes(1);
        expect(search.mock.calls[0][0]).toBe('madr');
        expect(options()).toHaveLength(4);
        expect(root.textContent).toContain('MATCHING STATIONS (3)');
    });

    test('teclear seguido solo lanza la última búsqueda', async () => {
        type('ma');
        await vi.advanceTimersByTimeAsync(100);
        type('mad');
        await vi.advanceTimersByTimeAsync(100);
        type('madr');
        await vi.advanceTimersByTimeAsync(300);
        expect(search).toHaveBeenCalledTimes(1);
        expect(search.mock.calls[0][0]).toBe('madr');
    });

    test('una respuesta antigua no sustituye a la más reciente y se aborta', async () => {
        let resolveOld;
        let oldSignal;
        search.mockImplementationOnce((q, { signal }) => {
            oldSignal = signal;
            return new Promise((resolve) => { resolveOld = resolve; });
        });
        search.mockImplementationOnce(async () => [RESULTS[0]]);
        type('mad');
        await vi.advanceTimersByTimeAsync(300);
        type('madr');
        await vi.advanceTimersByTimeAsync(300);
        expect(oldSignal.aborted).toBe(true);
        resolveOld(RESULTS);
        await vi.advanceTimersByTimeAsync(0);
        expect(options()).toHaveLength(2);
        expect(options()[1].textContent).toContain('Cuatro Caminos');
    });

    test('sin resultados', async () => {
        search.mockResolvedValueOnce([]);
        type('zzz');
        await vi.advanceTimersByTimeAsync(300);
        expect(root.textContent).toContain('No stations found for “zzz”');
    });

    test('error de red', async () => {
        search.mockRejectedValueOnce(new OfflineError());
        type('madr');
        await vi.advanceTimersByTimeAsync(300);
        expect(root.textContent).toContain('Search is unavailable right now');
    });

    test('un AbortError no muestra nada', async () => {
        search.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
        type('madr');
        await vi.advanceTimersByTimeAsync(300);
        expect(root.textContent).not.toContain('unavailable');
    });

    test('filas: chip, nombre partido y "Offline" sin lectura', async () => {
        type('madr');
        await vi.advanceTimersByTimeAsync(300);
        const [, cuatro, , madrid] = options();
        expect(cuatro.querySelector('[data-role="chip"]').textContent).toBe('59');
        expect(cuatro.querySelector('[data-role="primary"]').textContent).toBe('Cuatro Caminos');
        expect(cuatro.querySelector('[data-role="secondary"]').textContent).toBe('Madrid, Spain');
        expect(cuatro.textContent).toContain('Moderate');
        expect(madrid.querySelector('[data-role="chip"]').textContent).toBe('–');
        expect(madrid.textContent).toContain('Offline');
    });
});

describe('teclado', () => {
    beforeEach(async () => {
        input().focus();
        type('madr');
        await vi.advanceTimersByTimeAsync(300);
    });

    test('flechas con vuelta y aria-activedescendant', () => {
        key('ArrowDown');
        expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
        key('ArrowDown');
        expect(options()[1].getAttribute('aria-selected')).toBe('true');
        key('ArrowUp');
        key('ArrowUp');
        expect(input().getAttribute('aria-activedescendant')).toBe(options()[3].id);
        key('ArrowDown');
        expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    });

    test('Enter sobre una estación la elige, cierra y limpia', () => {
        key('ArrowDown');
        key('ArrowDown');
        key('Enter');
        expect(onSelect).toHaveBeenCalledWith(3229);
        expect(input().getAttribute('aria-expanded')).toBe('false');
        expect(input().value).toBe('');
    });

    test('Enter sobre "Use my current location"', () => {
        key('ArrowDown');
        key('Enter');
        expect(onUseLocation).toHaveBeenCalledOnce();
        expect(onSelect).not.toHaveBeenCalled();
    });

    test('Esc cierra y conserva el foco; Tab cierra', () => {
        key('Escape');
        expect(input().getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(input());
        input().dispatchEvent(new FocusEvent('focus'));
        expect(input().getAttribute('aria-expanded')).toBe('true');
        key('Tab');
        expect(input().getAttribute('aria-expanded')).toBe('false');
    });

    test('clic en una opción la elige', () => {
        options()[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(onSelect).toHaveBeenCalledWith(3227);
    });
});

describe('atajos', () => {
    test('⌘K, Ctrl+K y "/" enfocan el buscador', () => {
        document.body.focus();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(input());
        input().blur();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(input());
        input().blur();
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(input());
    });

    test('"/" dentro de otro campo de texto no roba el foco', () => {
        const other = document.createElement('input');
        document.body.append(other);
        other.focus();
        other.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
        expect(document.activeElement).toBe(other);
        other.remove();
    });
});
