import { describe, expect, it } from 'vitest';
import { buildPolyMaps360Directory, filterPolyMaps360Directory, normalizePendingPins, normalizeStorageObjectPath, canMarkSubmissionApproved, canApplyPanoramaToBuilding, getPanoramaUsage, findRoomPanoramaConflicts, buildSubmissionEditPlan, filter360Submissions, filterLocationsForSelection, getHotspotsForLocation } from '../polymaps360Directory';

describe('PolyMaps 360 directory resolver', () => {
  it('normalizes public storage URLs and ignores viewer fragments', () => {
    expect(normalizeStorageObjectPath('https://api.example/storage/v1/object/public/imaps_assets/polymaps/pano.jpg#haov=230'))
      .toBe('polymaps/pano.jpg');
    expect(normalizeStorageObjectPath('not a url')).toBeNull();
  });

  it('filters directory by status and query', () => {
    const entries = [
      { id: 'a', status: 'active', label: 'Blok A', source: 'building', panoramaUrl: 'a.jpg', pinCount: 0 },
      { id: 'b', status: 'unused', label: 'upload-b.jpg', source: 'storage', panoramaUrl: 'b.jpg', pinCount: 0 },
    ] as const;
    expect(filterPolyMaps360Directory([...entries], 'unused', '').map((entry) => entry.id)).toEqual(['b']);
    expect(filterPolyMaps360Directory([...entries], 'all', 'blok').map((entry) => entry.id)).toEqual(['a']);
  });

  it('normalizes pending pin edits without losing yaw, pitch, or room code', () => {
    const pins = normalizePendingPins([{ label: ' B101 ', room_code: ' b101 ', yaw: 42, pitch: -3 }, { label: 'Door', yaw: 8, pitch: 2 }]);
    expect(pins).toEqual([{ label: 'B101', room_code: 'B101', yaw: 42, pitch: -3 }, { label: 'Door', yaw: 8, pitch: 2 }]);
  });

  it('blocks approval status when any publication write failed', () => {
    expect(canMarkSubmissionApproved([null, new Error('insert failed')])).toBe(false);
    expect(canMarkSubmissionApproved([null, null, null])).toBe(true);
  });

  it('never allows disabled external backup panorama to be reactivated', () => {
    expect(canApplyPanoramaToBuilding({ source: 'disabled', status: 'disabled' })).toBe(false);
    expect(canApplyPanoramaToBuilding({ source: 'storage', status: 'unused' })).toBe(true);
  });


  it('lists every room using a panorama with its building, floor, and matching pins', () => {
    const usage = getPanoramaUsage(
      [{ id: 'loc-1', building_id: 'b1', room_code: 'B101', floor_level: 1, panorama_360_url: 'pano.jpg' }],
      [{ id: 'pin-1', location_id: 'loc-1', panorama_url: 'pano.jpg', label: 'B101', yaw: 20, pitch: -2 }],
      [{ id: 'b1', code: 'BF', name: 'Blok F' }],
      'pano.jpg',
    );
    expect(usage).toEqual([{ locationId: 'loc-1', buildingId: 'b1', building: 'BF · Blok F', floor: '1', roomCode: 'B101', pins: [{ id: 'pin-1', label: 'B101', yaw: 20, pitch: -2 }] }]);
  });

  it('finds same building and floor room conflicts only when another panorama is assigned', () => {
    const locations = [
      { id: 'same', building_id: 'b1', room_code: 'b101', floor_level: '01', panorama_360_url: 'old.jpg' },
      { id: 'other-floor', building_id: 'b1', room_code: 'B101', floor_level: '2', panorama_360_url: 'two.jpg' },
      { id: 'other-building', building_id: 'b2', room_code: 'B101', floor_level: '1', panorama_360_url: 'three.jpg' },
    ];
    expect(findRoomPanoramaConflicts(locations, { buildingId: 'b1', floor: '1', roomCode: 'B101', panoramaUrl: 'new.jpg' })).toEqual([locations[0]]);
    expect(findRoomPanoramaConflicts(locations, { buildingId: 'b1', floor: '1', roomCode: 'B101', panoramaUrl: 'old.jpg', locationId: 'same' })).toEqual([]);
  });


  it('keeps pending edits on submission and scopes approved edits to one location', () => {
    expect(buildSubmissionEditPlan('pending', 'loc-1')).toEqual({ updateSubmission: true, targetLocationId: 'loc-1', updateStatus: false });
    expect(buildSubmissionEditPlan('approved', 'loc-2')).toEqual({ updateSubmission: false, targetLocationId: 'loc-2', updateStatus: false });
    expect(buildSubmissionEditPlan('rejected', null)).toEqual({ updateSubmission: true, targetLocationId: null, updateStatus: false });
  });


  it('filters 360 submissions by status, building, and contributor/notes query', () => {
    const rows = [
      { id: '1', status: 'pending', building_id: 'b1', contributor_name: 'Amin', notes: 'Makmal' },
      { id: '2', status: 'approved', building_id: 'b2', contributor_name: 'Siti', notes: 'Koridor' },
    ];
    expect(filter360Submissions(rows, { status: 'pending', buildingId: 'all', query: '' }).map((x) => x.id)).toEqual(['1']);
    expect(filter360Submissions(rows, { status: 'all', buildingId: 'b2', query: 'koridor' }).map((x) => x.id)).toEqual(['2']);
  });

  it('lists selectable rooms only for selected building and floor', () => {
    const rows = [
      { id: '1', building_id: 'b1', floor_level: 1, room_code: 'B101' },
      { id: '2', building_id: 'b1', floor_level: 2, room_code: 'B201' },
      { id: '3', building_id: 'b2', floor_level: 1, room_code: 'C101' },
    ];
    expect(filterLocationsForSelection(rows, 'b1', '1').map((x) => x.id)).toEqual(['1']);
  });


  it('loads legacy room pins without location_id by building, floor, and room code only', () => {
    const rows = [
      { id: 'owned', location_id: 'loc-1', building_id: 'b1', floor_level: 1, room_code: 'B101', panorama_url: 'pano.jpg' },
      { id: 'legacy', location_id: null, building_id: 'b1', floor_level: '01', room_code: 'b101', panorama_url: 'pano.jpg' },
      { id: 'sibling', location_id: null, building_id: 'b1', floor_level: 1, room_code: 'B102', panorama_url: 'pano.jpg' },
      { id: 'other-building', location_id: null, building_id: 'b2', floor_level: 1, room_code: 'B101', panorama_url: 'pano.jpg' },
    ];
    expect(getHotspotsForLocation(rows, { id: 'loc-1', building_id: 'b1', floor_level: 1, room_code: 'B101', panorama_360_url: 'pano.jpg' }).map((x) => x.id)).toEqual(['owned', 'legacy']);
  });

  it('keeps shared panoramas referenced and maps pending submissions as pending', () => {
    const entries = buildPolyMaps360Directory(
      [], [],
      [{ id: 'sub-1', panorama_360_url: 'https://api.example/storage/v1/object/public/imaps_assets/polymaps/pano.jpg#haov=230', status: 'pending', hotspots_json: [{ yaw: 10 }, { yaw: 20 }] }],
      [{ id: 'hot-1', panorama_url: 'https://api.example/storage/v1/object/public/imaps_assets/polymaps/pano.jpg#vaov=80' }],
      [{ name: 'polymaps/pano.jpg', created_at: '2026-01-01T00:00:00Z' }, { name: 'polymaps/free.jpg', created_at: '2026-01-02T00:00:00Z' }],
      [],
    );
    expect(entries.find((entry) => entry.id === 'submission:sub-1')?.status).toBe('pending');
    expect(entries.find((entry) => entry.id === 'submission:sub-1')?.pinCount).toBe(2);
    expect(entries.find((entry) => entry.id === 'storage:polymaps/pano.jpg')).toBeUndefined();
    expect(entries.find((entry) => entry.id === 'storage:polymaps/free.jpg')?.status).toBe('unused');
  });
});
