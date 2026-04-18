// File: sentiric-stream-sdk/vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig({
  define: {
    // Versiyon bilgisini kütüphane içine gömüyoruz
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // [ARCH-COMPLIANCE]: Library Mode aktif edildi. 
    // Artık HTML sayfaları değil, sadece kütüphane dosyası üretilir.
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SentiricStreamSDK',
      // Çıktı formatları: ES Module ve UMD (Universal)
      fileName: (format) => `stream-sdk.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // Kütüphane içine gömülmeyecek dış bağımlılıklar
      external: [], 
      output: {
        globals: {
          // Eğer dış bağımlılık olsaydı burada eşlenirdi
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});