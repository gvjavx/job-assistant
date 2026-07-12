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
import 'dotenv/config'
import { extractText } from './extractText.js'
import { buildProfile, rankJobsForCv, buildSuggestions } from './cvAnalyzer.js'

const app = express()
const PORT = process.env.PORT || 3001

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
})

app.use(cors())
app.use(express.json())

// ---- tiny in-memory cache -------------------------------------------------
const cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCached (key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.time > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function setCached (key, value) {
  cache.set(key, { value, time: Date.now() })
}

// ---- normalization ---------------------------------------------------------
function normalizeRemotive (job) {
  return {
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || 'Remote',
    remote: true,
    tags: job.tags || [],
    description: stripHtml(job.description),
    postedAt: job.publication_date,
    applyUrl: job.url,
    source: 'Remotive'
  }
}

function normalizeArbeitnow (job) {
  return {
    id: `arbeitnow-${job.slug}`,
    title: job.title,
    company: job.company_name,
    location: job.location || (job.remote ? 'Remote' : 'Tidak dicantumkan'),
    remote: !!job.remote,
    tags: job.tags || job.job_types || [],
    description: stripHtml(job.description),
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
    applyUrl: job.url,
    source: 'Arbeitnow'
  }
}

function normalizeTheMuse (job) {
  return {
    id: `themuse-${job.id}`,
    title: job.name,
    company: job.company.name,
    location: job.locations.map(l => l.name).join(', ') || 'Fleksibel',
    remote: job.locations.some(l => l.name.toLowerCase().includes('remote')),
    tags: job.tags.map(t => t.name) || [],
    description: stripHtml(job.contents),
    postedAt: job.publication_date,
    applyUrl: job.refs.landing_page,
    source: 'The Muse'
  }
}

function normalizeSerper (result) {
  // Extract company from title if possible (e.g. "Software Engineer at Google")
  let company = 'Unknown'
  const title = result.title || ''
  
  // Basic patterns for company extraction from snippets or titles
  if (title.includes(' at ')) {
    company = title.split(' at ')[1].split(' | ')[0].split(' - ')[0].trim()
  } else if (title.includes(' | ')) {
    company = title.split(' | ')[1].trim()
  } else if (title.includes(' - ')) {
    company = title.split(' - ')[1].trim()
  }

  // Identify source from link
  let source = 'Google Search'
  if (result.link.includes('linkedin.com')) source = 'LinkedIn'
  else if (result.link.includes('jobstreet.co.id')) source = 'JobStreet'
  else if (result.link.includes('glints.com')) source = 'Glints'
  else if (result.link.includes('kalibrr.id')) source = 'Kalibrr'

  return {
    id: `serper-${Buffer.from(result.link).toString('base64').substring(0, 16)}`,
    title: title.split(' at ')[0].split(' | ')[0].split(' - ')[0].trim(),
    company,
    location: 'Indonesia', // Defaulting to Indonesia as per requirement
    remote: title.toLowerCase().includes('remote') || result.snippet.toLowerCase().includes('remote'),
    tags: [],
    description: result.snippet,
    postedAt: null, // Google snippet date is hard to parse reliably without extra logic
    applyUrl: result.link,
    source
  }
}

function stripHtml (html) {
  if (!html) return ''
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function dedupe (jobs) {
  const seen = new Set()
  return jobs.filter(j => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---- data sources -----------------------------------------------------------
async function fetchSerperJobs (query, posted) {
  const apiKey = "2e71ab6ad2ed11f1f7ef5db31dddd67af0eeb828"
  if (!apiKey) {
    console.warn('SERPER_API_KEY not found in environment variables.')
    return []
  }

  // Construct query targeting specific Indonesian job boards
  // site:id.linkedin.com/jobs OR site:jobstreet.co.id OR site:glints.com OR site:kalibrr.id
  const sites = [
    'site:id.linkedin.com/jobs',
    'site:jobstreet.co.id',
    'site:glints.com',
    'site:kalibrr.id'
  ]
  
  const siteQuery = `(${sites.join(' OR ')})`
  const fullQuery = `${query} Indonesia ${siteQuery}`

  const cacheKey = `serper:${fullQuery}:${posted}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
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
        tbs: posted === '7' ? 'qdr:w' : undefined // last 7 days if requested
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API responded ${response.status}`)
    }

    const data = await response.json()
    const jobs = (data.organic || []).map(normalizeSerper)
    setCached(cacheKey, jobs)
    return jobs
  } catch (err) {
    console.error('Error fetching from Serper:', err)
    return []
  }
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

// ---- routes -------------------------------------------------------------
app.get('/api/jobs', async (req, res) => {
  const { query = '', category = '', location = '', posted = null, remoteOnly, sort = 'date' } = req.query

  try {
    const [serperJobs] = await Promise.all([
      // fetchRemotive(query, category).catch(() => []),
      // fetchArbeitnow().catch(() => []),
      // fetchTheMuse(query, category).catch(() => []),
      fetchSerperJobs(query || category, posted).catch(() => [])
    ])

    const q = query.toLowerCase().trim()
    const loc = location.toLowerCase().trim()

    const filterFn = j => {
      const matchesQuery = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
      const matchesLocation = !loc || j.location.toLowerCase().includes(loc)
      return matchesQuery && matchesLocation
    }

    // const arbeitnowJobs = arbeitnowJobsAll.filter(filterFn)
    // const museJobs = museJobsAll.filter(filterFn)

    // Filter Remotive jobs as well, since its API search is broad
    // const filteredRemotiveJobs = remotiveJobs.filter(j => {
    //   return !loc || j.location.toLowerCase().includes(loc)
    // })
    let jobs = dedupe([...serperJobs])

    if (remoteOnly === 'true') {
      jobs = jobs.filter(j => j.remote)
    }

    // Filter by date range if 'posted' param is present
    if (posted) {
      const days = parseInt(posted, 10)
      if (!isNaN(days)) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        jobs = jobs.filter(j => j.postedAt && new Date(j.postedAt) >= cutoff)
      }
    }

    // By default, filter out jobs older than 90 days as they are likely expired.
    const defaultCutoff = new Date()
    defaultCutoff.setDate(defaultCutoff.getDate() - 90)
    jobs = jobs.filter(j => {
      if (!j.postedAt) return true // Keep if no date is available
      return new Date(j.postedAt) > defaultCutoff
    })

    jobs.sort((a, b) => {
      if (sort === 'company') return a.company.localeCompare(b.company)
      // default: newest first
      return new Date(b.postedAt || 0) - new Date(a.postedAt || 0)
    })

    res.json({
      jobs,
      fetchedAt: new Date().toISOString(),
      sources: ['Remotive', 'Arbeitnow', 'The Muse', 'LinkedIn', 'JobStreet', 'Glints', 'Kalibrr']
    })
  } catch (err) {
    console.error(err)
    res.status(502).json({
      message: 'Sumber lowongan sedang tidak bisa diakses. Coba lagi dalam beberapa saat.'
    })
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

  const { query = '', category = '' } = req.body

  try {
    const rawText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname)

    if (!rawText || rawText.trim().length < 30) {
      return res.status(422).json({
        message: 'Teks nyaris tidak bisa diekstrak dari file ini — kemungkinan hasil scan gambar tanpa OCR, atau format terlalu kompleks (kolom/tabel). Coba unggah versi PDF/DOCX berbasis teks asli.'
      })
    }

    const profile = buildProfile(rawText, req.file.originalname)

    const [serperJobs] = await Promise.all([
      // fetchRemotive(query, category).catch(() => []),
      // fetchArbeitnow().catch(() => []),
      // fetchTheMuse(query, category).catch(() => []),
      fetchSerperJobs(query || category, null).catch(() => [])
    ])
    const jobPool = dedupe([...serperJobs])

    const rankedJobs = rankJobsForCv(jobPool, profile)
    const suggestions = buildSuggestions(profile, rankedJobs)

    res.json({
      profile,
      jobs: rankedJobs.slice(0, 60),
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
