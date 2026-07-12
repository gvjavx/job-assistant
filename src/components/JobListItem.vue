<template>
  <q-item
    clickable
    class="job-list-item"
    :class="{
      'bg-white': index % 2 === 0,
      'bg-light': index % 2 !== 0,
      'job-list-item--applied': applied
    }"
    @click="$emit('open', job)"
  >
    <q-item-section>
      <q-item-label lines="1" class="jw-display text-weight-bold ">
        <q-icon
          v-if="applied"
          name="check_circle"
          color="positive"
          size="xs"
          class="q-mr-xs"
        />
        {{ job.title }}
      </q-item-label>
      <q-item-label lines="1" class="text-grey-5">
        <q-icon name="business" size="xs" class="q-mr-xs" />
        {{ job.company }}
        <span class="q-mx-sm text-grey-7">|</span>
        <q-icon name="location_on" size="xs" class="q-mr-xs" />
        {{ job.location }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="column items-end">
        <q-chip
          v-if="job.source"
          dense
          outline
          :color="job.matchScore ? 'secondary' : 'grey-6'"
          :text-color="job.matchScore ? 'secondary' : 'grey-6'"
          class="jw-mono text-caption q-mb-xs"
        >
          {{ job.source }}
        </q-chip>
        <div class="text-grey-6 text-caption q-mb-xs">{{ job.postedAt ? timeAgo(job.postedAt) : '' }}</div>
        <q-btn
          flat dense
          no-caps
          size="sm"
          :icon="applied ? 'bookmark_remove' : 'bookmark_add'"
          :label="applied ? 'Batal Tandai' : 'Tandai Dilamar'"
          @click.stop="toggleApplied(job.id)"
        >
          <q-tooltip anchor="top middle" self="bottom middle" :offset="[10, 10]">
            {{ applied ? 'Hapus tanda sudah dilamar' : 'Tandai lowongan ini sudah dilamar' }}
          </q-tooltip>
        </q-btn>
      </div>
    </q-item-section>
  </q-item>
</template>

<script setup>
import { computed } from 'vue'
import { timeAgo } from 'src/services/formatters.js'
import { useAppliedJobs } from 'src/composables/useAppliedJobs.js'

const props = defineProps({
  job: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    default: 0
  }
})

defineEmits(['open'])

const { isApplied, toggleApplied } = useAppliedJobs()

const applied = computed(() => isApplied(props.job.id))

</script>
<style lang="scss">
.job-list-item {
  border-bottom: 1px solid var(--jw-border);
  transition: background-color 0.3s;

  &:last-child {
    border-bottom: none;
  }

  &--applied {
    .jw-display, .text-grey-5 {
      opacity: 0.6;
    }
    &:hover {
      opacity: 1;
    }
  }
}
</style>