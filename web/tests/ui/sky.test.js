// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';
import { NEUTRAL, getCategory } from '../../src/lib/aqi.js';
import { applySky } from '../../src/ui/sky.js';

describe('applySky', () => {
    test('fija las variables del cielo y la categoría', () => {
        const root = document.createElement('div');
        applySky(getCategory(42), { root });
        expect(root.style.getPropertyValue('--sky-top')).toBe('#0B3D4F');
        expect(root.style.getPropertyValue('--sky-middle')).toBe('#1E846C');
        expect(root.style.getPropertyValue('--sky-horizon')).toBe('#9BE7C4');
        expect(root.style.getPropertyValue('--accent')).toBe('#449A66');
        expect(root.dataset.category).toBe('good');
    });

    test('cielo neutral', () => {
        const root = document.createElement('div');
        applySky(NEUTRAL, { root });
        expect(root.dataset.category).toBe('neutral');
        expect(root.style.getPropertyValue('--sky-top')).toBe('#0F172A');
    });
});
