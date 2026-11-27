import { supabase } from '@/lib/supabase';
import { CACHE_TTL, queryCache } from '@/lib/cache';
import { canMarkSubmissionApproved } from '@/lib/polymaps360Directory';
import { inferRoomMetadata, type PolyMaps360HotspotDraft } from '@/lib/polyMapsSmartEntry';
import {
  parsePanoramaSweepFromUrl,
  parsePanoramaVerticalSweepFromUrl,
} from '@/lib/panoStitcher';
import { parseFloorLevel, toDbFloorFields } from '../domain/floorLevel';
import type {
  CampusBuilding,
  CampusHotspot,
  CampusLocation,
  CampusMapBundle,
  CampusPanorama,
  CampusRoomMapping,
  CampusWalkway,
  CampusWalkwaySegment,
} from '../types';

export const POLYMAPS_BUNDLE_CACHE_KEY = 'polymaps:campus_bundle:v2';

// Module-level schema capability flags for zero-downtime pre-migration safety.
// Always snapshotted BEFORE launching async fetches to avoid React StrictMode races.
let supportsImapsPanoramas = true;
let supportsCanonicalFloorColumns = true;
let supportsAtomicApprovalRpc = true;

export function resetPolyMapsSchemaCapabilities(): void {
  supportsImapsPanoramas = true;
  supportsCanonicalFloorColumns = true;
  supportsAtomicApprovalRpc = true;
}

export function invalidatePolyMapsCache(): void {
  queryCache.invalidate('polymaps:');
}

function isMissingRelationError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const status = Number(error.status || 0);
  const message = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    status === 404 ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('column') && (message.includes('does not exist') || message.includes('schema cache'))
  );
}

function isMissingRpcError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const status = Number(error.status || 0);
  const message = String(error.message || '').toLowerCase();
  return (
    code === '42883' ||
    code === 'PGRST202' ||
    status === 404 ||
    message.includes('could not find the function') ||
    message.includes('does not exist')
  );
}

function synthesizeLegacyPanoramas(
  buildings: CampusBuilding[],
  locations: CampusLocation[],
): CampusPanorama[] {
  const panoramas: CampusPanorama[] = [];

  for (const b of buildings) {
    const url = b.panorama_360_url?.trim();
    if (!url || url.startsWith('data:')) continue;
    panoramas.push({
      id: `legacy-building:${b.id}`,
      building_id: b.id,
      location_id: null,
      floor_label: '1',
      floor_order: 1,
      title: b.name,
      image_url: url,
      haov: parsePanoramaSweepFromUrl(url) ?? 360,
      vaov: parsePanoramaVerticalSweepFromUrl(url) ?? 180,
      status: b.is_360_enabled === true ? 'published' : 'draft',
      is_primary: true,
    });
  }

  for (const l of locations) {
    const url = l.panorama_360_url?.trim();
    if (!url || url.startsWith('data:') || !l.building_id) continue;
    const floor = parseFloorLevel(l.floor_label ?? l.floor_level);
    panoramas.push({
      id: `legacy-location:${l.id}`,
      building_id: l.building_id,
      location_id: l.id,
      floor_label: floor.floor_label,
      floor_order: floor.floor_order,
      title: l.room_code,
      image_url: url,
      haov: parsePanoramaSweepFromUrl(url) ?? 360,
      vaov: parsePanoramaVerticalSweepFromUrl(url) ?? 180,
      status: l.is_360_enabled === true ? 'published' : 'draft',
      is_primary: false,
    });
  }

  return panoramas;
}

function normalizeLocations(rawLocations: any[]): CampusLocation[] {
  return (rawLocations || []).map((item: any) => {
    const building = Array.isArray(item.building) ? item.building[0] : item.building;
    const floor = parseFloorLevel(item.floor_label ?? item.floor_level);
    return {
      ...item,
      floor_level: floor.floor_level,
      floor_label: item.floor_label || floor.floor_label,
      floor_order: item.floor_order ?? floor.floor_order,
      // Keep room's OWN panorama_360_url strictly intact (never inject building URL)
      panorama_360_url: item.panorama_360_url?.trim() || null,
      building: building
        ? {
            ...building,
            panorama_360_url: building.panorama_360_url?.trim() || null,
          }
        : building,
    };
  });
}

