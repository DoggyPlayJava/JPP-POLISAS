import type { CampusWalkway, CampusWalkwaySegment } from '../types';

export interface GraphEdge {
  distance: number;
  isCovered: boolean;
}

export interface GraphNode {
  lat: number;
  lng: number;
  key: string;
  neighbors: Map<string, GraphEdge | number>;
}

/**
 * Haversine distance in meters between two WGS84 coordinates.
 */
export function calculateDistanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function edgePairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function edgeOverlapsSegment(idxA: number, idxB: number, seg: CampusWalkwaySegment): boolean {
  return (
    (idxA >= seg.start_idx && idxA < seg.end_idx) ||
    (idxB > seg.start_idx && idxB <= seg.end_idx) ||
    (idxA <= seg.start_idx && idxB >= seg.end_idx)
  );
}

/**
 * Builds the campus pedestrian routing graph from walkways and segments.
 *
 * Fixes Bug #7:
 *  - Skips any walkway with `walkway.is_blocked === true` completely so Dijkstra
 *    never routes across or snaps onto a blocked walkway.
 *  - Skips any edge overlapping a segment with `segment.is_blocked === true`,
 *    and records blocked pairs so the 8m junction bridge cannot jump across a
 *    short blocked segment.
 */
export function buildWalkwayGraph(
  walkways: CampusWalkway[],
  segments: CampusWalkwaySegment[],
): Map<string, GraphNode> {
  const nodesMap = new Map<string, GraphNode>();
  const blockedPairs = new Set<string>();

  for (const w of walkways) {
    if (w.is_blocked) continue;
    if (!Array.isArray(w.coordinates) || w.coordinates.length < 2) continue;

    const blockedSegs = segments.filter((s) => s.walkway_id === w.id && s.is_blocked);
    const coveredSegs = segments.filter((s) => s.walkway_id === w.id && s.is_covered);

    const ensureNode = (lat: number, lng: number): string => {
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (!nodesMap.has(key)) {
        nodesMap.set(key, {
          lat,
          lng,
          key,
          neighbors: new Map<string, GraphEdge | number>(),
        });
      }
      return key;
    };

    for (let i = 1; i < w.coordinates.length; i++) {
      const prevCoord = w.coordinates[i - 1];
      const currCoord = w.coordinates[i];
      const prevLat = prevCoord[0];
      const prevLng = prevCoord[1];
      const lat = currCoord[0];
      const lng = currCoord[1];

      const prevKey = `${prevLat.toFixed(6)},${prevLng.toFixed(6)}`;
      const currKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

      if (blockedSegs.some((seg) => edgeOverlapsSegment(i - 1, i, seg))) {
        blockedPairs.add(edgePairKey(prevKey, currKey));
        continue;
      }

      ensureNode(prevLat, prevLng);
      ensureNode(lat, lng);

      const distance = calculateDistanceInMeters(prevLat, prevLng, lat, lng);
      const isCovered =
        Boolean(w.is_covered) || coveredSegs.some((seg) => edgeOverlapsSegment(i - 1, i, seg));

      nodesMap.get(prevKey)?.neighbors.set(currKey, { distance, isCovered });
      nodesMap.get(currKey)?.neighbors.set(prevKey, { distance, isCovered });
    }
  }

  // Bridge junctions between distinct walkway nodes within 8.0m (unless explicitly blocked)
  const nodeList = Array.from(nodesMap.values());
  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const nodeA = nodeList[i];
      const nodeB = nodeList[j];
      if (nodeA.neighbors.has(nodeB.key)) continue;
      if (blockedPairs.has(edgePairKey(nodeA.key, nodeB.key))) continue;

      const distance = calculateDistanceInMeters(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
      if (distance <= 8.0) {
        nodeA.neighbors.set(nodeB.key, distance);
        nodeB.neighbors.set(nodeA.key, distance);
      }
    }
  }

  return nodesMap;
}

/**
 * Pure Dijkstra shortest-path solver on the campus pedestrian graph.
 * When `preferCovered` is true, covered segments receive a 0.5x weight bonus and
 * uncovered segments receive a 1.5x penalty.
 */
