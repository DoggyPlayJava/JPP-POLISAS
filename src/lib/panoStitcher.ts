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
  const wideHalf = (Math.min(170, Math.max(10, hfovDeg)) * DEG) / 2
  // FOV mendatar yang diukur pada sisi PANJANG bingkai. Video potret menukar sisi:
  // lebar jadi sisi pendek, jadi FOV mendatar sebenar = 2*atan(tan(halfWide) * aspect).
  const halfH = safeAspect >= 1 ? wideHalf : Math.atan(Math.tan(wideHalf) * safeAspect)
  const halfV = safeAspect >= 1 ? Math.atan(Math.tan(wideHalf) / safeAspect) : wideHalf

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

/**
 * Anggarkan sudut sapuan mendatar (sweepDeg) bagi foto Panorama telefon berdasarkan nisbah lebar:tinggi.
 * Kamera telefon dalam mod Pano menegak mempunyai FOV menegak ~65°..67°.
 * Contoh: iPhone Pano penuh (~12000 x 3400, nisbah ~3.53) -> ~230°.
 */
export function estimatePhonePanoSweepDeg(width: number, height: number): number {
  if (!width || !height || width <= 0 || height <= 0) return 230
  const aspect = width / height
  const rawDeg = aspect * 66.5
  const rounded10 = Math.round(rawDeg / 10) * 10
  return Math.min(360, Math.max(120, rounded10))
}

/**
 * Lekatkan penanda sudut sapuan mendatar `#haov=<deg>` (dan pilihan menegak `&vaov=<deg>`)
 * pada URL panorama supaya Pannellum360Viewer boleh mengunci minYaw/maxYaw & minPitch/maxPitch
 * tanpa perlu migrasi kolum DB.
 */
