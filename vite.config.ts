import { defineConfig } from 'vite';

export default defineConfig({
    publicDir: 'public', // Use the public directory for static assets
    build: {
        outDir: 'dist', // Ensure assets are copied to the dist directory
    },
    optimizeDeps: {
        exclude: ['@babylonjs/havok', '@babylonjs/core/Culling/ray'],
    },
});