function normalizeBuildings(rawBuildings: any[]): CampusBuilding[] {
  return (rawBuildings || []).map((b: any) => ({
    ...b,
    panorama_360_url: b.panorama_360_url?.trim() || null,
  }));
}

function normalizeWalkways(rawWalkways: any[]): CampusWalkway[] {
  return (rawWalkways || []).map((w: any) => {
    let coordinates: [number, number][] = [];
    if (Array.isArray(w.coordinates)) {
      coordinates = w.coordinates;
    } else if (typeof w.coordinates === 'string') {
      try {
        coordinates = JSON.parse(w.coordinates);
      } catch {
        coordinates = [];
      }
    }
    return {
      id: w.id,
      name: w.name,
      coordinates,
      is_covered: Boolean(w.is_covered),
      is_blocked: Boolean(w.is_blocked),
    };
  });
}

function groupHotspotsByPanorama(rawHotspots: any[]): Record<string, CampusHotspot[]> {
  const grouped: Record<string, CampusHotspot[]> = {};
  for (const hs of rawHotspots || []) {
    if (!hs?.panorama_url) continue;
    if (!grouped[hs.panorama_url]) grouped[hs.panorama_url] = [];
    grouped[hs.panorama_url].push(hs);
  }
  return grouped;
}

/**
 * Single typed fetcher for the PolyMaps campus map bundle.
 *
 * Improvements over legacy inline fetches:
 *  1. Caches `segments`, `panoramas`, and `roomMappings` alongside buildings/locations/walkways.
 *  2. Removes unused `ems_events` query from `/polymaps`.
 *  3. Gracefully falls back to legacy columns if `imaps_panoramas` hasn't been migrated yet.
 *  4. Never mutates `location.panorama_360_url` with parent building URL.
 */
