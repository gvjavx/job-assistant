/**
 * Job Wire backend
 * ------------------------------------------------------------------
 * This server aggregates job postings from public, freely-available
 * job-board APIs (Remotive, Arbeitnow) instead of scraping the HTML
 * of sites like LinkedIn or Indeed. Those sites forbid scraping in
 * their terms of service and actively block bots, so this is both
 * more reliable and something you can legitimately run long-term.
 *
 * If you want to add a source that only publishes HTML (no API),
 * see the `scrapeGeneric()` stub at the bottom for where a Cheerio-based
 * parser would go — just make sure you check that source's
 * robots.txt / terms of service first.
 * ------------------------------------------------------------------
 */

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { randomUUID } from 'node:crypto'
import 'dotenv/config'
import pmx from 'pmx'
import Redis from 'ioredis'
import { extractText } from './extractText.js'
import { buildProfile, rankJobsForCv, buildSuggestions } from './cvAnalyzer.js'
import {
  normalizeArbeitnow,
  normalizeJobstreet,
  normalizeRemotive,
  normalizeSerper,
  normalizeTheMuse,
  dedupe
} from './normalizers.js'
import { mergeAndFilterExpired, buildCoverageNote, applyJobFilters, paginateJobs } from './jobPool.js'

// --- PMX Custom Monitoring & Actions ---
pmx.init({
  http: true, // Automatically log HTTP requests
  errors: true, // Log uncaught exceptions
  custom_probes: true, // Enable custom probes
  network: true,
  ports: true
})

const apiRequestCounter = pmx.probe().counter({
  name: 'Total API Requests'
})

pmx.probe().metric({
  name: 'Cache Size',
  value: async () => {
    if (redis) return redis.dbsize()
    return memoryCache.size
  }
})

pmx.action('clearCache', async (reply) => {
  if (redis) await redis.flushdb()
  else memoryCache.clear()
  reply({ success: true, message: 'Cache cleared' })
})
// -----------------------------------------

const app = express()
const PORT = process.env.PORT || 3001

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})

// Izinkan permintaan HANYA dari URL frontend Anda.
// Di lingkungan produksi, Anda harus mengatur FRONTEND_URL di file .env Anda.
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:9000'
app.use(cors({
  origin: (origin, callback) => {
    // Izinkan permintaan tanpa origin (seperti dari Postman atau skrip server-side)
    // dan permintaan dari frontend yang diizinkan.
    if (!origin || origin === allowedOrigin) return callback(null, true)
    return callback(new Error('Akses ditolak oleh kebijakan CORS.'))
  }
}))
app.use(express.json())

// ---- Caching Layer (Redis) ------------------------------------------------
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null
if (!redis) {
  console.warn('REDIS_URL tidak ditemukan di .env. Menggunakan cache in-memory sementara.')
}
const memoryCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getCached (key) {
  if (!redis) return memoryCache.get(key)

  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

async function setCached (key, value, ttlMs = CACHE_TTL_MS) {
  const data = JSON.stringify(value)
  if (!redis) return memoryCache.set(key, value)

  // 'EX' memberitahu Redis untuk mengatur expiration time dalam detik.
  await redis.set(key, data, 'EX', ttlMs / 1000)
}

// ---- Sesi analisis CV (untuk paginasi rekomendasi tanpa unggah ulang) -----
const ANALYSIS_SESSION_TTL_MS = 15 * 60 * 1000 // 15 menit

function analysisSessionKey (analysisId) {
  return `cvAnalysis:${analysisId}`
}

async function createAnalysisSession (profile, rankedJobs, suggestions) {
  const analysisId = randomUUID()
  const session = { profile, rankedJobs, suggestions, createdAt: new Date().toISOString() }
  await setCached(analysisSessionKey(analysisId), session, ANALYSIS_SESSION_TTL_MS)
  return analysisId
}

async function getAnalysisSession (analysisId) {
  if (!analysisId) return null
  return getCached(analysisSessionKey(analysisId))
}

// Membungkus satu pemanggilan sumber data eksternal dengan batas waktu, supaya
// satu sumber yang lambat/hang tidak menahan seluruh request pencarian.
const SOURCE_TIMEOUT_MS = 8000

function withTimeout (promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ])
}

