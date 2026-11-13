export interface EquirectangularValidationResult {
  isValidEquirectangular: boolean
  isWidePanorama: boolean
  aspectRatio: number
  recommendation: string
}

const DEG = Math.PI / 180

/**
 * FOV mendatar lalai bagi kamera belakang telefon dalam mod video 16:9.
 * 68° = lensa wide ~26mm equiv. Kamera ultra-wide (0.5x) lebih kurang 106°.
 * ponytail: nilai tetap; naik taraf kepada slider FOV jika pengguna lapor herot.
 */
export const DEFAULT_HFOV_DEG = 68

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
 * Dikekalkan untuk keserasian; penyambung sebenar kini guna unjuran rectilinear.
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

export interface EquirectSamplePoint {
  u: number
  v: number
  inside: boolean
}

/**
 * Unjuran songsang rectilinear (kamera lubang jarum) -> equirectangular.
 * Pulangkan koordinat ternormal 0..1 dalam kerangka sumber.
 */
export function projectRectilinearToEquirect(
  lonDeg: number,
  latDeg: number,
  centerYawDeg: number,
  hfovDeg: number,
  frameAspect: number
): EquirectSamplePoint {
  const safeAspect = frameAspect > 0 ? frameAspect : 16 / 9
  const safeHfov = Math.min(170, Math.max(10, hfovDeg))
  const halfH = (safeHfov * DEG) / 2
  const halfV = Math.atan(Math.tan(halfH) / safeAspect)

  const dLon = ((((lonDeg - centerYawDeg) % 360) + 540) % 360) - 180

  if (Math.abs(dLon * DEG) > halfH || Math.abs(latDeg * DEG) > halfV) {
    return { u: 0, v: 0, inside: false }
  }

  const tx = Math.tan(dLon * DEG) / Math.tan(halfH)
  const ty = Math.tan(latDeg * DEG) / Math.tan(halfV)
  const u = 0.5 + 0.5 * tx
  const v = 0.5 - 0.5 * ty

  return { u, v, inside: u >= 0 && u <= 1 && v >= 0 && v <= 1 }
}

/**
 * Jarak sudut terpendek antara dua bearing (0..180).
 */
export function angularDistanceDeg(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180)
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

interface FrameSample {
  data: Uint8ClampedArray
  width: number
  height: number
  gain: number
}

function readFrameSample(img: HTMLImageElement, maxWidth = 1280): FrameSample {
  const scale = Math.min(1, maxWidth / Math.max(1, img.naturalWidth))
  const width = Math.max(2, Math.round(img.naturalWidth * scale))
  const height = Math.max(2, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Gagal memulakan kanvas 2D.')
  ctx.drawImage(img, 0, 0, width, height)
  return { data: ctx.getImageData(0, 0, width, height).data, width, height, gain: 1 }
}

function meanLuma(data: Uint8ClampedArray): number {
  let sum = 0
  let count = 0
  for (let i = 0; i + 3 < data.length; i += 68) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    count++
  }
  return count ? sum / count : 128
}

/**
 * Cantumkan kerangka ufuk daripada Kamera Berpandu AR kepada satu Blob JPEG Equirectangular.
 * Setiap kerangka diunjurkan secara gnomonic (rectilinear) mengikut bearing sebenar,
 * kemudian dicampur dengan pemberat kosinus pada jahitan bertindih.
 *
 * frameYaws: bearing sebenar setiap kerangka (0..360). Jika tiada, diagihkan sekata.
 */
