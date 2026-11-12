import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


const VENDOR_GROUPS: Array<[name: string, pattern: RegExp]> = [
  [
    'react',
    /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router)[\\/]/,
  ],
  [
    'charts',
    /[\\/]node_modules[\\/](recharts|recharts-scale|victory-vendor|d3-[^\\/]+|chart\.js|react-chartjs-2)[\\/]/,
  ],
  ['maps', /[\\/]node_modules[\\/](@googlemaps|@vis\.gl|@react-google-maps)[\\/]/],
  ['forms', /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/],
  ['data', /[\\/]node_modules[\\/](@tanstack|axios)[\\/]/],
]

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Never fall back to the live backend: a missing setting must not quietly send development
  // requests to the real system. Mock mode needs no backend at all.
  const apiTarget = env.VITE_API_PROXY_TARGET?.trim()
  const useMocks = env.VITE_USE_MOCKS === 'true'
  if (command === 'serve' && !useMocks) {
    if (!apiTarget) {
      throw new Error(
        'VITE_API_PROXY_TARGET is not set. Set it in .env to the backend you want to use, ' +
          'or set VITE_USE_MOCKS=true to run without a backend.'
      )
    }
    if (/production|e5energyng\.com/i.test(apiTarget)) {
      console.warn(`\n  Warning: development requests are going to the LIVE backend (${apiTarget}).\n`)
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: apiTarget
        ? {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    build: {
     
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            for (const [name, pattern] of VENDOR_GROUPS) {
              if (pattern.test(id)) return name
            }
            return undefined
          },
        },
      },
    },
  }
})