// ---- data sources -----------------------------------------------------------
async function fetchSerperJobs (query, posted) {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    // Sengaja throw, bukan return [], supaya getJobPool() bisa membedakan
    // "sumber ini gagal" dari "sumber ini memang kosong" untuk coverageNote.
    throw new Error('SERPER_API_KEY not found in environment variables.')
  }

  // Query pencarian umum (TANPA operator site:A OR site:B OR ... gabungan) —
  // pola site: gabungan yang dipakai sebelumnya ditolak Serper untuk akun
  // gratis dengan pesan "Query pattern not allowed for free accounts".
  // Query sederhana ini meniru pencarian Google biasa untuk lowongan kerja
  // di Indonesia (gl/hl sudah menargetkan Indonesia di bawah), dan berlaku
  // untuk semua plan Serper termasuk gratis.
  const fullQuery = ['lowongan kerja', query, 'Indonesia'].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  const cacheKey = `serper:${fullQuery}:${posted}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: fullQuery,
      gl: 'id', // Indonesia
      hl: 'id', // Indonesian
      num: 20, // naikkan volume hasil per query dari default ~10, tapi tetap konservatif (nilai lebih besar berisiko ditolak 400 oleh sebagian plan Serper)
      tbs: posted === '30' ? 'qdr:w' : undefined // last 30 days if requested
    })
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Serper API responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`)
  }

  const data = await response.json()
  const jobs = (data.organic || []).map(normalizeSerper)
  await setCached(cacheKey, jobs)
  return jobs
}

const JOBSTREET_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
const JOBSTREET_MAX_PAGES = 3 // Batas wajar agar tidak membebani API tak resmi ini

async function fetchJobstreetPage (query, location, page) {
  const url = new URL('https://www.jobstreet.co.id/api/chalice-search/v4/search')
  if (query) url.searchParams.set('keywords', query)
  if (location) url.searchParams.set('where', location)
  url.searchParams.set('page', page)
  url.searchParams.set('seek-site', 'ID') // Pastikan mencari di situs Indonesia

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      // Terkadang diperlukan User-Agent browser standar
      'User-Agent': JOBSTREET_USER_AGENT
    }
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Jobstreet API responded ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`)
  }
  const data = await res.json()
  return (data.data || []).map(normalizeJobstreet)
}

async function fetchJobstreet (query, location) {
  const cacheKey = `jobstreet:${query}:${location}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  // Halaman pertama wajib berhasil (indikasi API benar-benar down bila gagal);
  // halaman berikutnya bersifat best-effort untuk menambah cakupan.
  const firstPage = await fetchJobstreetPage(query, location, 1)
  const extraPages = await Promise.all(
    Array.from({ length: JOBSTREET_MAX_PAGES - 1 }, (_, i) => fetchJobstreetPage(query, location, i + 2).catch(() => []))
  )
  const jobs = dedupe([...firstPage, ...extraPages.flat()])
  await setCached(cacheKey, jobs)
  return jobs
}
// ---- data sources -----------------------------------------------------------
async function fetchRemotive (query, category) {
  const url = new URL('https://remotive.com/api/remote-jobs')
  if (query) url.searchParams.set('search', query)
  if (category) url.searchParams.set('category', category)

  const cacheKey = `remotive:${url.search}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Remotive API responded ${res.status}`)
  const data = await res.json()
  const jobs = (data.jobs || []).map(normalizeRemotive)
  setCached(cacheKey, jobs)
  return jobs
}

async function fetchArbeitnow () {
  const cacheKey = 'arbeitnow:all'
  const cached = getCached(cacheKey)
  if (cached) return cached

  const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Arbeitnow API responded ${res.status}`)
  const data = await res.json()
  const jobs = (data.data || []).map(normalizeArbeitnow)
  setCached(cacheKey, jobs)
  return jobs
}

async function fetchTheMuse (query, category) {
  // The Muse API uses different category slugs
  const categoryMap = {
    'software-dev': 'Software Engineering',
    'data': 'Data Science',
    'design': 'Design and UX'
  }

  const url = new URL('https://www.themuse.com/api/public/jobs')
  if (category && categoryMap[category]) {
    url.searchParams.set('category', categoryMap[category])
  }
  // Their API doesn't have a generic text search query param, so we filter post-fetch

  const cacheKey = `themuse:${url.search}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`The Muse API responded ${res.status}`)
  const data = await res.json()
  const jobs = (data.results || []).map(normalizeTheMuse)
  setCached(cacheKey, jobs)
  return jobs
}

