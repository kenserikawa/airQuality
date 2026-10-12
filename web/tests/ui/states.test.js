// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderSkeleton, renderState } from '../../src/ui/states.js';

let root;

beforeEach(() => {
    root = document.createElement('section');
});

describe('renderState', () => {
    test.each([
        ['locating', 'Finding the air around you…'],
        ['offline', "Can't reach the air quality service"],
        ['not-found', "We couldn't find air data for that station"],
        ['unlocated', 'Search for a city to get started'],
    ])('%s → %s', (status, title) => {
        renderState(root, status, {});
        expect(root.querySelector('#hero-title').textContent).toBe(title);
    });

    test('offline: Retry invoca el callback', () => {
        const onRetry = vi.fn();
        renderState(root, 'offline', { onRetry });
        expect(root.textContent).toContain('Check your connection and try again.');
        root.querySelector('button').click();
        expect(onRetry).toHaveBeenCalledOnce();
    });

    test('locating no tiene botón y lleva pulso', () => {
        renderState(root, 'locating', {});
        expect(root.querySelector('button')).toBeNull();
        expect(root.querySelector('.pulse-soft')).not.toBeNull();
    });

    test('estado desconocido lanza', () => {
        expect(() => renderState(root, 'nope', {})).toThrow();
    });
});

describe('renderSkeleton', () => {
    test('pinta bloques de carga y marca aria-busy', () => {
        root.hidden = true;
        renderSkeleton(root);
        expect(root.hidden).toBe(false);
        expect(root.getAttribute('aria-busy')).toBe('true');
        expect(root.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    });
});