export async function fetchCampusMapBundle(options?: {
  forceRefresh?: boolean;
  client?: any;
}): Promise<CampusMapBundle> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const client = options?.client ?? supabase;

  if (!forceRefresh) {
    const cached = queryCache.get<CampusMapBundle>(POLYMAPS_BUNDLE_CACHE_KEY);
    if (cached) return cached;
  }

  // Snapshot flags before launching parallel queries (avoids StrictMode races)
  const wantPanoramas = supportsImapsPanoramas;
  const wantFloorColumns = supportsCanonicalFloorColumns;

  const locationSelect = wantFloorColumns
    ? 'id, building_id, room_code, floor_level, floor_label, floor_order, direction_text, search_tags, image_url, panorama_360_url, is_360_enabled, target_yaw, target_pitch, op_start, op_end, building:building_id(id, name, code, center_lat, center_lng, zone_name, is_facility, facility_type, op_start, op_end, floorplan_image_url, entrance_image_url, drone_image_url, panorama_360_url, is_360_enabled)'
    : 'id, building_id, room_code, floor_level, direction_text, search_tags, image_url, panorama_360_url, is_360_enabled, target_yaw, target_pitch, op_start, op_end, building:building_id(id, name, code, center_lat, center_lng, zone_name, is_facility, facility_type, op_start, op_end, floorplan_image_url, entrance_image_url, drone_image_url, panorama_360_url, is_360_enabled)';

  const hotspotSelect = wantPanoramas
    ? 'id, panorama_id, building_id, location_id, panorama_url, pin_type, label, room_code, floor_level, pitch, yaw, description, target_panorama_url, target_location_id'
    : 'id, building_id, location_id, panorama_url, pin_type, label, room_code, floor_level, pitch, yaw, description, target_panorama_url, target_location_id';

  const [bRes, initialLRes, wRes, segRes, initialHsRes, rmRes, panoRes] = await Promise.all([
    client
      .from('imaps_buildings')
      .select(
        'id, name, code, center_lat, center_lng, zone_name, is_facility, facility_type, op_start, op_end, floorplan_image_url, entrance_image_url, drone_image_url, panorama_360_url, is_360_enabled',
      )
      .order('name'),
    client.from('imaps_locations').select(locationSelect).order('floor_level'),
    client
      .from('imaps_walkways')
      .select('id, name, coordinates, is_covered, is_blocked, created_at')
      .order('created_at', { ascending: false }),
    client
      .from('imaps_walkway_segments')
      .select('id, walkway_id, start_idx, end_idx, is_blocked, is_covered, reason')
      .order('created_at', { ascending: false }),
    client.from('imaps_360_hotspots').select(hotspotSelect).order('created_at', { ascending: true }),
    client
      .from('imaps_room_mappings')
      .select('id, room_code_pattern, location_id, is_online, notes')
      .order('room_code_pattern'),
    wantPanoramas
      ? client
          .from('imaps_panoramas')
          .select(
            'id, building_id, location_id, floor_label, floor_order, title, image_url, haov, vaov, status, is_primary, created_by, created_at, updated_at',
          )
          .order('floor_order', { ascending: true })
      : Promise.resolve({ data: null, error: { code: '42P01', message: 'disabled' } }),
  ]);

  let lRes = initialLRes;
  if (wantFloorColumns && isMissingColumnError(lRes?.error)) {
    supportsCanonicalFloorColumns = false;
    lRes = await client
      .from('imaps_locations')
      .select(
        'id, building_id, room_code, floor_level, direction_text, search_tags, image_url, panorama_360_url, is_360_enabled, target_yaw, target_pitch, op_start, op_end, building:building_id(id, name, code, center_lat, center_lng, zone_name, is_facility, facility_type, op_start, op_end, floorplan_image_url, entrance_image_url, drone_image_url, panorama_360_url, is_360_enabled)',
      )
      .order('floor_level');
  }

  let hsRes = initialHsRes;
  if (wantPanoramas && isMissingColumnError(hsRes?.error)) {
    hsRes = await client
      .from('imaps_360_hotspots')
      .select(
        'id, building_id, location_id, panorama_url, pin_type, label, room_code, floor_level, pitch, yaw, description, target_panorama_url, target_location_id',
      )
      .order('created_at', { ascending: true });
  }

  const buildings = normalizeBuildings(bRes?.data || []);
  const locations = normalizeLocations(lRes?.data || []);
  const walkways = normalizeWalkways(wRes?.data || []);
  const segments: CampusWalkwaySegment[] = !segRes?.error && Array.isArray(segRes?.data) ? segRes.data : [];
  const roomMappings: CampusRoomMapping[] = !rmRes?.error && Array.isArray(rmRes?.data) ? rmRes.data : [];
  const hotspotsByPanorama = !hsRes?.error ? groupHotspotsByPanorama(hsRes?.data || []) : {};

  let schemaMode: 'panoramas_v2' | 'legacy_fallback' = 'panoramas_v2';
  let panoramas: CampusPanorama[] = [];

  if (!wantPanoramas || isMissingRelationError(panoRes?.error)) {
    supportsImapsPanoramas = false;
    schemaMode = 'legacy_fallback';
    panoramas = synthesizeLegacyPanoramas(buildings, locations);
  } else if (!panoRes?.error && Array.isArray(panoRes?.data)) {
    panoramas = panoRes.data;
  } else {
    schemaMode = 'legacy_fallback';
    panoramas = synthesizeLegacyPanoramas(buildings, locations);
  }

  const bundle: CampusMapBundle = {
    buildings,
    locations,
    panoramas,
    walkways,
    segments,
    roomMappings,
    hotspotsByPanorama,
    schemaMode,
  };

  if (!bRes?.error && !lRes?.error && !wRes?.error) {
    queryCache.set(POLYMAPS_BUNDLE_CACHE_KEY, bundle, CACHE_TTL.ANNOUNCEMENT);
  }

  return bundle;
}

/**
 * Rehydrates currently open building/location sheet state by ID after any save/refresh
 * so edits appear immediately without stale React snapshots.
 */
export function rehydrateSelectionById(
  bundle: CampusMapBundle,
  activeBuildingId: string | null | undefined,
  selectedLocationId: string | null | undefined,
): { activeBuilding: CampusBuilding | null; selectedLocation: CampusLocation | null } {
  const selectedLocation = selectedLocationId
    ? bundle.locations.find((loc) => loc.id === selectedLocationId) ?? null
    : null;

  const targetBuildingId = activeBuildingId ?? selectedLocation?.building_id ?? selectedLocation?.building?.id ?? null;
  const activeBuilding = targetBuildingId
    ? bundle.buildings.find((b) => b.id === targetBuildingId) ?? selectedLocation?.building ?? null
    : null;

  return { activeBuilding, selectedLocation };
}

