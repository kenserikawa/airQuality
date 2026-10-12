const CITIES_URL = 'data/cities.json';

async function fillCitiesList() {
    const list = document.getElementById('cities_list');
    if (!list) {
        return;
    }
    try {
        const response = await fetch(CITIES_URL);
        if (!response.ok) {
            return;
        }
        const cities = await response.json();
        const fragment = document.createDocumentFragment();
        for (const city of cities) {
            const option = document.createElement('option');
            option.value = city;
            fragment.append(option);
        }
        list.append(fragment);
    } catch {
        // Sin sugerencias: el buscador sigue funcionando.
    }
}

fillCitiesList();
