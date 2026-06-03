import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env variables so we can use them in the config itself
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      // Dev-only proxy: forwards /api requests to the backend.
      // Set VITE_API_URL in frontend/.env for local dev (e.g. http://localhost:5000).
      // In production on Render the frontend is served by the same .NET process,
      // so /api calls hit the correct server with no proxy needed.
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
