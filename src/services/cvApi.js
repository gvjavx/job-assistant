import { api } from 'boot/axios'

/**
 * Uploads a CV file and gets back:
 *  - profile: detected skills, sections, and basic stats
 *  - jobs: the job pool ranked by match score against this CV
 *  - suggestions: actionable CV improvement tips
 *
 * @param {File} file
 * @param {Object} [scope] optional { query, category } to narrow the job pool used for matching
 */
export async function analyzeCv (file, scope = {}) {
  const form = new FormData()
  form.append('cv', file)
  if (scope.query) form.append('query', scope.query)
  if (scope.category) form.append('category', scope.category)

  const { data } = await api.post('/cv/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}
