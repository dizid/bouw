import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkersStore } from '../workers'
import type { Worker } from '@/types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

// Helper to create test workers
function createWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: crypto.randomUUID(),
    name: 'Test Worker',
    active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('workersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('findOrCreateWorker', () => {
    it('finds existing worker case-insensitively', async () => {
      const store = useWorkersStore()
      const existingWorker = createWorker({ name: 'Jan de Vries' })
      store.workers = [existingWorker]

      // Should find with exact match
      const result1 = await store.findOrCreateWorker('Jan de Vries')
      expect(result1?.id).toBe(existingWorker.id)

      // Should find with different case
      const result2 = await store.findOrCreateWorker('JAN DE VRIES')
      expect(result2?.id).toBe(existingWorker.id)

      // Should find with mixed case
      const result3 = await store.findOrCreateWorker('jan DE vries')
      expect(result3?.id).toBe(existingWorker.id)
    })

    it('returns null for empty name', async () => {
      const store = useWorkersStore()

      expect(await store.findOrCreateWorker('')).toBeNull()
      expect(await store.findOrCreateWorker('   ')).toBeNull()
    })

    it('trims whitespace from name', async () => {
      const store = useWorkersStore()
      const worker = createWorker({ name: 'Piet' })
      store.workers = [worker]

      const result = await store.findOrCreateWorker('  Piet  ')
      expect(result?.id).toBe(worker.id)
    })
  })

  describe('workers list', () => {
    it('stores workers correctly', () => {
      const store = useWorkersStore()
      const workers = [createWorker({ name: 'A' }), createWorker({ name: 'B' })]
      store.workers = workers

      expect(store.workers).toHaveLength(2)
    })
  })
})
