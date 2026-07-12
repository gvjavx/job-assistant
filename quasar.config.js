import { defineConfig } from '#q-app/wrappers'

export default defineConfig(() => {
  return {
    boot: ['axios'],

    css: ['app.scss'],

    extras: ['roboto-font', 'material-icons'],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20'
      },
      vueRouterMode: 'hash'
    },

    devServer: {
      open: true,
      port: 9000,
      proxy: {
        // Forwards /api requests to the Express scraper backend (server/index.js)
        // so the browser never has to talk to third-party job APIs directly.
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true
        }
      }
    },

    framework: {
      config: {},
      plugins: ['Notify', 'Dialog', 'LoadingBar']
    },

    animations: [],

    pwa: {
      workboxMode: 'GenerateSW'
    }
  }
})
