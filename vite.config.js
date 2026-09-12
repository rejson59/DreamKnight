import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Relatywne ścieżki — dzięki temu build działa na GitHub Pages
  // pod adresem https://<user>.github.io/DreamKnight/ (i pod każdym innym podkatalogiem).
  base: './',
  resolve: {
    alias: {
      // Lokalna kopia three.js — działa bez CDN i bez `npm install`.
      three: fileURLToPath(new URL('./vendor/three.module.min.js', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