/**
 * Inserts locations with canonical floor_level INTEGER + floor_label + floor_order,
 * degrading cleanly to floor_level INTEGER if pre-migration DB lacks floor_label/floor_order.
 */
export async function insertLocationsWithFloorFallback(
  rows: Array<Record<string, any>>,
  client: any = supabase,
): Promise<{ data: any[] | null; error: any }> {
  const wantFloorColumns = supportsCanonicalFloorColumns;

  const formatRows = (includeExtendedFloor: boolean) =>
    rows.map((row) => {
      const floor = toDbFloorFields(row.floor_label ?? row.floor_level);
      const base = {
        ...row,
        floor_level: floor.floor_level,
      };
      if (includeExtendedFloor) {
        return {
          ...base,
          floor_label: floor.floor_label,
          floor_order: floor.floor_order,
        };
      }
      const { floor_label: _fl, floor_order: _fo, ...legacyRow } = base;
      return legacyRow;
    });

  const first = await client.from('imaps_locations').insert(formatRows(wantFloorColumns)).select('id, room_code');
  if (wantFloorColumns && isMissingColumnError(first?.error)) {
    supportsCanonicalFloorColumns = false;
    return await client.from('imaps_locations').insert(formatRows(false)).select('id, room_code');
  }
  return first;
}

/**
 * Updates a location with canonical floor fields, degrading cleanly pre-migration.
 */
export async function updateLocationWithFloorFallback(
  locationId: string,
  patch: Record<string, any>,
  client: any = supabase,
): Promise<{ error: any }> {
  const wantFloorColumns = supportsCanonicalFloorColumns;
  const hasFloorInput = patch.floor_label !== undefined || patch.floor_level !== undefined;

  const buildPayload = (includeExtendedFloor: boolean) => {
    if (!hasFloorInput) return { ...patch };
    const floor = toDbFloorFields(patch.floor_label ?? patch.floor_level);
    const next: Record<string, any> = {
      ...patch,
      floor_level: floor.floor_level,
    };
    if (includeExtendedFloor) {
      next.floor_label = floor.floor_label;
      next.floor_order = floor.floor_order;
    } else {
      delete next.floor_label;
      delete next.floor_order;
    }
    return next;
  };

  const first = await client.from('imaps_locations').update(buildPayload(wantFloorColumns)).eq('id', locationId);
  if (wantFloorColumns && isMissingColumnError(first?.error)) {
    supportsCanonicalFloorColumns = false;
    return await client.from('imaps_locations').update(buildPayload(false)).eq('id', locationId);
  }
  return first;
}

/**
 * Inserts a missing-location report with canonical integer + label floor fields.
 */
export async function insertMissingReportWithFloorFallback(
  payload: Record<string, any>,
  client: any = supabase,
): Promise<{ error: any }> {
  const wantFloorColumns = supportsCanonicalFloorColumns;
  const floor = toDbFloorFields(payload.floor_label ?? payload.floor_level, {
    floor_level: 0,
    floor_label: 'G',
    floor_order: 0,
  });

  const fullPayload = {
    ...payload,
    floor_level: floor.floor_level,
    ...(wantFloorColumns ? { floor_label: floor.floor_label, floor_order: floor.floor_order } : {}),
  };

  const first = await client.from('imaps_missing_reports').insert(fullPayload);
  if (wantFloorColumns && isMissingColumnError(first?.error)) {
    supportsCanonicalFloorColumns = false;
    const { floor_label: _fl, floor_order: _fo, ...legacyPayload } = fullPayload;
    return await client.from('imaps_missing_reports').insert(legacyPayload);
  }
  return first;
}

export interface UpsertPanoramaInput {
  buildingId: string;
  locationId?: string | null;
  floorLevel?: string | number | null;
  title?: string | null;
  imageUrl: string;
  status?: 'draft' | 'published' | 'archived';
  isPrimary?: boolean;
  createdBy?: string | null;
}

/**
 * Syncs a scene into `imaps_panoramas` when Phase 1 SQL is deployed; safely skips
 * on pre-migration databases (`42P01`/`PGRST205`).
 */
