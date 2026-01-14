import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Worker, WorkerInsert } from '@/types'

export const useWorkersStore = defineStore('workers', () => {
  const workers = ref<Worker[]>([])
  const allWorkers = ref<Worker[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWorkers() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('workers')
        .select('*')
        .eq('active', true)
        .order('name')

      if (err) throw err
      workers.value = data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij ophalen medewerkers'
      console.error('Error fetching workers:', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchAllWorkers() {
    try {
      const { data, error: err } = await supabase
        .from('workers')
        .select('*')
        .order('name')

      if (err) throw err
      allWorkers.value = data || []
    } catch (e) {
      console.error('Error fetching all workers:', e)
    }
  }

  async function addWorker(name: string) {
    loading.value = true
    error.value = null
    try {
      const newWorker: WorkerInsert = { name: name.trim() }
      const { data, error: err } = await supabase
        .from('workers')
        .insert(newWorker)
        .select()
        .single()

      if (err) throw err
      if (data) {
        workers.value.push(data)
        workers.value.sort((a, b) => a.name.localeCompare(b.name))
      }
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij toevoegen medewerker'
      console.error('Error adding worker:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function findOrCreateWorker(name: string): Promise<Worker | null> {
    const trimmedName = name.trim()
    if (!trimmedName) return null

    // Check if worker exists (case-insensitive)
    const existing = workers.value.find(
      w => w.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existing) return existing

    // Create new worker
    return await addWorker(trimmedName)
  }

  async function updateWorker(id: string, name: string) {
    loading.value = true
    error.value = null
    try {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Naam mag niet leeg zijn')

      const { data, error: err } = await supabase
        .from('workers')
        .update({ name: trimmedName })
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      if (data) {
        // Update in local arrays
        const idx = workers.value.findIndex(w => w.id === id)
        if (idx !== -1) {
          workers.value[idx] = data
          workers.value.sort((a, b) => a.name.localeCompare(b.name))
        }
        const allIdx = allWorkers.value.findIndex(w => w.id === id)
        if (allIdx !== -1) {
          allWorkers.value[allIdx] = data
          allWorkers.value.sort((a, b) => a.name.localeCompare(b.name))
        }
      }
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij bijwerken medewerker'
      console.error('Error updating worker:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function removeWorker(id: string) {
    loading.value = true
    error.value = null
    try {
      // Soft delete - set active to false
      const { error: err } = await supabase
        .from('workers')
        .update({ active: false })
        .eq('id', id)

      if (err) throw err
      workers.value = workers.value.filter(w => w.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fout bij verwijderen medewerker'
      console.error('Error removing worker:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    workers,
    allWorkers,
    loading,
    error,
    fetchWorkers,
    fetchAllWorkers,
    addWorker,
    findOrCreateWorker,
    updateWorker,
    removeWorker,
  }
})
