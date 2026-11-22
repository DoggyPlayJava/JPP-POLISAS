export type DirectoryStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'disabled' | 'unused';

export interface DirectoryEntry {
  id: string;
  status: DirectoryStatus;
  panoramaUrl: string;
  buildingId?: string | null;
  source: 'building' | 'location' | 'submission' | 'storage' | 'disabled';
  pinCount: number;
  createdAt?: string | null;
  label?: string | null;
}

type Row = Record<string, any>;

export function normalizeStorageObjectPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = '/object/public/imaps_assets/';
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export function buildPolyMaps360Directory(
  buildings: Row[],
  locations: Row[],
  submissions: Row[],
  hotspots: Row[],
  storageObjects: Row[],
  disabledBackup: Row[],
): DirectoryEntry[] {
  const refs = new Set<string>();
  const entries: DirectoryEntry[] = [];
  const addRef = (url?: string | null) => {
    if (!url) return;
    const path = normalizeStorageObjectPath(url);
    if (path) refs.add(path);
  };
  const pinCount = (url: string) => hotspots.filter((hotspot) =>
    normalizeStorageObjectPath(hotspot.panorama_url || '') === normalizeStorageObjectPath(url),
  ).length;

  for (const row of buildings) {
    if (!row.panorama_360_url) continue;
    addRef(row.panorama_360_url);
    entries.push({ id: `building:${row.id}`, source: 'building', status: row.is_360_enabled ? 'active' : 'disabled', panoramaUrl: row.panorama_360_url, buildingId: row.id, pinCount: pinCount(row.panorama_360_url), createdAt: row.created_at, label: row.name || row.code });
  }
  for (const row of locations) {
    if (!row.panorama_360_url) continue;
    addRef(row.panorama_360_url);
    entries.push({ id: `location:${row.id}`, source: 'location', status: row.is_360_enabled ? 'active' : 'disabled', panoramaUrl: row.panorama_360_url, buildingId: row.building_id, pinCount: pinCount(row.panorama_360_url), createdAt: row.created_at, label: row.room_code });
  }
  for (const row of submissions) {
    if (!row.panorama_360_url) continue;
    addRef(row.panorama_360_url);
    entries.push({ id: `submission:${row.id}`, source: 'submission', status: row.status, panoramaUrl: row.panorama_360_url, buildingId: row.building_id, pinCount: Array.isArray(row.hotspots_json) ? row.hotspots_json.length : Array.isArray(row.hotspots_payload) ? row.hotspots_payload.length : 0, createdAt: row.created_at, label: row.contributor_name });
  }
  for (const row of disabledBackup) {
    if (!row.panorama_360_url) continue;
    addRef(row.panorama_360_url);
    entries.push({ id: `disabled:${row.table_name}:${row.row_id}`, source: 'disabled', status: 'disabled', panoramaUrl: row.panorama_360_url, buildingId: row.table_name === 'imaps_buildings' ? row.row_id : row.building_id, pinCount: pinCount(row.panorama_360_url), createdAt: row.backed_up_at, label: row.name || row.code || row.room_code });
  }
  for (const row of hotspots) addRef(row.panorama_url);

  for (const object of storageObjects) {
    const path = object.name || object.path;
    if (!path || refs.has(path)) continue;
    entries.push({ id: `storage:${path}`, source: 'storage', status: 'unused', panoramaUrl: object.publicUrl || object.public_url || '', pinCount: 0, createdAt: object.created_at, label: path });
  }

  return entries;
}

export function filterPolyMaps360Directory<T extends DirectoryEntry>(entries: T[], status: DirectoryStatus | 'all', query: string): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => (status === 'all' || entry.status === status)
    && (!needle || `${entry.label || ''} ${entry.buildingId || ''} ${entry.source}`.toLocaleLowerCase().includes(needle)));
}

export function normalizePendingPins<T extends Record<string, any>>(pins: T[]): T[] {
  return pins.map((pin) => ({
    ...pin,
    label: typeof pin.label === 'string' ? pin.label.trim() : pin.label,
    ...(typeof pin.room_code === 'string' ? { room_code: pin.room_code.trim().toUpperCase() } : {}),
  }));
}

export function canMarkSubmissionApproved(errors: Array<unknown | null | undefined>): boolean {
  return errors.every((error) => !error);
}

