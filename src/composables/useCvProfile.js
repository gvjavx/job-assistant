import { ref } from 'vue'

// Module-level singleton so both CvPage and IndexPage can read whether
// a CV has been analyzed this session, without pulling in a full store library.
const profile = ref(null)       // { fileName, skills, sections, stats }
const suggestions = ref([])
const rankedJobs = ref([])
const analyzedAt = ref(null)
const analysisId = ref(null)    // dipakai untuk GET /api/cv/recommendations (paginasi tanpa re-upload)
const pagination = ref({ currentPage: 1, totalPages: 1, totalItems: 0 })

export function useCvProfile () {
  function setResult ({ profile: p, suggestions: s, jobs, fetchedAt, analysisId: id, pagination: pg }) {
    profile.value = p
    suggestions.value = s
    rankedJobs.value = jobs
    analyzedAt.value = fetchedAt
    analysisId.value = id ?? null
    if (pg) pagination.value = pg
  }

  function setRecommendationsPage ({ jobs, pagination: pg }) {
    rankedJobs.value = jobs
    if (pg) pagination.value = pg
  }

  function clearResult () {
    profile.value = null
    suggestions.value = []
    rankedJobs.value = []
    analyzedAt.value = null
    analysisId.value = null
    pagination.value = { currentPage: 1, totalPages: 1, totalItems: 0 }
  }

  return { profile, suggestions, rankedJobs, analyzedAt, analysisId, pagination, setResult, setRecommendationsPage, clearResult }
}
