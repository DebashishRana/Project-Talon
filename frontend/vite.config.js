import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createReadStream, cpSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function localIconsPlugin() {
  const iconsDir = path.resolve(__dirname, 'icons')
  const mimeTypes = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  }

  function resolveIconPath(requestUrl = '') {
    const cleanPath = decodeURIComponent(requestUrl.split('?')[0]).replace(/^\/+/, '')
    const filePath = path.resolve(iconsDir, cleanPath)
    const insideIcons = filePath === iconsDir || filePath.startsWith(`${iconsDir}${path.sep}`)
    if (!insideIcons || !existsSync(filePath) || !statSync(filePath).isFile()) return null
    return filePath
  }

  return {
    name: 'talon-local-icons',
    configureServer(server) {
      server.middlewares.use('/icons', (request, response, next) => {
        const filePath = resolveIconPath(request.url)
        if (!filePath) return next()
        response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream')
        createReadStream(filePath).pipe(response)
      })
    },
    closeBundle() {
      if (existsSync(iconsDir)) {
        cpSync(iconsDir, path.resolve(__dirname, 'dist/icons'), { recursive: true })
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), localIconsPlugin()],
  optimizeDeps: {
    exclude: ['maplibre-gl']
  },
  resolve: {
    alias: {
      '@talon-mrz': path.resolve(__dirname, '../../src/lib/mrz/index.ts')
    }
  },
  server: {
    port: 3000,
    watch: {
      ignored: [
        '**/frontend/icons/**',
        '**\\frontend\\icons\\**'
      ]
    },
    fs: { allow: [path.resolve(__dirname, '../..')] },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})

