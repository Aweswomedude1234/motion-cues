import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the site works from GitHub Pages (/<repo>/) or any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {outDir: 'dist', sourcemap: false},
  // Inline (empty) PostCSS config: stops Vite from picking up a postcss.config.js from a parent folder.
  css: {postcss: {plugins: []}},
});
