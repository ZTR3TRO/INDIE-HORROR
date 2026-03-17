import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // importante para Electron — rutas relativas
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
    server: {
        port: 5173,
    }
});
