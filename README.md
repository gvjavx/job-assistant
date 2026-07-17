# Job Wire

Pengembang utama: [gvjavx](https://github.com/gvjavx)

Aplikasi agregator lowongan kerja: **Vue 3 + Quasar** di frontend, **Express**
di backend. Fokus utamanya pasar kerja Indonesia — lowongan diambil lewat
[Serper](https://serper.dev) (Google Search API, query pencarian umum
`"lowongan kerja {kata kunci} Indonesia"` — bukan operator `site:` gabungan,
karena itu ditolak Serper untuk akun gratis) digabung dengan API internal
JobStreet langsung, lengkap dengan pencarian, filter kategori/jenis
pekerjaan/remote, ticker "wire" yang menampilkan lowongan terbaru, dan tab
**CV Saya** untuk mengunggah CV lalu:

- melihat skill & bagian CV yang terdeteksi (kontak, ringkasan, pengalaman, pendidikan, keahlian) — termasuk padanan istilah Bahasa Indonesia (mis. "manajemen proyek" ≈ "Project Management")
- mendapat daftar lowongan yang diranking berdasarkan skor kecocokan dengan CV, bisa dijelajahi penuh lewat paginasi tanpa perlu mengunggah ulang CV di tiap perubahan filter
- mendapat saran perbaikan CV yang konkret (bagian yang hilang, minim pencapaian terukur, kata kunci yang sering muncul di lowongan incaran tapi belum ada di CV, dsb.)

Semua analisis CV berjalan di backend lokal kamu sendiri (parsing teks +
pencocokan kata kunci) — hanya *kata kunci pencarian* yang dikirim ke API
eksternal untuk mencari lowongan; isi/teks CV tidak pernah dikirim ke pihak
ketiga mana pun.

Remotive, Arbeitnow, dan The Muse (API JSON publik resmi, lowongan remote
global) tetap dipakai, tapi hanya untuk melengkapi pencarian detail satu
lowongan (`GET /api/job/:id`) — tidak dicampur ke hasil pencarian utama
supaya hasil tetap relevan dengan lowongan berbasis Indonesia.

Kalau kamu nanti perlu menambah sumber yang hanya punya halaman HTML
(tanpa API), ada stub `scrapeGeneric()` di `server/index.js` sebagai
tempat menaruh parser Cheerio — tapi cek dulu `robots.txt` dan Terms of
Service situs targetnya sebelum dipakai.

## Struktur proyek

```
job-assistant/
├── src/                       # Frontend (Vue 3 + Quasar)
│   ├── components/            # JobTicker, FilterRail, JobListItem, JobDetailDialog,
│   │                          # CvUploadCard, CvProfileSummary, CvSuggestionsList
│   ├── composables/           # useCvProfile.js — state CV dibagi antar tab
│   ├── layouts/                # MainLayout (tab "Cari Lowongan" / "CV Saya")
│   ├── pages/                  # IndexPage (pencarian), CvPage (analisis CV)
│   └── services/               # jobsApi.js, cvApi.js — pemanggil backend
└── server/                    # Backend (Express)
    ├── index.js                # Routing + orkestrasi sumber data (Serper, JobStreet, dll.)
    ├── jobPool.js               # Logika murni: dedupe, filter kedaluwarsa, coverageNote, paginasi
    ├── skillMatcher.js          # extractSkills() — dipakai bersama oleh normalizers.js & cvAnalyzer.js
    ├── skills.js                # Kamus skill, padanan Bahasa Indonesia, & kata kunci bagian CV
    ├── extractText.js           # Ekstraksi teks dari PDF/DOCX/TXT
    └── cvAnalyzer.js            # Deteksi skill/bagian, skor kecocokan, saran perbaikan
```

## Cara kerja pencocokan CV

1. **Ekstraksi teks** — file PDF/DOCX/TXT diubah jadi teks polos (`pdf-parse` / `mammoth`).
2. **Deteksi skill** — teks dicocokkan ke kamus skill di `server/skills.js` (bisa ditambah sendiri), termasuk padanan/sinonim Bahasa Indonesia yang terdaftar di `SKILL_SYNONYMS`.
3. **Deteksi bagian CV** — cek keberadaan kontak, ringkasan, pengalaman, pendidikan, keahlian lewat kata kunci & regex.
4. **Skor kecocokan per lowongan** — skill di judul/tag/deskripsi lowongan dibandingkan dengan skill di CV; skor = persentase skill lowongan yang juga ada di CV. Lowongan yang sama sekali tidak punya skill terdeteksi (mis. deskripsi terlalu pendek) diberi skor `null` ("Skor belum tersedia"), bukan angka default yang menyesatkan.
5. **Saran perbaikan** — gabungan pengecekan struktural (bagian hilang, CV terlalu pendek/panjang, minim angka/pencapaian terukur, kalimat pasif) dan celah kata kunci (skill yang sering diminta lowongan incaran tapi belum ada di CV).
6. **Paginasi tanpa re-upload** — `POST /api/cv/analyze` menyimpan hasil ranking penuh di sesi analisis sementara (`analysisId`, TTL 15 menit) supaya perubahan halaman/filter berikutnya cukup memanggil `GET /api/cv/recommendations` tanpa mengirim ulang file CV.

Semua berbasis aturan (rule-based), bukan model AI eksternal — jadi jalan
sepenuhnya lokal tanpa API key tambahan. Kalau mau analisis yang lebih pintar
(mis. lewat Claude API), kamu bisa ganti isi `buildSuggestions()` di
`server/cvAnalyzer.js` untuk memanggil LLM dengan teks CV sebagai konteksnya.

## Instalasi & Menjalankan Proyek

Butuh Node.js 18+ (untuk `fetch` bawaan di backend).

### 1. Jalankan backend

```bash
cd server
npm install
npm run dev
# jalan di http://localhost:3001
```

Buat file `.env` di `server/` dan isi `SERPER_API_KEY` (dari [serper.dev](https://serper.dev))
supaya pencarian mencakup hasil dari Google secara umum (LinkedIn, Glints,
Kalibrr, Indeed, Karir.com, TopKarir, dsb. akan dikenali otomatis lewat
domainnya kalau muncul di hasil) — tanpa key ini, hasil pencarian hanya
berasal dari JobStreet langsung dan frontend akan menampilkan pemberitahuan
cakupan terbatas (`coverageNote`). Catatan: akun Serper gratis sudah cukup
untuk query umum yang dipakai proyek ini (bukan operator `site:` gabungan
yang butuh plan berbayar). `REDIS_URL` opsional (fallback ke cache in-memory
kalau tidak diset).

Jalankan test backend dengan `npm test` (Vitest) di folder `server/`.

### 2. Jalankan frontend

Di terminal terpisah, dari folder root proyek:

```bash
npm install
npm install -g @quasar/cli   # kalau belum ada Quasar CLI
npm run dev
# jalan di http://localhost:9000, dan otomatis proxy /api ke backend
```

Buka `http://localhost:9000` — cari lowongan lewat kolom pencarian di kiri,
filter kategori/remote, lalu klik salah satu baris untuk lihat detail dan
tautan lamar ke situs aslinya. Buka tab **CV Saya** untuk unggah CV (PDF/DOCX/TXT,
maks 5MB) dan lihat lowongan yang paling cocok beserta saran perbaikannya.

## Menambah sumber data lain

1. Tambahkan fungsi `fetchXxx()` baru di `server/index.js` yang memanggil
   API sumber tersebut dan mengembalikan array job dalam skema yang sama
   (`id, title, company, location, remote, tags, description, postedAt,
   applyUrl, source`).
2. Daftarkan sumber itu di `sourceCalls` dalam `getJobPool()` (`server/index.js`)
   supaya otomatis dipakai bersama oleh `GET /api/jobs` dan
   `POST /api/cv/analyze` (FR-011) — termasuk dedupe, filter kedaluwarsa, dan
   `coverageNote` otomatis kalau sumber itu gagal diakses (lihat `server/jobPool.js`).
3. Selesai — frontend tidak perlu diubah karena sudah bekerja dengan skema
   job yang seragam.

## Konfigurasi produksi

- Set `VITE_API_BASE` di `.env` frontend kalau backend dideploy di domain
  lain (default-nya `/api`, mengandalkan proxy dev server).
- `server/index.js` cukup dijalankan sebagai proses Node biasa (mis. lewat
  PM2 atau container) di belakang reverse proxy.
