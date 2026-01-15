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
const uploadingPhotos = ref(false)

// Autocomplete state
const showWorkerDropdown = ref(false)
const workerConfirmed = ref(false)

const filteredWorkers = computed(() => {
  if (!workerName.value || workerName.value.length < 1) return []
  const search = workerName.value.toLowerCase()
  return workersStore.workers
    .filter(w => w.name.toLowerCase().includes(search))
    .slice(0, 5) // Max 5 suggestions
})

// Show confirm button when name entered, not confirmed, and dropdown not visible
// Dropdown is only visible when open AND has matching results
const showConfirmButton = computed(() => {
  const dropdownVisible = showWorkerDropdown.value && filteredWorkers.value.length > 0
  return workerName.value.trim().length > 0 &&
         !workerConfirmed.value &&
         !dropdownVisible
})

function selectWorker(name: string) {
  workerName.value = name
  workerConfirmed.value = true
  showWorkerDropdown.value = false
}

function confirmNewWorker() {
  workerConfirmed.value = true
  showWorkerDropdown.value = false
}

function handleWorkerBlur() {
  // Delay to allow click on dropdown item
  setTimeout(() => {
    showWorkerDropdown.value = false
  }, 150)
}

// Task states (binnenOpruimen, buitenBalkon, diversen have photos)
const binnenOpruimen = ref({ checked: false, minutes: null as number | null, opmerkingen: '', photos: [] as CapturedPhoto[] })
const buitenBalkon = ref({ checked: false, minutes: null as number | null, opmerkingen: '', photos: [] as CapturedPhoto[] })
const zonnescherm = ref({ checked: false, minutes: null as number | null, terugplaatsen: false, afstandverklaring: false, opmerkingen: '', photos: [] as CapturedPhoto[] })
const glasbreuk = ref({ checked: false, minutes: null as number | null, aantal: null as number | null, opmerkingen: '', photos: [] as CapturedPhoto[] })
const diversen = ref({ checked: false, minutes: null as number | null, naam: '', telefoon: '', opmerkingen: '', photos: [] as CapturedPhoto[] })

// Load workers on mount and restore last worker name
onMounted(async () => {
  await workersStore.fetchWorkers()
  const lastWorkerName = localStorage.getItem('lastWorkerName')
  if (lastWorkerName) {
    workerName.value = lastWorkerName
    // Auto-confirm if name matches existing worker
    const matchesExisting = workersStore.workers.some(
      w => w.name.toLowerCase() === lastWorkerName.trim().toLowerCase()
    )
    if (matchesExisting) {
      workerConfirmed.value = true
    }
  }
})

// Save worker name to localStorage and reset confirmation on change
watch(workerName, (name) => {
  if (name) {
    localStorage.setItem('lastWorkerName', name)
  }
  // Reset confirmation when name changes - user must explicitly confirm
  workerConfirmed.value = false
})

