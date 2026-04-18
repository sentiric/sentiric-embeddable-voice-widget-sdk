// [ARCH-COMPLIANCE] SOP-01: Official Library Mode for SDK
import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Sentiric',
      fileName: 'stream-sdk',
      formats: ['es'] // Modern ES Module formatı
    },
    minify: 'terser',
    outDir: 'dist',
    sourcemap: true // Hata ayıklama için şart
  }
});