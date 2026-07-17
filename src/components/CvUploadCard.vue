<template>
  <div class="jw-panel rounded-borders q-pa-md" :class="{ 'bg-grey-10': loading }">
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

const props = defineProps({ filters: { type: Object, required: true } })
const emit = defineEmits(['analyzed'])
const $q = useQuasar()

const file = ref(null)
const loading = ref(false)
const error = ref('')

function onRejected () {
  $q.notify({ type: 'negative', message: 'File ditolak — pastikan formatnya PDF/DOCX/TXT dan di bawah 5MB.' })
}

async function analyze () {
  // Komponen ini sekarang hanya bertugas memberi tahu induknya
  // bahwa file telah dipilih dan analisis harus dimulai.
  // State loading dan pemanggilan API dikelola oleh induk.
  if (!file.value) return
  emit('analyzed', { file: file.value })
}
</script>
