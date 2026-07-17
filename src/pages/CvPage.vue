<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-3">
        <cv-upload-card
          :filters="filters"
          @analyzed="onAnalyzed"
          @analysis-start="loading = true"
          @analysis-end="loading = false"
        />

        <filter-rail
          v-model="filters"
          :category-options="categoryOptions"
          class="q-mt-md"
          @search="onFilterSearch"
        />
      </div>

      <div class="col-12 col-md-8">
        <div v-if="loading" class="jw-panel rounded-borders q-pa-xl text-center">
          <q-spinner color="primary" size="2em" />
          <div class="jw-mono text-caption text-grey-6 q-mt-sm">MENGANALISIS CV & MENCARI LOWONGAN...</div>
        </div>
        <div v-else-if="!profile" class="jw-panel rounded-borders q-pa-xl text-center">
          <q-icon name="psychology" size="2.4em" color="grey-6" />
          <div class="text-body1 text-grey-4 q-mt-sm">
            Unggah CV di panel kiri untuk melihat skill yang terdeteksi, saran perbaikan,
            dan daftar lowongan yang paling cocok dengan CV-mu.
          </div>
        </div>

        <template v-else>
          <cv-profile-summary :profile="profile" class="q-mb-md" />
          <cv-suggestions-list :suggestions="suggestions" class="q-mb-md" />

          <div class="row items-center justify-between q-mb-sm">
            <div class="jw-display text-subtitle1 text-weight-bold text-white">
              Lowongan paling cocok
            </div>
            <div class="jw-mono text-caption text-grey-6" v-if="pagination.totalItems">
              {{ pagination.totalItems }} LOWONGAN COCOK
            </div>
          </div>
          <div class="jw-panel rounded-borders">
            <job-list-item
              v-for="(job, i) in rankedJobs"
              :key="job.id"
              :job="job"
              :index="i"
              @open="openDetail"
            />
          </div>

          <div class="q-pa-lg flex flex-center" v-if="rankedJobs.length">
            <q-pagination
              v-if="pagination.totalPages > 1"
              v-model="pagination.currentPage"
              :max="pagination.totalPages"
              :max-pages="7"
              direction-links
              boundary-links
              icon-prev="arrow_left"
              icon-next="arrow_right"
            />
          </div>
        </template>
      </div>
    </div>

    <job-detail-dialog v-model="detailOpen" :job="selectedJob" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import CvUploadCard from 'components/CvUploadCard.vue'
import FilterRail from 'components/FilterRail.vue'
import CvProfileSummary from 'components/CvProfileSummary.vue'
import CvSuggestionsList from 'components/CvSuggestionsList.vue'
import JobListItem from 'components/JobListItem.vue'
import JobDetailDialog from 'components/JobDetailDialog.vue'
import { useCvProfile } from 'src/composables/useCvProfile'
import { analyzeCv, fetchCvRecommendations } from 'src/services/cvApi'
import { fetchCategories } from 'src/services/jobsApi'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const { profile, suggestions, rankedJobs, analysisId, pagination, setResult, setRecommendationsPage, clearResult } = useCvProfile()

const loading = ref(false)
const detailOpen = ref(false)
const selectedJob = ref(null)
const uploadedCvFile = ref(null) // Simpan file CV yang diunggah

const filters = ref({
  query: '',
  category: null,
  location: '',
  posted: null,
  jobType: null,
  remoteOnly: false,
  sort: 'relevance' // Default sort untuk halaman CV
})

const categoryOptions = ref([{ label: 'Semua kategori', value: null }])

// Analisis penuh (unggah ulang file) — hanya dipakai saat CV pertama kali
// diunggah, atau saat sesi rekomendasi sudah kedaluwarsa.
async function performAnalysis () {
  if (!uploadedCvFile.value) return

  loading.value = true
  try {
    const result = await analyzeCv(uploadedCvFile.value, filters.value)
    setResult(result)
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.response?.data?.message || 'Gagal menganalisis CV.' })
    clearResult()
  } finally {
    loading.value = false
  }
}

// Mengambil halaman/filter rekomendasi berikutnya TANPA mengunggah ulang file
// CV, memakai sesi analisis (analysisId) yang sudah ada.
async function loadRecommendations (isNewFilterChange = false) {
  if (!uploadedCvFile.value) return

  if (!analysisId.value) {
    await performAnalysis()
    return
  }

  if (isNewFilterChange) pagination.value.currentPage = 1

  loading.value = true
  try {
    const result = await fetchCvRecommendations({
      analysisId: analysisId.value,
      page: pagination.value.currentPage,
      filters: {
        location: filters.value.location,
        category: filters.value.category,
        jobType: filters.value.jobType,
        remoteOnly: filters.value.remoteOnly,
        posted: filters.value.posted
      }
    })
    setRecommendationsPage(result)
  } catch (e) {
    if (e?.response?.status === 404) {
      $q.notify({ type: 'warning', message: 'Sesi rekomendasi sudah kedaluwarsa — menganalisis ulang CV...' })
      await performAnalysis()
    } else {
      $q.notify({ type: 'negative', message: e?.response?.data?.message || 'Gagal memuat rekomendasi.' })
    }
  } finally {
    loading.value = false
  }
}

async function onAnalyzed ({ file }) {
  // Saat CV pertama kali diunggah, simpan file dan lakukan analisis penuh.
  uploadedCvFile.value = file
  await performAnalysis()
}

function onFilterSearch () {
  loadRecommendations(true)
}

// --- Re-analisis otomatis dengan debounce saat filter berubah ---
let debounceTimer = null
watch(filters, () => {
  if (!uploadedCvFile.value) return

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    loadRecommendations(true)
  }, 500) // Tunggu 500ms setelah pengguna selesai mengubah filter
}, { deep: true })

// Pindah halaman rekomendasi (tanpa reset filter/halaman ke 1).
watch(() => pagination.value.currentPage, () => {
  if (!uploadedCvFile.value) return
  loadRecommendations(false)
})
// ---------------------------------------------

function openDetail (job) {
  selectedJob.value = job
  detailOpen.value = true
}

async function loadCategories () {
  try {
    const cats = await fetchCategories()
    categoryOptions.value = [
      { label: 'Semua kategori', value: null },
      ...cats.map(c => ({ label: c.label, value: c.value }))
    ]
  } catch { /* abaikan jika gagal */ }
}

onMounted(loadCategories)
</script>
