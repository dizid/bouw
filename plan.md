# Plan: Fase Reports (Invoice per 50 Houses)

## Goal
Add reporting per "Fase" - groups of 50 houses by completion order - for invoicing.
Report shows hours per house, no worker info.

## Files to Modify
- `src/views/DashboardView.vue` - Add Fases tab
- `src/stores/sessions.ts` - Add Fase computation

## Implementation

### 1. Add computed in sessions store

```typescript
// Get houses ordered by first completion date
const housesInCompletionOrder = computed(() => {
  const houseFirstDate = new Map<number, string>()
  for (const s of sessions.value) {
    const existing = houseFirstDate.get(s.house_number)
    if (!existing || (s.created_at && s.created_at < existing)) {
      houseFirstDate.set(s.house_number, s.created_at || '')
    }
  }
  return [...houseFirstDate.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([num]) => num)
})

// Get Fase number for a house (1-indexed)
function getFaseForHouse(houseNum: number) {
  const index = housesInCompletionOrder.value.indexOf(houseNum)
  return index >= 0 ? Math.floor(index / 50) + 1 : null
}

// Get all houses in a Fase
function getHousesInFase(faseNum: number) {
  const start = (faseNum - 1) * 50
  return housesInCompletionOrder.value.slice(start, start + 50)
}

// Total number of fases
const totalFases = computed(() => {
  return Math.ceil(housesInCompletionOrder.value.length / 50)
})
```

Export these from the store.

### 2. Add "Fases" tab in Dashboard

Add new tab button:
```html
<button class="tab" :class="{ active: activeTab === 'fases' }" @click="activeTab = 'fases'">
  Fases
</button>
```

Update activeTab type to include 'fases'.

### 3. Add Fases tab content

```html
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

    <!-- Export button -->
    <button class="btn btn-secondary mb-md" @click="exportFaseCSV">
      📊 Export Fase {{ selectedFase }} CSV
    </button>

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
    <table class="data-table">
      <thead>
        <tr>
          <th>Huisnummer</th>
          <th>Uren</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="house in faseHousesData" :key="house.number">
          <td>{{ house.number }}</td>
          <td>{{ house.hours }}</td>
        </tr>
        <tr style="font-weight: 700; background: var(--color-bg);">
          <td>Totaal</td>
          <td>{{ faseTotalHours }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### 4. Add computed properties in DashboardView

```typescript
const selectedFase = ref(1)

// Houses in selected fase
const faseHouses = computed(() => {
  return sessionsStore.getHousesInFase(selectedFase.value)
})

// Data for fase table
const faseHousesData = computed(() => {
  return faseHouses.value.map(houseNum => {
    const houseSessions = sessionsStore.getSessionsForHouse(houseNum)
    const totalMinutes = houseSessions.reduce((sum, s) => {
      return sum +
        (s.binnen_opruimen_min || 0) +
        (s.buiten_balkon_min || 0) +
        (s.zonnescherm_verwijderd_min || 0) +
        (s.glasbreuk_min || 0) +
        (s.diversen_min || 0)
    }, 0)
    return {
      number: houseNum,
      hours: (totalMinutes / 60).toFixed(1)
    }
  })
})

// Total hours for fase
const faseTotalHours = computed(() => {
  const total = faseHousesData.value.reduce((sum, h) => sum + parseFloat(h.hours), 0)
  return total.toFixed(1)
})

// Export fase to CSV (no worker names)
function exportFaseCSV() {
  const headers = ['Huisnummer', 'Uren']
  const rows = faseHousesData.value.map(h => [h.number, h.hours])
  rows.push(['Totaal', faseTotalHours.value])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `breijer-fase-${selectedFase.value}-${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
```

## Fase Report Format (CSV output)

```
Huisnummer,Uren
12,2.5
45,1.8
...
Totaal,X.X
```

No worker information included - just house numbers and hours for invoicing.
