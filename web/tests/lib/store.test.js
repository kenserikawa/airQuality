import { describe, expect, test, vi } from 'vitest';
import { createStore } from '../../src/lib/store.js';

describe('createStore', () => {
    test('set mezcla el estado y notifica a los suscriptores', () => {
        const store = createStore({ status: 'locating', station: null });
        const listener = vi.fn();
        store.subscribe(listener);
        store.set({ status: 'ready' });
        expect(store.get()).toEqual({ status: 'ready', station: null });
        expect(listener).toHaveBeenCalledWith({ status: 'ready', station: null }, { status: 'locating', station: null });
    });

    test('unsubscribe deja de notificar', () => {
        const store = createStore({ n: 0 });
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        unsubscribe();
        store.set({ n: 1 });
        expect(listener).not.toHaveBeenCalled();
    });
});
