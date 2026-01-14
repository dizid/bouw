<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { JobSession, JobSessionInsert } from '@/types'

const props = defineProps<{
  show: boolean
  session: JobSession | null
  workerName: string
}>()

const emit = defineEmits<{
  close: []
  save: [updates: Partial<JobSessionInsert>]
}>()

// Form state for each task type
const binnenOpruimen = ref({ minutes: null as number | null, opmerkingen: '' })
const buitenBalkon = ref({ minutes: null as number | null, opmerkingen: '' })
const zonnescherm = ref({ terugplaatsen: false, afstandverklaring: false, opmerkingen: '' })
const glasbreuk = ref({ minutes: null as number | null, aantal: null as number | null, opmerkingen: '' })
const diversen = ref({ minutes: null as number | null, naam: '', telefoon: '', opmerkingen: '' })

const saving = ref(false)

// Reset form when session changes
watch(() => [props.show, props.session], () => {
  if (props.show && props.session) {
    const s = props.session
    binnenOpruimen.value = {
      minutes: s.binnen_opruimen_min,
      opmerkingen: s.binnen_opruimen_opmerkingen || '',
    }
    buitenBalkon.value = {
      minutes: s.buiten_balkon_min,
      opmerkingen: s.buiten_balkon_opmerkingen || '',
    }
    zonnescherm.value = {
      terugplaatsen: s.zonnescherm_terugplaatsen || false,
      afstandverklaring: s.zonnescherm_afstandverklaring || false,
      opmerkingen: s.zonnescherm_opmerkingen || '',
    }
    glasbreuk.value = {
      minutes: s.glasbreuk_min,
      aantal: s.glasbreuk_aantal,
      opmerkingen: s.glasbreuk_opmerkingen || '',
    }
    diversen.value = {
      minutes: s.diversen_min,
      naam: s.bewoner_naam || '',
      telefoon: s.bewoner_telefoon || '',
      opmerkingen: s.diversen_opmerkingen || '',
    }
  }
}, { immediate: true })

// Track which sections are expanded
const expandedSections = ref<Set<string>>(new Set())

function toggleSection(section: string) {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section)
  } else {
    expandedSections.value.add(section)
  }
}

// Check if a section has data
function hasData(section: string): boolean {
  switch (section) {
    case 'binnen':
      return binnenOpruimen.value.minutes !== null || !!binnenOpruimen.value.opmerkingen
    case 'balkon':
      return buitenBalkon.value.minutes !== null || !!buitenBalkon.value.opmerkingen
    case 'zonnescherm':
      return zonnescherm.value.terugplaatsen || zonnescherm.value.afstandverklaring || !!zonnescherm.value.opmerkingen
    case 'glasbreuk':
      return glasbreuk.value.minutes !== null || glasbreuk.value.aantal !== null || !!glasbreuk.value.opmerkingen
    case 'diversen':
      return diversen.value.minutes !== null || !!diversen.value.naam || !!diversen.value.telefoon || !!diversen.value.opmerkingen
    default:
      return false
  }
}

// Auto-expand sections with data on open
watch(() => props.show, (show) => {
  if (show) {
    expandedSections.value = new Set()
    if (hasData('binnen')) expandedSections.value.add('binnen')
    if (hasData('balkon')) expandedSections.value.add('balkon')
    if (hasData('zonnescherm')) expandedSections.value.add('zonnescherm')
    if (hasData('glasbreuk')) expandedSections.value.add('glasbreuk')
    if (hasData('diversen')) expandedSections.value.add('diversen')
  }
})

const canSave = computed(() => {
  // At least one task should have minutes or zonnescherm data
  return binnenOpruimen.value.minutes !== null ||
         buitenBalkon.value.minutes !== null ||
         glasbreuk.value.minutes !== null ||
         diversen.value.minutes !== null ||
         zonnescherm.value.terugplaatsen ||
         zonnescherm.value.afstandverklaring ||
         !!zonnescherm.value.opmerkingen
})

async function handleSave() {
  if (!canSave.value || saving.value) return
  saving.value = true

  const updates: Partial<JobSessionInsert> = {
    binnen_opruimen_min: binnenOpruimen.value.minutes,
    binnen_opruimen_opmerkingen: binnenOpruimen.value.opmerkingen || null,
    buiten_balkon_min: buitenBalkon.value.minutes,
    buiten_balkon_opmerkingen: buitenBalkon.value.opmerkingen || null,
    zonnescherm_terugplaatsen: zonnescherm.value.terugplaatsen || null,
    zonnescherm_afstandverklaring: zonnescherm.value.afstandverklaring || null,
    zonnescherm_opmerkingen: zonnescherm.value.opmerkingen || null,
    glasbreuk_min: glasbreuk.value.minutes,
    glasbreuk_aantal: glasbreuk.value.aantal,
    glasbreuk_opmerkingen: glasbreuk.value.opmerkingen || null,
    diversen_min: diversen.value.minutes,
    diversen_opmerkingen: diversen.value.opmerkingen || null,
    bewoner_naam: diversen.value.naam || null,
    bewoner_telefoon: diversen.value.telefoon || null,
  }

  emit('save', updates)
  saving.value = false
}

function handleClose() {
  emit('close')
}

