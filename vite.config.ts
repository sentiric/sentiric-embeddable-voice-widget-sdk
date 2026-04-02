import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
import pkg from './package.json'; // package.json'ı içeri al

export default defineConfig({
  base: './', 
  
  // VERSİYONU OTOMATİK TANIMLA
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SentiricStream',
      fileName: (format) => `stream-sdk.${format === 'es' ? 'js' : 'umd.js'}`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        inlineDynamicImports: false 
      }
    },
    minify: 'terser',
  },
  plugins: [dts({ insertTypesEntry: true })],
});