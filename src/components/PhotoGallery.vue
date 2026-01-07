<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePhotosStore } from '@/stores/photos'
import type { SessionPhoto } from '@/types'

const props = defineProps<{
  photos: SessionPhoto[]
  loading?: boolean
}>()

const photosStore = usePhotosStore()
const selectedPhoto = ref<SessionPhoto | null>(null)

const photoUrls = computed(() => {
  return props.photos.map((photo) => ({
    ...photo,
    url: photosStore.getPhotoUrl(photo.storage_path),
  }))
})

function openPhoto(photo: SessionPhoto) {
  selectedPhoto.value = photo
}

function closePhoto() {
  selectedPhoto.value = null
}

function getSelectedUrl(): string {
  if (!selectedPhoto.value) return ''
  return photosStore.getPhotoUrl(selectedPhoto.value.storage_path)
}
</script>

<template>
  <div class="photo-gallery">
    <!-- Loading state -->
    <div v-if="loading" class="photo-gallery-loading">
      Foto's laden...
    </div>

    <!-- Empty state -->
    <div v-else-if="photos.length === 0" class="photo-gallery-empty">
      Geen foto's
    </div>

    <!-- Photo grid -->
    <div v-else class="photo-gallery-grid">
      <button
        v-for="photo in photoUrls"
        :key="photo.id"
        type="button"
        class="photo-gallery-thumb"
        @click="openPhoto(photo)"
      >
        <img :src="photo.url" alt="Sessie foto" loading="lazy" />
      </button>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="selectedPhoto"
        class="photo-lightbox"
        @click="closePhoto"
      >
        <button
          type="button"
          class="photo-lightbox-close"
          @click.stop="closePhoto"
          aria-label="Sluiten"
        >
          &times;
        </button>
        <img
          :src="getSelectedUrl()"
          alt="Foto volledig scherm"
          class="photo-lightbox-img"
          @click.stop
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.photo-gallery {
  width: 100%;
}

.photo-gallery-loading,
.photo-gallery-empty {
  padding: var(--space-lg);
  text-align: center;
  color: var(--color-text-light);
  font-size: 14px;
}

.photo-gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

.photo-gallery-thumb {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg);
  border: none;
  padding: 0;
  cursor: pointer;
}

.photo-gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

.photo-lightbox-close {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  font-size: 32px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
}

.photo-lightbox-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
}
</style>
