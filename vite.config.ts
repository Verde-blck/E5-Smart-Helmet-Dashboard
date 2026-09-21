import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  /**
   * The deployed API does not send CORS headers, and its preflight OPTIONS
   * returns 403 — so a browser blocks every request before it leaves. Curl
   * works because curl doesn't enforce CORS; the browser does.
   *
   * In development the dev server proxies /api through to the backend, so the
   * browser only ever talks to localhost and the request is same-origin. No
   * preflight, no CORS.
   *
   * This is a development workaround only. Production still needs the backend
   * to send Access-Control-Allow-Origin for the deployed dashboard's domain,
   * or the dashboard has to be served from the same origin as the API.
   */
  const apiTarget =
    env.VITE_API_PROXY_TARGET || 'https://e5energy-production.up.railway.app'

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
