import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PhotoGallery from '../PhotoGallery.vue'
import type { SessionPhoto } from '@/types'

// Mock Supabase for photos store
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test.com/${path}` },
        }),
      }),
    },
  },
}))

describe('PhotoGallery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function createPhoto(id: string): SessionPhoto {
    return {
      id,
      session_id: 'session-1',
      storage_path: `session-1/${id}.jpg`,
      thumbnail_path: null,
      original_filename: `${id}.jpg`,
      file_size: 1000,
      job_type: null,
      created_at: new Date().toISOString(),
    }
  }

  describe('rendering', () => {
    it('renders photo thumbnails', () => {
      const photos = [createPhoto('1'), createPhoto('2'), createPhoto('3')]
      const wrapper = mount(PhotoGallery, {
        props: { photos },
        global: {
          stubs: { Teleport: true },
        },
      })

      const thumbs = wrapper.findAll('.photo-gallery-thumb')
      expect(thumbs).toHaveLength(3)
    })

    it('shows loading state', () => {
      const wrapper = mount(PhotoGallery, {
        props: { photos: [], loading: true },
        global: {
          stubs: { Teleport: true },
        },
      })

      expect(wrapper.text()).toContain("Foto's laden")
    })

    it('shows empty state when no photos', () => {
      const wrapper = mount(PhotoGallery, {
        props: { photos: [], loading: false },
        global: {
          stubs: { Teleport: true },
        },
      })

      expect(wrapper.text()).toContain("Geen foto's")
    })

    it('generates correct URLs for photos', () => {
      const photos = [createPhoto('test-photo')]
      const wrapper = mount(PhotoGallery, {
        props: { photos },
        global: {
          stubs: { Teleport: true },
        },
      })

      const img = wrapper.find('.photo-gallery-thumb img')
      expect(img.attributes('src')).toBe('https://storage.test.com/session-1/test-photo.jpg')
    })
  })

  describe('lightbox', () => {
    it('opens lightbox on photo click', async () => {
      const photos = [createPhoto('1')]
      const wrapper = mount(PhotoGallery, {
        props: { photos },
        global: {
          stubs: { Teleport: true },
        },
      })

      await wrapper.find('.photo-gallery-thumb').trigger('click')

      expect(wrapper.find('.photo-lightbox').exists()).toBe(true)
    })

    it('closes lightbox on backdrop click', async () => {
      const photos = [createPhoto('1')]
      const wrapper = mount(PhotoGallery, {
        props: { photos },
        global: {
          stubs: { Teleport: true },
        },
      })

      // Open lightbox
      await wrapper.find('.photo-gallery-thumb').trigger('click')
      expect(wrapper.find('.photo-lightbox').exists()).toBe(true)

      // Close by clicking backdrop
      await wrapper.find('.photo-lightbox').trigger('click')
      expect(wrapper.find('.photo-lightbox').exists()).toBe(false)
    })

    it('closes lightbox on close button click', async () => {
      const photos = [createPhoto('1')]
      const wrapper = mount(PhotoGallery, {
        props: { photos },
        global: {
          stubs: { Teleport: true },
        },
      })

      await wrapper.find('.photo-gallery-thumb').trigger('click')
      await wrapper.find('.photo-lightbox-close').trigger('click')

      expect(wrapper.find('.photo-lightbox').exists()).toBe(false)
    })
  })
})
