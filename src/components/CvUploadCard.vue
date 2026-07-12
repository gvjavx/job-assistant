<template>
  <div class="jw-panel rounded-borders q-pa-md">
    <div class="jw-display text-caption text-weight-bold text-grey-5 q-mb-sm" style="letter-spacing: 0.08em;">
      UNGGAH CV
    </div>

    <q-file
      v-model="file"
      dense
      filled
      accept=".pdf,.docx,.txt"
      label="Pilih file (PDF, DOCX, atau TXT — maks 5MB)"
      class="q-mb-sm jw-input"
      @rejected="onRejected"
    >
      <template #prepend>
        <q-icon name="description" />
      </template>
    </q-file>

    <q-input
      v-model="query"
      dense
      filled
      clearable
      class="q-mb-sm jw-input"
      placeholder="Posisi yang dituju (opsional), mis. 'frontend developer'"
    >
      <template #prepend>
        <q-icon name="work_outline" />
      </template>
    </q-input>

    <q-btn
      label="Analisis CV & Cari Lowongan Cocok"
      color="primary"
      text-color="dark"
      unelevated
      no-caps
      :loading="loading"
      :disable="!file"
      class="full-width jw-display text-weight-bold"
      @click="analyze"
    />

    <div class="jw-mono text-caption text-grey-7 q-mt-sm">
      CV diproses di backend milikmu sendiri — tidak dikirim ke pihak ketiga mana pun.
    </div>

    <div v-if="error" class="text-negative text-caption q-mt-sm">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { analyzeCv } from 'src/services/cvApi'

const emit = defineEmits(['analyzed'])
const $q = useQuasar()

const file = ref(null)
const query = ref('')
const loading = ref(false)
const error = ref('')

function onRejected () {
  $q.notify({ type: 'negative', message: 'File ditolak — pastikan formatnya PDF/DOCX/TXT dan di bawah 5MB.' })
}

async function analyze () {
  if (!file.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await analyzeCv(file.value, { query: query.value })
    emit('analyzed', result)
    $q.notify({ type: 'positive', message: 'CV berhasil dianalisis.' })
  } catch (e) {
    error.value = e?.response?.data?.message || 'Gagal menganalisis CV. Coba lagi.'
  } finally {
    loading.value = false
  }
}
</script>
