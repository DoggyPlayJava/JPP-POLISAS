import { describe, expect, it } from 'vitest';
import {
  buildWalkwayGraph,
  findShortestPath,
  computeRouteStats,
  calculateDistanceInMeters,
} from '../domain/routingEngine';
import type { CampusWalkway, CampusWalkwaySegment } from '../types';

describe('PolyMaps routingEngine (Dijkstra + Walkway/Segment blocking)', () => {
  // Simple campus diamond:
  // Start (3.8600, 103.3100) -> End (3.8600, 103.3120)
  // Direct shortcut walkway: 3 nodes along lat 3.8600
  // Detour walkway: goes north via lat 3.8606 then back to (3.8600, 103.3120)
  const directWalkway: CampusWalkway = {
    id: 'w-direct',
    name: 'Laluan Terus',
    coordinates: [
      [3.8600, 103.3100],
      [3.8600, 103.3110],
      [3.8600, 103.3120],
    ],
    is_covered: false,
    is_blocked: false,
  };

  const detourWalkway: CampusWalkway = {
    id: 'w-detour',
    name: 'Laluan Berbumbung Utara',
    coordinates: [
      [3.8600, 103.3100],
      [3.8606, 103.3110],
      [3.8600, 103.3120],
    ],
    is_covered: true,
    is_blocked: false,
  };

  it('uses the shorter direct walkway when both are open and preferCovered is false', () => {
    const graph = buildWalkwayGraph([directWalkway, detourWalkway], []);
    const path = findShortestPath(graph, 3.8600, 103.3100, 3.8600, 103.3120, false);

    expect(path).not.toBeNull();
    expect(path?.some(([lat]) => Math.abs(lat - 3.8606) < 1e-5)).toBe(false);
    expect(path?.some(([lat, lng]) => Math.abs(lat - 3.8600) < 1e-5 && Math.abs(lng - 103.3110) < 1e-5)).toBe(true);
  });

  it('respects whole-walkway is_blocked = true and reroutes via open walkway', () => {
    const blockedDirect: CampusWalkway = { ...directWalkway, is_blocked: true };
    const graph = buildWalkwayGraph([blockedDirect, detourWalkway], []);
    const path = findShortestPath(graph, 3.8600, 103.3100, 3.8600, 103.3120, false);

    expect(path).not.toBeNull();
    // Must pass through the northern detour node
    expect(path?.some(([lat]) => Math.abs(lat - 3.8606) < 1e-5)).toBe(true);
    // Must NOT pass through the blocked midpoint
    expect(path?.some(([lat, lng]) => Math.abs(lat - 3.8600) < 1e-5 && Math.abs(lng - 103.3110) < 1e-5)).toBe(false);
  });

  it('returns null when every connecting walkway is blocked', () => {
    const graph = buildWalkwayGraph(
      [
        { ...directWalkway, is_blocked: true },
        { ...detourWalkway, is_blocked: true },
      ],
      [],
    );
    const path = findShortestPath(graph, 3.8600, 103.3100, 3.8600, 103.3120, false);
    expect(path).toBeNull();
  });

  it('respects partial blocked segment (segment.is_blocked = true) and reroutes around it', () => {
    const blockedSegment: CampusWalkwaySegment = {
      id: 'seg-1',
      walkway_id: 'w-direct',
      start_idx: 0,
      end_idx: 1,
      is_blocked: true,
      is_covered: false,
    };

    const graph = buildWalkwayGraph([directWalkway, detourWalkway], [blockedSegment]);
    const path = findShortestPath(graph, 3.8600, 103.3100, 3.8600, 103.3120, false);

    expect(path).not.toBeNull();
    expect(path?.some(([lat]) => Math.abs(lat - 3.8606) < 1e-5)).toBe(true);
  });

  it('prefers covered walkway or covered segment when preferCovered is true', () => {
    // Slightly longer covered detour (~260m vs ~222m direct -> covered gets 0.5x weight ~130m < 222m)
    const graph = buildWalkwayGraph([directWalkway, detourWalkway], []);
    const path = findShortestPath(graph, 3.8600, 103.3100, 3.8600, 103.3120, true);

    expect(path).not.toBeNull();
    expect(path?.some(([lat]) => Math.abs(lat - 3.8606) < 1e-5)).toBe(true);
  });

  it('computes accurate route stats from path or direct fallback', () => {
    const d = calculateDistanceInMeters(3.8600, 103.3100, 3.8600, 103.3120);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(250);

    const stats = computeRouteStats(
      [
        [3.8600, 103.3100],
        [3.8600, 103.3120],
      ],
      3.8600,
      103.3100,
      3.8600,
      103.3120,
    );
    expect(stats.usedWalkwayPath).toBe(true);
    expect(stats.etaMinutes).toBeGreaterThanOrEqual(1);
    expect(stats.distanceMeters).toBeCloseTo(d, 0);
  });
});
