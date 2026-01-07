<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { CapturedPhoto } from '@/types'

const props = defineProps<{
  photos: CapturedPhoto[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:photos': [photos: CapturedPhoto[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function openCamera() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  const newPhotos: CapturedPhoto[] = []

  for (const file of Array.from(files)) {
    const photo: CapturedPhoto = {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }
    newPhotos.push(photo)
  }

  emit('update:photos', [...props.photos, ...newPhotos])

  // Reset input so same file can be selected again
  input.value = ''
}

function removePhoto(photoId: string) {
  const photo = props.photos.find((p) => p.id === photoId)
  if (photo) {
    URL.revokeObjectURL(photo.previewUrl)
  }
  emit(
    'update:photos',
    props.photos.filter((p) => p.id !== photoId)
  )
}

// Cleanup blob URLs on unmount
onUnmounted(() => {
  props.photos.forEach((photo) => {
    URL.revokeObjectURL(photo.previewUrl)
  })
})
</script>

<template>
  <div class="photo-capture">
    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      class="photo-input-hidden"
      @change="handleFileSelect"
      :disabled="disabled"
    />

    <!-- Photo grid -->
    <div class="photo-grid">
      <!-- Existing photos -->
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="photo-thumb"
      >
        <img :src="photo.previewUrl" alt="Captured photo" />
        <button
          type="button"
          class="photo-thumb-delete"
          @click="removePhoto(photo.id)"
          :disabled="disabled"
          aria-label="Verwijder foto"
        >
          &times;
        </button>
        <!-- Upload progress bar -->
        <div
          v-if="photo.uploadProgress !== undefined && photo.uploadProgress < 100"
          class="photo-upload-progress"
          :style="{ width: photo.uploadProgress + '%' }"
        />
      </div>

      <!-- Add photo button -->
      <button
        type="button"
        class="photo-add-btn"
        @click="openCamera"
        :disabled="disabled"
      >
        <span class="photo-add-icon">+</span>
        <span class="photo-add-label">Foto</span>
      </button>
    </div>

    <!-- Photo count -->
    <p v-if="photos.length > 0" class="photo-count">
      {{ photos.length }} foto{{ photos.length === 1 ? '' : "'s" }} geselecteerd
    </p>
  </div>
</template>

<style scoped>
.photo-capture {
  width: 100%;
}

.photo-input-hidden {
  display: none;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.photo-thumb {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  position: relative;
  background: var(--color-bg);
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-thumb-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-error);
  color: white;
  border: none;
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.photo-thumb-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.photo-upload-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: var(--color-primary);
  transition: width 0.2s ease;
}

.photo-add-btn {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  background: var(--color-bg);
  border: 3px dashed var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  min-height: 100px;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.photo-add-btn:active {
  background: var(--color-border);
  border-color: var(--color-primary);
}

.photo-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.photo-add-icon {
  font-size: 36px;
  font-weight: bold;
  color: var(--color-text-light);
  line-height: 1;
}

.photo-add-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-light);
}

.photo-count {
  margin-top: var(--space-sm);
  font-size: 14px;
  color: var(--color-text-light);
  text-align: center;
}
</style>
