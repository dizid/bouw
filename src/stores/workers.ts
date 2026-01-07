import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Worker, WorkerInsert } from '@/types'

export const useWorkersStore = defineStore('workers', () => {
  const workers = ref<Worker[]>([])
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
    loading,
    error,
    fetchWorkers,
    addWorker,
    removeWorker,
  }
})
