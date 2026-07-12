import { ref } from 'vue'

// Module-level singleton so both CvPage and IndexPage can read whether
// a CV has been analyzed this session, without pulling in a full store library.
const profile = ref(null)       // { fileName, skills, sections, stats }
const suggestions = ref([])
const rankedJobs = ref([])
const analyzedAt = ref(null)

export function useCvProfile () {
  function setResult ({ profile: p, suggestions: s, jobs, fetchedAt }) {
    profile.value = p
    suggestions.value = s
    rankedJobs.value = jobs
    analyzedAt.value = fetchedAt
  }

  function clear () {
    profile.value = null
    suggestions.value = []
    rankedJobs.value = []
    analyzedAt.value = null
  }

  return { profile, suggestions, rankedJobs, analyzedAt, setResult, clear }
}
