export interface PolyMaps360HotspotDraft {
  id?: string
  panorama_url?: string
  building_id?: string | null
  location_id?: string | null
  pin_type: 'room' | 'scene' | 'info'
  label: string
  room_code?: string | null
  floor_level?: string | null
  description?: string | null
  pitch: number
  yaw: number
  target_panorama_url?: string | null
}

export interface InferredRoomMetadata {
  normalizedRoomCode: string
  buildingCodeHint: string | null
  floor_level: string
  search_tags: string
  direction_text: string
  roomCategoryLabel: string
}

const ROOM_CATEGORY_KEYWORDS: Array<{
  pattern: RegExp
  categoryMs: string
  categoryEn: string
  tags: string[]
}> = [
  {
    pattern: /\b(makmal|lab|laboratory|bengkel|workshop)\b/i,
    categoryMs: 'Makmal / Bengkel',
    categoryEn: 'Lab / Workshop',
    tags: ['makmal', 'lab', 'bengkel', 'workshop'],
  },
  {
    pattern: /\b(kuliah|dewan|dk|bk|bilik kuliah|auditorium|lecture)\b/i,
    categoryMs: 'Bilik / Dewan Kuliah',
    categoryEn: 'Lecture Hall / Classroom',
    tags: ['kuliah', 'dewan kuliah', 'kelas', 'lecture'],
  },
  {
    pattern: /\b(pejabat|office|pentadbiran|jabatan|hep|jpp)\b/i,
    categoryMs: 'Pejabat / Pentadbiran',
    categoryEn: 'Office / Administration',
    tags: ['pejabat', 'office', 'urusan'],
  },
  {
    pattern: /\b(surau|masjid|musolla|prayer)\b/i,
    categoryMs: 'Surau / Ibadah',
    categoryEn: 'Prayer Room / Surau',
    tags: ['surau', 'solat', 'ibadah', 'prayer'],
  },
  {
    pattern: /\b(tandas|toilet|washroom|restroom|oku)\b/i,
    categoryMs: 'Kemudahan Awam',
    categoryEn: 'Public Facility',
    tags: ['tandas', 'toilet', 'restroom', 'kemudahan'],
  },
]

/**
 * Menukar sudut yaw (-180..180) kepada panduan arah posisi jam / orientasi manusia dalam BM atau EN.
 */
export function formatYawToClockDirection(yaw: number, lang: 'ms' | 'en' = 'ms'): string {
  const norm = ((((yaw + 180) % 360) + 360) % 360) - 180
  if (lang === 'en') {
    if (norm >= -22.5 && norm <= 22.5) return "straight ahead (12 o'clock)"
    if (norm > 22.5 && norm <= 67.5) return "angled right ahead (1-2 o'clock)"
    if (norm > 67.5 && norm <= 112.5) return "on the right side of the corridor (3 o'clock)"
    if (norm > 112.5 && norm <= 157.5) return "angled right behind (4-5 o'clock)"
    if (norm < -22.5 && norm >= -67.5) return "angled left ahead (10-11 o'clock)"
    if (norm < -67.5 && norm >= -112.5) return "on the left side of the corridor (9 o'clock)"
    if (norm < -112.5 && norm >= -157.5) return "angled left behind (7-8 o'clock)"
    return "behind the starting point (6 o'clock)"
  }
  if (norm >= -22.5 && norm <= 22.5) return 'terus di hadapan anda (arah pukul 12)'
  if (norm > 22.5 && norm <= 67.5) return 'serong kanan di hadapan (arah pukul 1-2)'
  if (norm > 67.5 && norm <= 112.5) return 'di sebelah kanan koridor (arah pukul 3)'
  if (norm > 112.5 && norm <= 157.5) return 'serong kanan di belakang (arah pukul 4-5)'
  if (norm < -22.5 && norm >= -67.5) return 'serong kiri di hadapan (arah pukul 10-11)'
  if (norm < -67.5 && norm >= -112.5) return 'di sebelah kiri koridor (arah pukul 9)'
  if (norm < -112.5 && norm >= -157.5) return 'serong kiri di belakang (arah pukul 7-8)'
  return 'di belakang titik permulaan (arah pukul 6)'
}

/**
 * Auto-teka Aras, Kata Kunci Carian (Search Tags), dan Panduan Arah Dalaman daripada kod/nama bilik.
 */
