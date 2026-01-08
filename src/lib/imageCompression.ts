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
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.75
): Promise<CompressedImage> {
  const originalSize = file.size

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
 */
export async function generateThumbnail(
  file: File | Blob,
  maxWidth: number = 300
): Promise<Blob> {
  const options = {
    maxSizeMB: 0.1,
    maxWidthOrHeight: maxWidth,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.8,
  }

  return await imageCompression(file as File, options)
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
