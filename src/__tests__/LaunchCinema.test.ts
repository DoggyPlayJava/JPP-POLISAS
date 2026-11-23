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
  WHIP_S_CURVE,
  computeWhipVelocity,
  kineticCameraPush,
  editorialSplitCurtain,
  swissLouversWipe,
  depthLiftMatch,
  orbitalIrisMatch,
  portalZoomMorph,
  EditorialShutterOverlay,
  WarmLightSweepOverlay,
} from '../../remotion/launch/motion/transitions';
import {
  CinemaChromeContext,
  EditorialBackdrop,
  EditorialFrameMarks,
  GlobalCinemaGate,
} from '../../remotion/launch/components/EditorialChrome';
import { CameraStage } from '../../remotion/launch/motion/CameraStage';
import {
  KineticWindow,
  ExplodedLayer,
  LiveTypewriterText,
  PersonaMonogram,
  DeterministicQrMatrix,
} from '../../remotion/launch/ui/KineticCard';

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
    expect(LAUNCH_TRANSITION_FRAMES).toBe(36);
    expect(LAUNCH_OVERLAY_FRAMES).toBe(48);
    expect(LAUNCH_TOTAL_FRAMES).toBe(2940);
    expect(LAUNCH_CHAPTERS).toHaveLength(8);
    expect(LAUNCH_CHAPTERS.map((c) => c.code)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08',
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.durationInFrames)).toEqual([
      306, 480, 396, 366, 366, 390, 366, 450,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.startFrame)).toEqual([
      0, 270, 750, 1110, 1440, 1770, 2160, 2490,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.transitionOut)).toEqual([
      'portal-zoom-morph',
      'editorial-shutter',
      'split-curtain',
      'swiss-louvers',
      'depth-lift',
      'warm-light-sweep',
      'orbital-iris',
      null,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.title)).toEqual([
      'Portal Hub',
      'PolyMaps',
      'PolyMart & Rent',
      'PolySuara',
      'E-Kebajikan',
      'Nexus AI & EMS',
      'Impak',
      'Penutup',
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.gateLabel)).toEqual([
      'PORTAL SUPERAPP HUB',
      'POLYMAPS & JADUAL KULIAH',
      'EKONOMI & KEDIAMAN',
      'POLYSUARA • SUARA MAHASISWA',
      'E-KEBAJIKAN & FOOD BANK',
      'NEXUS AI • KELAB & EMS',
      'TELEMETRI MASA NYATA',
      'AKSES PORTAL RASMI',
    ]);
    for (const chapter of LAUNCH_CHAPTERS) {
      expect(chapter.gateLabel.length).toBeGreaterThan(0);
      expect(chapter.gateLabel).toBe(chapter.gateLabel.toUpperCase());
    }
    const rawDurationSum = LAUNCH_CHAPTERS.reduce((acc, c) => acc + c.durationInFrames, 0);
    expect(rawDurationSum - 5 * LAUNCH_TRANSITION_FRAMES).toBe(LAUNCH_TOTAL_FRAMES);
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
  it('verifies WHIP_S_CURVE boundary anchors and computeWhipVelocity bell profile', () => {
    expect(WHIP_S_CURVE(0)).toBe(0);
    expect(WHIP_S_CURVE(0.5)).toBeCloseTo(0.5, 4);
    expect(WHIP_S_CURVE(1)).toBe(1);

    expect(computeWhipVelocity(0)).toBe(0);
    expect(computeWhipVelocity(0.001)).toBe(0);
    expect(computeWhipVelocity(0.999)).toBe(0);
    expect(computeWhipVelocity(1)).toBe(0);
    expect(computeWhipVelocity(Number.NaN)).toBe(0);

    const peakVelocity = computeWhipVelocity(0.5);
    const entryBoundaryVelocity = computeWhipVelocity(0.03);
    const exitBoundaryVelocity = computeWhipVelocity(0.97);

    expect(peakVelocity).toBeCloseTo(1, 4);
    expect(entryBoundaryVelocity).toBeGreaterThan(0);
    expect(exitBoundaryVelocity).toBeGreaterThan(0);
    expect(peakVelocity).toBeGreaterThanOrEqual(4 * entryBoundaryVelocity);
    expect(peakVelocity).toBeGreaterThanOrEqual(4 * exitBoundaryVelocity);
  });

  it('returns valid native TransitionPresentation objects for all 6 bespoke factories', () => {
    const pushDefault = kineticCameraPush();
    const pushLeft = kineticCameraPush({ direction: 'from-left', accentColor: LAUNCH_PALETTE.SECONDARY });
    const curtainDefault = editorialSplitCurtain();
    const curtainCustom = editorialSplitCurtain({ accentColor: LAUNCH_PALETTE.ACCENT });
    const louversDefault = swissLouversWipe();
    const louversCustom = swissLouversWipe({ slatCount: 7, angleDeg: 18 });
    const liftDefault = depthLiftMatch();
    const irisDefault = orbitalIrisMatch();
    const irisCustom = orbitalIrisMatch({ ringColor: LAUNCH_PALETTE.ACCENT });
    const portalDefault = portalZoomMorph();
    const portalCustom = portalZoomMorph({
      originXPercent: 42,
      originYPercent: 64,
      accentColor: LAUNCH_PALETTE.SECONDARY,
    });

    for (const presentation of [
      pushDefault,
      pushLeft,
      curtainDefault,
      curtainCustom,
      louversDefault,
      louversCustom,
      liftDefault,
      irisDefault,
      irisCustom,
      portalDefault,
      portalCustom,
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
    expect(louversDefault.props.slatCount).toBe(5);
    expect(louversDefault.props.angleDeg).toBe(14);
    expect(louversCustom.props.slatCount).toBe(7);
    expect(louversCustom.props.angleDeg).toBe(18);
    expect(liftDefault.props.maxRadius).toBe(52);
    expect(irisDefault.props.ringColor).toBe(LAUNCH_PALETTE.ACCENT);
    expect(irisCustom.props.ringColor).toBe(LAUNCH_PALETTE.ACCENT);
    expect(portalDefault.props.originXPercent).toBe(56);
    expect(portalDefault.props.originYPercent).toBe(58);
    expect(portalDefault.props.accentColor).toBe(LAUNCH_PALETTE.ACCENT);
    expect(portalCustom.props.originXPercent).toBe(42);
    expect(portalCustom.props.originYPercent).toBe(64);
    expect(portalCustom.props.accentColor).toBe(LAUNCH_PALETTE.SECONDARY);

    expect(typeof EditorialShutterOverlay).toBe('function');
    expect(typeof WarmLightSweepOverlay).toBe('function');
  });

  it('uses 100% Chrome-native transforms/clip-paths/effects with zero experimental or CSS animations', () => {
    const source = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'motion', 'transitions.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/HtmlInCanvas|Math\.random/i);
    expect(source).not.toMatch(/blur-slide|zoom-in-out|film-burn/);
    expect(source).not.toMatch(/@keyframes|\banimate-|transition\s*:/);
    expect(source).toContain('premountFor={fps}');
    expect(source).toContain('WHIP_S_CURVE');
    expect(source).toContain('computeWhipVelocity');
    expect(source).toContain('interpolateColors');
    expect(source).toContain('swissLouversWipe');
    expect(source).toContain('portalZoomMorph');
    expect(source).toContain("from '@remotion/effects/light-leak'");
  });

  it('exports KineticCard UI primitives and uses zero experimental or CSS animations', () => {
    expect(typeof KineticWindow).toBe('function');
    expect(typeof ExplodedLayer).toBe('function');
    expect(typeof LiveTypewriterText).toBe('function');
    expect(typeof PersonaMonogram).toBe('function');
    expect(typeof DeterministicQrMatrix).toBe('function');

    const kineticSource = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'ui', 'KineticCard.tsx'),
      'utf8',
    );
    expect(kineticSource).not.toMatch(/HtmlInCanvas|Math\.random|@keyframes|\banimate-|transition\s*:/i);
  });

  it('renders CampusMapLibrePlate fallback with 100% procedural SVG blueprint and zero screenshot assets', () => {
    const mapSource = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'components', 'CampusMapLibrePlate.tsx'),
      'utf8',
    );
    expect(mapSource).not.toMatch(/Polymap View Phone\.png|GAMBAR\/|CanvasImage|staticFile/);
    expect(mapSource).toContain('M 380 548 L 478 446 L 590 347');
    expect(mapSource).toContain('JALAN SEMAMBU');
    expect(mapSource).toContain('BLOK JTMK');
  });

  it('exports GlobalCinemaGate, CinemaChromeContext, and 3-phase CameraStage with pure frame-driven motion', () => {
    expect(typeof GlobalCinemaGate).toBe('function');
    expect(typeof EditorialFrameMarks).toBe('function');
    expect(typeof EditorialBackdrop).toBe('function');
    expect(typeof CameraStage).toBe('function');
    expect(CinemaChromeContext).toBeDefined();

    const chromeSource = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'components', 'EditorialChrome.tsx'),
      'utf8',
    );
    expect(chromeSource).toContain('interpolateColors');
    expect(chromeSource).toContain('suppressLocalFrameMarks');
    expect(chromeSource).not.toMatch(/HtmlInCanvas|Math\.random|@keyframes|\banimate-|transition\s*:/i);

    const cameraSource = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'motion', 'CameraStage.tsx'),
      'utf8',
    );
    expect(cameraSource).toContain('entryZoomOffset');
    expect(cameraSource).toContain('exitZoomDelta');
    expect(cameraSource).toContain('Easing.bezier(0.33, 0.08, 0.67, 0.92)');
    expect(cameraSource).not.toMatch(/HtmlInCanvas|Math\.random|@keyframes|\banimate-|transition\s*:/i);
  });
});
