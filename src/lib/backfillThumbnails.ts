/**
 * Backfill script to generate thumbnails for existing photos
 * Run this once from browser console: await backfillThumbnails()
 */
import { supabase } from '@/lib/supabase'
import { generateThumbnail, getThumbnailPath } from '@/lib/imageCompression'

export async function backfillThumbnails(
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // Fetch all photos without thumbnails
  const { data: photos, error } = await supabase
    .from('session_photos')
    .select('id, storage_path')
    .is('thumbnail_path', null)

  if (error) {
    console.error('Failed to fetch photos:', error)
    throw error
  }

  if (!photos || photos.length === 0) {
    onProgress?.(0, 0, 'No photos need backfilling')
    return { success: 0, failed: 0 }
  }

  const total = photos.length
  onProgress?.(0, total, `Starting backfill of ${total} photos...`)

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]!
    const thumbnailPath = getThumbnailPath(photo.storage_path)

    try {
      onProgress?.(i + 1, total, `Processing ${photo.storage_path}`)

      // Download original image
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('session-photos')
        .download(photo.storage_path)

      if (downloadError) {
        console.error(`Failed to download ${photo.storage_path}:`, downloadError)
        failed++
        continue
      }

      // Generate thumbnail
      const thumbnailBlob = await generateThumbnail(fileData)

      // Upload thumbnail
      const { error: uploadError } = await supabase.storage
        .from('session-photos')
        .upload(thumbnailPath, thumbnailBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error(`Failed to upload thumbnail for ${photo.storage_path}:`, uploadError)
        failed++
        continue
      }

      // Update database record
      const { error: updateError } = await supabase
        .from('session_photos')
        .update({ thumbnail_path: thumbnailPath })
        .eq('id', photo.id)

      if (updateError) {
        console.error(`Failed to update record for ${photo.id}:`, updateError)
        failed++
        continue
      }

      success++
    } catch (err) {
      console.error(`Error processing ${photo.storage_path}:`, err)
      failed++
    }
  }

  onProgress?.(total, total, `Complete! Success: ${success}, Failed: ${failed}`)
  return { success, failed }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).backfillThumbnails = backfillThumbnails
}
