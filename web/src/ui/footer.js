// Pie (spec §3.5): créditos de datos, atribuciones de la estación y de la base cartográfica.
import { clear, el } from './dom.js';

const WAQI_NAME = 'World Air Quality Index Project';
const REPO_URL = 'https://github.com/kenserikawa/airQuality';

function link(text, href) {
    return /^https?:\/\//i.test(href ?? '')
        ? el('a', { href, class: 'underline decoration-white/30 underline-offset-2 hover:text-white', target: '_blank', rel: 'noopener noreferrer' }, text)
        : el('span', {}, text);
}

function joined(items) {
    return items.flatMap((item, i) => (i === 0 ? [item] : [' · ', item]));
}

export function renderFooter(root, station) {
    const attributions = (station?.attributions ?? []).filter((item) => item.name !== WAQI_NAME);
    clear(root);
    root.append(el('div', { class: 'mx-auto flex max-w-[1200px] flex-col gap-3 lg:flex-row lg:items-start lg:justify-between' },
        el('div', { class: 'flex flex-col gap-1' },
            el('p', {}, 'Data: ', link(WAQI_NAME, 'https://waqi.info/'), ' · ', link('aqicn.org', 'https://aqicn.org/')),
            attributions.length ? el('p', {}, 'Station data: ', joined(attributions.map((item) => link(item.name, item.url)))) : null,
            el('p', {}, 'Map tiles ', link('© OpenStreetMap contributors', 'https://www.openstreetmap.org/copyright'))),
        el('p', {}, link('AirQuality · GitHub', REPO_URL))));
}
