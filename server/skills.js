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

// Padanan Bahasa Indonesia untuk skill di atas. extractSkills() mencocokkan
// CV/lowongan terhadap SEMUA varian di bawah ini, bukan hanya nama skill baku,
// supaya CV tidak dianggap "minim skill" hanya karena berbeda istilah/ejaan.
//
// Sengaja HANYA berisi frasa (bukan singkatan 2-3 huruf seperti "JS"/"PM"/"HR"):
// singkatan pendek gampang salah cocok di dalam token lain yang dipisah tanda
// baca (mis. "JS" tanpa sengaja cocok di dalam "Vue.js" karena "." dianggap
// batas kata oleh regex pencocokan skill) — lihat server/skillMatcher.test.js.
export const SKILL_SYNONYMS = {
  'Project Management': ['Manajemen Proyek'],
  'Product Management': ['Manajemen Produk'],
  'Business Analysis': ['Analisis Bisnis'],
  'Business Development': ['Pengembangan Bisnis'],
  'Customer Service': ['Layanan Pelanggan'],
  'Customer Support': ['Dukungan Pelanggan'],
  'Human Resources': ['Sumber Daya Manusia'],
  'Financial Analysis': ['Analisis Keuangan'],
  'Accounting': ['Akuntansi'],
  'Bookkeeping': ['Pembukuan'],
  'Budgeting': ['Penganggaran'],
  'Taxation': ['Perpajakan'],
  'Supply Chain': ['Rantai Pasok'],
  'Procurement': ['Pengadaan'],
  'Inventory Management': ['Manajemen Persediaan', 'Manajemen Inventaris'],
  'Recruitment': ['Rekrutmen'],
  'Talent Acquisition': ['Akuisisi Talenta'],
  'Payroll': ['Penggajian'],
  'Leadership': ['Kepemimpinan'],
  'Communication': ['Komunikasi'],
  'Team Management': ['Manajemen Tim'],
  'Problem Solving': ['Pemecahan Masalah'],
  'Critical Thinking': ['Berpikir Kritis'],
  'Negotiation': ['Negosiasi'],
  'Public Speaking': ['Berbicara di Depan Umum'],
  'Time Management': ['Manajemen Waktu'],
  'Data Analysis': ['Analisis Data'],
  'Digital Marketing': ['Pemasaran Digital'],
  'Content Marketing': ['Pemasaran Konten'],
  'Social Media Marketing': ['Pemasaran Media Sosial'],
  'Sales': ['Penjualan'],
  'Account Management': ['Manajemen Akun'],
  'Stakeholder Management': ['Manajemen Pemangku Kepentingan'],
  'UI/UX': ['Desain UI/UX'],
  'Machine Learning': ['Pembelajaran Mesin']
}

export const SECTION_KEYWORDS = {
  summary: ['ringkasan', 'summary', 'profil', 'about me', 'objective', 'tentang saya'],
  experience: ['pengalaman kerja', 'work experience', 'experience', 'riwayat pekerjaan', 'employment history'],
  education: ['pendidikan', 'education', 'riwayat pendidikan', 'academic background'],
  skills: ['keahlian', 'kemampuan', 'skills', 'kompetensi', 'technical skills'],
  contact: ['email', 'phone', 'telepon', 'no. hp', 'linkedin']
}
