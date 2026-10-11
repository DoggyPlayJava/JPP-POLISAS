/**
 * PolyMaps Room Location Resolver
 * 
 * Multi-layer resolver that bridges discrepancies between timetable room notations
 * (e.g. DTK using "A301" vs DEE using "EA301") and PolyMaps physical locations:
 * 1. Direct UUID match (100% precision)
 * 2. Room code exact or substring match (e.g. "EA301")
 * 3. Search tags / nicknames / aliases match (e.g. "A301", "F107", "BKA")
 * 4. Composite room splitting (e.g. "EA301/EA302" -> resolves primary "EA301")
 * 5. Department prefix normalizer fallback (strips 'E', 'B', 'M', 'KA', etc.)
 */

export interface RoomLocationItem {
  id: string;
  room_code?: string;
  search_tags?: string | null;
  building?: any;
  [key: string]: any;
}

function resolveSingleRoomLocation<T extends RoomLocationItem>(
  rId: string,
  locations: T[]
): T | undefined {
  const rClean = rId.toLowerCase().trim();
  const stripPrefix = (str: string) =>
    str.replace(/^(jke|jkm|jka|jp|jmsk|e|b|m|ka)[\s_-]*/i, '').trim().toLowerCase();
  const rStripped = stripPrefix(rClean);

  // 1. Direct ID match or room_code match (exact or substring)
  let targetRoom = locations.find((r) => 
    r.id === rId || 
    r.room_code?.toLowerCase() === rClean ||
    r.room_code?.toLowerCase().includes(rClean) ||
    rClean.includes(r.room_code?.toLowerCase() || '')
  );

  // 2. search_tags match (aliases & nicknames, e.g. A301 in EA301's tags)
  if (!targetRoom) {
    targetRoom = locations.find((r) => {
      if (!r.search_tags) return false;
      const tags = r.search_tags.toLowerCase();
      const tokens = tags.split(/[,;\n]+/).map((t: string) => t.trim()).filter(Boolean);
      return tokens.includes(rClean) || tags.includes(rClean);
    });
  }

  // 3. Prefix normalizer fallback (for any un-tagged rooms)
  if (!targetRoom && rStripped && rStripped.length >= 3) {
    targetRoom = locations.find((r) => {
      if (!r.room_code) return false;
      return stripPrefix(r.room_code) === rStripped;
    });
  }

  return targetRoom;
}

export function resolveRoomLocation<T extends RoomLocationItem>(
  rId: string,
  locations: T[]
): T | undefined {
  if (!rId || !locations || locations.length === 0) return undefined;

  // Try direct resolution first
  const directMatch = resolveSingleRoomLocation(rId, locations);
  if (directMatch) return directMatch;

  // Handle composite rooms (e.g. "EA301/EA302" or "EA301 / EA302" or "EA301,EA302")
  const normalizedComposite = rId.replace(/\s*[\/,]\s*/g, '/');
  if (normalizedComposite.includes('/')) {
    const parts = normalizedComposite.split('/').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const partMatch = resolveSingleRoomLocation(part, locations);
      if (partMatch) return partMatch;
    }
  }

  return undefined;
}
