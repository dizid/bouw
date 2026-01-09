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

const activeTab = ref<'medewerkers' | 'woningen' | 'fases'>('medewerkers')
const selectedHouse = ref<number | null>(null)
const searchHouseNumber = ref<number | null>(null)
const housePhotos = ref<SessionPhoto[]>([])
const loadingPhotos = ref(false)
const selectedFase = ref(1)

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
    glasbreukMin: number
    diversenMin: number
    totalMin: number
  }[] = []

  for (const houseNum of sessionsStore.housesWithSessions) {
    const houseSessions = sessionsStore.getSessionsForHouse(houseNum)
    const binnenMin = houseSessions.reduce((sum, s) => sum + (s.binnen_opruimen_min || 0), 0)
    const balkonMin = houseSessions.reduce((sum, s) => sum + (s.buiten_balkon_min || 0), 0)
    const glasbreukMin = houseSessions.reduce((sum, s) => sum + (s.glasbreuk_min || 0), 0)
    const diversenMin = houseSessions.reduce((sum, s) => sum + (s.diversen_min || 0), 0)

    houses.push({
      number: houseNum,
      sessions: houseSessions.length,
      binnenMin,
      balkonMin,
      glasbreukMin,
      diversenMin,
      totalMin: binnenMin + balkonMin + glasbreukMin + diversenMin,
    })
  }

  return houses.sort((a, b) => a.number - b.number)
})

// Fases: houses in selected fase
const faseHouses = computed(() => {
  return sessionsStore.getHousesInFase(selectedFase.value)
})

// Data for fase table
const faseHousesData = computed(() => {
  return faseHouses.value.map(houseNum => {
    const houseSessions = sessionsStore.getSessionsForHouse(houseNum)
    const binnenMin = houseSessions.reduce((sum, s) => sum + (s.binnen_opruimen_min || 0), 0)
    const balkonMin = houseSessions.reduce((sum, s) => sum + (s.buiten_balkon_min || 0), 0)
    const hasZonnescherm = houseSessions.some(s => s.zonnescherm_terugplaatsen !== null || s.zonnescherm_opmerkingen)
    const glasbreukMin = houseSessions.reduce((sum, s) => sum + (s.glasbreuk_min || 0), 0)
    const diversenMin = houseSessions.reduce((sum, s) => sum + (s.diversen_min || 0), 0)
    const totalMin = binnenMin + balkonMin + glasbreukMin + diversenMin

    return {
      number: houseNum,
      hours: (totalMin / 60).toFixed(1),
      hasBinnen: binnenMin > 0,
      hasBalkon: balkonMin > 0,
      hasZonnescherm,
      hasGlasbreuk: glasbreukMin > 0,
      hasDiversen: diversenMin > 0,
    }
  })
})

// Total hours for fase
const faseTotalHours = computed(() => {
  const total = faseHousesData.value.reduce((sum, h) => sum + parseFloat(h.hours), 0)
  return total.toFixed(1)
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
              {{ sessionsStore.getWorkerStats(worker.id).sessions }} klussen
            </span>
            <button
              class="btn btn-secondary"
              style="width: auto; height: 40px; padding: 0 12px; font-size: 14px;"
              @click="confirmRemoveWorker(worker)"
            >
              ×
            </button>
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
              <div v-if="session.zonnescherm_terugplaatsen !== null || session.zonnescherm_opmerkingen">
                ✓ Zonnescherm
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
        <p class="mb-md text-center" style="color: var(--color-text-light); font-size: 14px;">
          Tik op een rij voor details • Tijden in minuten
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
                <td>{{ house.glasbreukMin || '-' }}</td>
                <td>{{ house.diversenMin || '-' }}</td>
                <td style="font-weight: 600;">{{ house.totalMin }}</td>
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
          class="btn btn-primary mb-md"
          :class="{ disabled: faseHouses.length === 0 }"
          style="width: 100%; display: block; text-align: center; text-decoration: none;"
        >
          PDF Rapport Fase {{ selectedFase }}
        </a>

        <!-- Stats -->
        <div class="form-row mb-md">
          <div class="card text-center" style="background: var(--color-bg);">
            <div style="font-size: 24px; font-weight: 700;">{{ faseHouses.length }}</div>
            <div style="font-size: 14px;">Woningen</div>
          </div>
          <div class="card text-center" style="background: var(--color-bg);">
            <div style="font-size: 24px; font-weight: 700;">{{ faseTotalHours }}</div>
            <div style="font-size: 14px;">Uren totaal</div>
          </div>
        </div>

        <!-- Table -->
        <div v-if="faseHousesData.length === 0" class="text-center">
          Nog geen woningen in deze fase
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Woning</th>
              <th>Werkzaamheden</th>
              <th>Uren</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="house in faseHousesData" :key="house.number">
              <td style="font-weight: 600;">{{ house.number }}</td>
              <td style="font-size: 12px;">
                <span v-if="house.hasBinnen">Binnen </span>
                <span v-if="house.hasBalkon">Balkon </span>
                <span v-if="house.hasZonnescherm">Zon </span>
                <span v-if="house.hasGlasbreuk">Glas </span>
                <span v-if="house.hasDiversen">Div</span>
              </td>
              <td>{{ house.hours }}</td>
            </tr>
            <tr style="font-weight: 700; background: var(--color-bg);">
              <td>Totaal</td>
              <td></td>
              <td>{{ faseTotalHours }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
