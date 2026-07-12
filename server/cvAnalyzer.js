import { SKILLS, STRONG_ACTION_VERBS, WEAK_PHRASES, SECTION_KEYWORDS } from './skills.js'

function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build once: a regex per skill with word boundaries, case-insensitive.
const SKILL_MATCHERS = SKILLS.map(skill => ({
  label: skill,
  regex: new RegExp(`(?<![a-z0-9])${escapeRegExp(skill.toLowerCase())}(?![a-z0-9])`, 'i')
}))

export function extractSkills (text = '') {
  const lower = text.toLowerCase()
  const found = []
  for (const { label, regex } of SKILL_MATCHERS) {
    if (regex.test(lower)) found.push(label)
  }

  // Drop shorter labels that are just a substring of a longer match on the
  // same term (e.g. "Vue" swallowed by "Vue.js") so the same mention isn't counted twice.
  return found.filter(label => {
    const l = label.toLowerCase()
    return !found.some(other => {
      const o = other.toLowerCase()
      return o !== l && o.includes(l)
    })
  })
}

export function detectSections (text = '') {
  const lower = text.toLowerCase()
  const result = {}
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    result[section] = keywords.some(k => lower.includes(k))
  }
  // Contact is better checked with real regexes rather than keyword hits.
  result.contact = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(text) || /(\+?\d[\d\s-]{7,}\d)/.test(text)
  return result
}

export function computeCvStats (text = '') {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length

  const quantifiedMatches = text.match(/\d+([.,]\d+)?\s?(%|persen|percent|x|juta|ribu|users?|pengguna|orang|tim|hari|bulan|minggu)/gi) || []

  const lines = text.split(/\n|•|- /).map(l => l.trim()).filter(l => l.length > 3)
  const experienceLines = lines.filter(l => l.length > 15 && l.length < 200) // Heuristic for experience bullet points
  let strongVerbLines = 0
  let weakPhraseLines = 0
  const weakPhraseSamples = []
  for (const line of experienceLines) {
    const firstWord = line.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
    if (firstWord && STRONG_ACTION_VERBS.includes(firstWord)) strongVerbLines++
    if (WEAK_PHRASES.some(p => line.toLowerCase().startsWith(p))) {
      weakPhraseLines++
      weakPhraseSamples.push(line)
    }
  }

  return {
    wordCount,
    quantifiedAchievementCount: quantifiedMatches.length,
    strongVerbLines,
    weakPhraseLines,
    lineCount: lines.length,
    weakPhraseSamples
  }
}

export function buildProfile (rawText, fileName) {
  const skills = extractSkills(rawText)
  const sections = detectSections(rawText)
  const stats = computeCvStats(rawText)
  return { fileName, skills, sections, stats }
}

/**
 * Score a single job against a CV profile.
 * Returns the job with matchScore (0-100), matchedSkills, missingSkills attached.
 */
export function scoreJob (job, cvSkillsLower) {
  const TITLE_WEIGHT = 3
  const TAG_WEIGHT = 2
  const DESC_WEIGHT = 1

  const titleSkills = new Set(extractSkills(job.title).map(s => s.toLowerCase()))
  const tagSkills = new Set(extractSkills(job.tags.join(' ')).map(s => s.toLowerCase()))
  const descSkills = new Set(extractSkills(job.description).map(s => s.toLowerCase()))

  const allJobSkills = new Set([...titleSkills, ...tagSkills, ...descSkills])
  if (allJobSkills.size === 0) {
    return { ...job, matchScore: 35, matchedSkills: [], missingSkills: [] }
  }

  let score = 0
  let maxScore = 0
  const matched = new Set()

  allJobSkills.forEach(skill => {
    const weight = titleSkills.has(skill) ? TITLE_WEIGHT : (tagSkills.has(skill) ? TAG_WEIGHT : DESC_WEIGHT)
    maxScore += weight
    if (cvSkillsLower.has(skill)) {
      score += weight
      matched.add(skill)
    }
  })

  const matchedSkillsList = SKILLS.filter(s => matched.has(s.toLowerCase()))
  const missingSkillsList = SKILLS.filter(s => allJobSkills.has(s.toLowerCase()) && !matched.has(s.toLowerCase()))

  return {
    ...job,
    matchScore: maxScore > 0 ? Math.round((score / maxScore) * 100) : 35,
    matchedSkills: matchedSkillsList,
    missingSkills: missingSkillsList.slice(0, 6)
  }
}

