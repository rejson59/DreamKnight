import { defineConfig } from 'vite';

export default defineConfig({
  // Relatywne ścieżki — dzięki temu build działa na GitHub Pages
  // pod adresem https://<user>.github.io/DreamKnight/ (i pod każdym innym podkatalogiem).
  base: './',
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
