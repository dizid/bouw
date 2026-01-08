<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkersStore } from '@/stores/workers'
import { useSessionsStore } from '@/stores/sessions'
import { usePhotosStore } from '@/stores/photos'
import PhotoCapture from '@/components/PhotoCapture.vue'
import type { JobSessionInsert, CapturedPhoto } from '@/types'

const workersStore = useWorkersStore()
const sessionsStore = useSessionsStore()
const photosStore = usePhotosStore()

// Form state
const workerName = ref('')
const houseNumber = ref<number | null>(null)
const showSuccess = ref(false)
const capturedPhotos = ref<CapturedPhoto[]>([])
const uploadingPhotos = ref(false)

// Autocomplete state
const showWorkerDropdown = ref(false)
const filteredWorkers = computed(() => {
  if (!workerName.value || workerName.value.length < 1) return []
  const search = workerName.value.toLowerCase()
  return workersStore.workers
    .filter(w => w.name.toLowerCase().includes(search))
    .slice(0, 5) // Max 5 suggestions
})

function selectWorker(name: string) {
  workerName.value = name
  showWorkerDropdown.value = false
}

function handleWorkerBlur() {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    showWorkerDropdown.value = false
  }, 150)
}

// Task states
const binnenOpruimen = ref({ checked: false, minutes: null as number | null, opmerkingen: '' })
const buitenBalkon = ref({ checked: false, minutes: null as number | null, opmerkingen: '' })
const zonnescherm = ref({ checked: false, minutes: null as number | null, terugplaatsen: false, afstandverklaring: false, opmerkingen: '' })
const glasbreuk = ref({ checked: false, minutes: null as number | null, aantal: null as number | null, opmerkingen: '' })
const diversen = ref({ checked: false, minutes: null as number | null, naam: '', telefoon: '', opmerkingen: '' })

// Load workers on mount and restore last worker name
onMounted(async () => {
  await workersStore.fetchWorkers()
  const lastWorkerName = localStorage.getItem('lastWorkerName')
  if (lastWorkerName) {
    workerName.value = lastWorkerName
  }
})

// Save worker name to localStorage
watch(workerName, (name) => {
  if (name) {
    localStorage.setItem('lastWorkerName', name)
  }
})

function resetForm() {
  houseNumber.value = null
  binnenOpruimen.value = { checked: false, minutes: null, opmerkingen: '' }
  buitenBalkon.value = { checked: false, minutes: null, opmerkingen: '' }
  zonnescherm.value = { checked: false, minutes: null, terugplaatsen: false, afstandverklaring: false, opmerkingen: '' }
  glasbreuk.value = { checked: false, minutes: null, aantal: null, opmerkingen: '' }
  diversen.value = { checked: false, minutes: null, naam: '', telefoon: '', opmerkingen: '' }
  // Clear photos and revoke blob URLs
  capturedPhotos.value.forEach(p => URL.revokeObjectURL(p.previewUrl))
  capturedPhotos.value = []
}

async function handleSubmit() {
  if (!workerName.value.trim() || !houseNumber.value) return

  // Find or create worker
  const worker = await workersStore.findOrCreateWorker(workerName.value)
  if (!worker) return

  const session: JobSessionInsert = {
    worker_id: worker.id,
    house_number: houseNumber.value,
    binnen_opruimen_min: binnenOpruimen.value.checked ? binnenOpruimen.value.minutes : null,
    binnen_opruimen_opmerkingen: binnenOpruimen.value.checked ? binnenOpruimen.value.opmerkingen || null : null,
    buiten_balkon_min: buitenBalkon.value.checked ? buitenBalkon.value.minutes : null,
    buiten_balkon_opmerkingen: buitenBalkon.value.checked ? buitenBalkon.value.opmerkingen || null : null,
    zonnescherm_verwijderd_min: zonnescherm.value.checked ? zonnescherm.value.minutes : null,
    zonnescherm_terugplaatsen: zonnescherm.value.checked ? zonnescherm.value.terugplaatsen : null,
    zonnescherm_afstandverklaring: zonnescherm.value.checked && zonnescherm.value.terugplaatsen ? zonnescherm.value.afstandverklaring : null,
    zonnescherm_opmerkingen: zonnescherm.value.checked ? zonnescherm.value.opmerkingen || null : null,
    glasbreuk_min: glasbreuk.value.checked ? glasbreuk.value.minutes : null,
    glasbreuk_aantal: glasbreuk.value.checked ? glasbreuk.value.aantal : null,
    glasbreuk_opmerkingen: glasbreuk.value.checked ? glasbreuk.value.opmerkingen || null : null,
    diversen_min: diversen.value.checked ? diversen.value.minutes : null,
    diversen_opmerkingen: diversen.value.checked ? diversen.value.opmerkingen || null : null,
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
  if (!workerName.value.trim() || !houseNumber.value || houseNumber.value <= 0 || uploadingPhotos.value) {
    return false
  }
  // Check that selected tasks have minutes filled in
  if (binnenOpruimen.value.checked && !binnenOpruimen.value.minutes) return false
  if (buitenBalkon.value.checked && !buitenBalkon.value.minutes) return false
  if (zonnescherm.value.checked && !zonnescherm.value.minutes) return false
  if (glasbreuk.value.checked && !glasbreuk.value.minutes) return false
  if (diversen.value.checked && !diversen.value.minutes) return false
  return true
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
      <div class="form-group autocomplete-wrapper">
        <label for="worker">Medewerker</label>
        <input
          id="worker"
          type="text"
          v-model="workerName"
          placeholder="Jouw naam"
          autocomplete="off"
          @focus="showWorkerDropdown = true"
          @blur="handleWorkerBlur"
        />
        <ul v-if="showWorkerDropdown && filteredWorkers.length > 0" class="autocomplete-list">
          <li
            v-for="worker in filteredWorkers"
            :key="worker.id"
            @mousedown.prevent="selectWorker(worker.name)"
          >
            {{ worker.name }}
          </li>
        </ul>
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
        <div>
          <label>Opmerkingen</label>
          <textarea v-model="binnenOpruimen.opmerkingen" rows="2"></textarea>
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
        <div>
          <label>Opmerkingen</label>
          <textarea v-model="buitenBalkon.opmerkingen" rows="2"></textarea>
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
        <div class="sub-checkbox" @click="zonnescherm.terugplaatsen = !zonnescherm.terugplaatsen">
          <div class="task-checkbox" :class="{ checked: zonnescherm.terugplaatsen }"></div>
          <span>Terugplaatsen?</span>
        </div>
        <div v-if="zonnescherm.terugplaatsen" class="sub-checkbox" @click="zonnescherm.afstandverklaring = !zonnescherm.afstandverklaring">
          <div class="task-checkbox" :class="{ checked: zonnescherm.afstandverklaring }"></div>
          <span>Afstandverklaring?</span>
        </div>
        <div>
          <label>Opmerkingen</label>
          <textarea v-model="zonnescherm.opmerkingen" rows="2"></textarea>
        </div>
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
        <div>
          <label>Opmerkingen</label>
          <textarea v-model="diversen.opmerkingen" rows="2"></textarea>
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
