// La estación visible vive en ?station=<uid>: enlaces compartibles y Atrás/Adelante.

export function readStationId() {
    const value = new URLSearchParams(window.location.search).get('station');
    return value !== null && /^\d+$/.test(value) ? Number(value) : null;
}

function urlFor(uid) {
    const url = new URL(window.location.href);
    url.searchParams.set('station', String(uid));
    return url;
}

export function pushStationId(uid) {
    window.history.pushState({ station: uid }, '', urlFor(uid));
}

export function replaceStationId(uid) {
    window.history.replaceState({ station: uid }, '', urlFor(uid));
}

export function onStationIdChange(callback) {
    const listener = () => callback(readStationId());
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
}
