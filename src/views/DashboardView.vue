<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useWorkersStore } from '@/stores/workers'
import { useSessionsStore } from '@/stores/sessions'
import { usePhotosStore } from '@/stores/photos'
import PhotoGallery from '@/components/PhotoGallery.vue'
import WorkerEditModal from '@/components/WorkerEditModal.vue'
import SessionEditModal from '@/components/SessionEditModal.vue'
import type { SessionPhoto, Worker, JobSession, JobSessionInsert } from '@/types'

const workersStore = useWorkersStore()
const sessionsStore = useSessionsStore()
const photosStore = usePhotosStore()

const activeTab = ref<'medewerkers' | 'woningen' | 'fases'>('medewerkers')
const selectedHouse = ref<number | null>(null)
const searchHouseNumber = ref<number | null>(null)
const housePhotos = ref<SessionPhoto[]>([])
const loadingPhotos = ref(false)
const selectedFase = ref(1)

// Worker detail state
const selectedWorker = ref<Worker | null>(null)
const workerPhotos = ref<SessionPhoto[]>([])
const loadingWorkerPhotos = ref(false)

// Worker edit modal state
const showWorkerModal = ref(false)
const editingWorker = ref<Worker | null>(null)

// Session edit modal state
const showSessionModal = ref(false)
const editingSession = ref<JobSession | null>(null)

// Search for house by number
function searchHouse() {
  if (searchHouseNumber.value && searchHouseNumber.value > 0) {
    selectedHouse.value = searchHouseNumber.value
  }
}

onMounted(async () => {
  await Promise.all([
    workersStore.fetchWorkers(),
    workersStore.fetchAllWorkers(),
    sessionsStore.fetchSessions(),
    sessionsStore.fetchSettings(),
  ])
})

// Get worker name by ID (uses allWorkers to include inactive workers)
function getWorkerName(workerId: string | null) {
  if (!workerId) return 'Onbekend'
  const worker = workersStore.allWorkers.find(w => w.id === workerId)
  return worker?.name || 'Onbekend'
}

// Remove worker with confirmation
function confirmRemoveWorker(worker: { id: string; name: string }) {
  if (confirm(`Weet je zeker dat je ${worker.name} wilt verwijderen?`)) {
    workersStore.removeWorker(worker.id)
  }
}

// Worker modal handlers
function openAddWorker() {
  editingWorker.value = null
  showWorkerModal.value = true
}

function openEditWorker(worker: Worker, event: Event) {
  event.stopPropagation() // Don't trigger row click
  editingWorker.value = worker
  showWorkerModal.value = true
}

function closeWorkerModal() {
  showWorkerModal.value = false
  editingWorker.value = null
}

async function saveWorker(name: string) {
  if (editingWorker.value) {
    // Edit existing
    await workersStore.updateWorker(editingWorker.value.id, name)
  } else {
    // Add new
    await workersStore.addWorker(name)
  }
  closeWorkerModal()
}

// Session modal handlers
function openEditSession(session: JobSession, event?: Event) {
  event?.stopPropagation()
  editingSession.value = session
  showSessionModal.value = true
}

function closeSessionModal() {
  showSessionModal.value = false
  editingSession.value = null
}

async function saveSession(updates: Partial<JobSessionInsert>) {
  if (editingSession.value) {
    await sessionsStore.updateSession(editingSession.value.id, updates)
  }
  closeSessionModal()
}

// Delete session with confirmation
function confirmDeleteSession(session: JobSession, event: Event) {
  event.stopPropagation()
  const workerName = getWorkerName(session.worker_id)
  if (confirm(`Klus van ${workerName} (woning ${session.house_number}) verwijderen?`)) {
    sessionsStore.deleteSession(session.id)
  }
}

// Format date
function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calculate total hours for a session
function getSessionTotalHours(session: any) {
  const totalMin = (session.binnen_opruimen_min || 0) +
    (session.buiten_balkon_min || 0) +
    (session.glasbreuk_min || 0) +
    (session.diversen_min || 0)
  return (totalMin / 60).toFixed(1)
}

// Convert minutes to hours
function minToHours(min: number | null) {
  if (!min) return null
  return (min / 60).toFixed(1)
}

// Sessions for selected house
const selectedHouseSessions = computed(() => {
  if (!selectedHouse.value) return []
  return sessionsStore.getSessionsForHouse(selectedHouse.value)
})