export async function stitchHorizonFramesToEquirectangular(
  frameDataUrls: string[],
  targetWidth = 4096,
  targetHeight = 2048,
  frameYaws?: number[],
  hfovDeg = DEFAULT_HFOV_DEG
): Promise<Blob> {
  if (!frameDataUrls.length) {
    throw new Error('Tiada kerangka imej untuk dicantumkan.')
  }

  const images = await Promise.all(frameDataUrls.map((url) => loadImageElement(url)))
  const total = images.length

  const workWidth = Math.max(256, Math.min(2048, targetWidth))
  const outAspect = targetHeight > 0 && targetWidth > 0 ? targetHeight / targetWidth : 0.5
  const workHeight = Math.max(128, Math.round(workWidth * outAspect))

  const frames = images.map((img) => readFrameSample(img))
  const yaws =
    frameYaws && frameYaws.length === total
      ? frameYaws.map((value) => ((value % 360) + 360) % 360)
      : images.map((_, index) => (index * 360) / total)

  // Imbangan dedahan: telefon ubah auto-exposure antara segmen -> jalur terang/gelap.
  const lumas = frames.map((frame) => meanLuma(frame.data))
  const targetLuma = lumas.reduce((sum, value) => sum + value, 0) / Math.max(1, lumas.length)
  frames.forEach((frame, index) => {
    const luma = Math.max(24, lumas[index])
    frame.gain = Math.min(1.45, Math.max(0.7, targetLuma / luma))
  })

  // 1. Lapisan asas kabur: isi kubah siling/lantai yang tiada liputan kamera.
  const baseCanvas = document.createElement('canvas')
  baseCanvas.width = workWidth
  baseCanvas.height = workHeight
  const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true })
  if (!baseCtx) throw new Error('Gagal memulakan kanvas asas.')
  baseCtx.fillStyle = '#0f172a'
  baseCtx.fillRect(0, 0, workWidth, workHeight)
  baseCtx.save()
  baseCtx.filter = 'blur(24px) brightness(0.8)'
  const fallbackSlot = workWidth / total
  images.forEach((img, index) => {
    baseCtx.drawImage(img, index * fallbackSlot - 12, 0, fallbackSlot + 24, workHeight)
  })
  baseCtx.restore()
  const baseData = baseCtx.getImageData(0, 0, workWidth, workHeight).data

  // 2. Jadual unjuran: u per lajur (setiap kerangka), v per baris (setiap kerangka).
  const colU: Float32Array[] = []
  const colW: Float32Array[] = []
  const rowV: Float32Array[] = []
  const tanHalfH: number[] = []
  const tanHalfV: number[] = []

  for (let f = 0; f < total; f++) {
    const frame = frames[f]
    const aspect = frame.width / frame.height
    const halfH = (Math.min(170, Math.max(10, hfovDeg)) * DEG) / 2
    const halfV = Math.atan(Math.tan(halfH) / aspect)
    tanHalfH.push(Math.tan(halfH))
    tanHalfV.push(Math.tan(halfV))

    const uTable = new Float32Array(workWidth)
    const wTable = new Float32Array(workWidth)
    for (let x = 0; x < workWidth; x++) {
      const lon = ((x + 0.5) / workWidth) * 360 - 180
      const dLon = ((((lon - yaws[f]) % 360) + 540) % 360) - 180
      if (Math.abs(dLon * DEG) > halfH) {
        uTable[x] = -1
        continue
      }
      const tx = Math.tan(dLon * DEG) / Math.tan(halfH)
      uTable[x] = (0.5 + 0.5 * tx) * (frame.width - 1)
      wTable[x] = Math.max(0.02, Math.cos((dLon / Math.min(170, Math.max(10, hfovDeg))) * Math.PI))
    }
    colU.push(uTable)
    colW.push(wTable)

    const vTable = new Float32Array(workHeight)
    for (let y = 0; y < workHeight; y++) {
      const lat = 90 - ((y + 0.5) / workHeight) * 180
      if (Math.abs(lat * DEG) > halfV) {
        vTable[y] = -1
        continue
      }
      const ty = Math.tan(lat * DEG) / Math.tan(halfV)
      vTable[y] = (0.5 - 0.5 * ty) * (frame.height - 1)
    }
    rowV.push(vTable)
  }

  // 3. Komposit piksel.
  const outImage = new ImageData(workWidth, workHeight)
  const out = outImage.data

  for (let y = 0; y < workHeight; y++) {
    for (let x = 0; x < workWidth; x++) {
      let accR = 0
      let accG = 0
      let accB = 0
      let accW = 0

      for (let f = 0; f < total; f++) {
        const u = colU[f][x]
        if (u < 0) continue
        const v = rowV[f][y]
        if (v < 0) continue

        const frame = frames[f]
        const fw = frame.width
        const fh = frame.height
        const x0 = Math.min(fw - 1, u | 0)
        const y0 = Math.min(fh - 1, v | 0)
        const x1 = x0 + 1 < fw ? x0 + 1 : x0
        const y1 = y0 + 1 < fh ? y0 + 1 : y0
        const fx = u - x0
        const fy = v - y0
        const d = frame.data
        const i00 = (y0 * fw + x0) << 2
        const i10 = (y0 * fw + x1) << 2
        const i01 = (y1 * fw + x0) << 2
        const i11 = (y1 * fw + x1) << 2
        const wTop = 1 - fy
        const wBottom = fy
        const w00 = (1 - fx) * wTop
        const w10 = fx * wTop
        const w01 = (1 - fx) * wBottom
        const w11 = fx * wBottom
        const weight = colW[f][x] * frame.gain

        accR += (d[i00] * w00 + d[i10] * w10 + d[i01] * w01 + d[i11] * w11) * weight
        accG += (d[i00 + 1] * w00 + d[i10 + 1] * w10 + d[i01 + 1] * w01 + d[i11 + 1] * w11) * weight
        accB += (d[i00 + 2] * w00 + d[i10 + 2] * w10 + d[i01 + 2] * w01 + d[i11 + 2] * w11) * weight
        accW += weight
      }

      const o = (y * workWidth + x) << 2
      if (accW > 0.0001) {
        out[o] = accR / accW
        out[o + 1] = accG / accW
        out[o + 2] = accB / accW
      } else {
        out[o] = baseData[o]
        out[o + 1] = baseData[o + 1]
        out[o + 2] = baseData[o + 2]
      }
      out[o + 3] = 255
    }
  }

  const workCanvas = document.createElement('canvas')
  workCanvas.width = workWidth
  workCanvas.height = workHeight
  const workCtx = workCanvas.getContext('2d')
  if (!workCtx) throw new Error('Gagal memulakan kanvas kerja.')
  workCtx.putImageData(outImage, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Gagal memulakan kanvas 2D.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(workCanvas, 0, 0, targetWidth, targetHeight)

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
 * Tukar foto mod Panorama kamera telefon kepada format Equirectangular 2:1 yang sah.
 * Jalur tajam diletakkan mengikut lebar sudut sebenar (sweepDeg) — bukan diregang
 * ke 360° penuh, yang menyebabkan herotan 1.5x pada pano iPhone (had ~240°).
 */
export async function convertPhonePanoramaToEquirectangular(
  file: File,
  maxWidth = 4096,
  sweepDeg = 240
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

    const sweep = Math.min(360, Math.max(60, sweepDeg))
    const bandWidth = Math.round((targetWidth * sweep) / 360)
    const bandHeight = Math.min(
      targetHeight,
      Math.max(Math.round(targetHeight * 0.42), Math.round((img.height / img.width) * bandWidth))
    )
    const bandX = Math.round((targetWidth - bandWidth) / 2)
    const bandY = Math.round((targetHeight - bandHeight) / 2)

    // Latar: salinan kabur untuk mengisi kubah siling/lantai.
    ctx.save()
    ctx.filter = 'blur(32px) brightness(0.8)'
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
    ctx.restore()

    // Isi jurang di kiri/kanan jalur dengan sambungan tepi (bukan regangan penuh).
    const gapLeft = bandX
    const gapRight = targetWidth - (bandX + bandWidth)
    const edgeWidth = Math.max(8, Math.round(img.width * 0.06))
    ctx.save()
    ctx.filter = 'blur(18px) brightness(0.78)'
    if (gapLeft > 0) {
      ctx.drawImage(img, 0, 0, edgeWidth, img.height, bandX - gapLeft, bandY, gapLeft, bandHeight)
    }
    if (gapRight > 0) {
      ctx.drawImage(
        img,
        img.width - edgeWidth,
        0,
        edgeWidth,
        img.height,
        bandX + bandWidth,
        bandY,
        gapRight,
        bandHeight
      )
    }
    ctx.restore()

    ctx.drawImage(img, 0, 0, img.width, img.height, bandX, bandY, bandWidth, bandHeight)

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
