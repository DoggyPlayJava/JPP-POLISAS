import type {
  CampusBuilding,
  CampusLocation,
  CampusPanorama,
  CampusRoomMapping,
  CampusSearchResult,
  EffectivePanorama360,
} from '../types';

const FACILITY_KEYWORDS: Record<string, string[]> = {
  cafe: ['kafe', 'cafe', 'kantin', 'makan'],
  kafe: ['kafe', 'cafe', 'kantin', 'makan'],
  surau: ['surau', 'masjid', 'solat'],
  toilet: ['tandas', 'toilet', 'washroom'],
  tandas: ['tandas', 'toilet', 'washroom'],
};

function hasValidUrl(url?: string | null): url is string {
  return typeof url === 'string' && url.trim().length > 0;
}

/**
 * Pure local campus search returning a discriminated union of real buildings and
 * real locations (eliminates synthetic `b-<uuid>` objects).
 * Also checks `imaps_room_mappings` patterns so timetable codes match in PolyMaps search.
 */
export function searchCampusLocally<
  B extends CampusBuilding,
  L extends CampusLocation & { building?: B | null },
>(
  query: string,
  buildings: B[],
  locations: L[],
  roomMappings: CampusRoomMapping[] = [],
  limit = 20,
): CampusSearchResult<B, L>[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: Array<{ score: number; isBuilding: boolean; label: string; result: CampusSearchResult<B, L> }> = [];
  const seenLocationIds = new Set<string>();

  for (const building of buildings) {
    const code = (building.code || '').toLowerCase();
    const name = (building.name || '').toLowerCase();
    const zone = (building.zone_name || '').toLowerCase();
    const facility = (building.facility_type || '').toLowerCase();
    const combined = `${code} ${name} ${zone} ${facility}`;

    if (!tokens.every((tok) => combined.includes(tok))) continue;

    let score = 40;
    if (code === q || name === q) score = 100;
    else if (code.startsWith(q) || name.startsWith(q)) score = 82;
    else if (code.includes(q) || name.includes(q)) score = 62;

    scored.push({
      score,
      isBuilding: true,
      label: building.name || building.code || '',
      result: { kind: 'building', building },
    });
  }

  // Match room mappings first so timetable aliases surface at high priority
  if (roomMappings.length > 0) {
    const trimmedRaw = query.trim();
    for (const mapping of roomMappings) {
      if (!mapping.location_id || mapping.is_online || !mapping.room_code_pattern) continue;
      let matched = mapping.room_code_pattern.toLowerCase().trim() === q;
      if (!matched) {
        try {
          matched = new RegExp(mapping.room_code_pattern, 'i').test(trimmedRaw);
        } catch {
          matched = false;
        }
      }
      if (!matched) continue;
      const loc = locations.find((item) => item.id === mapping.location_id);
      if (!loc || seenLocationIds.has(loc.id)) continue;
      seenLocationIds.add(loc.id);
      scored.push({
        score: 92,
        isBuilding: false,
        label: loc.room_code || '',
        result: { kind: 'location', location: loc },
      });
    }
  }

  for (const loc of locations) {
    if (!loc.id || seenLocationIds.has(loc.id)) continue;
    const room = (loc.room_code || '').toLowerCase();
    const tags = (loc.search_tags || '').toLowerCase();
    const dir = (loc.direction_text || '').toLowerCase();
    const bCode = (loc.building?.code || '').toLowerCase();
    const bName = (loc.building?.name || '').toLowerCase();
    const combined = `${room} ${tags} ${dir} ${bCode} ${bName}`;

    if (!tokens.every((tok) => combined.includes(tok))) continue;

    seenLocationIds.add(loc.id);
    let score = 35;
    if (room === q) score = 100;
    else if (room.startsWith(q)) score = 84;
    else if (room.includes(q)) score = 66;
    else if (tags.includes(q)) score = 52;

    scored.push({
      score,
      isBuilding: false,
      label: loc.room_code || '',
      result: { kind: 'location', location: loc },
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.isBuilding !== b.isBuilding) return a.isBuilding ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return scored.slice(0, Math.max(1, limit)).map((entry) => entry.result);
}

/**
 * Facility quick-filter (Kafe / Surau / Tandas) returning discriminated union
 * items with separate `etaMinutes` — NEVER mutating `location.floor_level` (Fixes Bug #10).
 */
export function filterCampusFacilities<
  B extends CampusBuilding,
  L extends CampusLocation & { building?: B | null },
>(
  activeFilter: string,
  buildings: B[],
  locations: L[],
  computeEta?: (lat: number, lng: number) => number | null,
): CampusSearchResult<B, L>[] {
  const filter = activeFilter.trim().toLowerCase();
  if (!filter) return [];

  const matchedBuildings = buildings.filter((b) => {
    if (!b.is_facility) return false;
    const bType = b.facility_type?.toLowerCase() || '';
    return (
      bType === filter ||
      (filter === 'cafe' && bType === 'kafe') ||
      (filter === 'kafe' && bType === 'cafe') ||
      (filter === 'surau' && bType.includes('surau')) ||
      (filter === 'toilet' && bType === 'tandas') ||
      (filter === 'tandas' && bType === 'toilet')
    );
  });

  const buildingResults: CampusSearchResult<B, L>[] = matchedBuildings.map((building) => {
    const etaMinutes =
      computeEta && typeof building.center_lat === 'number' && typeof building.center_lng === 'number'
        ? computeEta(building.center_lat, building.center_lng)
        : null;
    return { kind: 'building', building, etaMinutes };
  });

  const targetKeywords = FACILITY_KEYWORDS[filter] || [filter];
  const matchedLocations = locations.filter((loc) => {
    const haystack = `${loc.room_code} ${loc.search_tags || ''}`.toLowerCase();
    return targetKeywords.some((keyword) => haystack.includes(keyword));
  });

  const locationResults: CampusSearchResult<B, L>[] = matchedLocations.map((location) => {
    const etaMinutes =
      computeEta &&
      typeof location.building?.center_lat === 'number' &&
      typeof location.building?.center_lng === 'number'
        ? computeEta(location.building.center_lat, location.building.center_lng)
        : null;
    return { kind: 'location', location, etaMinutes };
  });

  const combined = [...buildingResults, ...locationResults];
  if (computeEta) {
    combined.sort((a, b) => (a.etaMinutes ?? 999) - (b.etaMinutes ?? 999));
  }
  return combined;
}

/**
 * Single read-only selector for resolving the effective active 360° panorama for
 * a room or building.
 *
 * Fixes Bug #5: when a student selects a room that has no dedicated active 360°,
 * it cleanly falls back to the parent building's active 360° panorama.
 * Never returns disabled/draft panoramas and never resurrects deleted URLs.
 */
export function resolveEffectiveLocation360(
  location: CampusLocation | null | undefined,
  building: CampusBuilding | null | undefined,
  panoramas: CampusPanorama[] = [],
): EffectivePanorama360 | null {
  const effectiveBuilding = building ?? location?.building ?? null;

  // 1. Check dedicated location-level published panorama in imaps_panoramas
  if (location?.id && panoramas.length > 0) {
    const roomPano = panoramas.find(
      (p) => p.location_id === location.id && p.status === 'published' && hasValidUrl(p.image_url),
    );
    if (roomPano) {
      return {
        imageUrl: roomPano.image_url.trim(),
        panoramaId: roomPano.id,
        source: 'location',
        haov: roomPano.haov,
        vaov: roomPano.vaov,
      };
    }
  }

  // 2. Legacy room-level active 360°
  if (location && location.is_360_enabled === true && hasValidUrl(location.panorama_360_url)) {
    return {
      imageUrl: location.panorama_360_url.trim(),
      panoramaId: null,
      source: 'location',
    };
  }

  // 3. Fallback to building-level published panorama in imaps_panoramas (primary preferred)
  if (effectiveBuilding?.id && panoramas.length > 0) {
    const buildingPanos = panoramas
      .filter(
        (p) =>
          p.building_id === effectiveBuilding.id &&
          !p.location_id &&
          p.status === 'published' &&
          hasValidUrl(p.image_url),
      )
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.floor_order - b.floor_order);

    if (buildingPanos.length > 0) {
      const top = buildingPanos[0];
      return {
        imageUrl: top.image_url.trim(),
        panoramaId: top.id,
        source: 'building',
        haov: top.haov,
        vaov: top.vaov,
      };
    }
  }

  // 4. Legacy building-level active 360°
  if (
    effectiveBuilding &&
    effectiveBuilding.is_360_enabled === true &&
    hasValidUrl(effectiveBuilding.panorama_360_url)
  ) {
    return {
      imageUrl: effectiveBuilding.panorama_360_url.trim(),
      panoramaId: null,
      source: 'building',
    };
  }

  return null;
}

export interface Admin360CoverageSummary {
  activeBuildings: number;
  availableBuildings: number;
  totalBuildings: number;
  activeLocations: number;
  availableLocations: number;
  totalLocations: number;
}

/**
 * Computes accurate Admin 360° coverage (Fixes Bug #4):
 * separates genuinely active/published scenes from draft/disabled URLs,
 * and never counts inherited parent building URLs as room coverage.
 */
export function computeAdmin360Coverage(
  buildings: CampusBuilding[],
  locations: CampusLocation[],
  panoramas: CampusPanorama[] = [],
): Admin360CoverageSummary {
  let activeBuildings = 0;
  let availableBuildings = 0;

  for (const b of buildings) {
    const bPanos = panoramas.filter((p) => p.building_id === b.id && !p.location_id && hasValidUrl(p.image_url));
    const hasPublishedPano = bPanos.some((p) => p.status === 'published');
    const hasAnyPano = bPanos.some((p) => p.status !== 'archived');

    const isActive = hasPublishedPano || (b.is_360_enabled === true && hasValidUrl(b.panorama_360_url));
    const isAvailable = !isActive && (hasAnyPano || hasValidUrl(b.panorama_360_url));

    if (isActive) activeBuildings += 1;
    else if (isAvailable) availableBuildings += 1;
  }

  let activeLocations = 0;
  let availableLocations = 0;

  for (const l of locations) {
    const lPanos = panoramas.filter((p) => p.location_id === l.id && hasValidUrl(p.image_url));
    const hasPublishedPano = lPanos.some((p) => p.status === 'published');
    const hasAnyPano = lPanos.some((p) => p.status !== 'archived');

    const isActive = hasPublishedPano || (l.is_360_enabled === true && hasValidUrl(l.panorama_360_url));
    const isAvailable = !isActive && (hasAnyPano || hasValidUrl(l.panorama_360_url));

    if (isActive) activeLocations += 1;
    else if (isAvailable) availableLocations += 1;
  }

  return {
    activeBuildings,
    availableBuildings,
    totalBuildings: buildings.length,
    activeLocations,
    availableLocations,
    totalLocations: locations.length,
  };
}
