import { describe, expect, it } from 'vitest';
import { buildPolyMaps360Directory, filterPolyMaps360Directory, normalizePendingPins, normalizeStorageObjectPath } from '../polymaps360Directory';

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
