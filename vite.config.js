import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import neisHandler from './api/neis.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'neis-development-api',
        configureServer(server) {
          server.middlewares.use('/api/neis', (req, res) => {
            neisHandler(req, res, env.NEIS_API_KEY);
          });
        },
      },
    ],
  };
});
