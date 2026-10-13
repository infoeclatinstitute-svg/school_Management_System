import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const currentBuildTimestamp = Date.now()

function otaVersionPlugin(): Plugin {
  return {
    name: 'ota-version-generator',
    buildStart() {
      const versionData = {
        version: '1.0.0',
        buildTime: currentBuildTimestamp,
        builtAt: new Date(currentBuildTimestamp).toISOString(),
      }
      const publicDir = path.resolve(__dirname, 'public')
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true })
      }
      fs.writeFileSync(path.resolve(publicDir, 'version.json'), JSON.stringify(versionData, null, 2))
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: '1.0.0',
            buildTime: currentBuildTimestamp,
            builtAt: new Date(currentBuildTimestamp).toISOString(),
          },
          null,
          2
        ),
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_BUILD_TIMESTAMP__: JSON.stringify(currentBuildTimestamp),
  },
  plugins: [
    react(),
    otaVersionPlugin(),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            if (id.includes('@tanstack')) {
              return 'vendor-query'
            }
          }
        },
      },
    },
  },
})
