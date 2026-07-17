import { SKILLS, SKILL_SYNONYMS } from './skills.js'

function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build once: per skill kanonik, cocokkan nama skill itu sendiri DAN semua
// varian/sinonimnya (lihat SKILL_SYNONYMS di skills.js), masing-masing
// dengan word boundary dan case-insensitive.
const SKILL_MATCHERS = SKILLS.map(skill => {
  const variants = [skill, ...(SKILL_SYNONYMS[skill] || [])]
  return {
    label: skill,
    regexes: variants.map(variant => new RegExp(`(?<![a-z0-9])${escapeRegExp(variant.toLowerCase())}(?![a-z0-9])`, 'i'))
  }
})

export function extractSkills (text = '') {
  const lower = text.toLowerCase()
  const found = []
  for (const { label, regexes } of SKILL_MATCHERS) {
    if (regexes.some(regex => regex.test(lower))) found.push(label)
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
