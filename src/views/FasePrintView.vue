<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionsStore } from '@/stores/sessions'
import { usePhotosStore } from '@/stores/photos'
import { useWorkersStore } from '@/stores/workers'
import type { SessionPhoto } from '@/types'

const route = useRoute()
const sessionsStore = useSessionsStore()
const photosStore = usePhotosStore()
const workersStore = useWorkersStore()

const loading = ref(true)
const imagesLoading = ref(true)
const imagesLoaded = ref(0)
const totalImages = ref(0)
const faseNum = computed(() => Number(route.params.num) || 1)

// Photos indexed by house number
const photosByHouse = ref<Record<number, SessionPhoto[]>>({})

// Lightbox state
const selectedPhoto = ref<SessionPhoto | null>(null)

function openPhoto(photo: SessionPhoto) {
  selectedPhoto.value = photo
}

function closePhoto() {
  selectedPhoto.value = null
}

function getFullResUrl(): string {
  if (!selectedPhoto.value) return ''
  return photosStore.getPhotoUrl(selectedPhoto.value.storage_path)
}

onMounted(async () => {
  // Fetch sessions, workers, and phase mappings in parallel
  await Promise.all([
    sessionsStore.fetchSessions(),
    sessionsStore.fetchPhaseHouses(),
    workersStore.fetchAllWorkers()
  ])

  // Fetch photos for all houses in this fase with single batch query
  const houses = sessionsStore.getHousesInFase(faseNum.value)
  photosByHouse.value = await photosStore.fetchPhotosForHouses(houses)

  // Count total images (max 6 per house)
  let count = 0
  for (const photos of Object.values(photosByHouse.value)) {
    count += Math.min(photos.length, 6)
  }
  totalImages.value = count

  // If no images, mark as loaded
  if (count === 0) {
    imagesLoading.value = false
  }

  loading.value = false
})

// Houses in this fase
const faseHouses = computed(() => sessionsStore.getHousesInFase(faseNum.value))

// Helper: get worker name by ID
function getWorkerName(workerId: string | null): string {
  if (!workerId) return ''
  const worker = workersStore.allWorkers.find(w => w.id === workerId)
  return worker?.name || ''
}

// Helper: collect non-empty remarks from sessions and join them
function collectRemarks(sessions: typeof sessionsStore.sessions, field: keyof typeof sessions[0]): string | null {
  const remarks = sessions
    .map(s => s[field])
    .filter((r): r is string => !!r && typeof r === 'string' && r.trim() !== '')
  return remarks.length > 0 ? remarks.join(' | ') : null
}

// Data for each house - hours per task type
const faseHousesData = computed(() => {
  return faseHouses.value.map(houseNum => {
    const houseSessions = sessionsStore.getSessionsForHouse(houseNum)
    const binnenMin = houseSessions.reduce((sum, s) => sum + (s.binnen_opruimen_min || 0), 0)
    const balkonMin = houseSessions.reduce((sum, s) => sum + (s.buiten_balkon_min || 0), 0)
    const hasZonnescherm = houseSessions.some(s => s.zonnescherm_terugplaatsen !== null || s.zonnescherm_opmerkingen)
    const glasbreukMin = houseSessions.reduce((sum, s) => sum + (s.glasbreuk_min || 0), 0)
    const diversenMin = houseSessions.reduce((sum, s) => sum + (s.diversen_min || 0), 0)
    const totalMin = binnenMin + balkonMin + glasbreukMin + diversenMin

    // Collect unique worker names for this house
    const workerIds = new Set<string>()
    houseSessions.forEach(s => {
      if (s.worker_id) workerIds.add(s.worker_id)
    })
    const workerNames = [...workerIds]
      .map(id => getWorkerName(id))
      .filter(name => name)
      .join(', ')

    // Collect remarks from all sessions for this house
    const remarks = {
      binnen: collectRemarks(houseSessions, 'binnen_opruimen_opmerkingen'),
      balkon: collectRemarks(houseSessions, 'buiten_balkon_opmerkingen'),
      zonnescherm: collectRemarks(houseSessions, 'zonnescherm_opmerkingen'),
      glasbreuk: collectRemarks(houseSessions, 'glasbreuk_opmerkingen'),
      diversen: collectRemarks(houseSessions, 'diversen_opmerkingen'),
    }
    const hasRemarks = Object.values(remarks).some(r => r !== null)

    return {
      number: houseNum,
      totalHours: (totalMin / 60).toFixed(1),
      binnenHours: binnenMin > 0 ? (binnenMin / 60).toFixed(1) : null,
      balkonHours: balkonMin > 0 ? (balkonMin / 60).toFixed(1) : null,
      zonnescherm: hasZonnescherm,
      glasbreukHours: glasbreukMin > 0 ? (glasbreukMin / 60).toFixed(1) : null,
      diversenHours: diversenMin > 0 ? (diversenMin / 60).toFixed(1) : null,
      workers: workerNames,
      remarks,
      hasRemarks,
    }
  })
})

