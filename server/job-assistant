module.exports = {
  apps: [{
    name: 'job-assistant-backend',
    script: 'index.js',
    // Nonaktifkan mode cluster untuk pengembangan/pengujian lokal
    // exec_mode: 'cluster',
    // instances: 'max',
    watch: false, // Di produksi, restart harus dilakukan secara manual
    env_production: {
      // Variabel lingkungan untuk produksi
      NODE_ENV: 'production',
      PORT: 3001,
      // Ganti dengan URL frontend produksi Anda
      FRONTEND_URL: 'https://www.domain-frontend-anda.com',
      // Pastikan baris ini dikomentari atau dihapus untuk menonaktifkan Redis
      // REDIS_URL: 'redis://localhost:6379',
      // Ganti dengan kunci API dan secret Anda yang sebenarnya
      SERPER_API_KEY: '<isi_dengan_kunci_API_Anda_yang_sesungguhnya>',
      SHARED_SECRET: '<isi_dengan_kunci_rahasia_panjang_yang_sulit_ditebak_anda>'
    }
  }]
}