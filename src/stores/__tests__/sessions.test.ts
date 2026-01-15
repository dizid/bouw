import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionsStore } from '../sessions'
import type { JobSession } from '@/types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        is: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

// Helper to create test sessions
function createSession(overrides: Partial<JobSession> = {}): JobSession {
  return {
    id: crypto.randomUUID(),
    house_number: 1,
    worker_id: null,
    binnen_opruimen_min: 0,
    buiten_balkon_min: 0,
    glasbreuk_min: 0,
    glasbreuk_aantal: null,
    diversen_min: 0,
    created_at: new Date().toISOString(),
    deleted_at: null,
    bewoner_naam: null,
    bewoner_telefoon: null,
    binnen_opruimen_opmerkingen: null,
    buiten_balkon_opmerkingen: null,
    glasbreuk_opmerkingen: null,
    diversen_opmerkingen: null,
    zonnescherm_verwijderd_min: null,
    zonnescherm_terugplaatsen: null,
    zonnescherm_afstandverklaring: null,
    zonnescherm_opmerkingen: null,
    ...overrides,
  }
}

describe('sessionsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('getSessionsForHouse', () => {
    it('filters sessions by house number', () => {
      const store = useSessionsStore()
      store.sessions = [
        createSession({ house_number: 1 }),
        createSession({ house_number: 2 }),
        createSession({ house_number: 1 }),
      ]

      const result = store.getSessionsForHouse(1)

      expect(result).toHaveLength(2)
      expect(result.every((s) => s.house_number === 1)).toBe(true)
    })

    it('returns empty array for non-existent house', () => {
      const store = useSessionsStore()
      store.sessions = [createSession({ house_number: 1 })]

      const result = store.getSessionsForHouse(999)

      expect(result).toHaveLength(0)
    })
  })

  describe('getWorkerStats', () => {
    it('aggregates minutes correctly', () => {
      const workerId = 'worker-1'
      const store = useSessionsStore()
      store.sessions = [
        createSession({
          worker_id: workerId,
          house_number: 1,
          binnen_opruimen_min: 30,
          buiten_balkon_min: 15,
          glasbreuk_min: 10,
          diversen_min: 5,
        }),
        createSession({
          worker_id: workerId,
          house_number: 2,
          binnen_opruimen_min: 60,
        }),
      ]

      const result = store.getWorkerStats(workerId)

      expect(result.sessions).toBe(2)
      expect(result.houses).toBe(2)
      expect(result.totalMinutes).toBe(120) // 30+15+10+5+60
      expect(result.totalHours).toBe(2.0)
    })

    it('excludes other workers', () => {
      const store = useSessionsStore()
      store.sessions = [
        createSession({ worker_id: 'worker-1', binnen_opruimen_min: 60 }),
        createSession({ worker_id: 'worker-2', binnen_opruimen_min: 120 }),
      ]

      const result = store.getWorkerStats('worker-1')

      expect(result.totalMinutes).toBe(60)
    })

    it('counts unique houses', () => {
      const workerId = 'worker-1'
      const store = useSessionsStore()
      store.sessions = [
        createSession({ worker_id: workerId, house_number: 1 }),
        createSession({ worker_id: workerId, house_number: 1 }),
        createSession({ worker_id: workerId, house_number: 2 }),
      ]

      const result = store.getWorkerStats(workerId)

      expect(result.sessions).toBe(3)
      expect(result.houses).toBe(2)
    })
  })

  describe('sessionsByHouse computed', () => {
    it('groups sessions by house number', () => {
      const store = useSessionsStore()
      store.sessions = [
        createSession({ house_number: 1 }),
        createSession({ house_number: 2 }),
        createSession({ house_number: 1 }),
      ]

      expect(Object.keys(store.sessionsByHouse)).toHaveLength(2)
      expect(store.sessionsByHouse[1]).toHaveLength(2)
      expect(store.sessionsByHouse[2]).toHaveLength(1)
    })
  })

  describe('housesWithSessions computed', () => {
    it('returns set of house numbers', () => {
      const store = useSessionsStore()
      store.sessions = [
        createSession({ house_number: 5 }),
        createSession({ house_number: 10 }),
        createSession({ house_number: 5 }),
      ]

      expect(store.housesWithSessions.size).toBe(2)
      expect(store.housesWithSessions.has(5)).toBe(true)
      expect(store.housesWithSessions.has(10)).toBe(true)
    })
  })

  describe('stats computed', () => {
    it('sums all minute fields', () => {
      const store = useSessionsStore()
      store.sessions = [
        createSession({
          binnen_opruimen_min: 10,
          buiten_balkon_min: 20,
          glasbreuk_min: 30,
          diversen_min: 40,
        }),
      ]

      expect(store.stats.totalMinutes).toBe(100)
      expect(store.stats.totalHours).toBe(1.7) // rounded to 1 decimal
    })

    it('counts total sessions and houses', () => {
      const store = useSessionsStore()
      store.sessions = [
        createSession({ house_number: 1 }),
        createSession({ house_number: 1 }),
        createSession({ house_number: 2 }),
      ]

      expect(store.stats.totalSessions).toBe(3)
      expect(store.stats.totalHouses).toBe(2)
    })
  })

  describe('getHousesInFase', () => {
    it('returns empty array when phase data not loaded', () => {
      const store = useSessionsStore()
      // Phase data is loaded from database via fetchPhaseHouses
      // Before loading, getHousesInFase returns empty array
      expect(store.getHousesInFase(1)).toEqual([])
      expect(store.getHousesInFase(99)).toEqual([])
    })
  })

  describe('totalFases computed', () => {
    it('returns fixed value of 6 phases', () => {
      const store = useSessionsStore()
      // totalFases is now a fixed value based on project phases (1-6)
      expect(store.totalFases).toBe(6)
    })
  })
})
