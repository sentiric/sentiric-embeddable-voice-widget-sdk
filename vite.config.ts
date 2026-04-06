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
    // Library mode multiple entry points ile çakıştığı için 
    // lib tanımını kaldırıp rollupOptions ile yönetiyoruz
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        interactive: resolve(__dirname, 'demos/interactive-agent.html'),
        analyst: resolve(__dirname, 'demos/meeting-analyst.html'),
        // Kütüphane çıktısını da buraya ekliyoruz
        sdk: resolve(__dirname, 'src/index.ts')
      },
      output: {
        // SDK'yı hala bir kütüphane olarak kullanmak isteyenler için format ayarı
        entryFileNames: (chunkInfo) => {
           return chunkInfo.name === 'sdk' ? 'stream-sdk.js' : '[name].js';
        },
        format: 'es'
      }
    },
    minify: 'terser',
  }
});