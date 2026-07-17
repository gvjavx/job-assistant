import { api } from 'boot/axios'

/**
 * Uploads a CV file and gets back:
 *  - analysisId: dipakai untuk mengambil halaman/filter rekomendasi berikutnya
 *    lewat fetchCvRecommendations() tanpa mengunggah ulang file
 *  - profile: detected skills, sections, and basic stats
 *  - jobs/pagination: halaman pertama dari pool lowongan yang diranking untuk CV ini
 *  - suggestions: actionable CV improvement tips
 *
 * @param {File} file
 * @param {Object} [scope] { query, category, location, jobType, remoteOnly, posted } untuk menyaring pool lowongan
 */
export async function analyzeCv (file, scope = {}) {
  const form = new FormData()
  form.append('cv', file)
  if (scope.query) form.append('query', scope.query)
  if (scope.category) form.append('category', scope.category)
  if (scope.location) form.append('location', scope.location)
  if (scope.jobType) form.append('jobType', scope.jobType)
  if (scope.remoteOnly) form.append('remoteOnly', scope.remoteOnly)
  if (scope.posted) form.append('posted', scope.posted)

  const { data } = await api.post('/cv/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

/**
 * Mengambil halaman/filter rekomendasi berikutnya dari sesi analisis CV yang
 * sudah ada, tanpa mengunggah ulang file CV (lihat contracts/api.md).
 *
 * @param {Object} params
 * @param {string} params.analysisId
 * @param {number} [params.page]
 * @param {Object} [params.filters] { location, category, jobType, remoteOnly, posted }
 */
export async function fetchCvRecommendations ({ analysisId, page = 1, filters = {} }) {
  const { data } = await api.get('/cv/recommendations', {
    params: { analysisId, page, ...filters }
  })
  return data
}
