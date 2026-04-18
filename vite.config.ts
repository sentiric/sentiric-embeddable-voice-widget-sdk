// File: sentiric-stream-sdk/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // [ARCH-COMPLIANCE]: Sadece Statik Giriş ve SDK Çekirdeği bırakıldı.
        // index.html burada 'main' olarak kaldığı için dist/ klasörüne kopyalanacak,
        // böylece GitHub Pages 404 hatası vermeyecektir.
        main: resolve(__dirname, 'index.html'),
        sdk: resolve(__dirname, 'src/index.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
           return chunkInfo.name === 'sdk' ? 'stream-sdk.js' : '[name].js';
        },
        format: 'es'
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Üretim loglarını temizler
        drop_debugger: true
      }
    }
  }
});