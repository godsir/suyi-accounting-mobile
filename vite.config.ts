import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Suyi记账',
        short_name: 'Suyi记账',
        description: '简洁实用的记账应用',
        theme_color: '#007AFF',
        background_color: '#f8f8f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 7089,
    host: '0.0.0.0',
    proxy: {
      '^/api/.*': {
        target: 'https://suyiapi.cpolar.cn',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            if (id.includes('vue')) {
              return 'vue'
            }
            if (id.includes('echarts')) {
              return 'echarts'
            }
            return 'vendor'
          }
          // 确保页面组件被正确分块
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^\/]+)\//)
            if (match) {
              return `page-${match[1]}`
            }
          }
        }
      }
    }
  }
})