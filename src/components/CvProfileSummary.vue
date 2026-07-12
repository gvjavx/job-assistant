<template>
  <div class="jw-panel rounded-borders q-pa-md">
    <div class="jw-display text-caption text-weight-bold text-grey-5 q-mb-sm" style="letter-spacing: 0.08em;">
      RINGKASAN CV — {{ profile.fileName }}
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <div class="jw-mono text-caption text-grey-6 q-mb-xs">KELENGKAPAN BAGIAN</div>
        <div v-for="(label, key) in sectionLabels" :key="key" class="row items-center q-py-xs">
          <q-icon
            :name="profile.sections[key] ? 'check_circle' : 'cancel'"
            :color="profile.sections[key] ? 'positive' : 'negative'"
            size="1.1em"
            class="q-mr-sm"
          />
          <span class="text-body2 text-grey-4">{{ label }}</span>
        </div>
      </div>

      <div class="col-12 col-sm-6">
        <div class="jw-mono text-caption text-grey-6 q-mb-xs">
          SKILL TERDETEKSI ({{ profile.skills.length }})
        </div>
        <div class="row q-gutter-xs">
          <q-chip
            v-for="skill in profile.skills"
            :key="skill"
            dense
            square
            class="jw-mono text-caption"
            style="background: var(--jw-panel-2); color: var(--jw-text-dim);"
          >
            {{ skill }}
          </q-chip>
          <div v-if="!profile.skills.length" class="text-caption text-grey-6">
            Belum ada skill yang terdeteksi otomatis.
          </div>
        </div>
      </div>
    </div>

    <q-separator dark class="jw-hairline q-my-md" />

    <div class="row q-col-gutter-md jw-mono text-caption text-grey-5">
      <div>{{ profile.stats.wordCount }} kata</div>
      <div>{{ profile.stats.quantifiedAchievementCount }} pencapaian terukur</div>
      <div>{{ profile.stats.strongVerbLines }} baris dengan kata kerja aktif</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  profile: { type: Object, required: true }
})

const sectionLabels = {
  contact: 'Info kontak',
  summary: 'Ringkasan profil',
  experience: 'Pengalaman kerja',
  education: 'Pendidikan',
  skills: 'Daftar keahlian'
}
</script>
