<template>
  <div class="jw-panel rounded-borders q-pa-md">
    <div class="row items-center justify-between q-mb-sm">
      <div class="jw-display text-caption text-weight-bold text-grey-6" style="letter-spacing: 0.08em;">
        SARING
      </div>
      <q-btn
        flat dense round
        color="secondary"
        icon="star_border"
        size="sm"
        @click="$emit('save-favorite')"
      >
        <q-tooltip>Simpan pencarian ini</q-tooltip>
      </q-btn>
    </div>

    <q-input
      :model-value="modelValue.query"
      @update:model-value="v => emitUpdate('query', v)"
      dense
      filled
      clearable
      placeholder="Judul, skill, atau perusahaan"
      class="q-mb-sm"
      @keyup.enter="$emit('search')"
    >
      <template #prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <q-input
      :model-value="modelValue.location"
      @update:model-value="v => emitUpdate('location', v)"
      dense
      filled
      clearable
      placeholder="Lokasi (e.g. Jakarta, Remote)"
      class="q-mb-sm"
      @keyup.enter="$emit('search')"
    >
      <template #prepend>
        <q-icon name="location_on" />
      </template>
    </q-input>

    <q-select
      :model-value="modelValue.category"
      @update:model-value="v => emitUpdate('category', v)"
      :options="categoryOptions"
      emit-value
      map-options
      dense
      filled
      label="Kategori"
      class="q-mb-sm"
    />

    <q-select
      :model-value="modelValue.posted"
      @update:model-value="v => emitUpdate('posted', v)"
      :options="[ { label: 'Kapan saja', value: null }, { label: '24 jam terakhir', value: 1 }, { label: '7 hari terakhir', value: 7 }, { label: '14 hari terakhir', value: 14 }, { label: '30 hari terakhir', value: 30 } ]"
      emit-value
      map-options
      dense
      filled
      clearable
      label="Tanggal Upload"
      class="q-mb-sm"
    />

    <q-select
      :model-value="modelValue.jobType"
      @update:model-value="v => emitUpdate('jobType', v)"
      :options="[
        { label: 'Semua jenis pekerjaan', value: null },
        { label: 'Penuh waktu', value: 'full-time' },
        { label: 'Paruh waktu', value: 'part-time' }
      ]"
      emit-value
      map-options
      dense
      filled
      label="Jenis Pekerjaan"
      class="q-mb-sm"
    />

    <q-toggle
      :model-value="modelValue.remoteOnly"
      @update:model-value="v => emitUpdate('remoteOnly', v)"
      label="Hanya remote"
      color="secondary"
      class="q-mb-sm"
    />

    <div class="jw-mono text-caption text-grey-6 q-mb-xs">Urutkan</div>
    <q-btn-toggle
      :model-value="modelValue.sort"
      @update:model-value="v => emitUpdate('sort', v)"
      spread
      no-caps
      dense
      unelevated
      toggle-color="primary"
      color="grey-2"
      text-color="grey-7"
      toggle-text-color="white"
      :options="[
        { label: 'Relevansi', value: 'relevance' },
        { label: 'Terbaru', value: 'date' },
        { label: 'Perusahaan', value: 'company' }
      ]"
      class="q-mb-md"
    />

    <q-btn
      label="Cari Lowongan"
      color="primary"
      unelevated
      no-caps
      class="full-width jw-display text-weight-bold"
      @click="$emit('search')"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  categoryOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'search', 'save-favorite'])

function emitUpdate (key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
