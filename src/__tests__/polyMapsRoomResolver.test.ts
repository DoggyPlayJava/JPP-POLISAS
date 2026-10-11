import { describe, it, expect } from 'vitest';
import { resolveRoomLocation } from '../lib/polyMapsResolver';

describe('PolyMaps Room Location Resolver (search_tags & aliases)', () => {
  const mockLocations = [
    {
      id: 'uuid-ea301',
      room_code: 'EA301',
      search_tags: 'JKE, A301',
      building: { id: 'b-jke-a', name: 'Blok A JKE' },
    },
    {
      id: 'uuid-ea302',
      room_code: 'EA302',
      search_tags: 'JKE, A302',
      building: { id: 'b-jke-a', name: 'Blok A JKE' },
    },
    {
      id: 'uuid-bf107',
      room_code: 'BF107',
      search_tags: 'Makmal Komputer, F107, JKE',
      building: { id: 'b-jke-f', name: 'Makmal Komputer JKE' },
    },
    {
      id: 'uuid-bka',
      room_code: 'BILIK KULIAH A',
      search_tags: 'BKA, BKB, MBKA',
      building: { id: 'b-admin', name: 'Bangunan Pentadbiran' },
    },
    {
      id: 'uuid-ea309',
      room_code: 'EA309',
      search_tags: null,
      building: { id: 'b-jke-a', name: 'Blok A JKE' },
    },
  ];

  it('matches exactly by location ID (UUID)', () => {
    const res = resolveRoomLocation('uuid-ea301', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-ea301');
    expect(res?.room_code).toBe('EA301');
  });

  it('matches exactly by room_code', () => {
    const res = resolveRoomLocation('EA301', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-ea301');
  });

  it('resolves alias A301 to EA301 via search_tags', () => {
    const res = resolveRoomLocation('A301', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-ea301');
    expect(res?.room_code).toBe('EA301');
  });

  it('resolves alias A302 to EA302 via search_tags', () => {
    const res = resolveRoomLocation('A302', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-ea302');
    expect(res?.room_code).toBe('EA302');
  });

  it('resolves F107 to BF107 via search_tags', () => {
    const res = resolveRoomLocation('F107', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-bf107');
    expect(res?.room_code).toBe('BF107');
  });

  it('resolves nickname BKA to BILIK KULIAH A via search_tags', () => {
    const res = resolveRoomLocation('BKA', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-bka');
    expect(res?.room_code).toBe('BILIK KULIAH A');
  });

  it('resolves untagged room via prefix normalizer fallback (A309 -> EA309)', () => {
    const res = resolveRoomLocation('A309', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-ea309');
  });

  it('returns undefined for non-existent room query', () => {
    const res = resolveRoomLocation('NON_EXISTENT_999', mockLocations);
    expect(res).toBeUndefined();
  });

  it('returns undefined for empty query or empty locations array', () => {
    expect(resolveRoomLocation('', mockLocations)).toBeUndefined();
    expect(resolveRoomLocation('EA301', [])).toBeUndefined();
  });

  it('resolves composite / split rooms to primary location (EA301/EA302)', () => {
    const res = resolveRoomLocation('EA301/EA302', mockLocations);
    expect(res).toBeDefined();
    expect(res?.id).toBe('uuid-ea301');
    expect(res?.room_code).toBe('EA301');

    // Also with spaces around slash or aliases in composite
    const resWithSpace = resolveRoomLocation('A302 / A301', mockLocations);
    expect(resWithSpace).toBeDefined();
    expect(resWithSpace?.id).toBe('uuid-ea302');
  });
});