export function canApplyPanoramaToBuilding(entry: { source: string; status: string }): boolean {
  return entry.source !== 'disabled' && entry.status !== 'disabled' && entry.status !== 'pending';
}


export interface PanoramaRoomUsage {
  locationId: string;
  buildingId: string;
  building: string;
  floor: string;
  roomCode: string;
  pins: Array<{ id: string; label: string; yaw: number | null; pitch: number | null }>;
}

export function getPanoramaUsage(locations: Row[], hotspots: Row[], buildings: Row[], panoramaUrl: string): PanoramaRoomUsage[] {
  const matching = (url: string | null | undefined) => !!url && (normalizeStorageObjectPath(url) || url.split('#')[0]) === (normalizeStorageObjectPath(panoramaUrl) || panoramaUrl.split('#')[0]);
  return locations.filter((location) => matching(location.panorama_360_url)).map((location) => {
    const building = buildings.find((item) => item.id === location.building_id);
    return {
      locationId: location.id,
      buildingId: location.building_id,
      building: building ? `${building.code} · ${building.name}` : 'Bangunan tidak diketahui',
      floor: String(location.floor_level ?? '1'),
      roomCode: location.room_code || 'Tanpa kod bilik',
      pins: hotspots.filter((pin) => matching(pin.panorama_url) && pin.location_id === location.id).map((pin) => ({ id: pin.id, label: pin.label || pin.room_code || pin.pin_type || 'Pin', yaw: pin.yaw ?? null, pitch: pin.pitch ?? null })),
    };
  });
}

export function findRoomPanoramaConflicts(locations: Row[], target: { buildingId: string; floor: string | number; roomCode: string; panoramaUrl: string; locationId?: string }): Row[] {
  const normalizeUrl = (url: string | null | undefined) => normalizeStorageObjectPath(url || '') || (url || '').split('#')[0];
  const key = (value: unknown) => { const text = String(value ?? '').trim().toLocaleLowerCase(); const number = Number(text); return text && Number.isFinite(number) ? String(number) : text; };
  return locations.filter((location) => location.id !== target.locationId
    && location.building_id === target.buildingId
    && key(location.floor_level) === key(target.floor)
    && key(location.room_code) === key(target.roomCode)
    && normalizeUrl(location.panorama_360_url) !== normalizeUrl(target.panoramaUrl));
}


export function buildSubmissionEditPlan(status: 'pending' | 'approved' | 'rejected', selectedLocationId: string | null): { updateSubmission: boolean; targetLocationId: string | null; updateStatus: false } {
  return { updateSubmission: status !== 'approved', targetLocationId: selectedLocationId, updateStatus: false };
}


export function filter360Submissions<T extends Row>(rows: T[], filters: { status: string; buildingId: string; query: string }): T[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return rows.filter((row) => (filters.status === 'all' || row.status === filters.status)
    && (filters.buildingId === 'all' || row.building_id === filters.buildingId)
    && (!query || `${row.contributor_name || ''} ${row.notes || ''} ${row.room_code_hint || ''} ${row.corridor_label || ''}`.toLocaleLowerCase().includes(query)));
}

export function filterLocationsForSelection<T extends Row>(locations: T[], buildingId: string, floor: string | number): T[] {
  const floorKey = (value: unknown) => { const text = String(value ?? '').trim(); const n = Number(text); return text && Number.isFinite(n) ? String(n) : text.toLocaleLowerCase(); };
  return locations.filter((location) => location.building_id === buildingId && floorKey(location.floor_level ?? 1) === floorKey(floor));
}


export function getHotspotsForLocation<T extends Row>(hotspots: T[], location: Row): T[] {
  const key = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();
  const floorKey = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? String(n) : key(value); };
  return hotspots.filter((pin) => pin.location_id === location.id || (!pin.location_id
    && pin.building_id === location.building_id
    && floorKey(pin.floor_level ?? 1) === floorKey(location.floor_level ?? 1)
    && key(pin.room_code) === key(location.room_code)
    && (!location.panorama_360_url || (normalizeStorageObjectPath(pin.panorama_url || '') || pin.panorama_url) === (normalizeStorageObjectPath(location.panorama_360_url) || location.panorama_360_url))));
}
