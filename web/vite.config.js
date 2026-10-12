import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: '/airQuality/',
    plugins: [tailwindcss()],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
    },
});