// Close on escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && session"
      class="modal-overlay"
      @click.self="handleClose"
      @keydown="handleKeydown"
    >
      <div class="modal-content session-modal">
        <div class="modal-header">
          <div>
            <h3>Bewerk klus</h3>
            <p class="modal-subtitle">
              Woning {{ session.house_number }} - {{ workerName }}
            </p>
          </div>
          <button class="modal-close" @click="handleClose" type="button">
            &times;
          </button>
        </div>

        <div class="modal-body">
          <!-- Binnen opruimen -->
          <div class="edit-section" :class="{ expanded: expandedSections.has('binnen'), 'has-data': hasData('binnen') }">
            <div class="section-header" @click="toggleSection('binnen')">
              <span class="section-indicator">{{ hasData('binnen') ? '✓' : '' }}</span>
              <span class="section-title">Binnen opruimen</span>
              <span class="section-toggle">{{ expandedSections.has('binnen') ? '−' : '+' }}</span>
            </div>
            <div v-if="expandedSections.has('binnen')" class="section-content">
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

          <!-- Buiten balkon -->
          <div class="edit-section" :class="{ expanded: expandedSections.has('balkon'), 'has-data': hasData('balkon') }">
            <div class="section-header" @click="toggleSection('balkon')">
              <span class="section-indicator">{{ hasData('balkon') ? '✓' : '' }}</span>
              <span class="section-title">Buiten balkon</span>
              <span class="section-toggle">{{ expandedSections.has('balkon') ? '−' : '+' }}</span>
            </div>
            <div v-if="expandedSections.has('balkon')" class="section-content">
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

          <!-- Zonnescherm -->
          <div class="edit-section" :class="{ expanded: expandedSections.has('zonnescherm'), 'has-data': hasData('zonnescherm') }">
            <div class="section-header" @click="toggleSection('zonnescherm')">
              <span class="section-indicator">{{ hasData('zonnescherm') ? '✓' : '' }}</span>
              <span class="section-title">Zonnescherm</span>
              <span class="section-toggle">{{ expandedSections.has('zonnescherm') ? '−' : '+' }}</span>
            </div>
            <div v-if="expandedSections.has('zonnescherm')" class="section-content">
              <div class="checkbox-row" @click="zonnescherm.terugplaatsen = !zonnescherm.terugplaatsen">
                <div class="task-checkbox" :class="{ checked: zonnescherm.terugplaatsen }"></div>
                <span>Terugplaatsen?</span>
              </div>
              <div v-if="zonnescherm.terugplaatsen" class="checkbox-row" @click="zonnescherm.afstandverklaring = !zonnescherm.afstandverklaring">
                <div class="task-checkbox" :class="{ checked: zonnescherm.afstandverklaring }"></div>
                <span>Afstandverklaring?</span>
              </div>
              <div>
                <label>Opmerkingen</label>
                <textarea v-model="zonnescherm.opmerkingen" rows="2"></textarea>
              </div>
            </div>
          </div>

          <!-- Glasbreuk -->
          <div class="edit-section" :class="{ expanded: expandedSections.has('glasbreuk'), 'has-data': hasData('glasbreuk') }">
            <div class="section-header" @click="toggleSection('glasbreuk')">
              <span class="section-indicator">{{ hasData('glasbreuk') ? '✓' : '' }}</span>
              <span class="section-title">Glasbreuk</span>
              <span class="section-toggle">{{ expandedSections.has('glasbreuk') ? '−' : '+' }}</span>
            </div>
            <div v-if="expandedSections.has('glasbreuk')" class="section-content">
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

          <!-- Diversen -->
          <div class="edit-section" :class="{ expanded: expandedSections.has('diversen'), 'has-data': hasData('diversen') }">
            <div class="section-header" @click="toggleSection('diversen')">
              <span class="section-indicator">{{ hasData('diversen') ? '✓' : '' }}</span>
              <span class="section-title">Diversen</span>
              <span class="section-toggle">{{ expandedSections.has('diversen') ? '−' : '+' }}</span>
            </div>
            <div v-if="expandedSections.has('diversen')" class="section-content">
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
        </div>

        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="handleClose"
            type="button"
          >
            Annuleren
          </button>
          <button
            class="btn btn-success"
            @click="handleSave"
            :disabled="saving"
            type="button"
          >
            {{ saving ? 'Opslaan...' : 'Opslaan' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--space-md);
  padding-top: var(--space-lg);
  z-index: 1000;
  overflow-y: auto;
}

.modal-content.session-modal {
  background: var(--color-card);
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 500px;
  margin-bottom: var(--space-lg);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
}

.modal-subtitle {
  margin: 4px 0 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.modal-close {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  font-size: 28px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-body {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.modal-footer {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.modal-footer .btn {
  flex: 1;
  height: 48px;
}

/* Edit sections */
.edit-section {
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.edit-section.has-data {
  border-left: 4px solid var(--color-success);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  cursor: pointer;
  min-height: 56px;
  -webkit-tap-highlight-color: transparent;
}

.section-indicator {
  width: 24px;
  color: var(--color-success);
  font-weight: bold;
}

.section-title {
  flex: 1;
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.section-toggle {
  font-size: 24px;
  font-weight: bold;
  color: var(--color-text-light);
  width: 32px;
  text-align: center;
}

.section-content {
  padding: 0 var(--space-md) var(--space-md) var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
}

/* Checkbox row */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  cursor: pointer;
  min-height: 48px;
  -webkit-tap-highlight-color: transparent;
}

/* Use existing task-checkbox styles from global */
.task-checkbox {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-card);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.task-checkbox.checked {
  background: var(--color-success);
  border-color: var(--color-success);
}

.task-checkbox.checked::after {
  content: '✓';
  color: white;
  font-size: 16px;
  font-weight: bold;
}
</style>