// Fetch photos when house is selected
watch(selectedHouse, async (houseNum) => {
  if (houseNum) {
    loadingPhotos.value = true
    try {
      housePhotos.value = await photosStore.fetchPhotosForHouse(houseNum)
    } catch (err) {
      console.error('Failed to fetch photos:', err)
      housePhotos.value = []
    } finally {
      loadingPhotos.value = false
    }
  } else {
    housePhotos.value = []
  }
})

// Sessions for selected worker (sorted by date, newest first)
const selectedWorkerSessions = computed(() => {
  if (!selectedWorker.value) return []
  return sessionsStore.sessions
    .filter(s => s.worker_id === selectedWorker.value!.id)
    .sort((a, b) => {
      const dateA = a.created_at || ''
      const dateB = b.created_at || ''
      return dateB.localeCompare(dateA)
    })
})

// Select a worker to view details
function selectWorker(worker: Worker) {
  selectedWorker.value = worker
}

// Fetch photos when worker is selected
watch(selectedWorker, async (worker) => {
  if (worker) {
    loadingWorkerPhotos.value = true
    try {
      workerPhotos.value = await photosStore.fetchPhotosForWorker(worker.id)
    } catch (err) {
      console.error('Failed to fetch worker photos:', err)
      workerPhotos.value = []
    } finally {
      loadingWorkerPhotos.value = false
    }
  } else {
    workerPhotos.value = []
  }
})

// Aggregated data per house for the table (in hours)
const housesTableData = computed(() => {
  const houses: {
    number: number
    sessions: number
    binnenHours: string | null
    balkonHours: string | null
    hasZonnescherm: boolean
    glasbreukHours: string | null
    diversenHours: string | null
    totalHours: string
  }[] = []

  for (const houseNum of sessionsStore.housesWithSessions) {
    const houseSessions = sessionsStore.getSessionsForHouse(houseNum)
    const binnenMin = houseSessions.reduce((sum, s) => sum + (s.binnen_opruimen_min || 0), 0)
    const balkonMin = houseSessions.reduce((sum, s) => sum + (s.buiten_balkon_min || 0), 0)
    const hasZonnescherm = houseSessions.some(s => s.zonnescherm_terugplaatsen !== null || s.zonnescherm_opmerkingen)
    const glasbreukMin = houseSessions.reduce((sum, s) => sum + (s.glasbreuk_min || 0), 0)
    const diversenMin = houseSessions.reduce((sum, s) => sum + (s.diversen_min || 0), 0)
    const totalMin = binnenMin + balkonMin + glasbreukMin + diversenMin

    houses.push({
      number: houseNum,
      sessions: houseSessions.length,
      binnenHours: binnenMin > 0 ? (binnenMin / 60).toFixed(1) : null,
      balkonHours: balkonMin > 0 ? (balkonMin / 60).toFixed(1) : null,
      hasZonnescherm,
      glasbreukHours: glasbreukMin > 0 ? (glasbreukMin / 60).toFixed(1) : null,
      diversenHours: diversenMin > 0 ? (diversenMin / 60).toFixed(1) : null,
      totalHours: (totalMin / 60).toFixed(1),
    })
  }

  return houses.sort((a, b) => a.number - b.number)
})

// Fases: houses in selected fase
const faseHouses = computed(() => {
  return sessionsStore.getHousesInFase(selectedFase.value)
})