// Executive overview stats
const overviewStats = computed(() => {
  const total = faseHousesData.value.length
  const binnenCount = faseHousesData.value.filter(h => h.binnenHours !== null).length
  const balkonCount = faseHousesData.value.filter(h => h.balkonHours !== null).length
  const zonneschermCount = faseHousesData.value.filter(h => h.zonnescherm).length
  const glasbreukCount = faseHousesData.value.filter(h => h.glasbreukHours !== null).length
  const diversenCount = faseHousesData.value.filter(h => h.diversenHours !== null).length

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return {
    total,
    binnen: { count: binnenCount, pct: pct(binnenCount) },
    balkon: { count: balkonCount, pct: pct(balkonCount) },
    zonnescherm: { count: zonneschermCount, pct: pct(zonneschermCount) },
    glasbreuk: { count: glasbreukCount, pct: pct(glasbreukCount) },
    diversen: { count: diversenCount, pct: pct(diversenCount) },
  }
})

// Total hours for fase
const faseTotalHours = computed(() => {
  const total = faseHousesData.value.reduce((sum, h) => sum + parseFloat(h.totalHours), 0)
  return total.toFixed(1)
})

// Get photo URL (uses pre-generated thumbnail if available, else falls back to transform)
function getPhotoUrl(photo: SessionPhoto): string {
  return photosStore.getPhotoThumbnailUrl(photo.storage_path, photo.thumbnail_path)
}

// Track image load progress
function onImageLoad() {
  imagesLoaded.value++
  if (imagesLoaded.value >= totalImages.value) {
    imagesLoading.value = false
  }
}

// Hide broken image (also counts as "loaded" for progress)
function hideImage(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  onImageLoad()
}

// Print the page
function printPage() {
  window.print()
}

// Format date
const formattedDate = computed(() => {
  return new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})
</script>

