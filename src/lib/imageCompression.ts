import imageCompression from 'browser-image-compression'

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  originalSize: number
  compressedSize: number
}

/**
 * Compress an image for upload
 * Optimized for construction site conditions (poor connectivity)
 * Falls back to original image if compression fails (iOS compatibility)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.75
): Promise<CompressedImage> {
  const originalSize = file.size

  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      initialQuality: quality,
    }

    const compressedBlob = await imageCompression(file, options)

    // Get dimensions from compressed image
    const dimensions = await getImageDimensions(compressedBlob)

    return {
      blob: compressedBlob,
      width: dimensions.width,
      height: dimensions.height,
      originalSize,
      compressedSize: compressedBlob.size,
    }
  } catch (err) {
    // Fallback: return original image if compression fails
    console.warn('Image compression failed, using original:', err)

    try {
      const dimensions = await getImageDimensions(file)
      return {
        blob: file,
        width: dimensions.width,
        height: dimensions.height,
        originalSize,
        compressedSize: file.size,
      }
    } catch {
      // Last resort: return with default dimensions
      console.error('Could not get image dimensions, using defaults')
      return {
        blob: file,
        width: 1200,
        height: 900,
        originalSize,
        compressedSize: file.size,
      }
    }
  }
}

/**
 * Get dimensions of an image blob
 */
function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Generate a thumbnail version of an image
 * Used for fast loading in fase reports
 * Falls back to original if thumbnail generation fails
 */
export async function generateThumbnail(
  file: File | Blob,
  maxWidth: number = 300
): Promise<Blob> {
  try {
    const options = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
      initialQuality: 0.8,
    }

    return await imageCompression(file as File, options)
  } catch (err) {
    console.warn('Thumbnail generation failed, using original:', err)
    return file
  }
}

/**
 * Generate a unique filename for storage
 */
export function generateStorageFilename(sessionId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 7)
  return `${sessionId}/${timestamp}_${random}.jpg`
}

/**
 * Generate thumbnail path from original path
 */
export function getThumbnailPath(originalPath: string): string {
  return `thumbnails/${originalPath}`
}
