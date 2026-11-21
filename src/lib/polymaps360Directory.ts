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