// Print URL for fase
function getPrintUrl(fase: number) {
  return `/print/fase/${fase}`
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'medewerkers' }"
        @click="activeTab = 'medewerkers'"
      >
        Medewerkers
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'woningen' }"
        @click="activeTab = 'woningen'"
      >
        Per Woning
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'fases' }"
        @click="activeTab = 'fases'"
      >
        PDF
      </button>
    </div>

    <!-- Medewerkers tab -->
    <div v-if="activeTab === 'medewerkers'">
      <!-- Worker detail view -->
      <div v-if="selectedWorker" class="card">
        <div class="form-row mb-md" style="align-items: center;">
          <h3>{{ selectedWorker.name }}</h3>
          <button
            class="btn btn-secondary"
            style="width: auto; height: 40px; padding: 0 16px;"
            @click="selectedWorker = null"
          >
            ← Terug
          </button>
        </div>

        <!-- Stats summary -->
        <div class="form-row mb-md">
          <div class="card text-center" style="background: var(--color-bg);">
            <div style="font-size: 24px; font-weight: 700;">
              {{ sessionsStore.getWorkerStats(selectedWorker.id).sessions }}
            </div>
            <div style="font-size: 14px;">Klussen</div>
          </div>
          <div class="card text-center" style="background: var(--color-bg);">
            <div style="font-size: 24px; font-weight: 700;">
              {{ sessionsStore.getWorkerStats(selectedWorker.id).houses }}
            </div>
            <div style="font-size: 14px;">Woningen</div>
          </div>
          <div class="card text-center" style="background: var(--color-bg);">
            <div style="font-size: 24px; font-weight: 700;">
              {{ sessionsStore.getWorkerStats(selectedWorker.id).totalHours }}
            </div>
            <div style="font-size: 14px;">Uren</div>
          </div>
        </div>

        <!-- Sessions list -->
        <h4 class="mb-sm">Werkhistorie ({{ selectedWorkerSessions.length }})</h4>
        <div v-if="selectedWorkerSessions.length === 0" class="text-center mb-md">
          Nog geen klussen geregistreerd
        </div>
        <div v-else>
          <div v-for="session in selectedWorkerSessions" :key="session.id" class="card mb-sm session-card">
            <div class="session-header">
              <div class="session-info">
                <strong
                  style="cursor: pointer; text-decoration: underline; color: var(--color-primary);"
                  @click="activeTab = 'woningen'; selectedHouse = session.house_number"
                >Woning {{ session.house_number }}</strong>
                <span class="session-date">{{ formatDate(session.created_at) }}</span>
              </div>
              <div class="session-actions">
                <button
                  class="btn-icon btn-edit"
                  @click="openEditSession(session)"
                  title="Bewerken"
                >
                  ✎
                </button>
                <button
                  class="btn-icon btn-delete"
                  @click="confirmDeleteSession(session, $event)"
                  title="Verwijderen"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style="font-size: 14px;">
              <div v-if="session.binnen_opruimen_min">
                ✓ Binnen opruimen: {{ minToHours(session.binnen_opruimen_min) }} uur
                <div v-if="session.binnen_opruimen_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.binnen_opruimen_opmerkingen }}
                </div>
              </div>
              <div v-if="session.buiten_balkon_min">
                ✓ Balkon opruimen: {{ minToHours(session.buiten_balkon_min) }} uur
                <div v-if="session.buiten_balkon_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.buiten_balkon_opmerkingen }}
                </div>
              </div>
              <div v-if="session.zonnescherm_terugplaatsen !== null || session.zonnescherm_opmerkingen">
                ✓ Zonnescherm
                (terugplaatsen: {{ session.zonnescherm_terugplaatsen ? 'ja' : 'nee' }}, afstandverklaring: {{ session.zonnescherm_afstandverklaring ? 'ja' : 'nee' }})
                <div v-if="session.zonnescherm_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.zonnescherm_opmerkingen }}
                </div>
              </div>
              <div v-if="session.glasbreuk_min">
                ✓ Glasbreuk: {{ minToHours(session.glasbreuk_min) }} uur
                <span v-if="session.glasbreuk_aantal">({{ session.glasbreuk_aantal }}x)</span>
                <div v-if="session.glasbreuk_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.glasbreuk_opmerkingen }}
                </div>
              </div>
              <div v-if="session.diversen_min">
                ✓ Diversen: {{ minToHours(session.diversen_min) }} uur
                <div v-if="session.bewoner_naam" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.bewoner_naam }} - {{ session.bewoner_telefoon }}
                </div>
                <div v-if="session.diversen_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.diversen_opmerkingen }}
                </div>
              </div>
              <div class="mt-sm" style="font-weight: 600;">
                Totaal: {{ getSessionTotalHours(session) }} uur
              </div>
            </div>
          </div>
        </div>

        <!-- Photos section -->
        <div class="mt-md">
          <h4 class="mb-sm">Foto's ({{ workerPhotos.length }})</h4>
          <PhotoGallery :photos="workerPhotos" :loading="loadingWorkerPhotos" />
        </div>
      </div>

      <!-- Worker list -->
      <div v-else class="card">
        <div class="form-row mb-md" style="align-items: center;">
          <h3>Medewerkers ({{ workersStore.workers.length }})</h3>
          <button
            class="btn-icon btn-add"
            @click="openAddWorker"
            title="Medewerker toevoegen"
          >
            +
          </button>
        </div>
        <p class="mb-md text-center" style="color: var(--color-text-light); font-size: 14px;">
          Tik op een medewerker voor details
        </p>
        <div v-if="workersStore.workers.length === 0" class="text-center">
          Nog geen medewerkers
        </div>
        <div v-else>
          <div
            v-for="worker in workersStore.workers"
            :key="worker.id"
            class="worker-row"
            @click="selectWorker(worker)"
          >
            <span class="worker-name">{{ worker.name }}</span>
            <span class="worker-hours">
              {{ sessionsStore.getWorkerStats(worker.id).totalHours }} uur
            </span>
            <div class="worker-actions">
              <button
                class="btn-icon btn-edit"
                @click="openEditWorker(worker, $event)"
                title="Bewerken"
              >
                ✎
              </button>
              <button
                class="btn-icon btn-delete"
                @click.stop="confirmRemoveWorker(worker)"
                title="Verwijderen"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Per Woning tab -->
    <div v-if="activeTab === 'woningen'">
      <!-- House search -->
      <div class="card">
        <h3 class="mb-sm">Zoek woning</h3>
        <div class="form-row">
          <input
            type="number"
            v-model="searchHouseNumber"
            placeholder="Huisnummer"
            inputmode="numeric"
            min="1"
            @keyup.enter="searchHouse"
          />
          <button
            class="btn btn-primary"
            style="width: auto; padding: 0 24px;"
            @click="searchHouse"
            :disabled="!searchHouseNumber"
          >
            Zoek
          </button>
        </div>
      </div>

      <!-- House detail view -->
      <div v-if="selectedHouse" class="card">
        <div class="form-row mb-md" style="align-items: center;">
          <h3>Woning {{ selectedHouse }}</h3>
          <button
            class="btn btn-secondary"
            style="width: auto; height: 40px; padding: 0 16px;"
            @click="selectedHouse = null"
          >
            ← Terug
          </button>
        </div>

        <div v-if="selectedHouseSessions.length === 0" class="text-center">
          Geen klussen voor deze woning
        </div>

        <div v-else>
          <div v-for="session in selectedHouseSessions" :key="session.id" class="card session-card">
            <div class="session-header">
              <div class="session-info">
                <strong>{{ getWorkerName(session.worker_id) }}</strong>
                <span class="session-date">{{ formatDate(session.created_at) }}</span>
              </div>
              <div class="session-actions">
                <button
                  class="btn-icon btn-edit"
                  @click="openEditSession(session)"
                  title="Bewerken"
                >
                  ✎
                </button>
                <button
                  class="btn-icon btn-delete"
                  @click="confirmDeleteSession(session, $event)"
                  title="Verwijderen"
                >
                  ✕
                </button>
              </div>
            </div>
            <div style="font-size: 14px;">
              <div v-if="session.binnen_opruimen_min">
                ✓ Binnen opruimen: {{ minToHours(session.binnen_opruimen_min) }} uur
                <div v-if="session.binnen_opruimen_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.binnen_opruimen_opmerkingen }}
                </div>
              </div>
              <div v-if="session.buiten_balkon_min">
                ✓ Balkon opruimen: {{ minToHours(session.buiten_balkon_min) }} uur
                <div v-if="session.buiten_balkon_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.buiten_balkon_opmerkingen }}
                </div>
              </div>
              <div v-if="session.zonnescherm_terugplaatsen !== null || session.zonnescherm_opmerkingen">
                ✓ Zonnescherm
                (terugplaatsen: {{ session.zonnescherm_terugplaatsen ? 'ja' : 'nee' }}, afstandverklaring: {{ session.zonnescherm_afstandverklaring ? 'ja' : 'nee' }})
                <div v-if="session.zonnescherm_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.zonnescherm_opmerkingen }}
                </div>
              </div>
              <div v-if="session.glasbreuk_min">
                ✓ Glasbreuk: {{ minToHours(session.glasbreuk_min) }} uur
                <span v-if="session.glasbreuk_aantal">({{ session.glasbreuk_aantal }}x)</span>
                <div v-if="session.glasbreuk_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.glasbreuk_opmerkingen }}
                </div>
              </div>
              <div v-if="session.diversen_min">
                ✓ Diversen: {{ minToHours(session.diversen_min) }} uur
                <div v-if="session.bewoner_naam" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.bewoner_naam }} - {{ session.bewoner_telefoon }}
                </div>
                <div v-if="session.diversen_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.diversen_opmerkingen }}
                </div>
              </div>
              <div class="mt-sm" style="font-weight: 600;">
                Totaal: {{ getSessionTotalHours(session) }} uur
              </div>
            </div>
          </div>
        </div>

        <!-- Photos section -->
        <div class="mt-md">
          <h3 class="mb-sm">Foto's ({{ housePhotos.length }})</h3>
          <PhotoGallery :photos="housePhotos" :loading="loadingPhotos" />
        </div>
      </div>

      <!-- Houses table -->
      <div v-else class="card">
        <h3 class="mb-md">Woningen met werk ({{ housesTableData.length }})</h3>
        <p class="mb-md text-center" style="color: var(--color-text-light); font-size: 14px;">
          Tik op een rij voor details • Tijden in uren
        </p>

        <div v-if="housesTableData.length === 0" class="text-center">
          Nog geen werk geregistreerd
        </div>

        <div v-else class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Huis</th>
                <th>Binnen</th>
                <th>Balkon</th>
                <th>Zon</th>
                <th>Glas</th>
                <th>Div.</th>
                <th>Totaal</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="house in housesTableData"
                :key="house.number"
                @click="selectedHouse = house.number"
                style="cursor: pointer;"
              >
                <td style="font-weight: 600;">{{ house.number }}</td>
                <td>{{ house.binnenHours || '-' }}</td>
                <td>{{ house.balkonHours || '-' }}</td>
                <td>{{ house.hasZonnescherm ? 'Ja' : '-' }}</td>
                <td>{{ house.glasbreukHours || '-' }}</td>
                <td>{{ house.diversenHours || '-' }}</td>
                <td style="font-weight: 600;">{{ house.totalHours }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Fases tab -->
    <div v-if="activeTab === 'fases'">
      <div class="card">
        <h3 class="mb-md">Fase Rapport</h3>

        <!-- Fase selector -->
        <div class="form-group mb-md">
          <label>Selecteer Fase</label>
          <select v-model="selectedFase">
            <option v-for="n in sessionsStore.totalFases" :key="n" :value="n">
              Fase {{ n }} ({{ n === sessionsStore.totalFases ? 'lopend' : 'compleet' }})
            </option>
          </select>
        </div>

        <!-- Print Report button -->
        <a
          :href="getPrintUrl(selectedFase)"
          target="_blank"
          class="btn btn-primary"
          :class="{ disabled: faseHouses.length === 0 }"
          style="width: 100%; display: block; text-align: center; text-decoration: none;"
        >
          PDF Rapport Fase {{ selectedFase }}
        </a>
      </div>
    </div>

    <!-- Modals -->
    <WorkerEditModal
      :show="showWorkerModal"
      :worker="editingWorker"
      @close="closeWorkerModal"
      @save="saveWorker"
    />

    <SessionEditModal
      :show="showSessionModal"
      :session="editingSession"
      :worker-name="editingSession ? getWorkerName(editingSession.worker_id) : ''"
      @close="closeSessionModal"
      @save="saveSession"
    />
  </div>
</template>

<style scoped>
/* Worker row styles */
.worker-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  min-height: 56px;
}

.worker-row:last-child {
  border-bottom: none;
}

.worker-name {
  flex: 1;
  font-weight: 600;
}

.worker-hours {
  color: var(--color-text-light);
  font-size: 14px;
}

.worker-actions {
  display: flex;
  gap: 4px;
}

/* Session card styles */
.session-card {
  background: var(--color-bg);
  margin-bottom: var(--space-sm);
}

.session-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-date {
  color: var(--color-text-light);
  font-size: 14px;
}

.session-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Icon button styles */
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.btn-add {
  background: var(--color-success);
  color: white;
  font-size: 28px;
  font-weight: bold;
}

.btn-add:active {
  background: var(--color-success-dark);
}

.btn-edit {
  background: var(--color-primary);
  color: white;
}

.btn-edit:active {
  background: var(--color-primary-dark);
}

.btn-delete {
  background: var(--color-error);
  color: white;
}

.btn-delete:active {
  opacity: 0.8;
}
</style>
