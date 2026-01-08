import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { compressImage, generateStorageFilename, generateThumbnail, getThumbnailPath } from '@/lib/imageCompression'
import type { SessionPhoto, SessionPhotoInsert, CapturedPhoto } from '@/types'

export const usePhotosStore = defineStore('photos', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Upload a batch of captured photos for a session
   */
  async function uploadPhotos(
    sessionId: string,
    photos: CapturedPhoto[],
    onProgress?: (photoId: string, progress: number) => void
  ): Promise<string[]> {
    const storagePaths: string[] = []

    for (const photo of photos) {
      try {
        // Compress the image
        const compressed = await compressImage(photo.file)

        // Generate unique path
        const storagePath = generateStorageFilename(sessionId)
        const thumbnailPath = getThumbnailPath(storagePath)

        // Upload original to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('session-photos')
          .upload(storagePath, compressed.blob, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        // Generate and upload thumbnail
        const thumbnailBlob = await generateThumbnail(compressed.blob)
        const { error: thumbError } = await supabase.storage
          .from('session-photos')
          .upload(thumbnailPath, thumbnailBlob, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (thumbError) {
          console.error('Thumbnail upload error:', thumbError)
          // Don't fail if thumbnail upload fails, just log it
        }

        // Save metadata to database
        const photoRecord: SessionPhotoInsert = {
          session_id: sessionId,
          storage_path: storagePath,
          thumbnail_path: thumbError ? null : thumbnailPath,
          original_filename: photo.file.name,
          file_size: compressed.compressedSize,
        }

        const { error: dbError } = await supabase
          .from('session_photos')
          .insert(photoRecord)

        if (dbError) {
          console.error('Database error:', dbError)
          throw dbError
        }

        storagePaths.push(storagePath)
        onProgress?.(photo.id, 100)
      } catch (err) {
        console.error(`Failed to upload photo ${photo.id}:`, err)
        throw err
      }
    }

    return storagePaths
  }

  /**
   * Fetch photos for a specific session
   */
  async function fetchPhotosForSession(sessionId: string): Promise<SessionPhoto[]> {
    const { data, error: fetchError } = await supabase
      .from('session_photos')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Failed to fetch photos:', fetchError)
      throw fetchError
    }

    return (data as SessionPhoto[]) || []
  }

  /**
   * Fetch all photos for a house (across all sessions)
   */
  async function fetchPhotosForHouse(houseNumber: number): Promise<SessionPhoto[]> {
    // First get all session IDs for this house
    const { data: sessions, error: sessionsError } = await supabase
      .from('job_sessions')
      .select('id')
      .eq('house_number', houseNumber)

    if (sessionsError) {
      console.error('Failed to fetch sessions:', sessionsError)
      throw sessionsError
    }

    if (!sessions || sessions.length === 0) {
      return []
    }

    const sessionIds = sessions.map((s) => s.id)

    // Then get all photos for those sessions
    const { data: photos, error: photosError } = await supabase
      .from('session_photos')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })

    if (photosError) {
      console.error('Failed to fetch photos:', photosError)
      throw photosError
    }

    return (photos as SessionPhoto[]) || []
  }

  /**
   * Fetch photos for multiple houses in a single query (batch)
   * Uses JOIN to avoid N+1 query problem
   */
  async function fetchPhotosForHouses(houseNumbers: number[]): Promise<Record<number, SessionPhoto[]>> {
    if (houseNumbers.length === 0) {
      return {}
    }

    // Single query: join session_photos with job_sessions (exclude deleted)
    const { data, error: fetchError } = await supabase
      .from('session_photos')
      .select('*, job_sessions!inner(house_number, deleted_at)')
      .in('job_sessions.house_number', houseNumbers)
      .is('job_sessions.deleted_at', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Failed to fetch photos:', fetchError)
      throw fetchError
    }

    // Group by house number
    const byHouse: Record<number, SessionPhoto[]> = {}
    // Initialize all houses with empty arrays
    for (const houseNum of houseNumbers) {
      byHouse[houseNum] = []
    }

    if (data) {
      for (const row of data) {
        const houseNum = (row.job_sessions as { house_number: number }).house_number
        // Extract just the photo fields (without the joined job_sessions)
        const photo: SessionPhoto = {
          id: row.id,
          session_id: row.session_id,
          storage_path: row.storage_path,
          thumbnail_path: row.thumbnail_path,
          original_filename: row.original_filename,
          file_size: row.file_size,
          created_at: row.created_at,
        }
        if (byHouse[houseNum]) {
          byHouse[houseNum].push(photo)
        }
      }
    }

    return byHouse
  }

  /**
   * Get the public URL for a photo
   */
  function getPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('session-photos')
      .getPublicUrl(storagePath)

    return data.publicUrl
  }

  /**
   * Get a thumbnail URL for a photo
   * Uses pre-generated thumbnail if available, falls back to Supabase transforms
   */
  function getPhotoThumbnailUrl(storagePath: string, thumbnailPath?: string | null): string {
    // Use pre-generated thumbnail if available (instant loading)
    if (thumbnailPath) {
      const { data } = supabase.storage
        .from('session-photos')
        .getPublicUrl(thumbnailPath)
      return data.publicUrl
    }

    // Fallback to Supabase transform (slower, cold start latency)
    const { data } = supabase.storage
      .from('session-photos')
      .getPublicUrl(storagePath, {
        transform: {
          width: 300,
          quality: 80
        }
      })

    return data.publicUrl
  }

  /**
   * Delete a photo from storage (for removing before submit)
   */
  async function deleteFromStorage(storagePath: string): Promise<void> {
    const { error: deleteError } = await supabase.storage
      .from('session-photos')
      .remove([storagePath])

    if (deleteError) {
      console.error('Failed to delete photo:', deleteError)
      throw deleteError
    }
  }

  return {
    loading,
    error,
    uploadPhotos,
    fetchPhotosForSession,
    fetchPhotosForHouse,
    fetchPhotosForHouses,
    getPhotoUrl,
    getPhotoThumbnailUrl,
    deleteFromStorage,
  }
})
