<template>
  <div
    class="jw-ticker jw-hairline"
    style="border-top: 1px solid; border-bottom: 1px solid; background: var(--jw-panel); overflow: hidden;"
  >
    <div class="row no-wrap items-center q-py-xs">
      <div
        class="jw-mono text-caption text-weight-medium q-px-md"
        style="background: var(--jw-amber); color: #10202B; white-space: nowrap; flex-shrink: 0;"
      >
        WIRE •
      </div>
      <div class="jw-ticker-track jw-mono text-caption text-grey-5 q-pl-md">
        <span v-for="(item, i) in loopedItems" :key="i" class="q-pr-xl">
          {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  jobs: { type: Array, default: () => [] }
})

// Duplicate the list so the CSS animation (-50%) loops seamlessly.
const loopedItems = computed(() => {
  const base = props.jobs.length
    ? props.jobs.map(j => `${j.title.toUpperCase()} — ${j.company}`)
    : ['MENUNGGU DATA LOWONGAN BARU…']
  return [...base, ...base]
})
</script>
