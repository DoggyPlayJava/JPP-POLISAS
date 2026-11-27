import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryCache } from '@/lib/cache';
import {
  fetchCampusMapBundle,
  invalidatePolyMapsCache,
  rehydrateSelectionById,
  approveFieldSubmissionAtomic,
  resetPolyMapsSchemaCapabilities,
  POLYMAPS_BUNDLE_CACHE_KEY,
} from '../api/polymapsRepository';

function createMockSupabase(tableResponses: Record<string, { data: any; error: any }>, rpcResponse?: { data: any; error: any }) {
  const queriedTables: string[] = [];
  const rpcCalls: Array<{ fn: string; args: any }> = [];

  const client = {
    from: vi.fn((table: string) => {
      queriedTables.push(table);
      const response = tableResponses[table] ?? { data: [], error: null };
      const chain: any = {
        select: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve(response)),
        in: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve(response)),
          then: (resolve: any) => resolve(response),
        })),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        then: (resolve: any) => resolve(response),
      };
      return chain;
    }),
    rpc: vi.fn((fn: string, args: any) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpcResponse ?? { data: { success: true, rooms_synced: 1, hotspots_inserted: 1 }, error: null });
    }),
  };

  return { client, queriedTables, rpcCalls };
}

describe('polymapsRepository', () => {
  beforeEach(() => {
    invalidatePolyMapsCache();
    resetPolyMapsSchemaCapabilities();
  });

  it('caches walkway segments, panoramas, and roomMappings in queryCache and NEVER queries ems_events', async () => {
    const { client, queriedTables } = createMockSupabase({
      imaps_buildings: {
        data: [{ id: 'b1', name: 'Blok A', code: 'A', panorama_360_url: 'https://cdn.example/a.jpg', is_360_enabled: true }],
        error: null,
      },
      imaps_locations: {
        data: [{ id: 'l1', building_id: 'b1', room_code: 'A101', floor_level: 1, panorama_360_url: null, is_360_enabled: false, building: { id: 'b1', name: 'Blok A', code: 'A', panorama_360_url: 'https://cdn.example/a.jpg', is_360_enabled: true } }],
        error: null,
      },
      imaps_walkways: {
        data: [{ id: 'w1', name: 'Laluan A', coordinates: [[3.86, 103.31], [3.861, 103.311]], is_covered: true, is_blocked: false }],
        error: null,
      },
      imaps_walkway_segments: {
        data: [{ id: 's1', walkway_id: 'w1', start_idx: 0, end_idx: 1, is_blocked: true, is_covered: false }],
        error: null,
      },
      imaps_360_hotspots: {
        data: [{ id: 'h1', panorama_url: 'https://cdn.example/a.jpg', building_id: 'b1', location_id: 'l1', pin_type: 'room', label: 'A101', pitch: 0, yaw: 10 }],
        error: null,
      },
      imaps_panoramas: {
        data: [{ id: 'p1', building_id: 'b1', location_id: null, floor_label: '1', floor_order: 1, image_url: 'https://cdn.example/a.jpg', haov: 360, vaov: 180, status: 'published', is_primary: true }],
        error: null,
      },
      imaps_room_mappings: {
        data: [{ id: 'rm1', room_code_pattern: '^A101$', location_id: 'l1', is_online: false }],
        error: null,
      },
    });

    const first = await fetchCampusMapBundle({ client });
    expect(queriedTables).not.toContain('ems_events');
    expect(first.segments).toHaveLength(1);
    expect(first.panoramas).toHaveLength(1);
    expect(first.roomMappings).toHaveLength(1);
    // Must NOT overwrite location.panorama_360_url with parent building URL
    expect(first.locations[0].panorama_360_url).toBeNull();
    expect(first.schemaMode).toBe('panoramas_v2');

    // Second call hits cache with zero DB queries AND retains segments!
    const callCountAfterFirst = client.from.mock.calls.length;
    const second = await fetchCampusMapBundle({ client });
    expect(client.from.mock.calls.length).toBe(callCountAfterFirst);
    expect(second.segments).toEqual(first.segments);
    expect(queryCache.get(POLYMAPS_BUNDLE_CACHE_KEY)).toBeTruthy();
  });

  it('gracefully falls back to legacy columns when imaps_panoramas returns 42P01 (pre-migration prod)', async () => {
    const { client } = createMockSupabase({
      imaps_buildings: {
        data: [{ id: 'b1', name: 'Blok A', code: 'A', panorama_360_url: 'https://cdn.example/a.jpg', is_360_enabled: true }],
        error: null,
      },
      imaps_locations: {
        data: [{ id: 'l1', building_id: 'b1', room_code: 'A101', floor_level: 0, panorama_360_url: null, is_360_enabled: false }],
        error: null,
      },
      imaps_walkways: { data: [], error: null },
      imaps_walkway_segments: { data: [], error: null },
      imaps_360_hotspots: { data: [], error: null },
      imaps_room_mappings: { data: [], error: null },
      imaps_panoramas: {
        data: null,
        error: { code: '42P01', message: 'relation "public.imaps_panoramas" does not exist' },
      },
    });

    const bundle = await fetchCampusMapBundle({ client, forceRefresh: true });
    expect(bundle.schemaMode).toBe('legacy_fallback');
    expect(bundle.buildings).toHaveLength(1);
    expect(bundle.locations[0].floor_label).toBe('G');
    expect(bundle.locations[0].floor_level).toBe(0);
    // Synthesizes a published panorama entry from legacy building columns
    expect(bundle.panoramas).toHaveLength(1);
    expect(bundle.panoramas[0].status).toBe('published');
    expect(bundle.panoramas[0].image_url).toBe('https://cdn.example/a.jpg');
  });

  it('rehydrates open activeBuilding and selectedLocation by ID after a refresh', () => {
    const updatedBuilding = { id: 'b1', name: 'Blok A (Updated)', code: 'A', is_360_enabled: true };
    const updatedLocation = { id: 'l1', building_id: 'b1', room_code: 'A101', floor_level: 1, building: updatedBuilding };
    const bundle = {
      buildings: [updatedBuilding],
      locations: [updatedLocation],
      panoramas: [],
      walkways: [],
      segments: [],
      roomMappings: [],
      hotspotsByPanorama: {},
      schemaMode: 'panoramas_v2' as const,
    };

    const hydrated = rehydrateSelectionById(bundle, 'b1', 'l1');
    expect(hydrated.activeBuilding?.name).toBe('Blok A (Updated)');
    expect(hydrated.selectedLocation?.building?.name).toBe('Blok A (Updated)');
  });

  it('calls approve_imaps_field_submission RPC atomically when deployed', async () => {
    const { client, rpcCalls } = createMockSupabase(
      {},
      { data: { success: true, rooms_synced: 3, hotspots_inserted: 4, panorama_id: 'p1' }, error: null },
    );

    const result = await approveFieldSubmissionAtomic(
      {
        id: 'sub-1',
        building_id: 'b1',
        panorama_360_url: 'https://cdn.example/sub.jpg',
        floor_level: 'G',
        hotspots_json: [],
      },
      { client, buildings: [], locations: [], currentLang: 'ms' },
    );

    expect(rpcCalls).toEqual([{ fn: 'approve_imaps_field_submission', args: { p_submission_id: 'sub-1' } }]);
    expect(result).toEqual({ usedAtomicRpc: true, roomsSynced: 3, hotspotsInserted: 4 });
  });
});
