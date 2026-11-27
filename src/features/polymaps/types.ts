import type { PolyMaps360HotspotDraft } from '@/lib/polyMapsSmartEntry';

export interface CanonicalFloor {
  /** Legacy PostgreSQL INTEGER column (0 = Ground Floor 'G', -1 = 'B1', 1..n = Level 1..n). */
  floor_level: number;
  /** Canonical human-readable floor label ('G', 'B1', '1', '2', ...). */
  floor_label: string;
  /** Canonical numeric sort order (mirrors floor_level). */
  floor_order: number;
}

export interface CampusBuilding {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  center_lat?: number | null;
  center_lng?: number | null;
  zone_name?: string | null;
  is_facility?: boolean | null;
  facility_type?: string | null;
  op_start?: string | null;
  op_end?: string | null;
  floorplan_image_url?: string | null;
  entrance_image_url?: string | null;
  drone_image_url?: string | null;
  panorama_360_url?: string | null;
  is_360_enabled?: boolean | null;
}

export interface CampusLocation {
  id: string;
  building_id?: string | null;
  room_code: string;
  floor_level: number;
  floor_label?: string | null;
  floor_order?: number | null;
  direction_text?: string | null;
  search_tags?: string | null;
  image_url?: string | null;
  panorama_360_url?: string | null;
  is_360_enabled?: boolean | null;
  target_yaw?: number | null;
  target_pitch?: number | null;
  op_start?: string | null;
  op_end?: string | null;
  building?: CampusBuilding | null;
}

export type PanoramaStatus = 'draft' | 'published' | 'archived';

export interface CampusPanorama {
  id: string;
  building_id: string;
  location_id?: string | null;
  floor_label: string;
  floor_order: number;
  title?: string | null;
  image_url: string;
  haov: number;
  vaov: number;
  status: PanoramaStatus;
  is_primary: boolean;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CampusWalkway {
  id: string;
  name: string;
  coordinates: [number, number][];
  is_covered?: boolean;
  is_blocked?: boolean;
}

export interface CampusWalkwaySegment {
  id: string;
  walkway_id: string;
  start_idx: number;
  end_idx: number;
  is_blocked: boolean;
  is_covered: boolean;
  reason?: string | null;
}

export interface CampusRoomMapping {
  id?: string;
  room_code_pattern: string;
  location_id?: string | null;
  is_online?: boolean | null;
  notes?: string | null;
}

export type CampusHotspot = PolyMaps360HotspotDraft & {
  panorama_id?: string | null;
  target_location_id?: string | null;
};

export interface CampusMapBundle {
  buildings: CampusBuilding[];
  locations: CampusLocation[];
  panoramas: CampusPanorama[];
  walkways: CampusWalkway[];
  segments: CampusWalkwaySegment[];
  roomMappings: CampusRoomMapping[];
  hotspotsByPanorama: Record<string, CampusHotspot[]>;
  schemaMode: 'panoramas_v2' | 'legacy_fallback';
}

export type CampusSearchResult<
  B extends CampusBuilding = CampusBuilding,
  L extends CampusLocation = CampusLocation,
> =
  | {
      kind: 'building';
      building: B;
      etaMinutes?: number | null;
    }
  | {
      kind: 'location';
      location: L;
      etaMinutes?: number | null;
    };

export interface EffectivePanorama360 {
  imageUrl: string;
  panoramaId: string | null;
  source: 'location' | 'building';
  haov?: number;
  vaov?: number;
}