<template>
  <div class="print-page">
    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>Rapport laden...</p>
    </div>

    <!-- Print content -->
    <div v-else class="print-content">
      <!-- Print button (hidden when printing) -->
      <div class="no-print toolbar">
        <button
          class="print-btn"
          :disabled="imagesLoading && totalImages > 0"
          @click="printPage"
        >
          <template v-if="imagesLoading && totalImages > 0">
            Foto's laden... ({{ imagesLoaded }}/{{ totalImages }})
          </template>
          <template v-else>
            Afdrukken / Opslaan als PDF
          </template>
        </button>
        <p v-if="!imagesLoading || totalImages === 0" class="hint">Tip: Kies "Opslaan als PDF" in het print dialoog</p>
      </div>

      <!-- Header bar -->
      <header class="header-bar">
        <div class="header-left">
          <img src="/breijer_logo.png" alt="Breijer" class="logo" />
          <div class="project-info">
            <span class="project-name">Complex "De Hoeksteen"</span>
            <span class="project-number">Werknummer: 2500714</span>
          </div>
        </div>
        <span class="date">{{ formattedDate }}</span>
      </header>

      <!-- Title -->
      <div class="title-section">
        <h1>Fase {{ faseNum }} Rapport</h1>
      </div>

      <!-- Executive Overview -->
      <section class="overview-card">
        <h2>Overzicht</h2>

        <div class="overview-stats">
          <div class="stat-box">
            <span class="stat-value">{{ overviewStats.total }}</span>
            <span class="stat-label">woningen</span>
          </div>
          <div class="stat-box">
            <span class="stat-value">{{ faseTotalHours }}</span>
            <span class="stat-label">uur totaal</span>
          </div>
        </div>

        <div class="task-breakdown">
          <h3>Uitgevoerde werkzaamheden</h3>
          <div class="task-row">
            <span class="task-name">Binnen opruimen</span>
            <span class="task-count">{{ overviewStats.binnen.count }}</span>
            <span class="task-pct">({{ overviewStats.binnen.pct }}%)</span>
            <div class="task-bar">
              <div class="task-bar-fill" :style="{ width: overviewStats.binnen.pct + '%' }"></div>
            </div>
          </div>
          <div class="task-row">
            <span class="task-name">Balkon opruimen</span>
            <span class="task-count">{{ overviewStats.balkon.count }}</span>
            <span class="task-pct">({{ overviewStats.balkon.pct }}%)</span>
            <div class="task-bar">
              <div class="task-bar-fill" :style="{ width: overviewStats.balkon.pct + '%' }"></div>
            </div>
          </div>
          <div class="task-row">
            <span class="task-name">Zonnescherm</span>
            <span class="task-count">{{ overviewStats.zonnescherm.count }}</span>
            <span class="task-pct">({{ overviewStats.zonnescherm.pct }}%)</span>
            <div class="task-bar">
              <div class="task-bar-fill" :style="{ width: overviewStats.zonnescherm.pct + '%' }"></div>
            </div>
          </div>
          <div class="task-row">
            <span class="task-name">Glasbreuk</span>
            <span class="task-count">{{ overviewStats.glasbreuk.count }}</span>
            <span class="task-pct">({{ overviewStats.glasbreuk.pct }}%)</span>
            <div class="task-bar">
              <div class="task-bar-fill" :style="{ width: overviewStats.glasbreuk.pct + '%' }"></div>
            </div>
          </div>
          <div class="task-row">
            <span class="task-name">Diversen</span>
            <span class="task-count">{{ overviewStats.diversen.count }}</span>
            <span class="task-pct">({{ overviewStats.diversen.pct }}%)</span>
            <div class="task-bar">
              <div class="task-bar-fill" :style="{ width: overviewStats.diversen.pct + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Houses Table -->
      <section class="houses-section">
        <h2>Details per woning</h2>

        <!-- Professional table with hours per task -->
        <table class="houses-table">
          <thead>
            <tr>
              <th class="col-house">Woning</th>
              <th class="col-task-hours">Binnen</th>
              <th class="col-task-hours">Balkon</th>
              <th class="col-task-hours">Zonnescherm</th>
              <th class="col-task-hours">Glasbreuk</th>
              <th class="col-task-hours">Diversen</th>
              <th class="col-total">Totaal</th>
              <th class="col-workers">Door</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="house in faseHousesData" :key="house.number">
              <!-- Data row -->
              <tr class="data-row">
                <td class="house-num">{{ house.number }}</td>
                <td class="task-hours">{{ house.binnenHours || '-' }}</td>
                <td class="task-hours">{{ house.balkonHours || '-' }}</td>
                <td class="task-hours">{{ house.zonnescherm ? 'Ja' : '-' }}</td>
                <td class="task-hours">{{ house.glasbreukHours || '-' }}</td>
                <td class="task-hours">{{ house.diversenHours || '-' }}</td>
                <td class="total-hours">{{ house.totalHours }}</td>
                <td class="workers">{{ house.workers }}</td>
              </tr>
              <!-- Photo row (if photos exist) -->
              <tr v-if="photosByHouse[house.number]?.length" class="photo-row">
                <td colspan="8">
                  <div class="photos-inline">
                    <img
                      v-for="(photo, idx) in photosByHouse[house.number]"
                      :key="photo.id"
                      :src="getPhotoUrl(photo)"
                      :alt="'Foto ' + (idx + 1)"
                      class="photo-thumb clickable"
                      @load="onImageLoad"
                      @error="hideImage"
                      @click="openPhoto(photo)"
                    />
                  </div>
                </td>
              </tr>
              <!-- Remarks row (if remarks exist) -->
              <tr v-if="house.hasRemarks" class="remarks-row">
                <td colspan="8">
                  <div class="remarks-content">
                    <span v-if="house.remarks.binnen" class="remark-item">
                      <strong>Binnen:</strong> {{ house.remarks.binnen }}
                    </span>
                    <span v-if="house.remarks.balkon" class="remark-item">
                      <strong>Balkon:</strong> {{ house.remarks.balkon }}
                    </span>
                    <span v-if="house.remarks.zonnescherm" class="remark-item">
                      <strong>Zonnescherm:</strong> {{ house.remarks.zonnescherm }}
                    </span>
                    <span v-if="house.remarks.glasbreuk" class="remark-item">
                      <strong>Glasbreuk:</strong> {{ house.remarks.glasbreuk }}
                    </span>
                    <span v-if="house.remarks.diversen" class="remark-item">
                      <strong>Diversen:</strong> {{ house.remarks.diversen }}
                    </span>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </section>

      <!-- Footer -->
      <footer class="report-footer">
        <p>Breijer Klussen - Fase {{ faseNum }} Rapport - {{ formattedDate }}</p>
      </footer>
    </div>

    <!-- Photo Lightbox -->
    <Teleport to="body">
      <div v-if="selectedPhoto" class="photo-lightbox" @click="closePhoto">
        <button
          type="button"
          class="photo-lightbox-close"
          @click.stop="closePhoto"
          aria-label="Sluiten"
        >
          &times;
        </button>
        <img
          :src="getFullResUrl()"
          alt="Foto volledig scherm"
          class="photo-lightbox-img"
          @click.stop
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Variables */
:root {
  --primary: #1e3a5f;
  --accent: #3b82f6;
  --success: #059669;
  --warning: #d97706;
  --text: #374151;
  --text-light: #6b7280;
  --bg-light: #f8fafc;
  --border: #e2e8f0;
}

