import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PhotoCapture from '../PhotoCapture.vue'
import type { CapturedPhoto } from '@/types'

// Mock URL.createObjectURL and revokeObjectURL
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:test-url'),
  revokeObjectURL: vi.fn(),
})

describe('PhotoCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createPhoto(id: string): CapturedPhoto {
    return {
      id,
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      previewUrl: `blob:photo-${id}`,
    }
  }

  describe('rendering', () => {
    it('renders photo previews from props', () => {
      const photos = [createPhoto('1'), createPhoto('2'), createPhoto('3')]
      const wrapper = mount(PhotoCapture, {
        props: { photos },
      })

      const images = wrapper.findAll('.photo-thumb img')
      expect(images).toHaveLength(3)
    })

    it('shows photo count', () => {
      const photos = [createPhoto('1'), createPhoto('2')]
      const wrapper = mount(PhotoCapture, {
        props: { photos },
      })

      expect(wrapper.text()).toContain("2 foto's geselecteerd")
    })

    it('shows singular when 1 photo', () => {
      const wrapper = mount(PhotoCapture, {
        props: { photos: [createPhoto('1')] },
      })

      expect(wrapper.text()).toContain('1 foto geselecteerd')
    })

    it('hides count when no photos', () => {
      const wrapper = mount(PhotoCapture, {
        props: { photos: [] },
      })

      expect(wrapper.find('.photo-count').exists()).toBe(false)
    })

    it('shows add photo button', () => {
      const wrapper = mount(PhotoCapture, {
        props: { photos: [] },
      })

      expect(wrapper.find('.photo-add-btn').exists()).toBe(true)
      expect(wrapper.text()).toContain('Foto')
    })
  })

  describe('delete photo', () => {
    it('emits update:photos without deleted photo', async () => {
      const photos = [createPhoto('1'), createPhoto('2'), createPhoto('3')]
      const wrapper = mount(PhotoCapture, {
        props: { photos },
      })

      const deleteButtons = wrapper.findAll('.photo-thumb-delete')
      await deleteButtons[1]!.trigger('click')

      const emitted = wrapper.emitted('update:photos')
      expect(emitted).toHaveLength(1)

      const updatedPhotos = emitted?.[0]?.[0] as CapturedPhoto[]
      expect(updatedPhotos).toHaveLength(2)
      expect(updatedPhotos.map((p) => p.id)).toEqual(['1', '3'])
    })

    it('revokes blob URL when deleting photo', async () => {
      const photos = [createPhoto('1')]
      const wrapper = mount(PhotoCapture, {
        props: { photos },
      })

      await wrapper.find('.photo-thumb-delete').trigger('click')

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1')
    })
  })

  describe('disabled state', () => {
    it('disables add button when disabled', () => {
      const wrapper = mount(PhotoCapture, {
        props: { photos: [], disabled: true },
      })

      expect(wrapper.find('.photo-add-btn').attributes('disabled')).toBeDefined()
    })

    it('disables delete buttons when disabled', () => {
      const wrapper = mount(PhotoCapture, {
        props: { photos: [createPhoto('1')], disabled: true },
      })

      expect(wrapper.find('.photo-thumb-delete').attributes('disabled')).toBeDefined()
    })
  })
})
