import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { Buffer } from 'node:buffer';
import { existsSync } from 'node:fs';
import path from 'path';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

function apiDevServer(): Plugin {
  return {
    name: 'api-dev-server',
    apply: 'serve',
    config(_config, { mode }) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? '';
        const modulePath = `${pathname}.ts`;
        if (!/^\/api(\/[a-z][\w-]*)+$/.test(pathname) || !existsSync(path.join(process.cwd(), modulePath)))
          return next();

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);
        const request = new Request(new URL(req.url ?? '', `http://${req.headers.host}`), {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: chunks.length ? Buffer.concat(chunks) : undefined,
        });

        const handlers = await server.ssrLoadModule(modulePath);
        const handler = handlers[req.method ?? ''];
        const response: Response = handler ? await handler(request) : new Response(null, { status: 405 });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevServer()],
  optimizeDeps: {
    include: ['leaflet'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@api': path.resolve(import.meta.dirname, 'api'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-auth', test: /node_modules[\\/]@?firebase[\\/](auth|app|util|component|logger)/ },
            { name: 'firebase-firestore', test: /node_modules[\\/]@?firebase[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'rules',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
