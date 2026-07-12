<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-4">
        <cv-upload-card @analyzed="onAnalyzed" />
      </div>

      <div class="col-12 col-md-8">
        <div v-if="!profile" class="jw-panel rounded-borders q-pa-xl text-center">
          <q-icon name="upload_file" size="2.4em" color="grey-6" />
          <div class="text-body1 text-grey-4 q-mt-sm">
            Unggah CV di panel kiri untuk melihat skill yang terdeteksi, saran perbaikan,
            dan daftar lowongan yang paling cocok dengan CV-mu.
          </div>
        </div>

        <template v-else>
          <cv-profile-summary :profile="profile" class="q-mb-md" />
          <cv-suggestions-list :suggestions="suggestions" class="q-mb-md" />

          <div class="jw-display text-subtitle1 text-weight-bold text-white q-mb-sm">
            Lowongan paling cocok
          </div>
          <div class="jw-panel rounded-borders">
            <job-list-item
              v-for="(job, i) in topJobs"
              :key="job.id"
              :job="job"
              :index="i"
              @open="openDetail"
            />
          </div>
        </template>
      </div>
    </div>

    <job-detail-dialog v-model="detailOpen" :job="selectedJob" />
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import CvUploadCard from 'components/CvUploadCard.vue'
import CvProfileSummary from 'components/CvProfileSummary.vue'
import CvSuggestionsList from 'components/CvSuggestionsList.vue'
import JobListItem from 'components/JobListItem.vue'
import JobDetailDialog from 'components/JobDetailDialog.vue'
import { useCvProfile } from 'src/composables/useCvProfile'

const { profile, suggestions, rankedJobs, setResult } = useCvProfile()

const detailOpen = ref(false)
const selectedJob = ref(null)

const topJobs = computed(() => rankedJobs.value.slice(0, 20))

function onAnalyzed (result) {
  setResult(result)
}

function openDetail (job) {
  selectedJob.value = job
  detailOpen.value = true
}
</script>
