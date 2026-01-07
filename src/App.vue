<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </nav>
  </header>
  <RouterView />
</template>

<style scoped>
nav {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}

nav a {
  color: inherit;
}

nav a.router-link-active {
  font-weight: bold;
}
</style>
