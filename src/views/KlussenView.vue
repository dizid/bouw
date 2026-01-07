<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useWorkersStore } from '@/stores/workers'
import { useSessionsStore } from '@/stores/sessions'
import { usePhotosStore } from '@/stores/photos'
import PhotoCapture from '@/components/PhotoCapture.vue'
import type { JobSessionInsert, CapturedPhoto } from '@/types'

const workersStore = useWorkersStore()
const sessionsStore = useSessionsStore()
const photosStore = usePhotosStore()

// Form state
const selectedWorkerId = ref('')
const houseNumber = ref<number | null>(null)
const showSuccess = ref(false)
const capturedPhotos = ref<CapturedPhoto[]>([])
const uploadingPhotos = ref(false)

// Task states
const binnenOpruimen = ref({ checked: false, minutes: null as number | null })
const buitenBalkon = ref({ checked: false, minutes: null as number | null })
const zonnescherm = ref({ checked: false, minutes: null as number | null, terugplaatsen: false })
const glasbreuk = ref({ checked: false, minutes: null as number | null, aantal: null as number | null, opmerkingen: '' })
const diversen = ref({ checked: false, minutes: null as number | null, naam: '', telefoon: '' })

// Load workers on mount and restore last selected worker
onMounted(async () => {
  await workersStore.fetchWorkers()
  const lastWorkerId = localStorage.getItem('lastWorkerId')
  if (lastWorkerId && workersStore.workers.some(w => w.id === lastWorkerId)) {
    selectedWorkerId.value = lastWorkerId
  }
})

// Save selected worker to localStorage
watch(selectedWorkerId, (newId) => {
  if (newId) {
    localStorage.setItem('lastWorkerId', newId)
  }
})

function resetForm() {
  houseNumber.value = null
  binnenOpruimen.value = { checked: false, minutes: null }
  buitenBalkon.value = { checked: false, minutes: null }
  zonnescherm.value = { checked: false, minutes: null, terugplaatsen: false }
  glasbreuk.value = { checked: false, minutes: null, aantal: null, opmerkingen: '' }
  diversen.value = { checked: false, minutes: null, naam: '', telefoon: '' }
  // Clear photos and revoke blob URLs
  capturedPhotos.value.forEach(p => URL.revokeObjectURL(p.previewUrl))
  capturedPhotos.value = []
}

async function handleSubmit() {
  if (!selectedWorkerId.value || !houseNumber.value) return

  const session: JobSessionInsert = {
    worker_id: selectedWorkerId.value,
    house_number: houseNumber.value,
    binnen_opruimen_min: binnenOpruimen.value.checked ? binnenOpruimen.value.minutes : null,
    buiten_balkon_min: buitenBalkon.value.checked ? buitenBalkon.value.minutes : null,
    zonnescherm_verwijderd_min: zonnescherm.value.checked ? zonnescherm.value.minutes : null,
    zonnescherm_terugplaatsen: zonnescherm.value.checked ? zonnescherm.value.terugplaatsen : null,
    glasbreuk_min: glasbreuk.value.checked ? glasbreuk.value.minutes : null,
    glasbreuk_aantal: glasbreuk.value.checked ? glasbreuk.value.aantal : null,
    glasbreuk_opmerkingen: glasbreuk.value.checked ? glasbreuk.value.opmerkingen : null,
    diversen_min: diversen.value.checked ? diversen.value.minutes : null,
    bewoner_naam: diversen.value.checked ? diversen.value.naam : null,
    bewoner_telefoon: diversen.value.checked ? diversen.value.telefoon : null,
  }

  const result = await sessionsStore.createSession(session)
  if (result) {
    // Upload photos if any
    if (capturedPhotos.value.length > 0) {
      uploadingPhotos.value = true
      try {
        await photosStore.uploadPhotos(result.id, capturedPhotos.value)
      } catch (err) {
        console.error('Failed to upload photos:', err)
        // Continue anyway - session is saved
      } finally {
        uploadingPhotos.value = false
      }
    }

    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
    resetForm()
  }
}

const canSubmit = () => {
  return selectedWorkerId.value && houseNumber.value && houseNumber.value > 0 && !uploadingPhotos.value
}

const isLoading = () => {
  return sessionsStore.loading || uploadingPhotos.value
}
</script>

