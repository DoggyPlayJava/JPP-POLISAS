import type { CampusRoomMapping } from '../types';

export interface RoomLocationLike {
  id: string;
  room_code?: string;
  search_tags?: string | null;
  building?: any;
  [key: string]: any;
}

const DEPARTMENT_PREFIX_RE = /^(jke|jkm|jka|jp|jmsk|e|b|m|ka)[\s_-]*/i;

function stripDepartmentPrefix(str: string): string {
  return str.replace(DEPARTMENT_PREFIX_RE, '').trim().toLowerCase();
}

/**
 * Detects online / virtual class room labels used in POLISAS SPMP timetables.
 */
export function isOnlineRoomToken(token: string): boolean {
  if (!token) return false;
  const clean = token.replace(/[\s_/-]+/g, '').toUpperCase();
  return (
    clean.includes('STEAM') ||
    clean.includes('TEAMS') ||
    clean === 'ONLINE' ||
    clean === 'ZOOM' ||
    clean === 'GOOGLEMEET' ||
    clean === 'MEET' ||
    clean === 'DALAMTALIAN'
  );
}

function findMatchingRoomMapping(
  rawRoom: string,
  roomMappings: CampusRoomMapping[],
): CampusRoomMapping | undefined {
  if (!roomMappings || roomMappings.length === 0) return undefined;
  const rClean = rawRoom.toLowerCase().trim();

  return roomMappings.find((m) => {
    if (!m.room_code_pattern) return false;
    if (m.room_code_pattern.toLowerCase().trim() === rClean) return true;
    try {
      return new RegExp(m.room_code_pattern, 'i').test(rawRoom);
    } catch {
      return false;
    }
  });
}

function resolveSingleRoom<T extends RoomLocationLike>(
  rawRoom: string,
  locations: T[],
  roomMappings: CampusRoomMapping[] = [],
  includeFuzzyFallbacks = true,
): T | undefined {
  const rTrim = rawRoom.trim();
  const rClean = rTrim.toLowerCase();
  if (!rClean) return undefined;

  // 1. Direct UUID match
  const idMatch = locations.find((loc) => loc.id === rTrim);
  if (idMatch) return idMatch;

  // 2. Exact room_code match
  const exactRoom = locations.find(
    (loc) => loc.room_code && loc.room_code.toLowerCase().trim() === rClean,
  );
  if (exactRoom) return exactRoom;

  // 3. search_tags token / substring match (aliases & nicknames, e.g. A301 -> EA301)
  const tagMatch = locations.find((loc) => {
    if (!loc.search_tags) return false;
    const tags = loc.search_tags.toLowerCase();
    const tokens = tags
      .split(/[,;\n]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    return tokens.includes(rClean) || (includeFuzzyFallbacks && tags.includes(rClean));
  });
  if (tagMatch) return tagMatch;

  // 4. Explicit imaps_room_mappings match (regex or literal)
  const mapping = findMatchingRoomMapping(rTrim, roomMappings);
  if (mapping?.location_id) {
    const mappedLoc = locations.find((loc) => loc.id === mapping.location_id);
    if (mappedLoc) return mappedLoc;
  }

  if (!includeFuzzyFallbacks) return undefined;

  // 5. Substring match on room_code
  const subMatch = locations.find((loc) => {
    const code = loc.room_code?.toLowerCase().trim();
    if (!code) return false;
    return code.includes(rClean) || rClean.includes(code);
  });
  if (subMatch) return subMatch;

  // 6. Department prefix normalizer fallback (e.g. A309 -> EA309)
  const rStripped = stripDepartmentPrefix(rClean);
  if (rStripped.length >= 3) {
    const prefixMatch = locations.find((loc) => {
      if (!loc.room_code) return false;
      return stripDepartmentPrefix(loc.room_code) === rStripped;
    });
    if (prefixMatch) return prefixMatch;
  }

  return undefined;
}

/**
 * Unified room resolver consumed by PolyMaps (deep links, search) AND Timetable parser.
 * Combines `imaps_locations` (`id`, `room_code`, `search_tags`) and `imaps_room_mappings`.
 */
export function resolveRoomLocationUnified<T extends RoomLocationLike>(
  query: string,
  locations: T[],
  roomMappings: CampusRoomMapping[] = [],
): T | undefined {
  if (!query || !locations || locations.length === 0) return undefined;

  const normalizedComposite = query.replace(/\s*[/,]\s*/g, '/');
  if (normalizedComposite.includes('/')) {
    // Try exact/direct match first in case a physical room_code contains '/'
    const exactComposite = resolveSingleRoom(query, locations, roomMappings, false);
    if (exactComposite) return exactComposite;

    // Resolve primary composite part first (e.g. "PDKJP / EA301" -> PDKJP before EA301)
    const parts = normalizedComposite
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      const partMatch = resolveSingleRoom(part, locations, roomMappings, true);
      if (partMatch) return partMatch;
    }
  }

  return resolveSingleRoom(query, locations, roomMappings, true);
}

/**
 * Timetable-compatible match API returning `{ location_id, is_online }`.
 */
export function matchRoomToLocationUnified(
  roomRaw: string,
  locations: RoomLocationLike[] = [],
  roomMappings: CampusRoomMapping[] = [],
): { location_id: string | null; is_online: boolean } {
  const trimmed = (roomRaw || '').trim();
  if (!trimmed) {
    return { location_id: null, is_online: false };
  }

  const cleanRoom = trimmed.replace(/\s*[/,]\s*/g, '/');
  const primaryRoom = cleanRoom.includes('/') ? cleanRoom.split('/')[0].trim() : cleanRoom;

  // 1. Online / virtual keywords
  if (isOnlineRoomToken(primaryRoom)) {
    return { location_id: null, is_online: true };
  }

  // 2. Check explicit room mapping first when it flags is_online
  const mapping = findMatchingRoomMapping(primaryRoom, roomMappings);

  // 3. Match physical locations (direct ID -> exact -> search_tags -> roomMappings -> substring -> prefix)
  if (locations.length > 0) {
    const resolved = resolveRoomLocationUnified(primaryRoom, locations, roomMappings);
    if (resolved) {
      return { location_id: resolved.id, is_online: false };
    }
  }

  // 4. Fallback to room_mapping even when locations list is empty or location is online-only
  if (mapping) {
    return {
      location_id: mapping.location_id ?? null,
      is_online: Boolean(mapping.is_online),
    };
  }

  return { location_id: null, is_online: false };
}
