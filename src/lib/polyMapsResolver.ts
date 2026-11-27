/**
 * PolyMaps Room Location Resolver
 *
 * Backward-compatible facade over the unified room resolver in
 * `@/features/polymaps/domain/roomResolver`, bridging PolyMaps physical
 * locations (`imaps_locations`) and explicit timetable patterns
 * (`imaps_room_mappings`).
 */

import {
  resolveRoomLocationUnified,
  type RoomLocationLike,
} from '@/features/polymaps/domain/roomResolver';
import type { CampusRoomMapping } from '@/features/polymaps/types';

export type RoomLocationItem = RoomLocationLike;

export function resolveRoomLocation<T extends RoomLocationItem>(
  rId: string,
  locations: T[],
  roomMappings: CampusRoomMapping[] = [],
): T | undefined {
  return resolveRoomLocationUnified(rId, locations, roomMappings);
}
