import { jsPDF } from 'jspdf'
import type { SessionPhoto } from '@/types'

interface HouseData {
  number: number
  hours: string
  hasBinnen: boolean
  hasBalkon: boolean
  hasZonnescherm: boolean
  hasGlasbreuk: boolean
  hasDiversen: boolean
}

// Load image as base64 data URL
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateFaseReport(
  faseNum: number,
  housesData: HouseData[],
  totalHours: string,
  _getSessionsForHouse: (houseNum: number) => unknown[],
  fetchPhotosForHouse: (houseNum: number) => Promise<SessionPhoto[]>,
  getPhotoUrl: (storagePath: string) => string
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = 20

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`BREIJER - Fase ${faseNum} Rapport`, margin, y)
  y += 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Totaal: ${housesData.length} woningen, ${totalHours} uur`, margin, y)
  y += 5

  doc.setDrawColor(0)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  // Process each house
  for (const house of housesData) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    // House header
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Woning ${house.number}`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`${house.hours} uur`, pageWidth - margin - 20, y)
    y += 7

    // Tasks done (checkmarks)
    doc.setFontSize(10)
    const tasks: string[] = []
    if (house.hasBinnen) tasks.push('Binnen opruimen')
    if (house.hasBalkon) tasks.push('Balkon')
    if (house.hasZonnescherm) tasks.push('Zonnescherm')
    if (house.hasGlasbreuk) tasks.push('Glasbreuk')
    if (house.hasDiversen) tasks.push('Diversen')

    if (tasks.length > 0) {
      doc.text(`✓ ${tasks.join('  ✓ ')}`, margin + 2, y)
      y += 6
    }

    // Fetch and add photos for this house
    try {
      const photos = await fetchPhotosForHouse(house.number)

      if (photos.length > 0) {
        // Limit to first 6 photos per house
        const photosToShow = photos.slice(0, 6)
        const photoWidth = 40
        const photoHeight = 30
        const photosPerRow = 4
        let photoX = margin

        for (let j = 0; j < photosToShow.length; j++) {
          // Check if we need a new page for photos
          if (y + photoHeight > 280) {
            doc.addPage()
            y = 20
            photoX = margin
          }

          const photo = photosToShow[j]
          if (!photo) continue

          const photoUrl = getPhotoUrl(photo.storage_path)
          const base64 = await loadImageAsBase64(photoUrl)

          if (base64) {
            try {
              doc.addImage(base64, 'JPEG', photoX, y, photoWidth, photoHeight)
              photoX += photoWidth + 5

              // New row after photosPerRow photos
              if ((j + 1) % photosPerRow === 0) {
                photoX = margin
                y += photoHeight + 3
              }
            } catch (imgErr) {
              console.warn('Failed to add image:', imgErr)
            }
          }
        }

        // Move y after photos
        if (photosToShow.length % photosPerRow !== 0) {
          y += photoHeight + 3
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch photos for house ${house.number}:`, err)
    }

    // Separator line
    y += 3
    doc.setDrawColor(200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8
  }

  // Save the PDF
  const filename = `breijer-fase-${faseNum}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
