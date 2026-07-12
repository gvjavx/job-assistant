import { api } from 'boot/axios'

/**
 * Fetches normalized job listings from the backend aggregator (server/index.js),
 * which in turn pulls from public job-board APIs (Remotive, Arbeitnow, RemoteOK).
 *
 * @param {Object} params
 * @param {string} [params.query]     free-text keyword, e.g. "vue developer"
 * @param {string} [params.category]  category filter, e.g. "software-dev"
 * @param {boolean} [params.remoteOnly]
 * @returns {Promise<{ jobs: Array, fetchedAt: string, sources: string[] }>}
 */
export async function fetchJobs (params = {}) {
  const { data } = await api.get('/jobs', { params })
  return data
}

export async function fetchCategories () {
  const { data } = await api.get('/categories')
  return data
}