/* Base styles */
.print-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #374151;
  line-height: 1.5;
}

.loading {
  text-align: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  color: #6b7280;
  font-size: 16px;
}

/* Toolbar (screen only) */
.toolbar {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
}

.print-btn {
  background: white;
  color: #1e3a5f;
  border: none;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.print-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.print-btn:disabled {
  background: #94a3b8;
  cursor: wait;
}

.hint {
  margin-top: 8px;
  color: rgba(255,255,255,0.8);
  font-size: 12px;
}

/* Header bar */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 2px solid #1e3a5f;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  height: 36px;
  width: auto;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e3a5f;
}

.project-number {
  font-size: 12px;
  color: #6b7280;
}

.date {
  font-size: 13px;
  color: #6b7280;
}

/* Title */
.title-section {
  text-align: center;
  margin-bottom: 32px;
}

.title-section h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #1e3a5f;
}

/* Overview card */
.overview-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.overview-card h2 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #1e3a5f;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.overview-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  flex: 1;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  color: white;
}

.stat-value {
  display: block;
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 14px;
  opacity: 0.85;
  margin-top: 4px;
}

.task-breakdown h3 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-row {
  display: grid;
  grid-template-columns: 140px 40px 50px 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.task-row:last-child {
  border-bottom: none;
}

.task-name {
  font-size: 14px;
  color: #374151;
}

.task-count {
  font-size: 14px;
  font-weight: 600;
  color: #1e3a5f;
  text-align: right;
}

.task-pct {
  font-size: 13px;
  color: #6b7280;
}

.task-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.task-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #1e3a5f 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Houses section */
.houses-section {
  margin-bottom: 32px;
}

.houses-section h2 {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #1e3a5f;
}

/* Professional table */
.houses-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: white;
  border: 1px solid #d1d5db;
}

