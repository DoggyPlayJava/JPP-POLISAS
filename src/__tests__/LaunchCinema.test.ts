import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_CAMPUS_STATS, LANDING_STATS_CACHE_KEY } from '@/hooks/useCampusStats';
import {
  LaunchShowcaseSchema,
  LAUNCH_CHAPTERS,
  LAUNCH_OVERLAY_FRAMES,
  LAUNCH_TOTAL_FRAMES,
  LAUNCH_TRANSITION_FRAMES,
} from '../../remotion/launch/schema';
import { LAUNCH_FPS, LAUNCH_PALETTE } from '../../remotion/launch/tokens';
import {
  CAMPUS_ROUTE_KM,
  sliceCampusRoute,
  getWalkerCoordinate,
} from '../../remotion/launch/lib/campusRoute';
import {
  probeMediaDurationSeconds,
  probeVideoDimensions,
} from '../../remotion/launch/lib/mediaProbe';
import {
  kineticCameraPush,
  editorialSplitCurtain,
  depthLiftMatch,
  orbitalIrisMatch,
  EditorialShutterOverlay,
  WarmLightSweepOverlay,
} from '../../remotion/launch/motion/transitions';

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
  it('computes exact 2940-frame 60fps TransitionSeries timeline and chapter offsets', () => {
    expect(LAUNCH_FPS).toBe(60);
    expect(LAUNCH_TRANSITION_FRAMES).toBe(30);
    expect(LAUNCH_OVERLAY_FRAMES).toBe(48);
    expect(LAUNCH_TOTAL_FRAMES).toBe(2940);
    expect(LAUNCH_CHAPTERS).toHaveLength(8);
    expect(LAUNCH_CHAPTERS.map((c) => c.durationInFrames)).toEqual([
      300, 480, 390, 360, 360, 390, 360, 450,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.startFrame)).toEqual([
      0, 270, 750, 1110, 1440, 1770, 2160, 2490,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.transitionAfter)).toEqual([
      'kinetic-push',
      'editorial-shutter',
      'split-curtain',
      'clock-wipe',
      'depth-lift',
      'light-sweep',
      'orbital-iris',
      'none',
    ]);
    const last = LAUNCH_CHAPTERS[LAUNCH_CHAPTERS.length - 1];
    expect(last.startFrame + last.durationInFrames).toBe(2940);
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

describe('Launch Cinema Bespoke Motion-Graphic Transitions & Overlays', () => {
  it('returns valid native TransitionPresentation objects for all 4 bespoke factories', () => {
    const pushDefault = kineticCameraPush();
    const pushLeft = kineticCameraPush({ direction: 'from-left', accentColor: LAUNCH_PALETTE.SECONDARY });
    const curtainDefault = editorialSplitCurtain();
    const curtainCustom = editorialSplitCurtain({ accentColor: LAUNCH_PALETTE.ACCENT });
    const liftDefault = depthLiftMatch();
    const irisDefault = orbitalIrisMatch();
    const irisCustom = orbitalIrisMatch({ ringColor: LAUNCH_PALETTE.ACCENT });

    for (const presentation of [
      pushDefault,
      pushLeft,
      curtainDefault,
      curtainCustom,
      liftDefault,
      irisDefault,
      irisCustom,
    ]) {
      expect(presentation).toBeDefined();
      expect(typeof presentation.component).toBe('function');
      expect(presentation.props).toBeTypeOf('object');
      expect(presentation.props).not.toBeNull();
      expect(presentation.canvas).toBeUndefined();
    }

    expect(pushDefault.props.direction).toBe('from-right');
    expect(pushLeft.props.direction).toBe('from-left');
    expect(pushLeft.props.accentColor).toBe(LAUNCH_PALETTE.SECONDARY);
    expect(curtainDefault.props.accentColor).toBe(LAUNCH_PALETTE.ACCENT);
    expect(curtainCustom.props.accentColor).toBe(LAUNCH_PALETTE.ACCENT);
    expect(irisDefault.props.ringColor).toBe(LAUNCH_PALETTE.ACCENT);
    expect(irisCustom.props.ringColor).toBe(LAUNCH_PALETTE.ACCENT);

    expect(typeof EditorialShutterOverlay).toBe('function');
    expect(typeof WarmLightSweepOverlay).toBe('function');
  });

  it('uses 100% Chrome-native transforms/clip-paths/effects with zero experimental or CSS animations', () => {
    const source = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'motion', 'transitions.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/HtmlInCanvas/i);
    expect(source).not.toMatch(/blur-slide|zoom-in-out|film-burn/);
    expect(source).not.toMatch(/@keyframes|\banimate-|transition\s*:/);
    expect(source).toContain('premountFor={fps}');
    expect(source).toContain("from '@remotion/effects/light-leak'");
  });
});
