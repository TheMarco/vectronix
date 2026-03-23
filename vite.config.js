import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  clearScreen: false,
  server: {
    port: 8081,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        android: resolve(__dirname, 'android.html'),
      },
    },
  },
});