.houses-table thead {
  background: #1e3a5f;
  color: white;
}

.houses-table th {
  padding: 10px 8px;
  text-align: center;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-right: 1px solid rgba(255,255,255,0.1);
}

.houses-table th:last-child {
  border-right: none;
}

.houses-table th.col-house {
  text-align: left;
  width: 70px;
}

.houses-table th.col-task-hours {
  width: 75px;
}

.houses-table th.col-total {
  width: 65px;
  background: #0f2942;
}

.houses-table th.col-workers {
  text-align: left;
  width: auto;
}

.houses-table td {
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  vertical-align: middle;
}

.houses-table td:last-child {
  border-right: none;
}

.houses-table .data-row:nth-child(4n+1),
.houses-table .data-row:nth-child(4n+2) {
  background: #f9fafb;
}

.houses-table .house-num {
  font-weight: 700;
  color: #1e3a5f;
}

.houses-table .task-hours {
  text-align: center;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  color: #374151;
}

.houses-table .total-hours {
  text-align: center;
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #1e3a5f;
  background: #f0f7ff;
}

.houses-table .workers {
  color: #6b7280;
  font-size: 12px;
}

/* Photo row */
.photo-row td {
  padding: 4px 8px 8px;
  background: inherit;
  border-bottom: 2px solid #e2e8f0;
}

.photos-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.photo-thumb {
  height: 80px;
  width: auto;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.photo-thumb.clickable {
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.photo-thumb.clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* Remarks row */
.remarks-row td {
  padding: 6px 8px;
  background: #fffbeb;
  border-bottom: 2px solid #e2e8f0;
}

.remarks-content {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  line-height: 1.4;
}

.remark-item {
  color: #374151;
}

.remark-item strong {
  color: #1e3a5f;
  font-weight: 600;
}

/* Footer */
.report-footer {
  text-align: center;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
  color: #6b7280;
  font-size: 12px;
}

/* Photo Lightbox */
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
  padding: 16px;
}

.photo-lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
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

.photo-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.photo-lightbox-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

/* Print styles */
@media print {
  .no-print,
  .photo-lightbox {
    display: none !important;
  }

  .print-page {
    max-width: none;
    margin: 0;
    padding: 0;
  }

  @page {
    size: A4;
    margin: 12mm;
  }

  .header-bar {
    margin-bottom: 16px;
  }

  .title-section {
    margin-bottom: 20px;
  }

  .title-section h1 {
    font-size: 26px;
  }

  .overview-card {
    margin-bottom: 24px;
    padding: 16px;
    box-shadow: none;
    border: 1px solid #ccc;
  }

  .stat-box {
    padding: 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .stat-value {
    font-size: 28px;
  }

  .task-bar-fill {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Table print styles */
  .houses-table {
    font-size: 11px;
    border: 1px solid #ccc;
  }

  .houses-table thead {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .houses-table th {
    padding: 6px;
    font-size: 10px;
  }

  .houses-table td {
    padding: 5px 6px;
  }

  .houses-table .data-row:nth-child(4n+1),
  .houses-table .data-row:nth-child(4n+2) {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .houses-table .total-hours {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .houses-table .task-hours,
  .houses-table .total-hours {
    font-size: 10px;
  }

  .photo-thumb {
    height: 60px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .photos-inline {
    gap: 3px;
  }

  .remarks-row td {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .remarks-content {
    font-size: 10px;
    gap: 8px;
  }

  .report-footer {
    margin-top: 16px;
    page-break-inside: avoid;
  }
}
</style>
