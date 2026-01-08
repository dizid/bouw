<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useWorkersStore } from '@/stores/workers'
import { useSessionsStore } from '@/stores/sessions'
import { usePhotosStore } from '@/stores/photos'
import PhotoGallery from '@/components/PhotoGallery.vue'
import type { SessionPhoto } from '@/types'

const workersStore = useWorkersStore()
const sessionsStore = useSessionsStore()
const photosStore = usePhotosStore()

const activeTab = ref<'medewerkers' | 'overzicht' | 'woningen'>('overzicht')
const newWorkerName = ref('')
const selectedHouse = ref<number | null>(null)
const housePhotos = ref<SessionPhoto[]>([])
const loadingPhotos = ref(false)

onMounted(async () => {
  await Promise.all([
    workersStore.fetchWorkers(),
    sessionsStore.fetchSessions(),
    sessionsStore.fetchSettings(),
  ])
})

// Get worker name by ID
function getWorkerName(workerId: string | null) {
  if (!workerId) return 'Onbekend'
  const worker = workersStore.workers.find(w => w.id === workerId)
  return worker?.name || 'Onbekend'
}

// Add new worker
async function addWorker() {
  if (!newWorkerName.value.trim()) return
  await workersStore.addWorker(newWorkerName.value)
  newWorkerName.value = ''
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

// Calculate total minutes for a session
function getSessionTotalMinutes(session: any) {
  return (session.binnen_opruimen_min || 0) +
    (session.buiten_balkon_min || 0) +
    (session.zonnescherm_verwijderd_min || 0) +
    (session.glasbreuk_min || 0) +
    (session.diversen_min || 0)
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

// Aggregated data per house for the table
const housesTableData = computed(() => {
  const houses: {
    number: number
    sessions: number
    binnenMin: number
    balkonMin: number
    zonneschermMin: number
    glasbreukMin: number
    diversenMin: number
    totalMin: number
  }[] = []

  for (const houseNum of sessionsStore.housesWithSessions) {
    const houseSessions = sessionsStore.getSessionsForHouse(houseNum)
    const binnenMin = houseSessions.reduce((sum, s) => sum + (s.binnen_opruimen_min || 0), 0)
    const balkonMin = houseSessions.reduce((sum, s) => sum + (s.buiten_balkon_min || 0), 0)
    const zonneschermMin = houseSessions.reduce((sum, s) => sum + (s.zonnescherm_verwijderd_min || 0), 0)
    const glasbreukMin = houseSessions.reduce((sum, s) => sum + (s.glasbreuk_min || 0), 0)
    const diversenMin = houseSessions.reduce((sum, s) => sum + (s.diversen_min || 0), 0)

    houses.push({
      number: houseNum,
      sessions: houseSessions.length,
      binnenMin,
      balkonMin,
      zonneschermMin,
      glasbreukMin,
      diversenMin,
      totalMin: binnenMin + balkonMin + zonneschermMin + glasbreukMin + diversenMin,
    })
  }

  return houses.sort((a, b) => a.number - b.number)
})

// Export to CSV
function exportCSV() {
  const headers = [
    'Datum',
    'Huisnummer',
    'Medewerker',
    'Binnen (min)',
    'Binnen opm.',
    'Balkon (min)',
    'Balkon opm.',
    'Zonnescherm (min)',
    'Terugplaatsen',
    'Afstandverklaring',
    'Zonnescherm opm.',
    'Glasbreuk (min)',
    'Glasbreuk aantal',
    'Glasbreuk opm.',
    'Diversen (min)',
    'Diversen opm.',
    'Bewoner naam',
    'Bewoner tel.',
    'Totaal (min)',
  ]

  const rows = sessionsStore.sessions.map(s => [
    formatDate(s.created_at),
    s.house_number,
    getWorkerName(s.worker_id),
    s.binnen_opruimen_min || '',
    s.binnen_opruimen_opmerkingen || '',
    s.buiten_balkon_min || '',
    s.buiten_balkon_opmerkingen || '',
    s.zonnescherm_verwijderd_min || '',
    s.zonnescherm_terugplaatsen ? 'Ja' : '',
    s.zonnescherm_afstandverklaring ? 'Ja' : '',
    s.zonnescherm_opmerkingen || '',
    s.glasbreuk_min || '',
    s.glasbreuk_aantal || '',
    s.glasbreuk_opmerkingen || '',
    s.diversen_min || '',
    s.diversen_opmerkingen || '',
    s.bewoner_naam || '',
    s.bewoner_telefoon || '',
    getSessionTotalMinutes(s),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `breijer-klussen-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Print
function printPage() {
  window.print()
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
        :class="{ active: activeTab === 'overzicht' }"
        @click="activeTab = 'overzicht'"
      >
        Overzicht
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'woningen' }"
        @click="activeTab = 'woningen'"
      >
        Per Woning
      </button>
    </div>

    <!-- Medewerkers tab -->
    <div v-if="activeTab === 'medewerkers'">
      <div class="card">
        <h3 class="mb-md">Medewerker toevoegen</h3>
        <div class="form-row">
          <input
            type="text"
            v-model="newWorkerName"
            placeholder="Naam"
            @keyup.enter="addWorker"
          />
          <button class="btn btn-primary" @click="addWorker" style="width: auto; padding: 0 24px;">
            +
          </button>
        </div>
      </div>

      <div class="card">
        <h3 class="mb-md">Medewerkers ({{ workersStore.workers.length }})</h3>
        <div v-if="workersStore.workers.length === 0" class="text-center">
          Nog geen medewerkers
        </div>
        <div v-else>
          <div
            v-for="worker in workersStore.workers"
            :key="worker.id"
            class="form-row mb-sm"
            style="align-items: center;"
          >
            <span style="flex: 1; font-weight: 600;">{{ worker.name }}</span>
            <span style="color: var(--color-text-light); font-size: 14px;">
              {{ sessionsStore.getWorkerStats(worker.id).sessions }} sessies
            </span>
            <button
              class="btn btn-secondary"
              style="width: auto; height: 40px; padding: 0 12px; font-size: 14px;"
              @click="if (confirm('Weet je zeker dat je ' + worker.name + ' wilt verwijderen?')) workersStore.removeWorker(worker.id)"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Overzicht tab -->
    <div v-if="activeTab === 'overzicht'">
      <!-- Stats cards -->
      <div class="form-row mb-md">
        <div class="card text-center">
          <div style="font-size: 32px; font-weight: 700; color: var(--color-primary);">
            {{ sessionsStore.stats.totalHouses }}
          </div>
          <div style="font-size: 14px; color: var(--color-text-light);">Woningen</div>
        </div>
        <div class="card text-center">
          <div style="font-size: 32px; font-weight: 700; color: var(--color-primary);">
            {{ sessionsStore.stats.totalHours }}
          </div>
          <div style="font-size: 14px; color: var(--color-text-light);">Uren totaal</div>
        </div>
      </div>

      <!-- Export buttons -->
      <div class="form-row mb-md">
        <button class="btn btn-secondary" @click="printPage">
          🖨️ Print
        </button>
        <button class="btn btn-secondary" @click="exportCSV">
          📊 CSV
        </button>
      </div>

      <!-- Per worker stats -->
      <div class="card">
        <h3 class="mb-md">Per medewerker</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Sessies</th>
              <th>Uren</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="worker in workersStore.workers" :key="worker.id">
              <td>{{ worker.name }}</td>
              <td>{{ sessionsStore.getWorkerStats(worker.id).sessions }}</td>
              <td>{{ sessionsStore.getWorkerStats(worker.id).totalHours }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Recent sessions -->
      <div class="card">
        <h3 class="mb-md">Recente sessies</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Huis</th>
              <th>Wie</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessionsStore.sessions.slice(0, 20)" :key="session.id">
              <td>{{ formatDate(session.created_at) }}</td>
              <td>{{ session.house_number }}</td>
              <td>{{ getWorkerName(session.worker_id) }}</td>
              <td>{{ getSessionTotalMinutes(session) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Per Woning tab -->
    <div v-if="activeTab === 'woningen'">
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
          Geen sessies voor deze woning
        </div>

        <div v-else>
          <div v-for="session in selectedHouseSessions" :key="session.id" class="card" style="background: var(--color-bg);">
            <div class="form-row mb-sm">
              <strong>{{ getWorkerName(session.worker_id) }}</strong>
              <span style="color: var(--color-text-light);">{{ formatDate(session.created_at) }}</span>
            </div>
            <div style="font-size: 14px;">
              <div v-if="session.binnen_opruimen_min">
                ✓ Binnen opruimen: {{ session.binnen_opruimen_min }} min
                <div v-if="session.binnen_opruimen_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.binnen_opruimen_opmerkingen }}
                </div>
              </div>
              <div v-if="session.buiten_balkon_min">
                ✓ Balkon opruimen: {{ session.buiten_balkon_min }} min
                <div v-if="session.buiten_balkon_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.buiten_balkon_opmerkingen }}
                </div>
              </div>
              <div v-if="session.zonnescherm_verwijderd_min">
                ✓ Zonnescherm: {{ session.zonnescherm_verwijderd_min }} min
                <span v-if="session.zonnescherm_terugplaatsen">(terugplaatsen<span v-if="session.zonnescherm_afstandverklaring">, afstandverklaring</span>)</span>
                <div v-if="session.zonnescherm_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.zonnescherm_opmerkingen }}
                </div>
              </div>
              <div v-if="session.glasbreuk_min">
                ✓ Glasbreuk: {{ session.glasbreuk_min }} min
                <span v-if="session.glasbreuk_aantal">({{ session.glasbreuk_aantal }}x)</span>
                <div v-if="session.glasbreuk_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.glasbreuk_opmerkingen }}
                </div>
              </div>
              <div v-if="session.diversen_min">
                ✓ Diversen: {{ session.diversen_min }} min
                <div v-if="session.bewoner_naam" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.bewoner_naam }} - {{ session.bewoner_telefoon }}
                </div>
                <div v-if="session.diversen_opmerkingen" style="color: var(--color-text-light); margin-left: 16px;">
                  {{ session.diversen_opmerkingen }}
                </div>
              </div>
              <div class="mt-sm" style="font-weight: 600;">
                Totaal: {{ getSessionTotalMinutes(session) }} minuten
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
                <th>Zonnesch.</th>
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
                <td>{{ house.binnenMin || '-' }}</td>
                <td>{{ house.balkonMin || '-' }}</td>
                <td>{{ house.zonneschermMin || '-' }}</td>
                <td>{{ house.glasbreukMin || '-' }}</td>
                <td>{{ house.diversenMin || '-' }}</td>
                <td style="font-weight: 600;">{{ house.totalMin }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-md text-center" style="color: var(--color-text-light); font-size: 14px;">
          Tik op een rij voor details • Tijden in minuten
        </p>
      </div>
    </div>
  </div>
</template>