export function inferRoomMetadata(
  rawRoomInput: string,
  buildingCode?: string | null,
  yaw?: number | null,
  lang: 'ms' | 'en' = 'ms'
): InferredRoomMetadata {
  const cleaned = (rawRoomInput || '').trim()
  const upper = cleaned.toUpperCase()

  // Padankan kod seperti EA301, A301, B-2-04, JKE102, DK1, G05
  const codeMatch = upper.match(/\b([A-Z]{1,4})[-_\s]?(\d)(\d{2})\b/)
  const groundMatch = upper.match(/\b([A-Z]{1,4})[-_\s]?G(\d{2})\b/)
  const explicitArasMatch = cleaned.match(/\b(?:aras|floor|level)\s*(\d+|bawah|ground|g)\b/i)

  let floor_level = '1'
  let buildingCodeHint: string | null = buildingCode ? buildingCode.trim().toUpperCase() : null
  let shortCode = ''
  let fullPrefixCode = ''

  if (explicitArasMatch) {
    const val = explicitArasMatch[1].toUpperCase()
    floor_level = val === 'BAWAH' || val === 'GROUND' || val === 'G' ? 'G' : val
  } else if (groundMatch) {
    floor_level = 'G'
    fullPrefixCode = `${groundMatch[1]}G${groundMatch[2]}`
    shortCode = `G${groundMatch[2]}`
    if (!buildingCodeHint) buildingCodeHint = groundMatch[1]
  } else if (codeMatch) {
    const prefix = codeMatch[1]
    const floorDigit = codeMatch[2]
    const roomNum = codeMatch[3]
    floor_level = floorDigit === '0' ? 'G' : floorDigit
    fullPrefixCode = `${prefix}${floorDigit}${roomNum}`
    const lastLetter = prefix.slice(-1)
    shortCode = `${lastLetter}${floorDigit}${roomNum}`
    if (!buildingCodeHint) buildingCodeHint = prefix
  }

  let roomCategoryLabel = lang === 'en' ? 'Room / Space' : 'Bilik / Ruang'
  const extraTags = new Set<string>()

  if (cleaned) extraTags.add(cleaned.toLowerCase())
  if (fullPrefixCode) extraTags.add(fullPrefixCode.toLowerCase())
  if (shortCode) extraTags.add(shortCode.toLowerCase())
  if (buildingCodeHint) extraTags.add(buildingCodeHint.toLowerCase())
  extraTags.add(`aras ${floor_level.toLowerCase()}`)
  extraTags.add(`tingkat ${floor_level.toLowerCase()}`)
  extraTags.add(`level ${floor_level.toLowerCase()}`)

  for (const rule of ROOM_CATEGORY_KEYWORDS) {
    if (rule.pattern.test(cleaned)) {
      roomCategoryLabel = lang === 'en' ? rule.categoryEn : rule.categoryMs
      rule.tags.forEach((t) => extraTags.add(t))
      break
    }
  }

  let direction_text: string
  if (lang === 'en') {
    const floorPhraseEn =
      floor_level === 'G' || floor_level === '0'
        ? 'Ground Floor'
        : `Level ${floor_level}`
    const buildingPhraseEn = buildingCodeHint ? `Building ${buildingCodeHint}` : 'this building'
    const yawPhraseEn =
      typeof yaw === 'number' && !Number.isNaN(yaw)
        ? `, located ${formatYawToClockDirection(yaw, 'en')} in the 360° view`
        : ''
    direction_text =
      Number(floor_level) >= 2
        ? `Take the stairs or lift in ${buildingPhraseEn} to ${floorPhraseEn}. Look for ${cleaned || 'the room'} door${yawPhraseEn}.`
        : `Enter ${floorPhraseEn} in ${buildingPhraseEn}. Look for ${cleaned || 'the room'} door${yawPhraseEn}.`
  } else {
    const floorPhrase =
      floor_level === 'G' || floor_level === '0'
        ? 'Aras Bawah (Ground Floor)'
        : `Aras ${floor_level}`

    const buildingPhrase = buildingCodeHint ? `Bangunan ${buildingCodeHint}` : 'bangunan ini'
    const yawPhrase =
      typeof yaw === 'number' && !Number.isNaN(yaw)
        ? `, terletak ${formatYawToClockDirection(yaw, 'ms')} dalam paparan 360°`
        : ''

    direction_text =
      Number(floor_level) >= 2
        ? `Naik tangga atau lif di ${buildingPhrase} ke ${floorPhrase}. Cari pintu ${cleaned || 'bilik'}${yawPhrase}.`
        : `Masuk ke ${floorPhrase} di ${buildingPhrase}. Cari pintu ${cleaned || 'bilik'}${yawPhrase}.`
  }

  return {
    normalizedRoomCode: cleaned,
    buildingCodeHint,
    floor_level,
    search_tags: Array.from(extraTags).filter(Boolean).join(', '),
    direction_text,
    roomCategoryLabel,
  }
}

