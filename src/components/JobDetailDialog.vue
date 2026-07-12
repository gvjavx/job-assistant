<template>
  <q-dialog :model-value="modelValue" @update:model-value="v => $emit('update:modelValue', v)">
    <q-card dark class="jw-panel" style="width: 640px; max-width: 95vw;">
      <q-card-section v-if="job" class="q-pb-none">
        <div class="row items-start no-wrap">
          <div class="col">
            <div class="jw-display text-h6 text-weight-bold text-white">{{ job.title }}</div>
            <div class="text-body2 text-grey-5 q-mt-xs">
              {{ job.company }} <span class="text-grey-7">·</span> {{ job.location || 'Lokasi tidak dicantumkan' }}
            </div>
          </div>
          <q-badge v-if="job.remote" color="secondary" text-color="dark" class="jw-mono">REMOTE</q-badge>
        </div>

        <div class="row q-gutter-sm q-mt-sm">
          <q-chip
            v-for="tag in job.tags"
            :key="tag"
            dense
            square
            class="jw-mono text-caption"
            style="background: var(--jw-panel-2); color: var(--jw-text-dim);"
          >
            {{ tag }}
          </q-chip>
        </div>
      </q-card-section>

      <q-separator dark class="q-my-md jw-hairline" />

      <q-card-section v-if="job" style="max-height: 45vh; overflow-y: auto;" class="q-pt-none">
        <div class="text-body2 text-grey-4" style="white-space: pre-line; line-height: 1.6;">
          {{ job.description || 'Deskripsi tidak tersedia dari sumber ini.' }}
        </div>
      </q-card-section>

      <q-card-section v-if="job" class="jw-mono text-caption text-grey-6 q-pt-none">
        Sumber: {{ job.source }} · Diambil {{ relativePosted }}
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat no-caps label="Tutup" color="grey-5" v-close-popup />
        <q-btn
          v-if="job?.applyUrl"
          unelevated
          no-caps
          color="primary"
          text-color="dark"
          label="Lamar di situs asal"
          icon-right="open_in_new"
          :href="job.applyUrl"
          target="_blank"
          rel="noopener"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  job: { type: Object, default: null }
})

defineEmits(['update:modelValue'])

const relativePosted = computed(() => {
  if (!props.job?.postedAt) return 'tanggal tidak diketahui'
  const d = new Date(props.job.postedAt)
  if (Number.isNaN(d.getTime())) return 'tanggal tidak diketahui'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
})
</script>
