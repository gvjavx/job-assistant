import { mergeAndFilterExpired, buildCoverageNote, applyJobFilters, paginateJobs } from './jobPool.js'

function daysAgo (n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

describe('mergeAndFilterExpired', () => {
  test('should dedupe jobs coming from different sources', () => {
    const sourceA = [{ id: 'a1', title: 'Software Engineer', company: 'Acme' }]
    const sourceB = [{ id: 'b1', title: 'Software Engineer', company: 'Acme' }]
    const jobs = mergeAndFilterExpired([sourceA, sourceB])
    expect(jobs).toHaveLength(1)
  })

  test('should exclude jobs older than the expiry window', () => {
    const jobs = mergeAndFilterExpired([[
      { id: 'fresh', title: 'Fresh Job', company: 'A', postedAt: daysAgo(5) },
      { id: 'stale', title: 'Stale Job', company: 'B', postedAt: daysAgo(200) }
    ]], 90)
    expect(jobs.map(j => j.id)).toEqual(['fresh'])
  })

  test('should keep jobs with no postedAt (cannot determine expiry)', () => {
    const jobs = mergeAndFilterExpired([[{ id: 'no-date', title: 'X', company: 'Y', postedAt: null }]])
    expect(jobs).toHaveLength(1)
  })
})

describe('buildCoverageNote', () => {
  test('should return null when no source failed', () => {
    expect(buildCoverageNote([])).toBeNull()
  })

  test('should mention failed sources by name', () => {
    const note = buildCoverageNote(['Jobstreet (Direct)'])
    expect(note).toContain('Jobstreet (Direct)')
  })
})

describe('applyJobFilters', () => {
  const jobs = [
    { id: 1, remote: true, jobType: 'full-time', postedAt: daysAgo(1) },
    { id: 2, remote: false, jobType: 'part-time', postedAt: daysAgo(10) },
    { id: 3, remote: true, jobType: null, postedAt: daysAgo(40) }
  ]

  test('should filter to remote-only jobs', () => {
    const filtered = applyJobFilters(jobs, { remoteOnly: 'true' })
    expect(filtered.map(j => j.id)).toEqual([1, 3])
  })

  test('should filter by jobType and exclude jobs with unknown jobType', () => {
    const filtered = applyJobFilters(jobs, { jobType: 'full-time' })
    expect(filtered.map(j => j.id)).toEqual([1])
  })

  test('should filter by posted-within-days window', () => {
    const filtered = applyJobFilters(jobs, { posted: '5' })
    expect(filtered.map(j => j.id)).toEqual([1])
  })
})

describe('paginateJobs', () => {
  const jobs = Array.from({ length: 45 }, (_, i) => ({ id: i }))

  test('should slice the correct page and report pagination metadata', () => {
    const { paginatedJobs, pagination } = paginateJobs(jobs, { page: 2, limit: 20 })
    expect(paginatedJobs).toHaveLength(20)
    expect(paginatedJobs[0].id).toBe(20)
    expect(pagination).toEqual({ totalItems: 45, totalPages: 3, currentPage: 2 })
  })
})
