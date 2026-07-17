import { extractSkills } from './skillMatcher.js'

describe('extractSkills (padanan Bahasa Indonesia)', () => {
  test('should match an Indonesian phrase synonym to its canonical English skill', () => {
    const text = 'Berpengalaman dalam manajemen proyek lintas tim selama 5 tahun.'
    expect(extractSkills(text)).toContain('Project Management')
  })

  test('should still match the canonical English term directly', () => {
    const text = 'Strong background in Project Management and Business Analysis.'
    const skills = extractSkills(text)
    expect(skills).toContain('Project Management')
    expect(skills).toContain('Business Analysis')
  })

  test('should not false-positive a short synonym inside an unrelated compound token', () => {
    // Regresi: dulu ada sinonim singkat "JS" untuk "JavaScript" yang tanpa
    // sengaja cocok di dalam "Vue.js" karena "." dianggap batas kata.
    const text = 'Proyek terakhir saya menggunakan Vue.js.'
    const skills = extractSkills(text)
    expect(skills).toEqual(['Vue.js'])
  })
})
