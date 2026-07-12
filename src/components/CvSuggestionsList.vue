<template>
  <div class="jw-panel rounded-borders q-pa-md">
    <div class="jw-display text-caption text-weight-bold text-grey-5 q-mb-sm" style="letter-spacing: 0.08em;">
      SARAN PERBAIKAN CV
    </div>

    <q-list separator class="jw-hairline">
      <q-item v-for="(s, i) in suggestions" :key="i" class="q-px-none">
        <q-item-section avatar top>
          <q-icon :name="iconFor(s.type)" :color="colorFor(s.type)" size="1.4em" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-bold text-white">{{ s.title }}</q-item-label>
          <q-item-label caption class="text-grey-5" style="white-space: normal;">
            {{ s.detail }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
defineProps({
  suggestions: { type: Array, default: () => [] }
})

function iconFor (type) {
  return { warning: 'warning', info: 'lightbulb', success: 'check_circle' }[type] || 'info'
}
function colorFor (type) {
  return { warning: 'warning', info: 'info', success: 'positive' }[type] || 'grey-5'
}
</script>
