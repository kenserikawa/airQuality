// El cielo: variables CSS registradas con @property (styles.css) para que el degradado haga el fundido.

export function applySky(category, { root = document.documentElement } = {}) {
    const [top, middle, horizon] = category.sky;
    root.style.setProperty('--sky-top', top);
    root.style.setProperty('--sky-middle', middle);
    root.style.setProperty('--sky-horizon', horizon);
    root.style.setProperty('--accent', category.accent);
    root.dataset.category = category.key;
}
