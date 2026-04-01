import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      // Ana giriş dosyası
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SentiricVoice',
      // CDN için 'voice-widget-sdk.umd.cjs', NPM için 'voice-widget-sdk.js' üretir
      fileName: 'voice-widget-sdk',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // Harici bırakmak istediğimiz büyük kütüphaneler buraya (şu an yok)
      external: [],
      output: {
        globals: {
          // UMD build'de kullanılacak global değişken adları
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
  plugins: [dts({ insertTypesEntry: true })],
});