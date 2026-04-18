// [ARCH-COMPLIANCE] SOP-01: Hybrid Build (Page + Library)
import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      input: {
        // 1. Web Sayfası Girişi (404'ü önler)
        main: resolve(__dirname, 'index.html'),
        // 2. Kütüphane Girişi (Playground'ın çektiği dosya)
        sdk: resolve(__dirname, 'src/index.ts')
      },
      output: {
        // SDK dosyasının adını sabitliyoruz
        entryFileNames: (chunk) => {
          return chunk.name === 'sdk' ? 'stream-sdk.js' : 'assets/[name]-[hash].js';
        },
        format: 'es'
      }
    },
    minify: 'terser',
    outDir: 'dist',
    sourcemap: true
  }
});