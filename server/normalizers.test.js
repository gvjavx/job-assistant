import { normalizeSerper, extractSkills, normalizeForDedupe, dedupe } from './normalizers.js'

describe('normalizeSerper', () => {
  const baseResult = {
    title: 'Software Engineer at Acme Corp',
    link: 'https://linkedin.com/jobs/view/123',
    snippet: 'Acme Corp is hiring a Software Engineer. This is a full-time position.',
    location: 'Jakarta, Indonesia'
  }

  test('should correctly parse title and company with "at"', () => {
    const result = normalizeSerper(baseResult)
    expect(result.title).toBe('Software Engineer')
    expect(result.company).toBe('Acme Corp')
  })

  test('should correctly parse title and company with "|"', () => {
    const modifiedResult = { ...baseResult, title: 'Frontend Developer | Gizmo Inc.' }
    const result = normalizeSerper(modifiedResult)
    expect(result.title).toBe('Frontend Developer')
    expect(result.company).toBe('Gizmo Inc.')
  })

  test('should correctly parse title and company with "-"', () => {
    const modifiedResult = { ...baseResult, title: 'Data Scientist - Stark Industries' }
    const result = normalizeSerper(modifiedResult)
    expect(result.title).toBe('Data Scientist')
    expect(result.company).toBe('Stark Industries')
  })

  test('should handle titles without a clear separator', () => {
    const modifiedResult = { ...baseResult, title: 'Product Manager job opening' }
    const result = normalizeSerper(modifiedResult)
    expect(result.title).toBe('Product Manager job opening')
    expect(result.company).toBe('Unknown')
  })

  test('should identify source from link', () => {
    const linkedin = normalizeSerper({ ...baseResult, link: 'https://id.linkedin.com/jobs/view/xyz' })
    expect(linkedin.source).toBe('LinkedIn')

    const jobstreet = normalizeSerper({ ...baseResult, link: 'https://www.jobstreet.co.id/id/job/123' })
    expect(jobstreet.source).toBe('JobStreet')

    const glints = normalizeSerper({ ...baseResult, link: 'https://glints.com/id/opportunities/jobs/abc' })
    expect(glints.source).toBe('Glints')

    const kalibrr = normalizeSerper({ ...baseResult, link: 'https://www.kalibrr.id/id-ID/job/456' })
    expect(kalibrr.source).toBe('Kalibrr')

    const indeed = normalizeSerper({ ...baseResult, link: 'https://id.indeed.com/viewjob?jk=789' })
    expect(indeed.source).toBe('Indeed')

    const karir = normalizeSerper({ ...baseResult, link: 'https://www.karir.com/lowongan/123' })
    expect(karir.source).toBe('Karir.com')

    const topkarir = normalizeSerper({ ...baseResult, link: 'https://www.topkarir.com/company/job/456' })
    expect(topkarir.source).toBe('TopKarir')

    const other = normalizeSerper({ ...baseResult, link: 'https://example.com/job' })
    expect(other.source).toBe('Google Search')
  })

  test('should infer jobType from snippet', () => {
    const fullTime = normalizeSerper({ ...baseResult, snippet: 'This is a full time role.' })
    expect(fullTime.jobType).toBe('full-time')

    const partTime = normalizeSerper({ ...baseResult, snippet: 'We are looking for a paruh waktu designer.' })
    expect(partTime.jobType).toBe('part-time')

    const none = normalizeSerper({ ...baseResult, snippet: 'A regular job description.' })
    expect(none.jobType).toBe(null)
  })

  test('should default location to Indonesia if not provided', () => {
    const { location, ...rest } = baseResult
    const result = normalizeSerper(rest)
    expect(result.location).toBe('Indonesia')
  })
})

