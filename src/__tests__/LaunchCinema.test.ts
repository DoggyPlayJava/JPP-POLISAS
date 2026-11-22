import { describe, it, expect } from 'vitest';
import { DEFAULT_CAMPUS_STATS, LANDING_STATS_CACHE_KEY } from '@/hooks/useCampusStats';
import {
  LaunchShowcaseSchema,
  LAUNCH_CHAPTERS,
  LAUNCH_TOTAL_FRAMES,
} from '../../remotion/launch/schema';
import {
  CAMPUS_ROUTE_KM,
  sliceCampusRoute,
  getWalkerCoordinate,
} from '../../remotion/launch/lib/campusRoute';
import {
  probeMediaDurationSeconds,
  probeVideoDimensions,
} from '../../remotion/launch/lib/mediaProbe';

describe('Shared Campus Stats Contract', () => {
  it('exposes safe non-zero fallback defaults and stable cache key', () => {
    expect(LANDING_STATS_CACHE_KEY).toBe('landing_campus_stats');
    expect(DEFAULT_CAMPUS_STATS.clubsCount).toBeGreaterThanOrEqual(21);
    expect(DEFAULT_CAMPUS_STATS.studentsCount).toBeGreaterThanOrEqual(1000);
    expect(DEFAULT_CAMPUS_STATS.productsCount).toBeGreaterThanOrEqual(200);
    expect(DEFAULT_CAMPUS_STATS.ordersCount).toBeGreaterThanOrEqual(300);
  });
});

describe('Launch Cinema Schema, Timeline, GIS Route & Media Probe', () => {
  it('computes exact 1470-frame TransitionSeries timeline and chapter offsets', () => {
    expect(LAUNCH_TOTAL_FRAMES).toBe(1470);
    expect(LAUNCH_CHAPTERS).toHaveLength(8);
    expect(LAUNCH_CHAPTERS.map((c) => c.startFrame)).toEqual([
      0, 135, 375, 555, 720, 885, 1080, 1245,
    ]);
    const last = LAUNCH_CHAPTERS[LAUNCH_CHAPTERS.length - 1];
    expect(last.startFrame + last.durationInFrames).toBe(1470);
  });

  it('validates Zod defaults with official POLISAS identity', () => {
    const parsed = LaunchShowcaseSchema.parse({});
    expect(parsed.portalUrl).toBe('https://jpp.polisas.edu.my');
    expect(parsed.headlinePrimary).toContain('Satu Kampus');
    expect(parsed.stats.clubsCount).toBe(21);
  });

  it('generates deterministic Turf walking route inside POLISAS Semambu coordinates', () => {
    expect(CAMPUS_ROUTE_KM).toBeGreaterThan(0.1);
    expect(CAMPUS_ROUTE_KM).toBeLessThan(1.5);
    const startSlice = sliceCampusRoute(0);
    const fullSlice = sliceCampusRoute(1);
    expect(startSlice.geometry.type).toBe('LineString');
    expect(fullSlice.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    const [lng, lat] = getWalkerCoordinate(0.5);
    expect(lng).toBeGreaterThan(103.31);
    expect(lng).toBeLessThan(103.32);
    expect(lat).toBeGreaterThan(3.86);
    expect(lat).toBeLessThan(3.87);

    const nanSlice = sliceCampusRoute(Number.NaN);
    expect(nanSlice.geometry.type).toBe('LineString');
    expect(nanSlice.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    const [nanLng, nanLat] = getWalkerCoordinate(Number.NaN);
    expect(Number.isFinite(nanLng)).toBe(true);
    expect(Number.isFinite(nanLat)).toBe(true);
  });

  it('returns null gracefully when Mediabunny probes empty or invalid media URL', async () => {
    await expect(probeMediaDurationSeconds('')).resolves.toBeNull();
    await expect(probeVideoDimensions('')).resolves.toBeNull();
    await expect(probeMediaDurationSeconds('not-a-valid-url')).resolves.toBeNull();
    await expect(probeVideoDimensions('not-a-valid-url')).resolves.toBeNull();
  });
});
