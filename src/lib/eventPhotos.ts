/**
 * Preset images for event covers (demo + quick-pick in production).
 * Picsum seeds keep URLs stable for the same visual each time.
 */
export const EVENT_PHOTO_PRESETS = [
  { id: 'preset-1', label: 'Field A', url: 'https://picsum.photos/seed/refevent01/640/400' },
  { id: 'preset-2', label: 'Field B', url: 'https://picsum.photos/seed/refevent02/640/400' },
  { id: 'preset-3', label: 'Arena', url: 'https://picsum.photos/seed/refevent03/640/400' },
  { id: 'preset-4', label: 'Court', url: 'https://picsum.photos/seed/refevent04/640/400' },
  { id: 'preset-5', label: 'Pitch', url: 'https://picsum.photos/seed/refevent05/640/400' },
  { id: 'preset-6', label: 'Night lights', url: 'https://picsum.photos/seed/refevent06/640/400' },
  { id: 'preset-7', label: 'Crowd', url: 'https://picsum.photos/seed/refevent07/640/400' },
  { id: 'preset-8', label: 'Training', url: 'https://picsum.photos/seed/refevent08/640/400' },
  { id: 'preset-9', label: 'Indoor', url: 'https://picsum.photos/seed/refevent09/640/400' },
  { id: 'preset-10', label: 'Outdoor', url: 'https://picsum.photos/seed/refevent10/640/400' },
] as const

const MAX_DATA_URL_CHARS = 450_000

/** Resize and compress an image to a JPEG data URL for storing on the match (POC). */
export function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = (e) => {
      const data = e.target?.result
      if (typeof data !== 'string') {
        reject(new Error('Could not read file'))
        return
      }
      const img = new Image()
      img.onload = () => {
        const maxW = 640
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > maxW) {
          h = Math.round((h * maxW) / w)
          w = maxW
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not process image'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        let quality = 0.82
        let jpeg = canvas.toDataURL('image/jpeg', quality)
        while (jpeg.length > MAX_DATA_URL_CHARS && quality > 0.35) {
          quality -= 0.07
          jpeg = canvas.toDataURL('image/jpeg', quality)
        }
        if (jpeg.length > MAX_DATA_URL_CHARS) {
          reject(new Error('Image is still too large after compression. Try a smaller photo.'))
          return
        }
        resolve(jpeg)
      }
      img.onerror = () => reject(new Error('Invalid image'))
      img.src = data
    }
    reader.readAsDataURL(file)
  })
}