function resetForm() {
  houseNumber.value = null
  // Revoke photo URLs before clearing
  binnenOpruimen.value.photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
  buitenBalkon.value.photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
  zonnescherm.value.photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
  glasbreuk.value.photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
  diversen.value.photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
  // Reset all task states
  binnenOpruimen.value = { checked: false, minutes: null, opmerkingen: '', photos: [] }
  buitenBalkon.value = { checked: false, minutes: null, opmerkingen: '', photos: [] }
  zonnescherm.value = { checked: false, minutes: null, terugplaatsen: false, afstandverklaring: false, opmerkingen: '', photos: [] }
  glasbreuk.value = { checked: false, minutes: null, aantal: null, opmerkingen: '', photos: [] }
  diversen.value = { checked: false, minutes: null, naam: '', telefoon: '', opmerkingen: '', photos: [] }
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
    // Upload photos per job type
    const hasPhotos = binnenOpruimen.value.photos.length > 0 ||
                      buitenBalkon.value.photos.length > 0 ||
                      zonnescherm.value.photos.length > 0 ||
                      glasbreuk.value.photos.length > 0 ||
                      diversen.value.photos.length > 0
    if (hasPhotos) {
      uploadingPhotos.value = true
      try {
        // Upload photos for each job type
        if (binnenOpruimen.value.photos.length > 0) {
          await photosStore.uploadPhotos(result.id, binnenOpruimen.value.photos, 'binnen_opruimen')
        }
        if (buitenBalkon.value.photos.length > 0) {
          await photosStore.uploadPhotos(result.id, buitenBalkon.value.photos, 'buiten_balkon')
        }
        if (zonnescherm.value.photos.length > 0) {
          await photosStore.uploadPhotos(result.id, zonnescherm.value.photos, 'zonnescherm')
        }
        if (glasbreuk.value.photos.length > 0) {
          await photosStore.uploadPhotos(result.id, glasbreuk.value.photos, 'glasbreuk')
        }
        if (diversen.value.photos.length > 0) {
          await photosStore.uploadPhotos(result.id, diversen.value.photos, 'diversen')
        }
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
  // Worker name must be confirmed (either existing worker or explicitly confirmed new name)
  if (!workerConfirmed.value) return false
  // Check that selected tasks have minutes filled in
  if (binnenOpruimen.value.checked && !binnenOpruimen.value.minutes) return false
  if (buitenBalkon.value.checked && !buitenBalkon.value.minutes) return false
  if (zonnescherm.value.checked && !zonnescherm.value.minutes) return false
  if (glasbreuk.value.checked && !glasbreuk.value.minutes) return false
  if (diversen.value.checked && !diversen.value.minutes) return false
  return true
}

// Validation message for disabled submit button
const submitValidationMessage = computed(() => {
  if (uploadingPhotos.value) return null
  if (!workerName.value.trim()) return 'Vul medewerker in'
  if (!workerConfirmed.value) return 'Bevestig medewerker naam'
  if (!houseNumber.value || houseNumber.value <= 0) return 'Vul huisnummer in'
  if (binnenOpruimen.value.checked && !binnenOpruimen.value.minutes) return 'Vul minuten in voor Binnen opruimen'
  if (buitenBalkon.value.checked && !buitenBalkon.value.minutes) return 'Vul minuten in voor Buiten balkon'
  if (zonnescherm.value.checked && !zonnescherm.value.minutes) return 'Vul minuten in voor Zonnescherm'
  if (glasbreuk.value.checked && !glasbreuk.value.minutes) return 'Vul minuten in voor Glasbreuk'
  if (diversen.value.checked && !diversen.value.minutes) return 'Vul minuten in voor Diversen'
  return null
})

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
          :class="{ confirmed: workerConfirmed }"
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
        <!-- Confirm button - ALWAYS shows when name typed and not confirmed -->
        <button
          v-if="showConfirmButton"
          type="button"
          class="btn-confirm-worker"
          @click="confirmNewWorker"
        >
          Bevestig: {{ workerName.trim() }}
        </button>
        <!-- Help text (shows confirmation status) -->
        <p class="field-help">
          <template v-if="workerConfirmed">
            <span class="confirmed-text">✓ {{ workerName }}</span>
          </template>
          <template v-else>
            Kies of bevestig je naam
          </template>
        </p>
      </div>

      <div class="form-group">
        <label for="house">Huisnummer</label>
        <input
          id="house"
          type="number"
          v-model="houseNumber"
          placeholder="Belangrijk: vul juiste huisnummer in"
          min="1"
          inputmode="numeric"
        />
      </div>
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
        <div class="task-photos">
          <label>Foto</label>
          <PhotoCapture v-model:photos="binnenOpruimen.photos" :disabled="isLoading()" />
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
        <div class="task-photos">
          <label>Foto</label>
          <PhotoCapture v-model:photos="buitenBalkon.photos" :disabled="isLoading()" />
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
        <div class="task-photos">
          <label>Foto</label>
          <PhotoCapture v-model:photos="zonnescherm.photos" :disabled="isLoading()" />
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
        <div class="task-photos">
          <label>Foto</label>
          <PhotoCapture v-model:photos="glasbreuk.photos" :disabled="isLoading()" />
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
        <div class="task-photos">
          <label>Foto</label>
          <PhotoCapture v-model:photos="diversen.photos" :disabled="isLoading()" />
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

    <!-- Validation feedback - shows when button is disabled -->
    <p v-if="!canSubmit() && !isLoading()" class="text-center mt-sm" style="color: #dc2626; font-size: 16px; font-weight: bold;">
      {{ submitValidationMessage }}
    </p>

    <!-- Error message -->
    <p v-if="sessionsStore.error" class="text-center mt-md" style="color: var(--color-error)">
      {{ sessionsStore.error }}
    </p>
  </div>
</template>
