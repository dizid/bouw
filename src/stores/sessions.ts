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
        (s.zonnescherm_verwijderd_min || 0) +
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
        .order('created_at', { ascending: false })

      if (err) throw err
      sessions.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij ophalen sessies'
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
      const { error: err } = await supabase
        .from('job_sessions')
        .delete()
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
        (s.zonnescherm_verwijderd_min || 0) +
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

  return {
    sessions,
    loading,
    error,
    maxHouses,
    sessionsByHouse,
    housesWithSessions,
    stats,
    fetchSettings,
    fetchSessions,
    createSession,
    deleteSession,
    getSessionsForHouse,
    getWorkerStats,
  }
})
