import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

export default defineConfig({
  base: './',
  clearScreen: false,
  server: {
    port: 8081,
    strictPort: true,
  },
  plugins: [
    {
      name: 'pico8-standalone',
      configureServer(server) {
        // Serve public/pico8/ files directly, before Vite's SPA fallback
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0]; // strip query string
          if (!url || !url.startsWith('/pico8/')) return next();

          // Redirect /pico8/standalone → /pico8/standalone/
          const dirPath = join(__dirname, 'public', url);
          if (!url.endsWith('/') && existsSync(dirPath) && statSync(dirPath).isDirectory()) {
            res.writeHead(302, { Location: url + '/' });
            res.end();
            return;
          }

          // Serve static file
          const filePath = join(__dirname, 'public', url);
          if (existsSync(filePath) && statSync(filePath).isFile()) {
            const ext = url.split('.').pop();
            const mimeTypes = {
              html: 'text/html; charset=utf-8',
              js: 'application/javascript; charset=utf-8',
              css: 'text/css; charset=utf-8',
              json: 'application/json',
              png: 'image/png',
            };
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
            res.end(readFileSync(filePath));
            return;
          }

          // Directory with trailing slash — serve index.html
          const indexPath = join(__dirname, 'public', url, 'index.html');
          if (existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(readFileSync(indexPath));
            return;
          }

          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        android: resolve(__dirname, 'android.html'),
      },
    },
  },
});
