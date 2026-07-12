/**
 * Curated skill dictionary used to:
 *  1. Detect skills mentioned in an uploaded CV
 *  2. Detect skills required by a job (from its title/tags/description)
 *  3. Compute an overlap score between the two
 *
 * This is intentionally a plain keyword list (not an ML model) so the
 * whole thing runs locally, with no external API calls and no CV data
 * leaving your own backend.
 */

export const SKILLS = [
  // Frontend
  'JavaScript', 'TypeScript', 'Vue', 'Vue.js', 'React', 'React Native', 'Angular',
  'Quasar', 'Nuxt', 'Next.js', 'Svelte', 'HTML', 'CSS', 'SCSS', 'Sass', 'Tailwind',
  'Bootstrap', 'Webpack', 'Vite', 'Redux', 'Pinia', 'jQuery',

  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Laravel', 'PHP',
  'Ruby on Rails', 'Ruby', 'Spring Boot', 'Java', 'Kotlin', '.NET', 'C#', 'Go',
  'Golang', 'Rust', 'Python', 'GraphQL', 'REST API', 'Microservices',

  // Data / Mobile / Infra
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Firebase',
  'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Jenkins',
  'Terraform', 'Linux', 'Git', 'GitHub Actions', 'Flutter', 'Swift', 'Android',
  'iOS Development', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
  'Data Analysis', 'Data Science', 'Pandas', 'NumPy', 'Power BI', 'Tableau', 'Excel',

  // Design
  'UI/UX', 'UI Design', 'UX Research', 'Figma', 'Adobe XD', 'Photoshop',
  'Illustrator', 'Wireframing', 'Prototyping', 'Design System',

  // Product / PM / Business
  'Product Management', 'Project Management', 'Agile', 'Scrum', 'Kanban', 'Jira',
  'Business Analysis', 'Stakeholder Management', 'Roadmapping', 'A/B Testing',

  // Marketing / Sales / Support
  'Digital Marketing', 'SEO', 'SEM', 'Content Marketing', 'Copywriting',
  'Social Media Marketing', 'Email Marketing', 'Google Analytics', 'Google Ads',
  'CRM', 'Salesforce', 'Sales', 'Business Development', 'Customer Service',
  'Customer Support', 'Account Management',

  // Finance / Ops / HR
  'Financial Analysis', 'Accounting', 'Bookkeeping', 'Budgeting', 'Taxation',
  'Supply Chain', 'Logistics', 'Procurement', 'Inventory Management',
  'Human Resources', 'Recruitment', 'Talent Acquisition', 'Payroll',

  // Soft / general professional skills
  'Leadership', 'Communication', 'Team Management', 'Problem Solving',
  'Critical Thinking', 'Negotiation', 'Public Speaking', 'Time Management',
  'Bahasa Inggris', 'English', 'Bahasa Indonesia', 'Mandarin'
]

// Verbs that make a bullet point read as an accomplishment rather than a duty.
export const STRONG_ACTION_VERBS = [
  'led', 'built', 'designed', 'launched', 'developed', 'implemented',
  'improved', 'increased', 'reduced', 'optimized', 'automated', 'migrated',
  'architected', 'managed', 'mentored', 'delivered', 'shipped', 'scaled',
  'memimpin', 'membangun', 'merancang', 'meluncurkan', 'mengembangkan',
  'menerapkan', 'meningkatkan', 'mengurangi', 'mengoptimalkan', 'mengotomatisasi',
  'mengelola', 'membimbing', 'mengirimkan'
]

export const WEAK_PHRASES = [
  'responsible for', 'in charge of', 'duties included', 'tasked with',
  'bertanggung jawab', 'bertugas', 'membantu dalam', 'tugas saya adalah'
]

export const SECTION_KEYWORDS = {
  summary: ['ringkasan', 'summary', 'profil', 'about me', 'objective', 'tentang saya'],
  experience: ['pengalaman kerja', 'work experience', 'experience', 'riwayat pekerjaan', 'employment history'],
  education: ['pendidikan', 'education', 'riwayat pendidikan', 'academic background'],
  skills: ['keahlian', 'kemampuan', 'skills', 'kompetensi', 'technical skills'],
  contact: ['email', 'phone', 'telepon', 'no. hp', 'linkedin']
}