export async function upsertPanoramaRecord(
  input: UpsertPanoramaInput,
  client: any = supabase,
): Promise<{ panoramaId: string | null; skippedLegacy: boolean }> {
  if (!supportsImapsPanoramas || !input.imageUrl.trim() || input.imageUrl.trim().startsWith('data:')) {
    return { panoramaId: null, skippedLegacy: true };
  }

  const floor = parseFloorLevel(input.floorLevel);
  const imageUrl = input.imageUrl.trim();
  const baseUrl = imageUrl.split('#')[0];
  const haov = parsePanoramaSweepFromUrl(imageUrl) ?? 360;
  const vaov = parsePanoramaVerticalSweepFromUrl(imageUrl) ?? 180;

  const existingQuery = client
    .from('imaps_panoramas')
    .select('id, image_url')
    .eq('building_id', input.buildingId);

  const existingRes = input.locationId
    ? await existingQuery.eq('location_id', input.locationId)
    : await existingQuery.is('location_id', null);

  if (isMissingRelationError(existingRes?.error)) {
    supportsImapsPanoramas = false;
    return { panoramaId: null, skippedLegacy: true };
  }

  const match = (existingRes?.data || []).find(
    (row: any) => typeof row.image_url === 'string' && row.image_url.split('#')[0] === baseUrl,
  );

  if (match?.id) {
    await client
      .from('imaps_panoramas')
      .update({
        image_url: imageUrl,
        floor_label: floor.floor_label,
        floor_order: floor.floor_order,
        title: input.title ?? undefined,
        haov,
        vaov,
        status: input.status ?? 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id);
    return { panoramaId: match.id, skippedLegacy: false };
  }

  const insertRes = await client
    .from('imaps_panoramas')
    .insert({
      building_id: input.buildingId,
      location_id: input.locationId || null,
      floor_label: floor.floor_label,
      floor_order: floor.floor_order,
      title: input.title || null,
      image_url: imageUrl,
      haov,
      vaov,
      status: input.status ?? 'published',
      is_primary: Boolean(input.isPrimary),
      created_by: input.createdBy || null,
    })
    .select('id')
    .single();

  if (isMissingRelationError(insertRes?.error)) {
    supportsImapsPanoramas = false;
    return { panoramaId: null, skippedLegacy: true };
  }

  return { panoramaId: insertRes?.data?.id ?? null, skippedLegacy: false };
}

export interface FieldSubmissionInput {
  id: string;
  building_id?: string | null;
  location_id?: string | null;
  contributor_id?: string | null;
  floor_level?: string | null;
  panorama_360_url: string;
  hotspots_json?: PolyMaps360HotspotDraft[] | null;
  hotspots_payload?: PolyMaps360HotspotDraft[] | null;
}

export interface ApproveSubmissionContext {
  client?: any;
  buildings: Array<{ id: string; code: string; name: string }>;
  locations: Array<{ id: string; building_id?: string | null; room_code: string; floor_level?: number | string | null; direction_text?: string | null }>;
  actorUserId?: string | null;
  currentLang?: 'ms' | 'en';
  notifyTitle?: string;
  notifyMessageBuilder?: (pinCount: number) => string;
}

/**
 * Approves a volunteer 360° field submission atomically via `approve_imaps_field_submission` RPC.
 * Falls back cleanly to a hardened client-side path ONLY when prod DB hasn't run Phase 1 SQL yet.
 */
export async function approveFieldSubmissionAtomic(
  sub: FieldSubmissionInput,
  context: ApproveSubmissionContext,
): Promise<{ usedAtomicRpc: boolean; roomsSynced: number; hotspotsInserted: number }> {
  const client = context.client ?? supabase;
  const wantRpc = supportsAtomicApprovalRpc;

  if (wantRpc) {
    const { data, error } = await client.rpc('approve_imaps_field_submission', {
      p_submission_id: sub.id,
    });

    if (!error) {
      if (data && data.success === false) {
        throw new Error(data.message || 'Gagal meluluskan sumbangan 360°.');
      }
      invalidatePolyMapsCache();
      return {
        usedAtomicRpc: true,
        roomsSynced: Number(data?.rooms_synced ?? 0),
        hotspotsInserted: Number(data?.hotspots_inserted ?? 0),
      };
    }

    if (!isMissingRpcError(error)) {
      throw error;
    }

    supportsAtomicApprovalRpc = false;
  }

  // Hardened pre-migration fallback (uses canonical floorLevel & hotspots_json ?? hotspots_payload)
  const targetBuildingId = sub.building_id || context.buildings[0]?.id;
  if (!targetBuildingId) throw new Error('Bangunan sasaran submission tiada.');
  const matchedBuilding = context.buildings.find((b) => b.id === targetBuildingId);
  if (!matchedBuilding) throw new Error('Bangunan sasaran submission tidak ditemui.');

  const pins =
    Array.isArray(sub.hotspots_json) && sub.hotspots_json.length > 0
      ? sub.hotspots_json
      : Array.isArray(sub.hotspots_payload)
        ? sub.hotspots_payload
        : [];
  const roomPins = pins.filter((pin) => pin.pin_type === 'room' && (pin.room_code || pin.label));
  const roomCodeToLocationId = new Map<string, string>();
  const failures: Array<unknown> = [];

  if (sub.location_id) {
    const { error } = await client
      .from('imaps_locations')
      .update({ panorama_360_url: sub.panorama_360_url, is_360_enabled: true })
      .eq('id', sub.location_id);
    failures.push(error);
  } else {
    const { error } = await client
      .from('imaps_buildings')
      .update({ panorama_360_url: sub.panorama_360_url, is_360_enabled: true })
      .eq('id', targetBuildingId);
    failures.push(error);
  }

  const updatePromises: Array<Promise<{ error: any }>> = [];
  const newLocationsPayload: Array<Record<string, any>> = [];

  for (const pin of roomPins) {
    const codeText = (pin.room_code || pin.label).trim();
    const inferred = inferRoomMetadata(codeText, matchedBuilding.code, pin.yaw, context.currentLang ?? 'ms');
    const canonicalFloor = toDbFloorFields(pin.floor_level ?? sub.floor_level ?? inferred.floor_level);
    const existingLoc = context.locations.find(
      (loc) =>
        loc.building_id === targetBuildingId &&
        loc.room_code.trim().toLowerCase() === codeText.toLowerCase(),
    );

    if (existingLoc) {
      roomCodeToLocationId.set(codeText.toLowerCase(), existingLoc.id);
      updatePromises.push(
        updateLocationWithFloorFallback(
          existingLoc.id,
          {
            panorama_360_url: sub.panorama_360_url,
            is_360_enabled: true,
            target_yaw: pin.yaw,
            target_pitch: pin.pitch,
            floor_level: canonicalFloor.floor_level,
            floor_label: canonicalFloor.floor_label,
            floor_order: canonicalFloor.floor_order,
            direction_text: pin.description || existingLoc.direction_text || inferred.direction_text,
          },
          client,
        ),
      );
    } else {
      newLocationsPayload.push({
        building_id: targetBuildingId,
        room_code: codeText,
        floor_level: canonicalFloor.floor_level,
        floor_label: canonicalFloor.floor_label,
        floor_order: canonicalFloor.floor_order,
        direction_text: pin.description || inferred.direction_text,
        search_tags: inferred.search_tags,
        panorama_360_url: sub.panorama_360_url,
        is_360_enabled: true,
        target_yaw: pin.yaw,
        target_pitch: pin.pitch,
      });
    }
  }

  const [updateResults, insertedRes] = await Promise.all([
    Promise.all(updatePromises),
    newLocationsPayload.length > 0
      ? insertLocationsWithFloorFallback(newLocationsPayload, client)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  updateResults.forEach((res) => failures.push(res.error));
  failures.push(insertedRes.error);

  for (const row of insertedRes.data || []) {
    if (row.id && row.room_code) {
      roomCodeToLocationId.set(row.room_code.trim().toLowerCase(), row.id);
    }
  }

  let hotspotsInserted = 0;
  if (pins.length > 0) {
    const { error: deleteError } = await client
      .from('imaps_360_hotspots')
      .delete()
      .eq('panorama_url', sub.panorama_360_url);
    failures.push(deleteError);
    if (deleteError) throw deleteError;

    const hsPayload = pins.map((pin) => {
      const key = (pin.room_code || pin.label || '').trim().toLowerCase();
      const pinFloor = parseFloorLevel(pin.floor_level ?? sub.floor_level);
      return {
        panorama_url: sub.panorama_360_url,
        building_id: targetBuildingId,
        location_id: roomCodeToLocationId.get(key) || pin.location_id || sub.location_id || null,
        pin_type: pin.pin_type,
        label: pin.label,
        room_code: pin.room_code || null,
        floor_level: pinFloor.floor_label,
        description: pin.description || null,
        pitch: pin.pitch,
        yaw: pin.yaw,
        target_panorama_url: pin.target_panorama_url || null,
        created_by: sub.contributor_id || context.actorUserId || null,
      };
    });

    const { error: hotspotError } = await client.from('imaps_360_hotspots').insert(hsPayload);
    failures.push(hotspotError);
    if (!hotspotError) hotspotsInserted = hsPayload.length;
  }

  if (!canMarkSubmissionApproved(failures)) {
    const failed = failures.find(Boolean);
    throw (failed instanceof Error ? failed : new Error('Gagal menerbitkan panorama atau pin.'));
  }

  const { error: statusError } = await client
    .from('imaps_field_submissions')
    .update({
      status: 'approved',
      reviewed_by: context.actorUserId || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', sub.id)
    .eq('status', 'pending');
  if (statusError) throw statusError;

  if (sub.contributor_id) {
    await client.from('notifications').insert({
      user_id: sub.contributor_id,
      title: context.notifyTitle || '🎥 Sumbangan 360° PolyMaps Diluluskan!',
      message: context.notifyMessageBuilder
        ? context.notifyMessageBuilder(pins.length)
        : `Rakaman 360° dan ${pins.length} pin pintu bilik sumbangan anda telah diterbitkan ke dalam PolyMaps. Terima kasih!`,
      type: 'MAPS_REPORT_APPROVED',
      module: 'AKADEMIK',
      link: '/polymaps',
    });
  }

  invalidatePolyMapsCache();
  return {
    usedAtomicRpc: false,
    roomsSynced: roomPins.length,
    hotspotsInserted,
  };
}

/**
 * Compresses a stitched or phone panorama JPEG client-side so uploads stay under
 * `maxBytes` (default 3.5MB) for Supabase Storage (`imaps_assets`, 5MB bucket limit).
 * Never falls back to Base64 data URIs.
 */
export async function compressPanoramaBlobForUpload(
  blob: Blob,
  options?: { maxBytes?: number; maxWidth?: number },
): Promise<Blob> {
  const maxBytes = options?.maxBytes ?? 3_500_000;
  const maxWidth = options?.maxWidth ?? 4096;

  if (blob.size <= maxBytes && blob.type === 'image/jpeg') {
    return blob;
  }

  const tempUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal memproses imej panorama untuk pemampatan.'));
      el.src = tempUrl;
    });

    const attempts: Array<{ width: number; quality: number }> = [
      { width: Math.min(maxWidth, img.width || maxWidth), quality: 0.85 },
      { width: Math.min(3584, img.width || 3584), quality: 0.8 },
      { width: Math.min(3072, img.width || 3072), quality: 0.76 },
      { width: Math.min(2560, img.width || 2560), quality: 0.72 },
      { width: Math.min(2048, img.width || 2048), quality: 0.68 },
    ];

    let smallestBlob: Blob = blob;

    for (const attempt of attempts) {
      const w = Math.max(1, Math.round(attempt.width));
      const h = Math.max(1, Math.round((img.height / Math.max(1, img.width)) * w));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Kanvas pelayar tidak tersedia untuk pemampatan imej.');
      ctx.drawImage(img, 0, 0, w, h);

      const candidate = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((out) => resolve(out), 'image/jpeg', attempt.quality),
      );

      if (candidate) {
        if (candidate.size < smallestBlob.size) smallestBlob = candidate;
        if (candidate.size <= maxBytes) return candidate;
      }
    }

    if (smallestBlob.size > 5_000_000) {
      throw new Error('Saiz imej panorama terlalu besar walaupun selepas dimampatkan (melebihi had storan 5MB).');
    }
    return smallestBlob;
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}
