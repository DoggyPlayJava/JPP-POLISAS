import { describe, expect, it } from 'vitest';
import {
  searchCampusLocally,
  filterCampusFacilities,
  resolveEffectiveLocation360,
  computeAdmin360Coverage,
} from '../domain/campusSearch';
import type { CampusBuilding, CampusLocation, CampusPanorama } from '../types';

describe('campusSearch, discriminated results & 360° selectors', () => {
  const bJke: CampusBuilding = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'JKEA',
    name: 'Blok A JKE',
    zone_name: 'Kejuruteraan',
    center_lat: 3.862,
    center_lng: 103.315,
    is_facility: false,
    panorama_360_url: 'https://cdn.example.com/jkea.jpg',
    is_360_enabled: true,
  };

  const bKafe: CampusBuilding = {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'KAFE',
    name: 'Kafeteria Pusat',
    zone_name: 'Awam',
    center_lat: 3.863,
    center_lng: 103.316,
    is_facility: true,
    facility_type: 'Kafe',
    op_start: '07:30',
    op_end: '18:00',
    panorama_360_url: 'https://cdn.example.com/kafe-draft.jpg',
    is_360_enabled: false,
  };

  const locRoomNoOwn360: CampusLocation = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    building_id: bJke.id,
    room_code: 'EA301',
    floor_level: 3,
    floor_label: '3',
    search_tags: 'makmal komputer, a301',
    panorama_360_url: null,
    is_360_enabled: false,
    building: bJke,
  };

  const locSurauGround: CampusLocation = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    building_id: bJke.id,
    room_code: 'SURAU JKE',
    floor_level: 0,
    floor_label: 'G',
    search_tags: 'surau, solat',
    panorama_360_url: 'https://cdn.example.com/surau.jpg',
    is_360_enabled: true,
    building: bJke,
  };

  it('returns discriminated building/location results with real UUIDs (never synthetic b-<uuid>)', () => {
    const results = searchCampusLocally('jke', [bJke, bKafe], [locRoomNoOwn360, locSurauGround]);

    const buildingHit = results.find((r) => r.kind === 'building');
    expect(buildingHit).toBeDefined();
    if (buildingHit?.kind === 'building') {
      expect(buildingHit.building.id).toBe(bJke.id);
      expect(buildingHit.building.id.startsWith('b-')).toBe(false);
    }

    const locationHit = results.find((r) => r.kind === 'location' && r.location.id === locSurauGround.id);
    expect(locationHit).toBeDefined();
  });

  it('matches rooms via imaps_room_mappings patterns during search', () => {
    const results = searchCampusLocally(
      'PDK_CUSTOM',
      [bJke],
      [locRoomNoOwn360],
      [{ room_code_pattern: '^PDK_CUSTOM$', location_id: locRoomNoOwn360.id, is_online: false }],
    );
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('location');
    if (results[0].kind === 'location') {
      expect(results[0].location.id).toBe(locRoomNoOwn360.id);
    }
  });

  it('quick facility filter stores walking ETA in etaMinutes WITHOUT corrupting location.floor_level', () => {
    const results = filterCampusFacilities(
      'surau',
      [bJke, bKafe],
      [locRoomNoOwn360, locSurauGround],
      () => 5,
    );

    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('location');
    if (results[0].kind === 'location') {
      expect(results[0].etaMinutes).toBe(5);
      // Floor level MUST remain 0 (Ground Floor), NOT 5!
      expect(results[0].location.floor_level).toBe(0);
      expect(results[0].location.floor_label).toBe('G');
    }
  });

  it('resolveEffectiveLocation360 falls back to active building 360° when room has no active own 360°', () => {
    const effective = resolveEffectiveLocation360(locRoomNoOwn360, bJke, []);
    expect(effective).toEqual({
      imageUrl: 'https://cdn.example.com/jkea.jpg',
      panoramaId: null,
      source: 'building',
    });

    // Room with its own active 360° takes precedence over building 360°
    const own = resolveEffectiveLocation360(locSurauGround, bJke, []);
    expect(own?.imageUrl).toBe('https://cdn.example.com/surau.jpg');
    expect(own?.source).toBe('location');

    // Disabled building 360° returns null (never leaks draft/disabled URL)
    const disabled = resolveEffectiveLocation360(null, bKafe, []);
    expect(disabled).toBeNull();
  });

  it('prefers published imaps_panoramas rows when available', () => {
    const panoramas: CampusPanorama[] = [
      {
        id: 'pano-1',
        building_id: bJke.id,
        location_id: locRoomNoOwn360.id,
        floor_label: '3',
        floor_order: 3,
        image_url: 'https://cdn.example.com/ea301-v2.jpg',
        haov: 230,
        vaov: 70,
        status: 'published',
        is_primary: false,
      },
    ];

    const effective = resolveEffectiveLocation360(locRoomNoOwn360, bJke, panoramas);
    expect(effective).toEqual({
      imageUrl: 'https://cdn.example.com/ea301-v2.jpg',
      panoramaId: 'pano-1',
      source: 'location',
      haov: 230,
      vaov: 70,
    });
  });

  it('computeAdmin360Coverage counts ONLY active/published items separately from draft/available', () => {
    const coverage = computeAdmin360Coverage([bJke, bKafe], [locRoomNoOwn360, locSurauGround], []);
    expect(coverage).toEqual({
      activeBuildings: 1,
      availableBuildings: 1,
      totalBuildings: 2,
      activeLocations: 1,
      availableLocations: 0,
      totalLocations: 2,
    });
  });
});
