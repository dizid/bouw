import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { JobSession, JobSessionInsert } from '@/types'

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref<JobSession[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const maxHouses = ref(200)

  // Computed: sessions grouped by house number
  const sessionsByHouse = computed(() => {
    const grouped: Record<number, JobSession[]> = {}
    for (const session of sessions.value) {
      const houseNum = session.house_number
      if (!grouped[houseNum]) {
        grouped[houseNum] = []
      }
      grouped[houseNum]!.push(session)
    }
    return grouped
  })

  // Computed: houses that have at least one session
  const housesWithSessions = computed(() => {
    return new Set(sessions.value.map(s => s.house_number))
  })

  // Computed: total stats
  const stats = computed(() => {
    const totalMinutes = sessions.value.reduce((sum, s) => {
      return sum +
        (s.binnen_opruimen_min || 0) +
        (s.buiten_balkon_min || 0) +
        (s.glasbreuk_min || 0) +
        (s.diversen_min || 0)
    }, 0)

    return {
      totalSessions: sessions.value.length,
      totalHouses: housesWithSessions.value.size,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    }
  })

  async function fetchSettings() {
    try {
      const { data, error: err } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'max_houses')
        .single()

      if (err) throw err
      if (data) {
        maxHouses.value = parseInt(data.value) || 200
      }
    } catch (e) {
      console.error('Error fetching settings:', e)
    }
  }

  async function fetchSessions() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('job_sessions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (err) throw err
      sessions.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij ophalen klussen'
      console.error('Error fetching sessions:', e)
    } finally {
      loading.value = false
    }
  }

  async function createSession(session: JobSessionInsert) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('job_sessions')
        .insert(session)
        .select()
        .single()

      if (err) throw err
      if (data) {
        sessions.value.unshift(data)
      }
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij opslaan'
      console.error('Error creating session:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteSession(id: string) {
    loading.value = true
    error.value = null
    try {
      // Soft delete - set deleted_at instead of actually deleting
      const { error: err } = await supabase
        .from('job_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (err) throw err
      sessions.value = sessions.value.filter(s => s.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij verwijderen'
      console.error('Error deleting session:', e)
    } finally {
      loading.value = false
    }
  }

  async function updateSession(id: string, updates: Partial<JobSessionInsert>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('job_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      if (data) {
        // Update in local array
        const idx = sessions.value.findIndex(s => s.id === id)
        if (idx !== -1) {
          sessions.value[idx] = data
        }
      }
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij bijwerken'
      console.error('Error updating session:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Get sessions for a specific house
  function getSessionsForHouse(houseNumber: number) {
    return sessions.value.filter(s => s.house_number === houseNumber)
  }

  // Get stats for a specific worker
  function getWorkerStats(workerId: string) {
    const workerSessions = sessions.value.filter(s => s.worker_id === workerId)
    const totalMinutes = workerSessions.reduce((sum, s) => {
      return sum +
        (s.binnen_opruimen_min || 0) +
        (s.buiten_balkon_min || 0) +
        (s.glasbreuk_min || 0) +
        (s.diversen_min || 0)
    }, 0)

    return {
      sessions: workerSessions.length,
      houses: new Set(workerSessions.map(s => s.house_number)).size,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    }
  }

  // Fases: houses ordered by first completion date
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

  // Get houses in a specific fase (1-indexed, 50 houses per fase)
  function getHousesInFase(faseNum: number) {
    const start = (faseNum - 1) * 50
    return housesInCompletionOrder.value.slice(start, start + 50)
  }

  // Total number of fases
  const totalFases = computed(() =>
    Math.ceil(housesInCompletionOrder.value.length / 50) || 1
  )

  return {
    sessions,
    loading,
    error,
    maxHouses,
    sessionsByHouse,
    housesWithSessions,
    stats,
    housesInCompletionOrder,
    totalFases,
    fetchSettings,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    getSessionsForHouse,
    getWorkerStats,
    getHousesInFase,
  }
})
