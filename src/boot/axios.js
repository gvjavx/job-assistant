import { boot } from 'quasar/wrappers'
import axios from 'axios'

// In dev, quasar.config.js proxies /api -> http://localhost:3001 (the Express scraper server).
// In production, set VITE_API_BASE to wherever server/index.js is deployed.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api'
})

export default boot(({ app }) => {
  app.config.globalProperties.$api = api
})

export { api }