describe('extractSkills', () => {
  // Karena `extractSkills` bergantung pada daftar SKILLS yang sebenarnya,
  // kita akan menguji dengan asumsi beberapa skill umum ada di sana.
  // Contoh: 'Vue', 'Vue.js', 'Go', 'Golang', 'React', 'SQL'

  test('should extract a single, simple skill', () => {
    const text = 'Saya berpengalaman dengan React.'
    expect(extractSkills(text)).toEqual(['React'])
  })

  test('should be case-insensitive', () => {
    const text = 'Keahlian utama saya adalah javascript dan REACT.'
    // Hasilnya harus sesuai dengan casing asli di `skills.js`
    expect(extractSkills(text)).toEqual(expect.arrayContaining(['JavaScript', 'React']))
  })

  test('should handle multiple, non-overlapping skills', () => {
    const text = 'Menggunakan React, Node.js, dan SQL.'
    expect(extractSkills(text)).toEqual(expect.arrayContaining(['React', 'Node.js', 'SQL']))
  })

  test('should return an empty array if no skills are found', () => {
    const text = 'Saya seorang manajer proyek yang berpengalaman.'
    expect(extractSkills(text)).toEqual([])
  })

  test('should respect word boundaries', () => {
    // Tidak boleh cocok dengan 'Go' di dalam 'Golang' jika 'Golang' juga ada.
    const text = 'Saya menulis kode di Golang.'
    expect(extractSkills(text)).toEqual(['Golang'])
    // Tidak boleh cocok dengan 'script' di dalam 'javascript'.
    const text2 = 'Pengalaman dengan javascript.'
    expect(extractSkills(text2)).not.toContain('Script')
  })

  test('should prefer the longer, more specific skill when there is an overlap', () => {
    // Ini adalah tes inti untuk logika penyaringan.
    const text = 'Proyek terakhir saya menggunakan Vue.js.'
    const skills = extractSkills(text)
    expect(skills).toContain('Vue.js')
    expect(skills).not.toContain('Vue')
    expect(skills).toHaveLength(1)
  })
})

describe('normalizeForDedupe', () => {
  test('should convert to lowercase and trim whitespace', () => {
    expect(normalizeForDedupe('  Software Engineer  ')).toBe('software engineer')
  })

  test('should remove common parenthetical terms', () => {
    expect(normalizeForDedupe('Developer (Remote)')).toBe('developer')
    expect(normalizeForDedupe('Manager (Senior)')).toBe('manager')
  })

  test('should remove common company suffixes', () => {
    expect(normalizeForDedupe('Acme Inc.')).toBe('acme')
    expect(normalizeForDedupe('PT. Gizmo')).toBe('gizmo')
    expect(normalizeForDedupe('Stark Industries, Corp')).toBe('stark industries')
  })

  test('should remove non-alphanumeric characters', () => {
    expect(normalizeForDedupe('Front-end/Full-stack Developer')).toBe('frontendfullstack developer')
  })
})

describe('dedupe', () => {
  const jobs = [
    { id: 1, title: 'Software Engineer', company: 'Acme Inc' }, // Unik
    { id: 2, title: 'Software Engineer', company: 'Acme' }, // Duplikat dari 1
    { id: 3, title: 'Frontend Developer (Remote)', company: 'Gizmo' }, // Unik
    { id: 4, title: 'Data Scientist', company: 'Stark Industries' }, // Unik
    { id: 5, title: 'Frontend Developer', company: 'PT. Gizmo' } // Duplikat dari 3
  ]

  test('should remove duplicates based on normalized title and company', () => {
    const dedupedJobs = dedupe(jobs)
    expect(dedupedJobs).toHaveLength(3)
  })

  test('should keep the first occurrence of a job', () => {
    const dedupedJobs = dedupe(jobs)
    const ids = dedupedJobs.map(j => j.id)
    expect(ids).toEqual([1, 3, 4])
  })

  test('should return the same array if no duplicates are found', () => {
    const noDupes = [jobs[0], jobs[2], jobs[3]]
    const dedupedJobs = dedupe(noDupes)
    expect(dedupedJobs).toHaveLength(3)
    expect(dedupedJobs).toEqual(noDupes)
  })
})