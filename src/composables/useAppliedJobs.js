import { ref, watch } from 'vue'

const APPLIED_JOBS_KEY = 'jobwire_applied_jobs'

// State is loaded once and shared across the app
const appliedJobIds = ref(new Set(JSON.parse(localStorage.getItem(APPLIED_JOBS_KEY) || '[]')))

// Persist changes to localStorage
watch(appliedJobIds, (newValue) => {
  localStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(Array.from(newValue)))
}, { deep: true })

export function useAppliedJobs () {
  function isApplied (jobId) {
    return appliedJobIds.value.has(jobId)
  }

  function toggleApplied (jobId) {
    appliedJobIds.value.has(jobId) ? appliedJobIds.value.delete(jobId) : appliedJobIds.value.add(jobId)
  }

  return { isApplied, toggleApplied }
}