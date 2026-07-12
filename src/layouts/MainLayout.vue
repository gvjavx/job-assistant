<template>
  <q-layout view="hHh lpR fFf" class="bg-grey-1">
    <q-header class="bg-white text-primary shadow-1" bordered>
      <q-toolbar class="q-py-sm">
        <div class="row items-center no-wrap">
          <q-avatar size="40px" class="q-mr-sm">
            <q-icon name="work" color="primary" size="32px" />
          </q-avatar>
          <div class="jw-display text-h5 text-weight-bold text-primary">
            Job Seeker <span class="text-secondary">Assistent</span>
          </div>
          <div class="jw-mono text-caption text-grey-8 q-ml-md gt-xs">
            PENDAMPING PENCARIAN KERJA PINTAR
          </div>
        </div>
        <q-space />
        <q-tabs
          dense
          indicator-color="secondary"
          active-color="secondary"
          class="text-grey-7"
        >
          <q-route-tab no-caps label="Analisa CV" to="/" exact icon="psychology" />
          <q-route-tab no-caps label="Cari Lowongan" to="/jobs" icon="search" />
        </q-tabs>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-white text-grey-8">
      <div class="jw-mono text-caption q-pa-sm text-center">
        Job Seeker Assistent &copy; 2026 · Membantu kamu menemukan karir impian dengan analisa cerdas.
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
</script>
