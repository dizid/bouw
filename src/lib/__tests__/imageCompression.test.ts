import { describe, it, expect } from 'vitest'
import { generateStorageFilename, getThumbnailPath } from '../imageCompression'

describe('imageCompression', () => {
  describe('generateStorageFilename', () => {
    it('generates path with sessionId prefix', () => {
      const sessionId = 'abc-123'
      const result = generateStorageFilename(sessionId)

      expect(result).toMatch(new RegExp(`^${sessionId}/`))
    })

    it('generates .jpg extension', () => {
      const result = generateStorageFilename('session-1')

      expect(result).toMatch(/\.jpg$/)
    })

    it('includes timestamp and random string', () => {
      const result = generateStorageFilename('session-1')
      // Format: {sessionId}/{timestamp}_{random}.jpg
      const parts = result.split('/')
      expect(parts).toHaveLength(2)
      expect(parts[1]).toMatch(/^\d+_[a-z0-9]+\.jpg$/)
    })

    it('generates unique filenames', () => {
      const results = new Set<string>()
      for (let i = 0; i < 10; i++) {
        results.add(generateStorageFilename('session-1'))
      }
      // All 10 should be unique
      expect(results.size).toBe(10)
    })
  })

  describe('getThumbnailPath', () => {
    it('prepends thumbnails/ to path', () => {
      const original = 'session-1/12345_abc.jpg'
      const result = getThumbnailPath(original)

      expect(result).toBe('thumbnails/session-1/12345_abc.jpg')
    })

    it('handles paths with multiple segments', () => {
      const original = 'a/b/c/file.jpg'
      const result = getThumbnailPath(original)

      expect(result).toBe('thumbnails/a/b/c/file.jpg')
    })
  })
})
