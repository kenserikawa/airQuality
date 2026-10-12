// Estación de Madrid ya normalizada (forma que devuelve lib/waqi.js) a partir de una respuesta real.
import madrid from './madrid.json';

export function madridStation(overrides = {}) {
    const data = madrid.data;
    return {
        uid: 5725,
        aqi: 42,
        name: 'Madrid',
        geo: { lat: 40.4167754, lng: -3.7037902 },
        time: '2026-10-12T10:00:00+02:00',
        dominant: 'pm25',
        iaqi: structuredClone(data.iaqi),
        forecast: structuredClone(data.forecast.daily),
        attributions: [
            { name: 'Calidad del Air en Madrid, Servicio de Protección de la Atmósfera', url: 'https://airedemadrid.madrid.es/portal/site/calidadaire' },
            { name: 'European Environment Agency', url: 'https://www.eea.europa.eu/themes/air/' },
            { name: 'World Air Quality Index Project', url: 'https://waqi.info/' },
        ],
        ...overrides,
    };
}
