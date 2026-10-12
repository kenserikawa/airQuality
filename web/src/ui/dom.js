// Creación de nodos sin innerHTML: los hijos string siempre se insertan como texto.

const SAFE_HREF = /^(https?:\/\/|[?#]|\.\/)/i;

function setAttribute(node, key, value) {
    if (value === null || value === undefined || value === false) {
        return;
    }
    if (key === 'class') {
        node.setAttribute('class', value);
    } else if (key === 'text') {
        node.textContent = String(value);
    } else if (key === 'style' && typeof value === 'object') {
        Object.assign(node.style, value);
    } else if (/^on[A-Z]/.test(key) && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'href') {
        const href = String(value);
        if (SAFE_HREF.test(href)) {
            node.setAttribute('href', href);
        }
    } else {
        node.setAttribute(key, value === true ? '' : String(value));
    }
}

function append(node, child) {
    if (child === null || child === undefined || child === false) {
        return;
    }
    if (Array.isArray(child)) {
        child.forEach((item) => append(node, item));
    } else if (child instanceof Node) {
        node.append(child);
    } else {
        node.append(document.createTextNode(String(child)));
    }
}

export function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs ?? {}).forEach(([key, value]) => setAttribute(node, key, value));
    children.forEach((child) => append(node, child));
    return node;
}

export function clear(node) {
    node.replaceChildren();
    return node;
}
