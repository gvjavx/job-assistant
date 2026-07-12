# Job Wire

Pengembang utama: [gvjavx](https://github.com/gvjavx)

Aplikasi agregator lowongan kerja: **Vue 3 + Quasar** di frontend, **Express**
di backend. Menampilkan daftar lowongan dari beberapa job-board API publik
(Remotive, Arbeitnow) dalam satu tampilan, lengkap dengan pencarian, filter
kategori/remote, ticker "wire" yang menampilkan lowongan terbaru, dan tab
**CV Saya** untuk mengunggah CV lalu:

- melihat skill & bagian CV yang terdeteksi (kontak, ringkasan, pengalaman, pendidikan, keahlian)
- mendapat daftar lowongan yang diurutkan berdasarkan skor kecocokan dengan CV
- mendapat saran perbaikan CV yang konkret (bagian yang hilang, minim pencapaian terukur, kata kunci yang sering muncul di lowongan incaran tapi belum ada di CV, dsb.)

Semua analisis CV berjalan di backend lokal kamu sendiri (parsing teks +
pencocokan kata kunci) — tidak ada data CV yang dikirim ke pihak ketiga.

## Kenapa lewat API publik, bukan scraping HTML?

Situs besar seperti LinkedIn dan Indeed melarang scraping di Terms of
Service mereka dan aktif memblokir bot — jadi scraper HTML ke situs
semacam itu gampang error, gampang diblokir, dan berisiko secara hukum.
Remotive dan Arbeitnow sebaliknya **menyediakan API JSON publik secara
resmi** untuk agregator seperti ini, jadi datanya stabil dan legal dipakai.

Kalau kamu nanti perlu menambah sumber yang hanya punya halaman HTML
(tanpa API), ada stub `scrapeGeneric()` di `server/index.js` sebagai
tempat menaruh parser Cheerio — tapi cek dulu `robots.txt` dan Terms of
Service situs targetnya sebelum dipakai.

## Struktur proyek

```
job-scraper/
├── src/                       # Frontend (Vue 3 + Quasar)
│   ├── components/            # JobTicker, FilterRail, JobListItem, JobDetailDialog,
│   │                          # CvUploadCard, CvProfileSummary, CvSuggestionsList
│   ├── composables/           # useCvProfile.js — state CV dibagi antar tab
│   ├── layouts/                # MainLayout (tab "Cari Lowongan" / "CV Saya")
│   ├── pages/                  # IndexPage (pencarian), CvPage (analisis CV)
│   └── services/               # jobsApi.js, cvApi.js — pemanggil backend
└── server/                    # Backend (Express)
    ├── index.js                # Routing + aggregator: Remotive + Arbeitnow
    ├── skills.js                # Kamus skill & kata kunci bagian CV
    ├── extractText.js           # Ekstraksi teks dari PDF/DOCX/TXT
    └── cvAnalyzer.js            # Deteksi skill/bagian, skor kecocokan, saran perbaikan
```

## Cara kerja pencocokan CV

1. **Ekstraksi teks** — file PDF/DOCX/TXT diubah jadi teks polos (`pdf-parse` / `mammoth`).
2. **Deteksi skill** — teks dicocokkan ke kamus skill di `server/skills.js` (bisa ditambah sendiri).
3. **Deteksi bagian CV** — cek keberadaan kontak, ringkasan, pengalaman, pendidikan, keahlian lewat kata kunci & regex.
4. **Skor kecocokan per lowongan** — skill di judul/tag/deskripsi lowongan dibandingkan dengan skill di CV; skor = persentase skill lowongan yang juga ada di CV.
5. **Saran perbaikan** — gabungan pengecekan struktural (bagian hilang, CV terlalu pendek/panjang, minim angka/pencapaian terukur, kalimat pasif) dan celah kata kunci (skill yang sering diminta lowongan incaran tapi belum ada di CV).

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
2. Panggil fungsi itu di `Promise.all([...])` pada handler `/api/jobs`.
3. Selesai — frontend tidak perlu diubah karena sudah bekerja dengan skema
   job yang seragam.

## Konfigurasi produksi

- Set `VITE_API_BASE` di `.env` frontend kalau backend dideploy di domain
  lain (default-nya `/api`, mengandalkan proxy dev server).
- `server/index.js` cukup dijalankan sebagai proses Node biasa (mis. lewat
  PM2 atau container) di belakang reverse proxy.
