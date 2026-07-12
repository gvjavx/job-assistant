<template>
  <q-page class="q-pa-md">
    <q-banner
      v-if="cvProfile"
      dense
      class="jw-panel rounded-borders q-mb-md text-grey-4"
    >
      <template #avatar>
        <q-icon name="description" color="secondary" />
      </template>
      CV "{{ cvProfile.fileName }}" sudah dianalisis.
      <router-link to="/cv" class="text-primary">Lihat lowongan yang paling cocok →</router-link>
    </q-banner>

    <job-ticker :jobs="tickerJobs" class="q-mb-lg rounded-borders" />

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-3">
        <filter-rail
          v-model="filters"
          :category-options="categoryOptions"
          @search="loadJobs"
          @save-favorite="saveFavorite"
        />

        <div v-if="favorites.length" class="jw-panel rounded-borders q-pa-md q-mt-md">
          <div class="jw-display text-caption text-weight-bold text-grey-6 q-mb-sm" style="letter-spacing: 0.08em;">
            FAVORIT
          </div>
          <q-list dense>
            <q-item
              v-for="fav in favorites"
              :key="fav.id"
              clickable
              class="rounded-borders q-mb-xs"
              @click="loadFavorite(fav)"
            >
              <q-item-section>
                <q-item-label lines="1" class="text-caption">{{ fav.name }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  flat dense round
                  icon="close"
                  size="xs"
                  @click.stop="removeFavorite(fav.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="row items-center justify-between q-mt-md">
          <div class="jw-mono text-caption text-grey-6">
            {{ resultSummary }}aaaaaaaa
          </div>
          <q-btn
            flat dense round
            icon="refresh"
            @click="loadJobs"
          />
        </div>
      </div>

      <div class="col-12 col-md-9">
        <div v-if="loading" class="jw-panel rounded-borders q-pa-xl text-center">
          <q-spinner color="primary" size="2em" />
          <div class="jw-mono text-caption text-grey-6 q-mt-sm">MENARIK DATA DARI SUMBER…</div>
        </div>

        <div v-else-if="error" class="jw-panel rounded-borders q-pa-xl text-center">
          <q-icon name="error_outline" size="2em" color="negative" />
          <div class="text-body2 text-grey-4 q-mt-sm">{{ error }}</div>
          <q-btn
            class="q-mt-md"
            no-caps
            unelevated
            color="primary"
            text-color="dark"
            label="Coba lagi"
            @click="loadJobs"
          />
        </div>

        <div v-else-if="!jobs.length" class="jw-panel rounded-borders q-pa-xl text-center">
          <q-icon name="search_off" size="2em" color="grey-6" />
          <div class="text-body2 text-grey-4 q-mt-sm">
            Tidak ada lowongan yang cocok. Ubah kata kunci atau nonaktifkan filter "hanya remote".
          </div>
        </div>

        <div v-else class="jw-panel rounded-borders">
          <job-list-item
            v-for="(job, i) in jobs"
            :key="job.id"
            :job="job"
            :index="i"
            @open="openDetail"
          />
        </div>
      </div>
    </div>

    <job-detail-dialog v-model="detailOpen" :job="selectedJob" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import JobTicker from 'components/JobTicker.vue'
import FilterRail from 'components/FilterRail.vue'
import JobListItem from 'components/JobListItem.vue'
import JobDetailDialog from 'components/JobDetailDialog.vue'
import { fetchJobs, fetchCategories } from 'src/services/jobsApi'
import { useQuasar } from 'quasar'
import { useCvProfile } from 'src/composables/useCvProfile'

const $q = useQuasar()
const { profile: cvProfile } = useCvProfile()

const filters = ref({
  query: '',
  category: null,
  location: '',
  posted: null,
  minSalary: '',
  maxSalary: '',
  remoteOnly: false,
  sort: 'date'
})

const favorites = ref(JSON.parse(localStorage.getItem('jsa_favorite_searches') || '[]'))

function saveFavorite () {
  const newFav = {
    id: Date.now(),
    name: filters.value.query || filters.value.location || 'Semua Lowongan',
    filters: { ...filters.value }
  }
  favorites.value.push(newFav)
  localStorage.setItem('jsa_favorite_searches', JSON.stringify(favorites.value))
  $q.notify({ type: 'positive', message: 'Pencarian disimpan ke favorit', position: 'top' })
}

function loadFavorite (fav) {
  filters.value = { ...fav.filters }
  loadJobs()
}

function removeFavorite (id) {
  favorites.value = favorites.value.filter(f => f.id !== id)
  localStorage.setItem('jsa_favorite_searches', JSON.stringify(favorites.value))
}


const categoryOptions = ref([{ label: 'Semua kategori', value: null }])
const jobs = ref([])
const loading = ref(false)
const error = ref('')
const fetchedAt = ref(null)

const detailOpen = ref(false)
const selectedJob = ref(null)

const tickerJobs = computed(() => jobs.value.slice(0, 12))

const resultSummary = computed(() => {
  if (loading.value) return 'Memuat…'
  if (!fetchedAt.value) return ''
  const time = new Date(fetchedAt.value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${jobs.value.length} LOWONGAN · DIPERBARUI ${time}`
})

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
  } catch {
    // Categories are a nice-to-have; silently keep the default "Semua kategori" option.
  }
}

async function loadJobs () {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchJobs({
      query: filters.value.query || undefined,
      category: filters.value.category || undefined,
      location: filters.value.location || undefined,
      posted: filters.value.posted || undefined,
      remoteOnly: filters.value.remoteOnly || undefined,
      sort: filters.value.sort
    })
    jobs.value = data.jobs
    fetchedAt.value = data.fetchedAt
  } catch (e) {
    error.value = e?.response?.data?.message
      || 'Backend tidak bisa dihubungi. Pastikan server/index.js sudah berjalan di port 3001.'
    $q.notify({ type: 'negative', message: 'Gagal memuat lowongan', position: 'top' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadJobs()
})
</script>
