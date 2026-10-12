import { WAQI_TOKEN } from './config.js';
import { buildFeedUrl, parseFeedResponse, readCityParam } from './air-quality.js';
import {
    mountMap,
    renderDescription,
    renderError,
    renderGases,
    renderMain,
    renderSource,
    renderWeather,
} from './render.js';

async function fetchFeed(city) {
    try {
        const response = await fetch(buildFeedUrl(city, WAQI_TOKEN));
        return parseFeedResponse(await response.json());
    } catch {
        // Red caída o cuerpo no JSON.
        return parseFeedResponse(null);
    }
}

async function main() {
    const city = readCityParam(window.location.search);
    if (!city) {
        window.location.replace('index.html');
        return;
    }

    const root = document.getElementById('result');
    const result = await fetchFeed(city);
    if (result.kind === 'error') {
        root.append(renderError(result.message));
        return;
    }

    const { data } = result;
    const details = document.createElement('div');
    details.className = 'container';
    details.append(...[
        renderMain(data),
        renderDescription(data.aqi),
        renderGases(data.iaqi),
        renderWeather(data.iaqi),
        renderSource(data.city?.url),
    ].filter(Boolean));
    root.append(details);
    mountMap(root, data.city?.geo);
}

main();
