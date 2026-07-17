export { extractSkills } from './skillMatcher.js'

export function stripHtml (html) {
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

export function normalizeRemotive (job) {
  return {
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name,
    location: job.candidate_required_location || 'Remote',
    remote: true,
    tags: job.tags || [],
    jobType: job.job_type || null, // e.g., 'full_time'
    description: stripHtml(job.description),
    postedAt: job.publication_date,
    applyUrl: job.url,
    source: 'Remotive'
  }
}

export function normalizeArbeitnow (job) {
  return {
    id: `arbeitnow-${job.slug}`,
    title: job.title,
    company: job.company_name,
    location: job.location || (job.remote ? 'Remote' : 'Tidak dicantumkan'),
    remote: !!job.remote,
    tags: job.tags || job.job_types || [],
    jobType: job.job_types?.length > 0 ? job.job_types[0] : null,
    description: stripHtml(job.description),
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
    applyUrl: job.url,
    source: 'Arbeitnow'
  }
}

export function normalizeTheMuse (job) {
  return {
    id: `themuse-${job.id}`,
    title: job.name,
    company: job.company.name,
    location: job.locations.map(l => l.name).join(', ') || 'Fleksibel',
    remote: job.locations.some(l => l.name.toLowerCase().includes('remote')),
    tags: job.tags.map(t => t.name) || [],
    jobType: job.type === 'full-time' ? 'full-time' : (job.type === 'part-time' ? 'part-time' : null),
    description: stripHtml(job.contents),
    postedAt: job.publication_date,
    applyUrl: job.refs.landing_page,
    source: 'The Muse'
  }
}

export function parseTitleAndCompany (title) {
  // Regex untuk memisahkan judul dari perusahaan. Mencari ' at ', ' | ', atau ' - '.
  // Ini menangkap teks sebelum pemisah sebagai judul, dan teks setelahnya sebagai perusahaan.
  const match = title.match(/^(.*?)\s(?:at|\||-)\s(.*?)(?:\s(?:\||-)|$)/)

  if (match && match[1] && match[2]) {
    // match[1] adalah judul pekerjaan, match[2] adalah nama perusahaan
    return {
      jobTitle: match[1].trim(),
      companyName: match[2].trim()
    }
  }

  // Jika tidak ada pemisah yang cocok, kembalikan judul asli dan perusahaan 'Unknown'.
  return { jobTitle: title, companyName: 'Unknown' }
}

export function normalizeSerper (result) {
  const title = result.title || ''
  const { jobTitle, companyName } = parseTitleAndCompany(title)

  // Identify source from link
  let source = 'Google Search'
  if (result.link.includes('linkedin.com')) source = 'LinkedIn'
  else if (result.link.includes('jobstreet.co.id')) source = 'JobStreet'
  else if (result.link.includes('glints.com')) source = 'Glints'
  else if (result.link.includes('kalibrr.id')) source = 'Kalibrr'
  else if (result.link.includes('indeed.com')) source = 'Indeed'
  // Cek topkarir.com lebih dulu — "karir.com" adalah substring dari "topkarir.com".
  else if (result.link.includes('topkarir.com')) source = 'TopKarir'
  else if (result.link.includes('karir.com')) source = 'Karir.com'

  // Infer job type from title/snippet for Serper results
  const fullText = `${title.toLowerCase()} ${result.snippet.toLowerCase()}`
  let jobType = null
  if (/\b(full[\s-]?time|penuh waktu)\b/.test(fullText)) {
    jobType = 'full-time'
  } else if (/\b(part[\s-]?time|paruh waktu)\b/.test(fullText)) {
    jobType = 'part-time'
  }

  return {
    id: `serper-${Buffer.from(result.link).toString('base64').substring(0, 16)}`,
    title: jobTitle,
    company: companyName,
    location: result.location || 'Indonesia', // Defaulting to Indonesia as per requirement
    remote: title.toLowerCase().includes('remote') || result.snippet.toLowerCase().includes('remote'),
    tags: [],
    description: result.snippet,
    postedAt: null, // Google snippet date is hard to parse reliably without extra logic
    applyUrl: result.link,
    source,
    jobType
  }
}

export function normalizeJobPortalIndonesia (job) {
  // Placeholder normalizer untuk API fiktif "Job Portal Indonesia"
  // Sesuaikan field ini dengan respons API yang sebenarnya.
  return {
    id: `jpi-${job.job_id}`,
    title: job.posisi,
    company: job.nama_perusahaan,
    location: job.lokasi_kerja,
    remote: job.tipe_kerja === 'remote',
    tags: job.kategori || [],
    jobType: null, // Placeholder, sesuaikan jika API punya data ini
    description: stripHtml(job.deskripsi_pekerjaan),
    postedAt: job.tanggal_publikasi,
    applyUrl: job.link_lamaran,
    source: 'JobPortalID'
  }
}

export function normalizeJobstreet (job) {
  // Normalizer untuk data dari API internal Jobstreet
  return {
    id: `jobstreet-${job.id}`,
    title: job.title,
    company: job.companyMeta?.name || 'Perusahaan tidak dicantumkan',
    location: job.jobLocation || 'Lokasi tidak dicantumkan',
    remote: !!job.isRemote,
    // Ambil klasifikasi pertama sebagai tag utama
    tags: job.classifications?.map(c => c.name) || [],
    // Deskripsi seringkali tidak ada di hasil pencarian, perlu diambil dari halaman detail
    description: job.description || `Lihat detail di situs Jobstreet untuk deskripsi lengkap.`,
    postedAt: job.postedDate,
    // URL lamaran biasanya ada di dalam metadata 'sol'
    applyUrl: job.solMetadata?.applyUrl || `https://www.jobstreet.co.id/id/job/${job.id}`,
    source: 'Jobstreet (Direct)',
    jobType: null // API pencarian tidak menyediakan info ini secara langsung
  }
}

export function normalizeForDedupe (str) {
  if (!str) return ''
  return str
    .toLowerCase()
    // Hapus istilah umum dalam tanda kurung
    .replace(/\((remote|hybrid|senior|sr\.|junior|jr\.|wfh|hiring|magang|internship)\)/g, '')
    // Hapus awalan badan hukum Indonesia (mis. "PT. Gizmo" -> "Gizmo")
    .replace(/^(pt|cv|ud)\.?\s+/, '')
    // Hapus akhiran umum perusahaan
    .replace(/,?\s*(inc|corp|llc|ltd|pt|tbk)\.?$/g, '')
    // Hapus karakter non-alfanumerik kecuali spasi
    .replace(/[^a-z0-9\s]/g, '')
    // Normalisasi spasi ganda menjadi tunggal
    .replace(/\s+/g, ' ')
    .trim()
}

export function dedupe (jobs) {
  const seen = new Set()
  return jobs.filter(j => {
    // Gunakan normalisasi yang lebih kuat untuk membuat key
    const key = `${normalizeForDedupe(j.title)}|${normalizeForDedupe(j.company)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}