// Placeholder for a source that has no public API and would need a real
// HTML scraper (e.g. with Cheerio). Left unimplemented on purpose —
// check the target site's robots.txt and terms of service before writing one.
// async function scrapeGeneric (targetUrl) { ... }

// Label sumber yang dicakup pool pencarian utama (Jobstreet langsung + Serper
// yang menargetkan portal-portal ini). Remotive/Arbeitnow/The Muse sengaja
// tidak dimasukkan ke sini karena condong ke lowongan remote global, bukan
// spesifik Indonesia — tetap dipakai hanya di lookup detail per-id.
const SEARCH_SOURCE_LABELS = ['Jobstreet (Direct)', 'LinkedIn', 'Glints', 'Kalibrr', 'Indeed', 'Karir.com', 'TopKarir']

/**
 * Pool lowongan bersama untuk pencarian umum (`GET /api/jobs`) maupun
 * rekomendasi berbasis CV (`POST /api/cv/analyze`) — keduanya harus memakai
 * hasil agregasi yang identik (FR-011), bukan implementasi terpisah seperti
 * sebelumnya.
 *
 * @returns {Promise<{ jobs: Array, coverageNote: string|null, sources: string[] }>}
 */
async function getJobPool ({ query = '', category = '', location = '', posted = null } = {}) {
  const sourceCalls = [
    { label: 'Jobstreet (Direct)', promise: fetchJobstreet(query || category, location) },
    { label: 'Serper (LinkedIn/Glints/Kalibrr/Indeed/Karir.com/TopKarir)', promise: fetchSerperJobs(query || category, posted) }
  ]

  const settled = await Promise.allSettled(
    sourceCalls.map(({ promise, label }) => withTimeout(promise, SOURCE_TIMEOUT_MS, label))
  )

  const failedSources = []
  const jobsBySource = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    failedSources.push(sourceCalls[i].label)
    console.error(`Gagal mengambil dari ${sourceCalls[i].label}:`, result.reason?.message || result.reason)
    return []
  })

  const jobs = mergeAndFilterExpired(jobsBySource)

  return { jobs, coverageNote: buildCoverageNote(failedSources), sources: SEARCH_SOURCE_LABELS }
}

// ---- routes -------------------------------------------------------------
app.get('/api/jobs', async (req, res) => {
  // Increment the API request counter
  apiRequestCounter.inc()

  const { query = '', category = '', location = '', posted = null, remoteOnly, sort = 'date', jobType = null, page = 1, limit = 20 } = req.query

  try {
    // Pool lowongan bersama (dipakai juga oleh POST /api/cv/analyze) — sudah
    // di-dedupe dan sudah dikeluarkan yang kedaluwarsa (lihat getJobPool()).
    const { jobs: pooledJobs, coverageNote, sources } = await getJobPool({ query, category, location, posted })

    let jobs = applyJobFilters(pooledJobs, { remoteOnly, jobType, posted })

    jobs.sort((a, b) => {
      if (sort === 'company') return a.company.localeCompare(b.company)
      // default: newest first
      return new Date(b.postedAt || 0) - new Date(a.postedAt || 0)
    })

    const { paginatedJobs, pagination } = paginateJobs(jobs, { page, limit })

    res.json({
      jobs: paginatedJobs,
      fetchedAt: new Date().toISOString(),
      sources,
      coverageNote,
      pagination
    })
  } catch (err) {
    console.error(err)
    res.status(502).json({
      message: 'Sumber lowongan sedang tidak bisa diakses. Coba lagi dalam beberapa saat.'
    })
  }
})

app.get('/api/job/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    return res.status(400).json({ message: 'Job ID is required.' })
  }

  try {
    // We need to fetch from all sources to find the job,
    // but the cache will make this fast if the data is recent.
    // Fokus hanya pada sumber data Indonesia
    const [serperJobs, jobstreetJobs, remotiveJobs, arbeitnowJobs, museJobs] = await Promise.all([
      fetchSerperJobs('').catch(() => []), // Fetch with a generic query
      fetchJobstreet('', '').catch(() => []),
      fetchRemotive('').catch(() => []),
      fetchArbeitnow().catch(() => []),
      fetchTheMuse('').catch(() => [])
    ])

    const allJobs = dedupe([...serperJobs, ...jobstreetJobs, ...remotiveJobs, ...arbeitnowJobs, ...museJobs])
    const job = allJobs.find(j => j.id === id)

    if (job) {
      res.json(job)
    } else {
      res.status(404).json({ message: 'Pekerjaan tidak ditemukan.' })
    }
  } catch (err) {
    console.error(`Error fetching job ${id}:`, err)
    res.status(500).json({ message: 'Gagal mengambil detail pekerjaan.' })
  }
})

