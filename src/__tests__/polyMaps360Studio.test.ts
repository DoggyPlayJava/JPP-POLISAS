import { describe, it, expect } from 'vitest'
import {
  inferRoomMetadata,
  formatYawToClockDirection,
  calculateGpsDistanceMeters,
  findNearestBuildingByGps,
  parseBulkRoomsInput,
} from '../lib/polyMapsSmartEntry'
import {
  normalizePannellumYaw,
  validateEquirectangularDimensions,
  computeHorizonSlotPlacement,
} from '../lib/panoStitcher'

describe('polyMapsSmartEntry', () => {
  it('infers floor level, search tags, and indoor directions from standard POLISAS room codes', () => {
    const meta = inferRoomMetadata('EA301 - Makmal Komputer 1', 'EA', 90)
    expect(meta.floor_level).toBe('3')
    expect(meta.buildingCodeHint).toBe('EA')
    expect(meta.search_tags).toContain('ea301')
    expect(meta.search_tags).toContain('a301')
    expect(meta.search_tags).toContain('makmal')
    expect(meta.direction_text).toContain('Aras 3')
    expect(meta.direction_text).toContain('sebelah kanan koridor')
  })

  it('infers ground floor when room code starts with G or 0', () => {
    const meta = inferRoomMetadata('JKE-G04 Bengkel Elektrik', 'JKE', 0)
    expect(meta.floor_level).toBe('G')
    expect(meta.direction_text).toContain('Aras Bawah')
    expect(meta.direction_text).toContain('terus di hadapan anda')
  })

  it('formats yaw into intuitive English and Malay clock-face directions', () => {
    expect(formatYawToClockDirection(0)).toContain('pukul 12')
    expect(formatYawToClockDirection(90)).toContain('pukul 3')
    expect(formatYawToClockDirection(-90)).toContain('pukul 9')
    expect(formatYawToClockDirection(180)).toContain('pukul 6')
    expect(formatYawToClockDirection(0, 'en')).toContain("12 o'clock")
    expect(formatYawToClockDirection(90, 'en')).toContain("3 o'clock")
    const enMeta = inferRoomMetadata('EA301 - Computer Lab 1', 'EA', 90, 'en')
    expect(enMeta.direction_text).toContain('Level 3')
    expect(enMeta.direction_text).toContain("3 o'clock")
  })

  it('calculates GPS distance and finds nearest building within threshold', () => {
    const buildings = [
      { id: 'b-ea', code: 'EA', name: 'Blok Akademik A', latitude: 3.8471, longitude: 103.3261 },
      { id: 'b-jke', code: 'JKE', name: 'Jabatan Kejuruteraan Elektrik', latitude: 3.8495, longitude: 103.3285 },
    ]
    const dist = calculateGpsDistanceMeters(3.8471, 103.3261, 3.8472, 103.3261)
    expect(dist).toBeGreaterThan(5)
    expect(dist).toBeLessThan(20)

    const nearest = findNearestBuildingByGps(3.84715, 103.32612, buildings, 80)
    expect(nearest?.building.code).toBe('EA')
  })

  it('parses bulk room input lines and maps buildings automatically', () => {
    const buildings = [
      { id: 'id-ea', code: 'EA', name: 'Blok Akademik A' },
      { id: 'id-jke', code: 'JKE', name: 'Jabatan Kejuruteraan Elektrik' },
    ]
    const raw = `
      EA301, Makmal Rangkaian
      JKE204, Bilik Kuliah 4
    `
    const parsed = parseBulkRoomsInput(raw, buildings)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].building_id).toBe('id-ea')
    expect(parsed[0].floor_level).toBe('3')
    expect(parsed[1].building_id).toBe('id-jke')
    expect(parsed[1].floor_level).toBe('2')
  })
})

describe('panoStitcher helpers', () => {
  it('normalizes arbitrary compass degrees to Pannellum -180..180 yaw', () => {
    expect(normalizePannellumYaw(0)).toBe(0)
    expect(normalizePannellumYaw(270)).toBe(-90)
    expect(normalizePannellumYaw(-270)).toBe(90)
  })

  it('validates equirectangular 2:1 dimensions vs wide phone panoramas', () => {
    const eq = validateEquirectangularDimensions(4096, 2048)
    expect(eq.isValidEquirectangular).toBe(true)
    expect(eq.isWidePanorama).toBe(false)

    const wide = validateEquirectangularDimensions(6000, 1400)
    expect(wide.isValidEquirectangular).toBe(false)
    expect(wide.isWidePanorama).toBe(true)
  })

  it('computes horizon slot placement across a 2:1 canvas', () => {
    const slot0 = computeHorizonSlotPlacement(0, 8, 4096, 2048)
    const slot4 = computeHorizonSlotPlacement(4, 8, 4096, 2048)
    expect(slot0.x).toBe(0)
    expect(slot0.slotWidth).toBe(512)
    expect(slot4.x).toBe(2048)
    expect(slot4.centerYaw).toBe(0)
  })
})
