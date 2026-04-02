import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SentiricStream',
      fileName: 'stream-sdk',
      formats: ['es', 'umd'],
    },
    minify: 'terser',
  },
  plugins: [dts({ insertTypesEntry: true })],
});