export function appendPanoramaSweepHash(
  url: string,
  sweepDeg: number,
  verticalSweepDeg?: number | null
): string {
  const cleanUrl = (url || '')
    .trim()
    .replace(/#(?:haov|vaov)=\d+(?:&(?:haov|vaov)=\d+)*/gi, '')
    .replace(/#$/, '')
  if (!cleanUrl) return ''
  const clampedH = Math.min(360, Math.max(60, Math.round(sweepDeg)))
  if (typeof verticalSweepDeg === 'number' && !Number.isNaN(verticalSweepDeg)) {
    const clampedV = Math.min(180, Math.max(30, Math.round(verticalSweepDeg)))
    if (clampedV < 165) {
      return `${cleanUrl}#haov=${clampedH}&vaov=${clampedV}`
    }
  }
  return `${cleanUrl}#haov=${clampedH}`
}

/**
 * Baca sudut sapuan mendatar (`haov`) daripada URL panorama jika ada (cth: `...jpg#haov=230`).
 */
export function parsePanoramaSweepFromUrl(url: string | null | undefined): number | null {
  if (!url) return null
  const match = url.match(/(?:[#?&])haov=(\d{2,3})/i)
  if (!match) return null
  const parsed = Number(match[1])
  if (Number.isNaN(parsed) || parsed < 60 || parsed > 360) return null
  return parsed
}

/**
 * Baca sudut liputan menegak (`vaov`) daripada URL panorama jika ada (cth: `...jpg#haov=230&vaov=65`).
 */
export function parsePanoramaVerticalSweepFromUrl(url: string | null | undefined): number | null {
  if (!url) return null
  const match = url.match(/(?:[#?&])vaov=(\d{2,3})/i)
  if (!match) return null
  const parsed = Number(match[1])
  if (Number.isNaN(parsed) || parsed < 30 || parsed > 180) return null
  return parsed
}

/**
 * Kira had sudut sempadan tepi atas/bawah (`minPitch`/`maxPitch` dalam Pannellum) bagi tangkapan satu baris.
 * Pannellum mengehadkan pinggir viewport ke nilai ini — memberi julat dongak/tunduk selesa (~±18°–24° pada tengah kamera)
 * sambil menyekat kamera daripada menembusi kutub zenith/nadir kosong (`±90°`).
 */
export function computeVerticalPitchBounds(verticalSweepDeg: number): number {
  const clamped = Math.min(180, Math.max(30, verticalSweepDeg))
  if (clamped >= 165) return 90
  return Math.max(34, Math.min(72, Math.round(clamped / 2 + 14)))
}

/**
 * Kira dimensi jalur tajam & sudut liputan menegak sebenar bagi foto mod Pano telefon
 * di atas kanvas Equirectangular 2:1.
 */
export function computePhonePanoBandMetrics(
  imgWidth: number,
  imgHeight: number,
  horizontalSweepDeg: number,
  targetWidth: number
): {
  targetHeight: number
  bandWidth: number
  bandHeight: number
  bandX: number
  bandY: number
  verticalSweepDeg: number
} {
  const safeW = Math.max(1, imgWidth)
  const safeH = Math.max(1, imgHeight)
  const targetHeight = Math.round(targetWidth / 2)
  const sweep = Math.min(360, Math.max(60, horizontalSweepDeg))
  const bandWidth = Math.round((targetWidth * sweep) / 360)
  const rawBandHeight = Math.round((safeH / safeW) * bandWidth)
  const bandHeight = Math.min(
    targetHeight,
    Math.max(Math.round(targetHeight * 0.36), rawBandHeight)
  )
  const bandX = Math.round((targetWidth - bandWidth) / 2)
  const bandY = Math.round((targetHeight - bandHeight) / 2)
  const verticalSweepDeg = Math.min(
    180,
    Math.max(30, Math.round((bandHeight / Math.max(1, targetHeight)) * 180))
  )
  return { targetHeight, bandWidth, bandHeight, bandX, bandY, verticalSweepDeg }
}

/**
 * Anggar sudut liputan menegak (`vaov`) daripada aspek nisbah & FOV mendatar kerangka ufuk.
 */
export function computeHorizonVerticalSweepDeg(aspect: number, hfovDeg = DEFAULT_HFOV_DEG): number {
  const safeAspect = Math.max(0.25, aspect)
  const wideHalf = (Math.min(170, Math.max(10, hfovDeg)) * DEG) / 2
  const halfV = safeAspect >= 1 ? Math.atan(Math.tan(wideHalf) / safeAspect) : wideHalf
  return Math.min(180, Math.max(30, Math.round((halfV / DEG) * 2)))
}

interface BackdropSlice {
  img: HTMLImageElement
  sx: number
  sw: number
  dx: number
  dw: number
}

function sampleEdgeAmbientColors(slices: BackdropSlice[]): {
  ceilRgb: [number, number, number]
  floorRgb: [number, number, number]
} {
  if (!slices.length) {
    return { ceilRgb: [30, 41, 59], floorRgb: [15, 23, 42] }
  }
  const sW = 16
  const sH = 12
  const probe = document.createElement('canvas')
  probe.width = sW
  probe.height = sH
  const pCtx = probe.getContext('2d', { willReadFrequently: true })
  if (!pCtx) {
    return { ceilRgb: [30, 41, 59], floorRgb: [15, 23, 42] }
  }

  let ceilR = 0
  let ceilG = 0
  let ceilB = 0
  let floorR = 0
  let floorG = 0
  let floorB = 0
  let count = 0

  for (const { img, sx, sw } of slices) {
    pCtx.clearRect(0, 0, sW, sH)
    pCtx.drawImage(img, sx, 0, Math.max(1, sw), Math.max(1, img.height), 0, 0, sW, sH)
    const data = pCtx.getImageData(0, 0, sW, sH).data
    for (let x = 0; x < sW; x++) {
      const topIdx = x << 2
      const botIdx = ((sH - 1) * sW + x) << 2
      ceilR += data[topIdx]
      ceilG += data[topIdx + 1]
      ceilB += data[topIdx + 2]
      floorR += data[botIdx]
      floorG += data[botIdx + 1]
      floorB += data[botIdx + 2]
      count++
    }
  }

  if (count === 0) {
    return { ceilRgb: [30, 41, 59], floorRgb: [15, 23, 42] }
  }
  // Lembutkan sedikit kecerahan supaya kubah kutub sentiasa seragam tanpa pusaran silau
  return {
    ceilRgb: [
      Math.round((ceilR / count) * 0.94),
      Math.round((ceilG / count) * 0.94),
      Math.round((ceilB / count) * 0.94),
    ],
    floorRgb: [
      Math.round((floorR / count) * 0.9),
      Math.round((floorG / count) * 0.9),
      Math.round((floorB / count) * 0.9),
    ],
  }
}

/**
 * Lukis kubah siling (zenith) & lantai (nadir) yang seragam tanpa pusaran kutub.
 * Jalur tepi atas/bawah imej dilembutkan sedikit keluar dari garisan horizon sebelum pudar penuh
 * menjadi satu warna ambien sekata di kutub utara/selatan — menghapuskan garis potong & kesan pusaran.
 */
function paintAmbientZenithNadirBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bandY: number,
  bandHeight: number,
  slices: BackdropSlice[]
): void {
  const { ceilRgb, floorRgb } = sampleEdgeAmbientColors(slices)
  const ceilSolid = `rgb(${ceilRgb[0]}, ${ceilRgb[1]}, ${ceilRgb[2]})`
  const ceilMid = `rgba(${ceilRgb[0]}, ${ceilRgb[1]}, ${ceilRgb[2]}, 0.72)`
  const ceilClear = `rgba(${ceilRgb[0]}, ${ceilRgb[1]}, ${ceilRgb[2]}, 0)`
  const floorSolid = `rgb(${floorRgb[0]}, ${floorRgb[1]}, ${floorRgb[2]})`
  const floorMid = `rgba(${floorRgb[0]}, ${floorRgb[1]}, ${floorRgb[2]}, 0.72)`
  const floorClear = `rgba(${floorRgb[0]}, ${floorRgb[1]}, ${floorRgb[2]}, 0)`

  const baseGrad = ctx.createLinearGradient(0, 0, 0, height)
  baseGrad.addColorStop(0, ceilSolid)
  baseGrad.addColorStop(Math.min(0.49, bandY / Math.max(1, height)), ceilSolid)
  baseGrad.addColorStop(0.5, '#1e293b')
  baseGrad.addColorStop(Math.max(0.51, (bandY + bandHeight) / Math.max(1, height)), floorSolid)
  baseGrad.addColorStop(1, floorSolid)
  ctx.fillStyle = baseGrad
  ctx.fillRect(0, 0, width, height)

  const bottomStart = bandY + bandHeight
  const bottomSpace = Math.max(0, height - bottomStart)
  const topFeather = Math.min(bandY, Math.max(24, Math.round(height * 0.14)))
  const bottomFeather = Math.min(bottomSpace, Math.max(24, Math.round(height * 0.14)))

  ctx.save()
  ctx.filter = 'blur(16px)'
  for (const { img, sx, sw, dx, dw } of slices) {
    const stripH = Math.max(4, Math.round(img.height * 0.055))
    if (topFeather > 0) {
      ctx.drawImage(img, sx, 0, Math.max(1, sw), stripH, dx - 10, bandY - topFeather, dw + 20, topFeather + 8)
    }
    if (bottomFeather > 0) {
      ctx.drawImage(
        img,
        sx,
        Math.max(0, img.height - stripH),
        Math.max(1, sw),
        stripH,
        dx - 10,
        bottomStart - 8,
        dw + 20,
        bottomFeather + 8
      )
    }
  }
  ctx.restore()

  if (bandY > 0) {
    const topFade = ctx.createLinearGradient(0, 0, 0, bandY)
    const solidEnd = Math.max(0, (bandY - topFeather) / bandY)
    const midPos = Math.max(solidEnd, (bandY - topFeather * 0.35) / bandY)
    topFade.addColorStop(0, ceilSolid)
    topFade.addColorStop(solidEnd, ceilSolid)
    topFade.addColorStop(midPos, ceilMid)
    topFade.addColorStop(1, ceilClear)
    ctx.fillStyle = topFade
    ctx.fillRect(0, 0, width, bandY + 4)
  }

  if (bottomSpace > 0) {
    const botFade = ctx.createLinearGradient(0, bottomStart, 0, height)
    const solidStart = Math.min(1, bottomFeather / bottomSpace)
    const midPos = Math.min(solidStart, (bottomFeather * 0.35) / bottomSpace)
    botFade.addColorStop(0, floorClear)
    botFade.addColorStop(midPos, floorMid)
    botFade.addColorStop(solidStart, floorSolid)
    botFade.addColorStop(1, floorSolid)
    ctx.fillStyle = botFade
    ctx.fillRect(0, bottomStart - 4, width, bottomSpace + 4)
  }
}

/**
 * Kira sudut senget (roll) & dongak (pitch) telefon dengan betul bagi kedua-dua orientasi
 * Menegak (Portrait) dan Melintang (Landscape).
 * Menyelesaikan pepijat W3C DeviceOrientation di mana paksi beta & gamma bertukar apabila telefon melintang.
 */
export function computeDeviceLevelAngles(
  beta: number | null | undefined,
  gamma: number | null | undefined,
  isLandscape: boolean
): { roll: number; pitch: number; isLevel: boolean } {
  const safeBeta = typeof beta === 'number' && !Number.isNaN(beta) ? beta : isLandscape ? 0 : 90
  const safeGamma = typeof gamma === 'number' && !Number.isNaN(gamma) ? gamma : isLandscape ? -90 : 0

  let roll = 0
  let pitch = 0

  if (isLandscape) {
    // Dalam mod Melintang (Landscape), beta mengukur senget kiri/kanan sekitar 0° (atau ±180°)
    let normBeta = ((((safeBeta + 180) % 360) + 360) % 360) - 180
    if (normBeta > 90) normBeta -= 180
    if (normBeta < -90) normBeta += 180
    roll = Math.round(normBeta)
    // Manakala |gamma| berada sekitar 90° apabila telefon dipegang tegak pada paras mata
    pitch = Math.round(90 - Math.min(90, Math.abs(safeGamma)))
  } else {
    // Dalam mod Menegak (Portrait), gamma mengukur senget kiri/kanan dan beta ~ 90° pada paras mata
    roll = Math.round(safeGamma)
    pitch = Math.round(safeBeta - 90)
  }

  const isLevel = Math.abs(roll) <= 15 && Math.abs(pitch) <= 22
  return { roll, pitch, isLevel }
}

/**
 * Kira pemberat adunan kosinus (frontWeight & backWeight) bagi setiap lajur X
 * untuk mencantumkan 2 Panorama Telefon (Pano Depan 0° + Pano Belakang 180°) menjadi 360° penuh.
 */
export function computeDualPanoBlendWeights(
  targetWidth: number,
  sweepDegPerPano = 230
): { frontWeight: Float32Array; backWeight: Float32Array } {
  const safeWidth = Math.max(2, Math.round(targetWidth))
  const halfSweep = Math.max(90, Math.min(180, sweepDegPerPano / 2))
  const frontWeight = new Float32Array(safeWidth)
  const backWeight = new Float32Array(safeWidth)

  for (let x = 0; x < safeWidth; x++) {
    const yaw = ((x + 0.5) / safeWidth) * 360 - 180
    const dFront = Math.abs(yaw) // 0° di tengah kanvas (x = width/2)
    const dBack = 180 - dFront // 0° di tepi kiri/kanan kanvas (x = 0 & x = width)

    const wF =
      dFront <= halfSweep
        ? Math.max(0.001, Math.cos((dFront / halfSweep) * (Math.PI / 2)))
        : 0
    const wB =
      dBack <= halfSweep
        ? Math.max(0.001, Math.cos((dBack / halfSweep) * (Math.PI / 2)))
        : 0

    const sum = wF + wB
    if (sum > 0) {
      frontWeight[x] = wF / sum
      backWeight[x] = wB / sum
    } else {
      frontWeight[x] = dFront <= dBack ? 1 : 0
      backWeight[x] = dFront <= dBack ? 0 : 1
    }
  }

  return { frontWeight, backWeight }
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

  // 1. Lapisan asas ambien: isi kubah siling/lantai seragam tanpa pusaran kutub.
  const baseCanvas = document.createElement('canvas')
  baseCanvas.width = workWidth
  baseCanvas.height = workHeight
  const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true })
  if (!baseCtx) throw new Error('Gagal memulakan kanvas asas.')
  const maxHorizonVaov = frames.reduce(
    (maxV, frame) =>
      Math.max(maxV, computeHorizonVerticalSweepDeg(frame.width / Math.max(1, frame.height), hfovDeg)),
    52
  )
  const horizonBandHeight = Math.min(
    workHeight,
    Math.max(Math.round(workHeight * 0.25), Math.round((workHeight * maxHorizonVaov) / 180))
  )
  const horizonBandY = Math.round((workHeight - horizonBandHeight) / 2)
  const fallbackSlot = workWidth / total
  const horizonSlices: BackdropSlice[] = []
  images.forEach((img, index) => {
    const centerX = ((yaws[index] + 180) / 360) * workWidth
    const dx = centerX - fallbackSlot / 2
    horizonSlices.push({ img, sx: 0, sw: img.width, dx, dw: fallbackSlot })
    if (dx < 0) {
      horizonSlices.push({ img, sx: 0, sw: img.width, dx: dx + workWidth, dw: fallbackSlot })
    } else if (dx + fallbackSlot > workWidth) {
      horizonSlices.push({ img, sx: 0, sw: img.width, dx: dx - workWidth, dw: fallbackSlot })
    }
  })
  paintAmbientZenithNadirBackdrop(baseCtx, workWidth, workHeight, horizonBandY, horizonBandHeight, horizonSlices)
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
    const wideHalf = (Math.min(170, Math.max(10, hfovDeg)) * DEG) / 2
    const halfH = aspect >= 1 ? wideHalf : Math.atan(Math.tan(wideHalf) * aspect)
    const halfV = aspect >= 1 ? Math.atan(Math.tan(wideHalf) / aspect) : wideHalf
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
    const { bandWidth, bandHeight, bandX, bandY } = computePhonePanoBandMetrics(
      img.width,
      img.height,
      sweep,
      targetWidth
    )

    // Latar: kubah siling & lantai ambien yang sekata tanpa herotan pusaran kutub.
    paintAmbientZenithNadirBackdrop(ctx, targetWidth, targetHeight, bandY, bandHeight, [
      { img, sx: 0, sw: img.width, dx: bandX, dw: bandWidth },
    ])

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

/**
 * Cantumkan 2 foto Panorama Telefon (Pano 1: Menghadap Depan ~230° + Pano 2: Menghadap Belakang ~230°)
 * menjadi satu imej 360° Equirectangular (2:1) penuh yang 100% tajam tanpa ruang kabur di belakang.
 */
export async function stitchDualPhonePanoramasToEquirectangular(
  frontFile: File,
  backFile: File,
  maxWidth = 4096,
  sweepDegPerPano = 230
): Promise<Blob> {
  const frontUrl = URL.createObjectURL(frontFile)
  const backUrl = URL.createObjectURL(backFile)

  try {
    const [imgFront, imgBack] = await Promise.all([
      loadImageElement(frontUrl),
      loadImageElement(backUrl),
    ])

    const targetWidth = Math.min(maxWidth, Math.max(2048, imgFront.width, imgBack.width))
    const sweep = Math.min(360, Math.max(160, sweepDegPerPano))
    const {
      targetHeight,
      bandWidth,
      bandHeight,
      bandX: frontX,
      bandY,
    } = computePhonePanoBandMetrics(imgFront.width, imgFront.height, sweep, targetWidth)

    // 1. Lukis kanvas Pano Depan (berpusat pada yaw = 0°, iaitu x = targetWidth / 2)
    const frontCanvas = document.createElement('canvas')
    frontCanvas.width = targetWidth
    frontCanvas.height = targetHeight
    const fCtx = frontCanvas.getContext('2d', { willReadFrequently: true })
    if (!fCtx) throw new Error('Kanvas 2D tidak disokong.')

    paintAmbientZenithNadirBackdrop(fCtx, targetWidth, targetHeight, bandY, bandHeight, [
      { img: imgFront, sx: 0, sw: imgFront.width, dx: frontX, dw: bandWidth },
    ])

    fCtx.drawImage(imgFront, 0, 0, imgFront.width, imgFront.height, frontX, bandY, bandWidth, bandHeight)

    // 2. Lukis kanvas Pano Belakang (berpusat pada yaw = ±180°, terbelah di x = 0 dan x = targetWidth)
    const backCanvas = document.createElement('canvas')
    backCanvas.width = targetWidth
    backCanvas.height = targetHeight
    const bCtx = backCanvas.getContext('2d', { willReadFrequently: true })
    if (!bCtx) throw new Error('Kanvas 2D tidak disokong.')

    const halfSrcW = Math.round(imgBack.width / 2)
    const halfBandW = Math.round(bandWidth / 2)
    paintAmbientZenithNadirBackdrop(bCtx, targetWidth, targetHeight, bandY, bandHeight, [
      { img: imgBack, sx: 0, sw: halfSrcW, dx: targetWidth - halfBandW, dw: halfBandW },
      { img: imgBack, sx: halfSrcW, sw: imgBack.width - halfSrcW, dx: 0, dw: bandWidth - halfBandW },
    ])

    // Separuh kiri Pano Belakang -> hujung kanan kanvas (yaw +180° - sweep/2 .. +180°)
    bCtx.drawImage(
      imgBack,
      0,
      0,
      halfSrcW,
      imgBack.height,
      targetWidth - halfBandW,
      bandY,
      halfBandW,
      bandHeight
    )
    // Separuh kanan Pano Belakang -> hujung kiri kanvas (yaw -180° .. -180° + sweep/2)
    bCtx.drawImage(
      imgBack,
      halfSrcW,
      0,
      imgBack.width - halfSrcW,
      imgBack.height,
      0,
      bandY,
      bandWidth - halfBandW,
      bandHeight
    )

    // 3. Adun kedua-dua kanvas menggunakan pemberat kosinus + imbangan pencahayaan
    const frontImageData = fCtx.getImageData(0, 0, targetWidth, targetHeight)
    const backImageData = bCtx.getImageData(0, 0, targetWidth, targetHeight)
    const fData = frontImageData.data
    const bData = backImageData.data

    const fLuma = Math.max(24, meanLuma(fData))
    const bLuma = Math.max(24, meanLuma(bData))
    const avgLuma = (fLuma + bLuma) / 2
    const fGain = Math.min(1.3, Math.max(0.75, avgLuma / fLuma))
    const bGain = Math.min(1.3, Math.max(0.75, avgLuma / bLuma))

    const { frontWeight, backWeight } = computeDualPanoBlendWeights(targetWidth, sweep)
    const outImageData = new ImageData(targetWidth, targetHeight)
    const out = outImageData.data

    for (let y = 0; y < targetHeight; y++) {
      const rowOffset = y * targetWidth
      for (let x = 0; x < targetWidth; x++) {
        const idx = (rowOffset + x) << 2
        const wf = frontWeight[x]
        const wb = backWeight[x]

        out[idx] = Math.min(255, fData[idx] * fGain * wf + bData[idx] * bGain * wb)
        out[idx + 1] = Math.min(255, fData[idx + 1] * fGain * wf + bData[idx + 1] * bGain * wb)
        out[idx + 2] = Math.min(255, fData[idx + 2] * fGain * wf + bData[idx + 2] * bGain * wb)
        out[idx + 3] = 255
      }
    }

    const outCanvas = document.createElement('canvas')
    outCanvas.width = targetWidth
    outCanvas.height = targetHeight
    const outCtx = outCanvas.getContext('2d')
    if (!outCtx) throw new Error('Kanvas output 2D tidak disokong.')
    outCtx.putImageData(outImageData, 0, 0)

    return await new Promise<Blob>((resolve, reject) => {
      outCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Gagal mencantumkan 2 foto panorama telefon.'))
        },
        'image/jpeg',
        0.91
      )
    })
  } finally {
    URL.revokeObjectURL(frontUrl)
    URL.revokeObjectURL(backUrl)
  }
}