export function rankJobsForCv (jobs, profile) {
  const cvSkillsLower = new Set(profile.skills.map(s => s.toLowerCase()))
  return jobs
    .map(job => scoreJob(job, cvSkillsLower))
    .sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Generate plain-language, actionable suggestions to improve the CV —
 * both structural (sections, achievements, phrasing) and content-based
 * (keywords that keep showing up in the targeted job pool but are absent
 * from the CV).
 */
export function buildSuggestions (profile, rankedJobs) {
  const suggestions = []
  const { sections, stats } = profile

  if (!sections.contact) {
    suggestions.push({
      type: 'warning',
      title: 'Info kontak tidak terdeteksi',
      detail: 'Pastikan email dan nomor telepon tercantum jelas di bagian atas CV, bukan di dalam gambar/logo, supaya sistem ATS dan recruiter bisa langsung menghubungimu.'
    })
  }

  if (!sections.summary) {
    suggestions.push({
      type: 'info',
      title: 'Belum ada ringkasan profil',
      detail: 'Tambahkan 2-3 kalimat di bagian atas CV yang merangkum peran, tahun pengalaman, dan keahlian utamamu. Ini membantu recruiter menilai kecocokan dalam hitungan detik.'
    })
  }

  if (!sections.experience) {
    suggestions.push({
      type: 'warning',
      title: 'Bagian pengalaman kerja tidak terdeteksi',
      detail: 'Beri judul bagian yang jelas seperti "Pengalaman Kerja" — ATS dan recruiter sering mencari heading ini secara literal.'
    })
  }

  if (!sections.skills) {
    suggestions.push({
      type: 'info',
      title: 'Tidak ada bagian keahlian tersendiri',
      detail: 'Kumpulkan tools/skill yang kamu kuasai dalam satu daftar terpisah — memudahkan ATS mencocokkan kata kunci dari lowongan.'
    })
  }

  if (stats.wordCount < 150) {
    suggestions.push({
      type: 'warning',
      title: 'CV terlihat terlalu singkat',
      detail: `Hanya terdeteksi sekitar ${stats.wordCount} kata. Tambahkan detail tanggung jawab dan pencapaian di tiap pengalaman kerja supaya lebih meyakinkan.`
    })
  } else if (stats.wordCount > 1200) {
    suggestions.push({
      type: 'info',
      title: 'CV cukup panjang',
      detail: `Terdeteksi sekitar ${stats.wordCount} kata. Pertimbangkan memangkas ke 1-2 halaman dan fokus pada pengalaman paling relevan untuk posisi yang dituju.`
    })
  }

  if (stats.quantifiedAchievementCount === 0) {
    suggestions.push({
      type: 'warning',
      title: 'Belum ada pencapaian yang terukur',
      detail: 'Tambahkan angka konkret, contoh: "meningkatkan konversi 18%" atau "memimpin tim beranggotakan 5 orang" — CV dengan angka lebih meyakinkan daripada deskripsi tugas umum.'
    })
  }

  if (stats.weakPhraseLines > 0 && stats.weakPhraseLines >= stats.strongVerbLines) {
    suggestions.push({
      type: 'info',
      title: 'Gunakan lebih banyak kalimat aktif',
      detail: `Beberapa kalimatmu dimulai dengan frasa pasif. Ganti frasa seperti "bertanggung jawab atas..." dengan kata kerja aksi yang kuat. Contohnya, ubah kalimat "${stats.weakPhraseSamples[0]}" menjadi "Memimpin...", "Membangun...", atau "Meningkatkan...".`
    })
  }

  // Keyword gap: skills that show up often across the matched job pool but are missing from the CV.
  const freq = new Map()
  for (const job of rankedJobs.slice(0, 40)) {
    for (const skill of job.missingSkills) {
      freq.set(skill, (freq.get(skill) || 0) + 1)
    }
  }
  const topMissing = [...freq.entries()]
    .filter(([, count]) => count >= 3) // Only suggest if it appears in at least 3 top jobs
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill)

  if (topMissing.length) {
    suggestions.push({
      type: 'info',
      title: 'Kata kunci yang sering dicari tapi belum ada di CV-mu',
      detail: `${topMissing.join(', ')}. Kalau kamu memang punya pengalaman dengan ini, tambahkan secara eksplisit — banyak sistem ATS menyaring CV murni berdasarkan kecocokan kata kunci.`
    })
  }

  if (profile.skills.length === 0) {
    suggestions.push({
      type: 'warning',
      title: 'Tidak ada skill yang terdeteksi otomatis',
      detail: 'Coba tuliskan nama tools/teknologi/kompetensi secara eksplisit (bukan hanya di dalam kalimat panjang), misalnya sebagai daftar singkat, supaya lebih mudah dipindai.'
    })
  }

  if (!suggestions.length) {
    suggestions.push({
      type: 'success',
      title: 'Struktur CV sudah cukup lengkap',
      detail: 'Semua bagian utama (kontak, ringkasan, pengalaman, keahlian) terdeteksi. Fokus selanjutnya: pastikan tiap poin pengalaman punya hasil yang terukur.'
    })
  }

  return suggestions
}
