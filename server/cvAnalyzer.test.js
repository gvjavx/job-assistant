import { scoreJob, rankJobsForCv } from './cvAnalyzer.js'

function makeJob (overrides = {}) {
  return {
    id: 'job-1',
    title: 'Untitled',
    company: 'Acme',
    tags: [],
    description: '',
    ...overrides
  }
}

describe('scoreJob', () => {
  test('should return matchScore null (not a default 35) when no skill is detected in the job at all', () => {
    const job = makeJob({ title: 'Staff Umum', description: 'Bergabunglah dengan tim kami yang hebat.' })
    const result = scoreJob(job, new Set(['react']))
    expect(result.matchScore).toBeNull()
    expect(result.matchedSkills).toEqual([])
    expect(result.missingSkills).toEqual([])
  })

  test('should return a numeric score reflecting real overlap when skills are detected', () => {
    const job = makeJob({ title: 'React Developer', description: 'Kami mencari developer React dan Node.js.' })
    const result = scoreJob(job, new Set(['react']))
    expect(typeof result.matchScore).toBe('number')
    expect(result.matchScore).toBeGreaterThan(0)
    expect(result.matchedSkills).toContain('React')
    expect(result.missingSkills).toContain('Node.js')
  })

  test('should score a full-overlap job at 100', () => {
    const job = makeJob({ title: 'React Developer' })
    const result = scoreJob(job, new Set(['react']))
    expect(result.matchScore).toBe(100)
  })
})

describe('rankJobsForCv', () => {
  test('should sort numeric-score jobs before null-score jobs', () => {
    const profile = { skills: ['React'] }
    const jobs = [
      makeJob({ id: 'no-signal', title: 'Posisi Umum', description: 'Tidak ada kata kunci teknis di sini.' }),
      makeJob({ id: 'match', title: 'React Developer' })
    ]
    const ranked = rankJobsForCv(jobs, profile)
    expect(ranked[0].id).toBe('match')
    expect(ranked[0].matchScore).toBe(100)
    expect(ranked[1].id).toBe('no-signal')
    expect(ranked[1].matchScore).toBeNull()
  })
})
