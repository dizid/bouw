import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePhotosStore } from '../photos'

// Mock Supabase with storage
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        in: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          is: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: (path: string, options?: { transform?: object }) => ({
          data: {
            publicUrl: options?.transform
              ? `https://storage.example.com/${path}?transform=true`
              : `https://storage.example.com/${path}`,
          },
        }),
      }),
    },
  },
}))

describe('photosStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('getPhotoUrl', () => {
    it('returns public URL for storage path', () => {
      const store = usePhotosStore()
      const result = store.getPhotoUrl('session-1/photo.jpg')

      expect(result).toBe('https://storage.example.com/session-1/photo.jpg')
    })
  })

  describe('getPhotoThumbnailUrl', () => {
    it('uses pre-generated thumbnail when available', () => {
      const store = usePhotosStore()
      const result = store.getPhotoThumbnailUrl(
        'session-1/photo.jpg',
        'thumbnails/session-1/photo.jpg'
      )

      expect(result).toBe('https://storage.example.com/thumbnails/session-1/photo.jpg')
      expect(result).not.toContain('transform')
    })

    it('falls back to transform when no thumbnail path', () => {
      const store = usePhotosStore()
      const result = store.getPhotoThumbnailUrl('session-1/photo.jpg', null)

      expect(result).toContain('transform=true')
    })

    it('falls back to transform when thumbnail undefined', () => {
      const store = usePhotosStore()
      const result = store.getPhotoThumbnailUrl('session-1/photo.jpg', undefined)

      expect(result).toContain('transform=true')
    })
  })
})
