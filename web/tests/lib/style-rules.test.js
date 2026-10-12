// Reglas de contraste que dependen del marcado y del CSS (spec §3.7 y §4.1).
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { GLASS_ALPHA, GLASS_COLOR } from '../../src/lib/aqi.js';

const root = process.cwd();
const uiFiles = readdirSync(resolve(root, 'src/ui')).map((file) => resolve(root, 'src/ui', file));
const sources = [...uiFiles, resolve(root, 'index.html')].map((file) => [file, readFileSync(file, 'utf-8')]);
const css = readFileSync(resolve(root, 'src/styles.css'), 'utf-8');

describe('reglas de estilo', () => {
    test('ningún texto blanco por debajo del 85 % de opacidad', () => {
        const offenders = sources.flatMap(([file, text]) => [...text.matchAll(/text-white\/(\d+)/g)]
            .filter((match) => Number(match[1]) < 85)
            .map((match) => `${file.replace(root, '')}: ${match[0]}`));
        expect(offenders).toEqual([]);
    });

    test('el cristal oscuro del CSS coincide con GLASS_COLOR/GLASS_ALPHA', () => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(GLASS_COLOR.slice(i, i + 2), 16));
        const expected = `rgba(${r}, ${g}, ${b}, ${GLASS_ALPHA})`;
        const glassRules = css.match(/\.glass(?:-pill)?\s*\{[^}]*\}/g);
        expect(glassRules).toHaveLength(2);
        glassRules.forEach((rule) => expect(rule).toContain(`background: ${expected}`));
    });
});
