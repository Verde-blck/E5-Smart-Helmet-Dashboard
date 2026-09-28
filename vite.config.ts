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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  
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