export function findShortestPath(
  nodesMap: Map<string, GraphNode>,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  preferCovered = false,
): [number, number][] | null {
  if (nodesMap.size === 0) return null;

  let startKey: string | null = null;
  let minDistStart = Infinity;
  let endKey: string | null = null;
  let minDistEnd = Infinity;

  for (const node of nodesMap.values()) {
    const dStart = calculateDistanceInMeters(startLat, startLng, node.lat, node.lng);
    if (dStart < minDistStart) {
      minDistStart = dStart;
      startKey = node.key;
    }
    const dEnd = calculateDistanceInMeters(endLat, endLng, node.lat, node.lng);
    if (dEnd < minDistEnd) {
      minDistEnd = dEnd;
      endKey = node.key;
    }
  }

  if (!startKey || !endKey) return null;

  const tempStartKey = 'temp_start';
  const tempEndKey = 'temp_end';

  const neighborsCopy = new Map<string, Map<string, GraphEdge | number>>();
  for (const [key, node] of nodesMap.entries()) {
    neighborsCopy.set(key, new Map(node.neighbors));
  }

  neighborsCopy.set(tempStartKey, new Map([[startKey, minDistStart]]));
  neighborsCopy.get(startKey)?.set(tempStartKey, minDistStart);

  neighborsCopy.set(tempEndKey, new Map([[endKey, minDistEnd]]));
  neighborsCopy.get(endKey)?.set(tempEndKey, minDistEnd);

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const key of neighborsCopy.keys()) {
    distances.set(key, Infinity);
    previous.set(key, null);
    unvisited.add(key);
  }
  distances.set(tempStartKey, 0);

  while (unvisited.size > 0) {
    let currentKey: string | null = null;
    let minD = Infinity;
    for (const key of unvisited) {
      const d = distances.get(key) ?? Infinity;
      if (d < minD) {
        minD = d;
        currentKey = key;
      }
    }

    if (currentKey === null || minD === Infinity) break;
    if (currentKey === tempEndKey) break;

    unvisited.delete(currentKey);

    const neighbors = neighborsCopy.get(currentKey);
    if (!neighbors) continue;

    for (const [neighborKey, edgeVal] of neighbors.entries()) {
      if (!unvisited.has(neighborKey)) continue;

      const dist = typeof edgeVal === 'number' ? edgeVal : edgeVal.distance;
      const isCovered = typeof edgeVal === 'number' ? false : edgeVal.isCovered;
      const weight = preferCovered ? (isCovered ? dist * 0.5 : dist * 1.5) : dist;

      const alt = minD + weight;
      if (alt < (distances.get(neighborKey) ?? Infinity)) {
        distances.set(neighborKey, alt);
        previous.set(neighborKey, currentKey);
      }
    }
  }

  if ((distances.get(tempEndKey) ?? Infinity) === Infinity) {
    return null;
  }

  const path: [number, number][] = [];
  let curr: string | null = tempEndKey;
  while (curr) {
    if (curr === tempStartKey) {
      path.unshift([startLat, startLng]);
    } else if (curr === tempEndKey) {
      path.unshift([endLat, endLng]);
    } else {
      const node = nodesMap.get(curr);
      if (node) path.unshift([node.lat, node.lng]);
    }
    curr = previous.get(curr) ?? null;
  }

  return path.length >= 2 ? path : null;
}

export function computeRouteStats(
  path: [number, number][] | null,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): { distanceMeters: number; etaMinutes: number; usedWalkwayPath: boolean } {
  if (path && path.length > 1) {
    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      totalDistance += calculateDistanceInMeters(
        path[i - 1][0],
        path[i - 1][1],
        path[i][0],
        path[i][1],
      );
    }
    const etaMinutes = Math.max(1, Math.ceil(totalDistance / 75));
    return { distanceMeters: totalDistance, etaMinutes, usedWalkwayPath: true };
  }

  const directDistance = calculateDistanceInMeters(startLat, startLng, endLat, endLng);
  const etaMinutes = Math.max(1, Math.ceil((directDistance / 4500) * 60) + 1);
  return { distanceMeters: directDistance, etaMinutes, usedWalkwayPath: false };
}
