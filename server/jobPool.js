import { dedupe } from './normalizers.js'

// Lowongan yang lebih tua dari ini dianggap kemungkinan besar sudah kedaluwarsa.
export const DEFAULT_EXPIRY_DAYS = 90

/**
 * Gabungkan hasil dari beberapa sumber, buang duplikat, dan keluarkan lowongan
 * yang sudah kedaluwarsa. Murni (tanpa I/O) supaya mudah diuji.
 */
export function mergeAndFilterExpired (jobsBySource, maxAgeDays = DEFAULT_EXPIRY_DAYS) {
  let jobs = dedupe(jobsBySource.flat())

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxAgeDays)
  jobs = jobs.filter(j => !j.postedAt || new Date(j.postedAt) > cutoff)

  return jobs
}

/** Pesan singkat untuk pengguna ketika satu/lebih sumber gagal diambil (FR-002). */
export function buildCoverageNote (failedSources) {
  if (!failedSources.length) return null
  return `Beberapa sumber lowongan sedang tidak bisa diakses (${failedSources.join(', ')}) — hasil pencarian mungkin belum mencakup semuanya.`
}

// Filter tambahan yang dipakai bersama oleh GET /api/jobs dan
// GET /api/cv/recommendations, supaya perilaku filter konsisten di kedua alur (FR-017).
export function applyJobFilters (jobs, { remoteOnly, jobType, posted } = {}) {
  let filtered = jobs

  if (remoteOnly === 'true' || remoteOnly === true) {
    filtered = filtered.filter(j => j.remote)
  }

  if (jobType && jobType !== 'all') {
    filtered = filtered.filter(j => {
      if (!j.jobType) return false // Jika tidak ada info, jangan ikutkan
      return j.jobType.toLowerCase().includes(jobType) // 'full-time' akan cocok dengan 'full_time'
    })
  }

  if (posted) {
    const days = parseInt(posted, 10)
    if (!isNaN(days)) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      filtered = filtered.filter(j => j.postedAt && new Date(j.postedAt) >= cutoff)
    }
  }

  return filtered
}

export function paginateJobs (jobs, { page = 1, limit = 20 } = {}) {
  const totalItems = jobs.length
  const pageNum = parseInt(page, 10) || 1
  const limitNum = parseInt(limit, 10) || 20
  const startIndex = (pageNum - 1) * limitNum

  return {
    paginatedJobs: jobs.slice(startIndex, startIndex + limitNum),
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limitNum),
      currentPage: pageNum
    }
  }
}
