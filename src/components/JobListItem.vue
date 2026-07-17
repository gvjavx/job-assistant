<template>
  <q-item
    clickable
    class="job-list-item"
    :class="{
      'job-list-item--even': index % 2 === 0,
      'job-list-item--odd': index % 2 !== 0,
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
          v-if="typeof job.matchScore === 'number'"
          dense
          color="secondary"
          text-color="dark"
          class="jw-display text-weight-bold q-mb-xs"
          :label="`${job.matchScore}%`"
        >
          <q-tooltip>Skor Kecocokan</q-tooltip>
        </q-chip>
        <q-chip
          v-else-if="job.matchedSkills !== undefined"
          dense
          outline
          color="grey-6"
          text-color="grey-6"
          class="jw-mono text-caption q-mb-xs"
          label="Skor belum tersedia"
        >
          <q-tooltip>Tidak ada skill yang terdeteksi di lowongan ini untuk dibandingkan dengan CV-mu.</q-tooltip>
        </q-chip>
        <q-chip
          v-if="job.source"
          dense
          outline
          :color="chipColor"
          :text-color="chipColor"
          class="jw-mono text-caption q-mb-xs"
        >
          {{ job.source }}
        </q-chip>
        <div class="text-grey-6 text-caption q-mb-xs">{{ job.postedAt ? timeAgo(job.postedAt) : 'Tanggal tidak tersedia' }}</div>
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
import { computed, toRefs } from 'vue'
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

const { job } = toRefs(props)
const { isApplied, toggleApplied } = useAppliedJobs()

const applied = computed(() => isApplied(job.value.id))

const chipColor = computed(() => {
  // Jika ada matchScore (dari halaman Analisa CV), warnanya 'secondary'.
  // Jika tidak (dari halaman Cari Lowongan), warnanya abu-abu.
  return job.value.matchScore ? 'secondary' : 'grey-6'
})
</script>
<style lang="scss">
.job-list-item {
  border-bottom: 1px solid var(--jw-border);
  transition: background-color 0.3s;

  &--even {
    background-color: white;
  }

  &--odd {
    background-color: #f5f5f5; // Mengganti variabel $light dengan nilai defaultnya
  }

  &--applied {
    .jw-display, .text-grey-5 {
      opacity: 0.6;
    }
    &:hover {
      opacity: 1;
    }
  }

  &:last-child {
    border-bottom: none;
  }
}
</style>