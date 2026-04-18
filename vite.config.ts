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
        main: resolve(__dirname, 'index.html'),
        interactive: resolve(__dirname, 'examples/interactive-agent.html'),
        analyst: resolve(__dirname, 'examples/meeting-analyst.html'),
        megaphone: resolve(__dirname, 'examples/megaphone.html'),
        omnichat: resolve(__dirname, 'examples/omni-chat.html'),
        cognitive: resolve(__dirname, 'examples/cognitive-canvas.html'),
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
        drop_console: true, // Üretim ortamında console.log'ları temizler
        drop_debugger: true
      }
    }
  }
});