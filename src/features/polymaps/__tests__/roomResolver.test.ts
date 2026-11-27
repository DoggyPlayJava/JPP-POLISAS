import { describe, expect, it } from 'vitest';
import {
  resolveRoomLocationUnified,
  matchRoomToLocationUnified,
  isOnlineRoomToken,
} from '../domain/roomResolver';

describe('unified PolyMaps & Timetable roomResolver', () => {
  const locations = [
    { id: 'loc-ea301', room_code: 'EA301', search_tags: 'JKE, A301', building: { id: 'b-a', name: 'Blok A' } },
    { id: 'loc-bf107', room_code: 'BF107', search_tags: 'Makmal Komputer, F107', building: { id: 'b-f', name: 'Blok F' } },
    { id: 'loc-dk2', room_code: 'DEWAN KULIAH 2', search_tags: 'DK2, kuliah', building: { id: 'b-dk', name: 'DK2' } },
    { id: 'loc-ea309', room_code: 'EA309', search_tags: null, building: { id: 'b-a', name: 'Blok A' } },
  ];

  const roomMappings = [
    { id: 'm1', room_code_pattern: '^PDKJP$', location_id: 'loc-dk2', is_online: false },
    { id: 'm2', room_code_pattern: '^MS[-_]?TEAMS$', location_id: null, is_online: true },
    { id: 'm3', room_code_pattern: '[invalid-regex', location_id: 'loc-ea301', is_online: false },
  ];

  it('resolves rooms via imaps_room_mappings regex when room_code and search_tags do not match', () => {
    const resolved = resolveRoomLocationUnified('PDKJP', locations, roomMappings);
    expect(resolved?.id).toBe('loc-dk2');

    const matched = matchRoomToLocationUnified('PDKJP', locations, roomMappings);
    expect(matched).toEqual({ location_id: 'loc-dk2', is_online: false });
  });

  it('handles malformed regex in room mappings without throwing', () => {
    expect(() => matchRoomToLocationUnified('[invalid-regex', locations, roomMappings)).not.toThrow();
    expect(matchRoomToLocationUnified('[invalid-regex', locations, roomMappings)).toEqual({
      location_id: 'loc-ea301',
      is_online: false,
    });
  });

  it('recognizes online room tokens and room_mapping is_online flags', () => {
    expect(isOnlineRoomToken('MS TEAMS')).toBe(true);
    expect(isOnlineRoomToken('Dalam Talian')).toBe(true);
    expect(isOnlineRoomToken('EA301')).toBe(false);

    expect(matchRoomToLocationUnified('MS_TEAMS', locations, roomMappings)).toEqual({
      location_id: null,
      is_online: true,
    });
  });

  it('preserves direct ID, exact room_code, search_tags, composite split, and prefix stripping', () => {
    expect(resolveRoomLocationUnified('loc-ea301', locations)?.id).toBe('loc-ea301');
    expect(resolveRoomLocationUnified('A301', locations)?.id).toBe('loc-ea301');
    expect(resolveRoomLocationUnified('F107', locations)?.id).toBe('loc-bf107');
    expect(resolveRoomLocationUnified('A309', locations)?.id).toBe('loc-ea309');
    expect(resolveRoomLocationUnified('PDKJP / EA301', locations, roomMappings)?.id).toBe('loc-dk2');
  });
});