/**
 * Kira jarak Haversine dalam meter antara dua koordinat GPS.
 */
export function calculateGpsDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // meter
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface MinimalBuildingWithCoords {
  id: string
  code: string
  name: string
  latitude?: number | null
  longitude?: number | null
}

/**
 * Cari bangunan terdekat berdasarkan koordinat GPS semasa sukarelawan/JPP.
 */
export function findNearestBuildingByGps<T extends MinimalBuildingWithCoords>(
  userLat: number,
  userLng: number,
  buildings: T[],
  maxRadiusMeters = 85
): { building: T; distanceMeters: number } | null {
  let best: { building: T; distanceMeters: number } | null = null

  for (const b of buildings) {
    if (typeof b.latitude !== 'number' || typeof b.longitude !== 'number') continue
    const dist = calculateGpsDistanceMeters(userLat, userLng, b.latitude, b.longitude)
    if (dist <= maxRadiusMeters && (!best || dist < best.distanceMeters)) {
      best = { building: b, distanceMeters: Math.round(dist) }
    }
  }

  return best
}

export interface BulkRoomImportRow {
  room_code: string
  building_id: string
  building_code: string
  floor_level: string
  search_tags: string
  direction_text: string
}

/**
 * Parse teks senarai bilik (Smart Paste / CSV) kepada baris siap-import dengan inferens automatik.
 */
export function parseBulkRoomsInput(
  rawText: string,
  buildings: MinimalBuildingWithCoords[],
  fallbackBuildingId?: string,
  lang: 'ms' | 'en' = 'ms'
): BulkRoomImportRow[] {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const results: BulkRoomImportRow[] = []

  for (const line of lines) {
    // Abaikan baris header CSV jika ada
    if (/^(room_code|kod\s*bilik|nama\s*bilik)[,\t;|]/i.test(line)) continue

    const parts = line.split(/[,\t;|]/).map((p) => p.trim())
    const firstCol = parts[0] || ''
    const secondCol = parts[1] || ''
    const thirdCol = parts[2] || ''

    // Cuba padankan sama ada lajur pertama ialah kod bangunan atau nama bilik
    const matchedFirstColBuilding = buildings.find(
      (b) => b.code.toLowerCase() === firstCol.toLowerCase()
    )

    let roomLabel = firstCol
    let explicitBuilding: MinimalBuildingWithCoords | undefined = matchedFirstColBuilding

    if (matchedFirstColBuilding && secondCol) {
      roomLabel = thirdCol ? `${secondCol} - ${thirdCol}` : secondCol
    } else if (secondCol && !matchedFirstColBuilding) {
      // Contoh: "EA301, Makmal Rangkaian" -> gabungkan supaya bermakna
      const secondIsBuilding = buildings.find(
        (b) => b.code.toLowerCase() === secondCol.toLowerCase()
      )
      if (secondIsBuilding) {
        explicitBuilding = secondIsBuilding
        roomLabel = thirdCol ? `${firstCol} - ${thirdCol}` : firstCol
      } else {
        roomLabel = `${firstCol} - ${secondCol}`
      }
    }

    if (!roomLabel) continue

    const inferred = inferRoomMetadata(roomLabel, explicitBuilding?.code, undefined, lang)

    if (!explicitBuilding && inferred.buildingCodeHint) {
      const hint = inferred.buildingCodeHint.toLowerCase()
      explicitBuilding =
        buildings.find((b) => b.code.toLowerCase() === hint) ||
        buildings.find(
          (b) =>
            hint.startsWith(b.code.toLowerCase()) || b.code.toLowerCase().startsWith(hint)
        )
    }

    if (!explicitBuilding && fallbackBuildingId) {
      explicitBuilding = buildings.find((b) => b.id === fallbackBuildingId)
    }

    if (!explicitBuilding && buildings.length > 0) {
      explicitBuilding = buildings[0]
    }

    const finalInferred = inferRoomMetadata(roomLabel, explicitBuilding?.code, undefined, lang)

    results.push({
      room_code: roomLabel,
      building_id: explicitBuilding?.id || '',
      building_code: explicitBuilding?.code || finalInferred.buildingCodeHint || (lang === 'en' ? 'GENERAL' : 'UMUM'),
      floor_level: finalInferred.floor_level,
      search_tags: finalInferred.search_tags,
      direction_text: finalInferred.direction_text,
    })
  }

  return results
}
