// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { madridStation } from '../fixtures/station.js';
import { renderHero } from '../../src/ui/hero.js';

const now = new Date('2026-10-12T10:00:00Z');
let root;

beforeEach(() => {
    root = document.createElement('section');
});

function text() {
    return root.textContent.replace(/\s+/g, ' ');
}

describe('renderHero', () => {
    test('estación Good con todos sus datos', () => {
        renderHero(root, { station: madridStation(), now, reducedMotion: true });
        expect(root.querySelector('[data-role="aqi"]').textContent).toBe('42');
        expect(text()).toContain('AIR QUALITY INDEX');
        expect(text()).toContain('Good');
        expect(text()).toContain('AQI RANGE (0–50)');
        expect(text()).toContain('Madrid · Updated 2 hours ago');
        expect(text()).toContain('Dominant: PM2.5');
        expect(text()).toContain('Air quality is satisfactory, and air pollution poses little or no risk.');
        expect(text()).toContain('Great day to be outside.');
        expect(root.querySelector('#hero-title').textContent).toBe('Air quality in Madrid');
        expect(root.querySelector('.aqi-scale')).not.toBeNull();
        expect(root.querySelectorAll('[data-role="now-tile"]')).toHaveLength(4);
    });

    test('sin lectura: "–" y sin rango, mensaje ni escala', () => {
        renderHero(root, { station: madridStation({ aqi: null }), now, reducedMotion: true });
        expect(root.querySelector('[data-role="aqi"]').textContent).toBe('–');
        expect(text()).toContain('No current reading');
        expect(text()).not.toContain('AQI RANGE');
        expect(root.querySelector('.aqi-scale')).toBeNull();
        expect(root.querySelector('[data-role="health"]')).toBeNull();
    });

    test('sin contaminante dominante no hay chip', () => {
        renderHero(root, { station: madridStation({ dominant: null }), now, reducedMotion: true });
        expect(text()).not.toContain('Dominant');
    });

    test('casillas de "Right now" solo para los datos presentes', () => {
        const station = madridStation();
        delete station.iaqi.t;
        renderHero(root, { station, now, reducedMotion: true });
        expect(root.querySelectorAll('[data-role="now-tile"]')).toHaveLength(3);
        station.iaqi = {};
        renderHero(root, { station, now, reducedMotion: true });
        expect(root.querySelector('[data-role="right-now"]')).toBeNull();
    });

    test('dato de hace más de 24 h → "Last reading"', () => {
        renderHero(root, { station: madridStation({ time: '2026-10-10T02:00:00+02:00' }), now, reducedMotion: true });
        expect(text()).toContain('Madrid · Last reading 2 days ago');
    });

    test('categoría mala usa icono de aviso y su recomendación', () => {
        renderHero(root, { station: madridStation({ aqi: 168 }), now, reducedMotion: true });
        expect(text()).toContain('Unhealthy');
        expect(text()).toContain('Avoid prolonged outdoor exertion. Consider a mask outdoors.');
        expect(root.querySelector('[data-role="health"] [data-icon="alert-triangle"]')).not.toBeNull();
    });

    test('un nombre con HTML se muestra como texto', () => {
        renderHero(root, { station: madridStation({ name: '<img src=x onerror=alert(1)>' }), now, reducedMotion: true });
        expect(root.querySelector('img')).toBeNull();
        expect(text()).toContain('<img src=x onerror=alert(1)>');
    });

    test('vuelve a pintar sin duplicar contenido', () => {
        renderHero(root, { station: madridStation(), now, reducedMotion: true });
        renderHero(root, { station: madridStation({ aqi: 64 }), now, reducedMotion: true });
        expect(root.querySelectorAll('[data-role="aqi"]')).toHaveLength(1);
        expect(root.querySelector('[data-role="aqi"]').textContent).toBe('64');
    });

    test('la pista de scroll es un botón que lleva a la primera sección visible, sin tocar la URL', () => {
        document.body.innerHTML = '<main><section id="hero"></section><section id="forecast" hidden></section><section id="pollutants"></section></main>';
        const hero = document.getElementById('hero');
        const scrolled = [];
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = vi.fn(function scrollIntoView() { scrolled.push(this.id); });
        renderHero(hero, { station: madridStation(), now, reducedMotion: true });
        const cue = hero.querySelector('[data-role="scroll-cue"]');
        expect(cue.tagName).toBe('BUTTON');
        expect(hero.querySelector('a[href^="#"]')).toBeNull();
        cue.click();
        expect(scrolled).toEqual(['pollutants']);
        Element.prototype.scrollIntoView = original;
        document.body.innerHTML = '';
    });
});