<template>
  <div class="page">
    <!-- Success message -->
    <div v-if="showSuccess" class="success-message">
      ✓ Opgeslagen!
    </div>

    <!-- Header with logo -->
    <div class="page-header">
      <img src="/breijer_logo.png" alt="Breijer" class="logo" />
    </div>

    <!-- Worker and house selection -->
    <div class="card">
      <div class="form-group">
        <label for="worker">Medewerker</label>
        <select id="worker" v-model="selectedWorkerId">
          <option value="">-- Selecteer --</option>
          <option v-for="worker in workersStore.workers" :key="worker.id" :value="worker.id">
            {{ worker.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="house">Huisnummer</label>
        <input
          id="house"
          type="number"
          v-model="houseNumber"
          placeholder="Bijv. 42"
          min="1"
          inputmode="numeric"
        />
      </div>
    </div>

    <!-- Photo capture -->
    <div class="card">
      <h3 class="mb-sm">Foto's situatie</h3>
      <p style="color: var(--color-text-light); font-size: 14px; margin-bottom: var(--space-md);">
        Maak foto's van de huidige situatie
      </p>
      <PhotoCapture v-model:photos="capturedPhotos" :disabled="isLoading()" />
    </div>

    <!-- Task cards -->
    <div class="card task-card">
      <div class="task-header" @click="binnenOpruimen.checked = !binnenOpruimen.checked">
        <div class="task-checkbox" :class="{ checked: binnenOpruimen.checked }"></div>
        <span class="task-title">Binnen opruimen</span>
      </div>
      <div v-if="binnenOpruimen.checked" class="task-fields">
        <div class="inline-field">
          <label>Minuten:</label>
          <input type="number" v-model="binnenOpruimen.minutes" min="0" inputmode="numeric" />
        </div>
      </div>
    </div>

    <div class="card task-card">
      <div class="task-header" @click="buitenBalkon.checked = !buitenBalkon.checked">
        <div class="task-checkbox" :class="{ checked: buitenBalkon.checked }"></div>
        <span class="task-title">Buiten balkon opruimen</span>
      </div>
      <div v-if="buitenBalkon.checked" class="task-fields">
        <div class="inline-field">
          <label>Minuten:</label>
          <input type="number" v-model="buitenBalkon.minutes" min="0" inputmode="numeric" />
        </div>
      </div>
    </div>

    <div class="card task-card">
      <div class="task-header" @click="zonnescherm.checked = !zonnescherm.checked">
        <div class="task-checkbox" :class="{ checked: zonnescherm.checked }"></div>
        <span class="task-title">Zonnescherm verwijderen</span>
      </div>
      <div v-if="zonnescherm.checked" class="task-fields">
        <div class="inline-field">
          <label>Minuten:</label>
          <input type="number" v-model="zonnescherm.minutes" min="0" inputmode="numeric" />
        </div>
        <label class="sub-checkbox">
          <input type="checkbox" v-model="zonnescherm.terugplaatsen" />
          <span>Terugplaatsen?</span>
        </label>
      </div>
    </div>

    <div class="card task-card">
      <div class="task-header" @click="glasbreuk.checked = !glasbreuk.checked">
        <div class="task-checkbox" :class="{ checked: glasbreuk.checked }"></div>
        <span class="task-title">Glasbreuk balkonafscheiding</span>
      </div>
      <div v-if="glasbreuk.checked" class="task-fields">
        <div class="inline-field">
          <label>Minuten:</label>
          <input type="number" v-model="glasbreuk.minutes" min="0" inputmode="numeric" />
        </div>
        <div class="inline-field">
          <label>Aantal:</label>
          <input type="number" v-model="glasbreuk.aantal" min="0" inputmode="numeric" />
        </div>
        <div>
          <label>Opmerkingen</label>
          <textarea v-model="glasbreuk.opmerkingen" rows="2"></textarea>
        </div>
      </div>
    </div>

    <div class="card task-card">
      <div class="task-header" @click="diversen.checked = !diversen.checked">
        <div class="task-checkbox" :class="{ checked: diversen.checked }"></div>
        <span class="task-title">Diversen</span>
      </div>
      <div v-if="diversen.checked" class="task-fields">
        <div class="inline-field">
          <label>Minuten:</label>
          <input type="number" v-model="diversen.minutes" min="0" inputmode="numeric" />
        </div>
        <div>
          <label>Naam bewoner</label>
          <input type="text" v-model="diversen.naam" />
        </div>
        <div>
          <label>Telefoon bewoner</label>
          <input type="tel" v-model="diversen.telefoon" inputmode="tel" />
        </div>
      </div>
    </div>

    <!-- Submit button -->
    <button
      class="btn btn-success"
      @click="handleSubmit"
      :disabled="!canSubmit() || isLoading()"
    >
      {{ uploadingPhotos ? "Foto's uploaden..." : sessionsStore.loading ? 'Opslaan...' : 'Opslaan' }}
    </button>

    <!-- Error message -->
    <p v-if="sessionsStore.error" class="text-center mt-md" style="color: var(--color-error)">
      {{ sessionsStore.error }}
    </p>
  </div>
</template>
