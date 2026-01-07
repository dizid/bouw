<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <RouterView />

  <!-- Bottom navigation -->
  <nav class="bottom-nav">
    <RouterLink to="/" class="nav-item" :class="{ active: route.name === 'klussen' }">
      <span class="nav-icon">📋</span>
      <span>Klussen</span>
    </RouterLink>
    <RouterLink to="/dashboard" class="nav-item" :class="{ active: route.name === 'dashboard' }">
      <span class="nav-icon">📊</span>
      <span>Dashboard</span>
    </RouterLink>
  </nav>
</template>
