export interface EquirectangularValidationResult {
  isValidEquirectangular: boolean
  isWidePanorama: boolean
  aspectRatio: number
  recommendation: string
}

/**
 * Normalisasikan sebarang darjah kompas/yaw kepada julat Pannellum (-180 hingga +180).
 */
export function normalizePannellumYaw(deg: number): number {
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180
  return Math.round(wrapped * 100) / 100
}

/**
 * Semak dimensi imej sama ada ia Equirectangular 2:1, Panorama memanjang telefon (3:1+), atau foto biasa.
 */
export function validateEquirectangularDimensions(
  width: number,
  height: number
): EquirectangularValidationResult {
  if (!width || !height || width <= 0 || height <= 0) {
    return {
      isValidEquirectangular: false,
      isWidePanorama: false,
      aspectRatio: 0,
      recommendation: 'Dimensi imej tidak sah.',
    }
  }

  const aspectRatio = Math.round((width / height) * 100) / 100
  const isValidEquirectangular = aspectRatio >= 1.85 && aspectRatio <= 2.15
  const isWidePanorama = aspectRatio > 2.15

  let recommendation = 'Nisbah 2:1 Equirectangular tepat.'
  if (isWidePanorama) {
    recommendation =
      'Imej ini ialah Panorama memanjang telefon (nisbah > 2.15:1). Gunakan Auto-Konversi Pano supaya siling & lantai tidak herot dalam 360°.'
  } else if (!isValidEquirectangular) {
    recommendation =
      'Imej ini ialah foto biasa (bukan 2:1). Gunakan perakam 360° Berpandu atau Auto-Konversi Pano untuk paparan sfera penuh.'
  }

  return {
    isValidEquirectangular,
    isWidePanorama,
    aspectRatio,
    recommendation,
  }
}

/**
 * Kira kedudukan X dan lebar bagi setiap segmen tangkapan ufuk (horizon ring) atas kanvas 2:1.
 */
export function computeHorizonSlotPlacement(
  slotIndex: number,
  totalSlots: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; slotWidth: number; slotHeight: number; centerYaw: number } {
  const safeTotal = Math.max(1, totalSlots)
  const safeIndex = ((slotIndex % safeTotal) + safeTotal) % safeTotal
  const slotWidth = canvasWidth / safeTotal
  const slotHeight = Math.round(canvasHeight * 0.58)
  const x = Math.round(safeIndex * slotWidth)
  const y = Math.round((canvasHeight - slotHeight) / 2)
  const rawDeg = (safeIndex / safeTotal) * 360 - 180
  const centerYaw = normalizePannellumYaw(rawDeg)

  return { x, y, slotWidth: Math.ceil(slotWidth), slotHeight, centerYaw }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

/**
 * Cantumkan (stitch) 8 kerangka ufuk daripada Kamera Berpandu AR kepada satu Blob JPEG Equirectangular (4096x2048).
 */
export async function stitchHorizonFramesToEquirectangular(
  frameDataUrls: string[],
  targetWidth = 4096,
  targetHeight = 2048
): Promise<Blob> {
  if (!frameDataUrls.length) {
    throw new Error('Tiada kerangka imej untuk dicantumkan.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Gagal memulakan kanvas 2D.')

  const images = await Promise.all(frameDataUrls.map((url) => loadImageElement(url)))

  // 1. Lukis latar belakang terisi-kabur (ambient zenith & nadir fill) supaya tiada lubang hitam di atas/bawah
  ctx.save()
  ctx.filter = 'blur(36px) brightness(0.82)'
  images.forEach((img, idx) => {
    const slotW = targetWidth / images.length
    ctx.drawImage(img, idx * slotW - 24, 0, slotW + 48, targetHeight)
  })
  ctx.restore()

  // Gelapkan sedikit bahagian kutub atas (siling) & bawah (lantai) secara semula jadi
  const poleGrad = ctx.createLinearGradient(0, 0, 0, targetHeight)
  poleGrad.addColorStop(0, 'rgba(15, 23, 42, 0.55)')
  poleGrad.addColorStop(0.22, 'rgba(15, 23, 42, 0.0)')
  poleGrad.addColorStop(0.78, 'rgba(15, 23, 42, 0.0)')
  poleGrad.addColorStop(1, 'rgba(15, 23, 42, 0.65)')
  ctx.fillStyle = poleGrad
  ctx.fillRect(0, 0, targetWidth, targetHeight)

  // 2. Lukis jalur ufuk tajam dengan pertindihan lembut (feathered seam blending)
  const total = images.length
  for (let i = 0; i < total; i++) {
    const img = images[i]
    const placement = computeHorizonSlotPlacement(i, total, targetWidth, targetHeight)
    const overlapPx = Math.round(placement.slotWidth * 0.08)

    ctx.save()
    ctx.drawImage(
      img,
      placement.x - overlapPx,
      placement.y,
      placement.slotWidth + overlapPx * 2,
      placement.slotHeight
    )
    ctx.restore()
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Gagal menjana fail JPEG 360°.'))
      },
      'image/jpeg',
      0.9
    )
  })
}

/**
 * Tukar foto mod Panorama kamera telefon biasa kepada format Equirectangular 2:1 yang sah.
 */
export async function convertPhonePanoramaToEquirectangular(
  file: File,
  maxWidth = 4096
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(objectUrl)
    const targetWidth = Math.min(maxWidth, Math.max(2048, img.width))
    const targetHeight = Math.round(targetWidth / 2)

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Kanvas 2D tidak disokong.')

    // Latar belakang kabur daripada imej asal untuk mengisi ruang zenith/nadir
    ctx.save()
    ctx.filter = 'blur(32px) brightness(0.8)'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
    ctx.restore()

    // Kira ketinggian jalur panorama apabila diregang penuh mengikut lebar kanvas 360°
    const stripHeight = Math.min(
      targetHeight,
      Math.max(Math.round(targetHeight * 0.45), Math.round((img.height / img.width) * targetWidth))
    )
    const offsetY = Math.round((targetHeight - stripHeight) / 2)

    ctx.drawImage(img, 0, offsetY, targetWidth, stripHeight)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Gagal menukar foto panorama.'))
        },
        'image/jpeg',
        0.91
      )
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