app.get('/api/categories', (req, res) => {
  // Curated subset of Remotive's category list — expand as needed.
  res.json([
    { label: 'Software Development', value: 'software-dev' },
    { label: 'Customer Service', value: 'customer-support' },
    { label: 'Design', value: 'design' },
    { label: 'Marketing', value: 'marketing' },
    { label: 'Sales / Business', value: 'sales-business' },
    { label: 'Data', value: 'data' },
    { label: 'DevOps / Sysadmin', value: 'devops' },
    { label: 'Finance / Legal', value: 'finance-legal' },
    { label: 'HR', value: 'hr' },
    { label: 'Product', value: 'product' },
    { label: 'Writing', value: 'writing' }
  ])
})

app.post('/api/cv/analyze', upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file CV yang diunggah.' })
  }

  const { query = '', category = '', location = '', posted = null, jobType = null, remoteOnly, page = 1, limit = 20 } = req.body

  try {
    const rawText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname)

    if (!rawText || rawText.trim().length < 30) {
      return res.status(422).json({
        message: 'Teks nyaris tidak bisa diekstrak dari file ini — kemungkinan hasil scan gambar tanpa OCR, atau format terlalu kompleks (kolom/tabel). Coba unggah versi PDF/DOCX berbasis teks asli.'
      })
    }

    const profile = buildProfile(rawText, req.file.originalname)

    // Pool lowongan sama persis dengan pencarian umum GET /api/jobs (FR-011),
    // bukan implementasi/subset terpisah seperti sebelumnya.
    const { jobs: pooledJobs } = await getJobPool({ query, category, location, posted })

    const rankedJobs = rankJobsForCv(pooledJobs, profile)
    const suggestions = buildSuggestions(profile, rankedJobs)

    // Simpan ranking penuh di sesi analisis supaya halaman berikutnya/filter
    // berikutnya (GET /api/cv/recommendations) tidak perlu unggah ulang file CV.
    const analysisId = await createAnalysisSession(profile, rankedJobs, suggestions)

    const filteredJobs = applyJobFilters(rankedJobs, { remoteOnly, jobType, posted })
    const { paginatedJobs, pagination } = paginateJobs(filteredJobs, { page, limit })

    res.json({
      analysisId,
      profile,
      jobs: paginatedJobs,
      pagination,
      suggestions,
      fetchedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error(err)
    res.status(422).json({
      message: err.message || 'Gagal memproses file CV. Pastikan file tidak rusak dan coba lagi.'
    })
  }
})

app.get('/api/cv/recommendations', async (req, res) => {
  const { analysisId, location = '', category = '', jobType = null, remoteOnly, posted = null, page = 1, limit = 20 } = req.query

  const session = await getAnalysisSession(analysisId)
  if (!session) {
    return res.status(404).json({
      message: 'Sesi analisis CV sudah kedaluwarsa. Unggah ulang CV untuk melihat rekomendasi terbaru.'
    })
  }

  let jobs = session.rankedJobs
  if (location) {
    const loc = location.toLowerCase().trim()
    jobs = jobs.filter(j => j.location?.toLowerCase().includes(loc))
  }
  if (category) {
    const cat = category.toLowerCase().trim()
    jobs = jobs.filter(j => j.tags?.some(t => t.toLowerCase().includes(cat)))
  }
  jobs = applyJobFilters(jobs, { remoteOnly, jobType, posted })

  const { paginatedJobs, pagination } = paginateJobs(jobs, { page, limit })

  res.json({
    jobs: paginatedJobs,
    pagination,
    fetchedAt: new Date().toISOString()
  })
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Handles Multer errors (e.g. file too large) with a friendly JSON message
// instead of Express's default HTML error page.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Ukuran file CV maksimal 5MB.' })
    }
    return res.status(400).json({ message: 'Gagal mengunggah file CV.' })
  }
  next(err)
})

app.listen(PORT, () => {
  console.log(`Job Wire backend jalan di http://localhost:${PORT}`)
})
