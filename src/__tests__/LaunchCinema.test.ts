import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { DEFAULT_CAMPUS_STATS, LANDING_STATS_CACHE_KEY } from '@/hooks/useCampusStats';
import {
  LaunchShowcaseSchema,
  LAUNCH_CHAPTERS,
  LAUNCH_OVERLAY_FRAMES,
  LAUNCH_TOTAL_FRAMES,
  LAUNCH_TRANSITION_FRAMES,
} from '../../remotion/launch/schema';
import {
  CHAPTER_MODULE_THEMES,
  LAUNCH_FPS,
  LAUNCH_MODULE_THEMES,
  LAUNCH_PALETTE,
} from '../../remotion/launch/tokens';
import {
  CAMPUS_ROUTE_CURVATURE_RATIO,
  CAMPUS_ROUTE_KM,
  CAMPUS_WALK_ROUTE,
  getCampusTurnStep,
  getWalkerBearing,
  getWalkerCoordinate,
  sliceCampusRoute,
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
import { computeCampusRouteProgress } from '../../remotion/launch/components/CampusMapLibrePlate';
import { CameraStage } from '../../remotion/launch/motion/CameraStage';
import {
  KineticWindow,
  ExplodedLayer,
  SpatialFloorGrid,
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
  it('computes exact 6120-frame 60fps TransitionSeries timeline and 9-chapter offsets', () => {
    expect(LAUNCH_FPS).toBe(60);
    expect(LAUNCH_TRANSITION_FRAMES).toBe(42);
    expect(LAUNCH_OVERLAY_FRAMES).toBe(54);
    expect(LAUNCH_TOTAL_FRAMES).toBe(6120);
    expect(LAUNCH_CHAPTERS).toHaveLength(9);
    expect(LAUNCH_CHAPTERS.map((c) => c.code)).toEqual([
      '01', '02', '03', '04', '05', '06', '07', '08', '09',
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.durationInFrames)).toEqual([
      420, 660, 720, 720, 750, 750, 762, 570, 1020,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.startFrame)).toEqual([
      0, 378, 1038, 1716, 2394, 3102, 3810, 4572, 5100,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.transitionOut)).toEqual([
      'portal-zoom-morph',
      'editorial-shutter',
      'kinetic-push',
      'split-curtain',
      'swiss-louvers',
      'depth-lift',
      'warm-light-sweep',
      'orbital-iris',
      null,
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.title)).toEqual([
      'SuperApp Siswa',
      'PolyMaps & Jadual',
      'PolyMart & JPP Pay',
      'PolyRent Kediaman',
      'PolySuara Komuniti',
      'E-Kebajikan',
      'Kelab & Merit QR',
      'Komuniti Siswa',
      'Imbas & Masuk',
    ]);
    expect(LAUNCH_CHAPTERS.map((c) => c.gateLabel)).toEqual([
      'SELAMAT DATANG MAHASISWA BAHARU',
      '08:00 PAGI • TAK SESAT CARI KELAS',
      '12:30 TGH HARI • KAFETERIA & JPP PAY',
      '14:00 PETANG • BILIK SEWA & KONGSI SEWA',
      'KOMUNITI SISWA • LUAH & UNDI TANPA NAMA',
      'PRIHATIN SISWA • ADUAN KAMSIS & FOOD BANK',
      '17:00 PETANG • 21 KELAB, MERIT & E-SIJIL',
      'KOMUNITI HIDUP • 1,083+ SISWA AKTIF',
      'AKSES SERTA-MERTA • IMBAS QR SEKARANG',
    ]);
    for (const chapter of LAUNCH_CHAPTERS) {
      expect(chapter.gateLabel.length).toBeGreaterThan(0);
      expect(chapter.gateLabel).toBe(chapter.gateLabel.toUpperCase());
    }
    const rawDurationSum = LAUNCH_CHAPTERS.reduce((acc, c) => acc + c.durationInFrames, 0);
    expect(rawDurationSum - 6 * LAUNCH_TRANSITION_FRAMES).toBe(LAUNCH_TOTAL_FRAMES);
    const last = LAUNCH_CHAPTERS[LAUNCH_CHAPTERS.length - 1];
    expect(last.startFrame + last.durationInFrames).toBe(6120);
  });

  it('validates Zod defaults with official POLISAS Student-POV v7 identity', () => {
    const parsed = LaunchShowcaseSchema.parse({});
    expect(parsed.portalUrl).toBe('https://jpp.polisas.edu.my');
    expect(parsed.headlinePrimary).toBe('Baru Masuk POLISAS? Satu App Untuk Semua.');
    expect(parsed.headlineItalic).toBe('Satu Kampus. Satu SuperApp Mahasiswa POLISAS.');
    expect(parsed.stats.clubsCount).toBe(21);
  });

  it('generates deterministic 17-waypoint Turf walking route inside POLISAS Semambu coordinates & distinct module themes', () => {
    expect(CAMPUS_ROUTE_KM).toBeGreaterThan(0.2);
    expect(CAMPUS_ROUTE_KM).toBeLessThan(1.5);
    expect(CAMPUS_WALK_ROUTE.geometry.coordinates).toHaveLength(17);
    expect(CAMPUS_ROUTE_CURVATURE_RATIO).toBeGreaterThanOrEqual(1.18);

    expect(getCampusTurnStep(0).turnKind).toBe('straight');
    expect(getCampusTurnStep(0.35).isCovered).toBe(true);
    expect(getCampusTurnStep(0.65).turnKind).toBe('left');
    expect(getCampusTurnStep(0.9).turnKind).toBe('right');
    expect(getCampusTurnStep(1).turnKind).toBe('arrived');
    expect(getCampusTurnStep(Number.NaN).turnKind).toBe('straight');
    expect(Number.isFinite(getWalkerBearing(0.5))).toBe(true);
    expect(computeCampusRouteProgress(10, 60, 260)).toBe(0);
    expect(computeCampusRouteProgress(260, 60, 260)).toBe(1);
    expect(computeCampusRouteProgress(Number.NaN, 60, 260)).toBe(0);
    expect(computeCampusRouteProgress(100, Number.NaN, Number.NaN)).toBe(1);

    expect(CHAPTER_MODULE_THEMES).toHaveLength(9);
    const distinctChapterAccents = new Set(CHAPTER_MODULE_THEMES.map((ch) => ch.accent));
    expect(distinctChapterAccents.size).toBeGreaterThanOrEqual(8);
    expect(CHAPTER_MODULE_THEMES.map((c) => c.accent)).toEqual(
      expect.arrayContaining([
        '#10B981',
        '#F59E0B',
        '#06B6D4',
        '#F43F5E',
        '#14B8A6',
        '#3B82F6',
        '#A855F7',
      ]),
    );
    expect(LAUNCH_MODULE_THEMES.polyrent.primary).toBe('#06B6D4');
    expect(LAUNCH_MODULE_THEMES.takwim.primary).toBe('#6366F1');
    expect(LAUNCH_MODULE_THEMES.ems.primary).toBe('#EC4899');

    const startSlice = sliceCampusRoute(0);
    const fullSlice = sliceCampusRoute(1);
    expect(startSlice.geometry.type).toBe('LineString');
    expect(fullSlice.geometry.coordinates.length).toBeGreaterThanOrEqual(12);
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
    expect(typeof SpatialFloorGrid).toBe('function');
    expect(typeof LiveTypewriterText).toBe('function');
    expect(typeof PersonaMonogram).toBe('function');
    expect(typeof DeterministicQrMatrix).toBe('function');

    const kineticSource = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'ui', 'KineticCard.tsx'),
      'utf8',
    );
    expect(kineticSource).not.toMatch(/HtmlInCanvas|Math\.random|@keyframes|\banimate-|transition\s*:/i);
  });

  it('renders CampusMapLibrePlate fallback with 17-waypoint procedural SVG blueprint and zero screenshot assets', () => {
    const mapSource = readFileSync(
      join(process.cwd(), 'remotion', 'launch', 'components', 'CampusMapLibrePlate.tsx'),
      'utf8',
    );
    expect(mapSource).not.toMatch(/Polymap View Phone\.png|GAMBAR\/|CanvasImage|staticFile/);
    expect(mapSource).toContain('M 376 616 L 379 556');
    expect(mapSource).toContain('360° Street View Tersedia');
    expect(mapSource).toContain('Laluan Berbumbung');
    expect(mapSource).toContain('campus-3d-buildings');
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

const LAUNCH_ROOT_DIR = join(process.cwd(), 'remotion', 'launch');

function walkLaunchTsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      return walkLaunchTsFiles(fullPath);
    }
    return entry.endsWith('.ts') || entry.endsWith('.tsx') ? [fullPath] : [];
  });
}

describe('v4 Zero Static UI Screenshot Policy', () => {
  const launchFiles = walkLaunchTsFiles(LAUNCH_ROOT_DIR);

  it('scans all TypeScript modules under remotion/launch/', () => {
    expect(launchFiles.length).toBeGreaterThanOrEqual(20);
  });

  it('contains ZERO references to static UI screenshots across every file under remotion/launch/', () => {
    const forbiddenScreenshotPatterns: readonly RegExp[] = [
      /GAMBAR\//i,
      /Portal View/,
      /Polymart View/,
      /Inside Polymart/,
      /Foodbank Admin Preview/,
      /Kelab Preview/,
      /Event Management System \(EMS\) Preview/,
      /Automated E-akademik/,
      /Integrated Jadual Akademik/,
      /Polymap View/,
      /Aduan Kebajikan Status/,
    ];

    for (const filePath of launchFiles) {
      const relPath = relative(LAUNCH_ROOT_DIR, filePath).replace(/\\/g, '/');
      const content = readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenScreenshotPatterns) {
        expect(content, `${relPath} matched forbidden screenshot pattern ${pattern}`).not.toMatch(
          pattern,
        );
      }
    }
  });

  it('contains ZERO HtmlInCanvas, deprecated transition strings, CSS animations, or Math.random( across remotion/launch/', () => {
    const forbiddenRuntimePatterns: readonly RegExp[] = [
      /<HtmlInCanvas/,
      /HtmlInCanvasMotionBlur/,
      /blur-slide/,
      /zoom-in-out/,
      /film-burn/,
      /Math\.random\(/,
      /@keyframes/i,
      /\banimate-/i,
      /transition\s*:/i,
      /backdrop-filter|backdropFilter/i,
    ];

    for (const filePath of launchFiles) {
      const relPath = relative(LAUNCH_ROOT_DIR, filePath).replace(/\\/g, '/');
      const content = readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenRuntimePatterns) {
        expect(content, `${relPath} matched forbidden pattern ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('contains ZERO Admin/Officer jargon across every file under remotion/launch/ (100% Student-POV Guard)', () => {
    const forbiddenAdminPatterns: readonly RegExp[] = [
      /PENTADBIR UTAMA/i,
      /PENTADBIR/i,
      /SUPER ADMIN/i,
      /Command Center/i,
      /Semakan Kelulusan Acara HQ/i,
      /Tadbir Urus/i,
      /Telemetri Masa Nyata/i,
      /Automasi Kertas Kerja/i,
      /Disemak EXCO/i,
      /DISAHKAN EXCO/i,
      /Audit Kertas Kerja/i,
      /Nexus AI Copilot/i,
    ];

    for (const filePath of launchFiles) {
      const relPath = relative(LAUNCH_ROOT_DIR, filePath).replace(/\\/g, '/');
      const content = readFileSync(filePath, 'utf8');
      for (const pattern of forbiddenAdminPatterns) {
        expect(
          content,
          `${relPath} matched forbidden admin/officer jargon ${pattern}`,
        ).not.toMatch(pattern);
      }
    }
  });

  it('allows only jpp-logo.png in staticFile(...) calls inside remotion/launch/ (plus dynamic bgmSrc in JppLaunchCinema.tsx)', () => {
    const staticFileRegex = /staticFile\s*\(\s*([^)]+?)\s*\)/g;
    const quotedLiteralRegex = /^(?:'([^']*)'|"([^"]*)"|`([^`]*)`)$/;

    for (const filePath of launchFiles) {
      const relPath = relative(LAUNCH_ROOT_DIR, filePath).replace(/\\/g, '/');
      const content = readFileSync(filePath, 'utf8');
      const matches = [...content.matchAll(staticFileRegex)];

      for (const match of matches) {
        const argExpr = match[1].trim();
        const literalMatch = argExpr.match(quotedLiteralRegex);
        if (literalMatch) {
          const assetName = literalMatch[1] ?? literalMatch[2] ?? literalMatch[3] ?? '';
          expect(assetName, `${relPath} used disallowed staticFile('${assetName}')`).toBe(
            'jpp-logo.png',
          );
        } else {
          expect(relPath, `${relPath} used non-literal staticFile(${argExpr})`).toBe(
            'JppLaunchCinema.tsx',
          );
          expect(argExpr).toMatch(/^(?:trimmedBgm|resolvedBgmSrc|bgmSrc)$/);
        }
      }
    }
  });

  it('wires 9-chapter v7 cinema, dedicated PolyRent Semambu scene, single-hero 3D choreography, and symmetric LED-wall 340px QR lock', () => {
    const cinemaSource = readFileSync(join(LAUNCH_ROOT_DIR, 'JppLaunchCinema.tsx'), 'utf8');
    const rootSource = readFileSync(join(process.cwd(), 'remotion', 'Root.tsx'), 'utf8');
    const polymapsSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'PolyMapsCampusScene.tsx'),
      'utf8',
    );
    const impactSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'ImpactNumbersScene.tsx'),
      'utf8',
    );
    const closingSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'ClosingVaultScene.tsx'),
      'utf8',
    );

    expect(cinemaSource).toContain('portalZoomMorph({');
    expect(cinemaSource).toContain('PORTAL_POLYMAPS_ORIGIN.xPercent');
    expect(cinemaSource).toContain('PORTAL_POLYMAPS_ORIGIN.yPercent');
    expect(cinemaSource).toContain('chapterLabel="12:30 TGH HARI • KAFETERIA & JPP PAY"');
    expect(cinemaSource).toContain('headline="Lapar Lepas Kelas? Pesan Terus Tanpa Beratur."');
    expect(cinemaSource).toContain('<PolyRentHousingScene');
    expect(cinemaSource).toContain('kineticCameraPush({');
    expect(cinemaSource).toContain('pollTitle="Cadangan Kemudahan Siswa Semester Baharu"');
    expect(cinemaSource).toContain('ticketNo="KBJ-0842"');
    expect(cinemaSource).toContain('headline="Kamsis Bermasalah? Perlukan Food Bank? Kami Ada."');
    expect(cinemaSource).toContain('headlinePrimary="Imbas Sekarang. Mulakan Pengalaman Kampus Anda."');

    expect(rootSource).toContain("id=\"PolyRentHousingScene\"");
    expect(rootSource).toContain("headlinePrimary: 'Baru Masuk POLISAS? Satu App Untuk Semua.'");
    expect(rootSource).toContain("headline: 'Lapar Lepas Kelas? Pesan Terus Tanpa Beratur.'");
    expect(rootSource).toContain("ticketNo: 'KBJ-0842'");
    expect(rootSource).toContain("headlinePrimary: 'Imbas Sekarang. Mulakan Pengalaman Kampus Anda.'");
    expect(rootSource).toContain("headlineItalic: 'Satu Kampus. Satu SuperApp Mahasiswa POLISAS.'");

    expect(polymapsSource).toContain('<span>TIBA TEPAT MASA</span>');
    expect(polymapsSource).not.toContain('TIBA TEPAT MASA ✓');
    expect(polymapsSource).not.toContain('TIBA DI KELAS ✓');

    expect(impactSource).toContain('chapterCode="08"');
    expect(impactSource).toContain('KOMUNITI HIDUP • 5 JABATAN POLISAS');
    expect(impactSource).toContain('MAHASISWA DAH AKSES');
    expect(impactSource).toContain('KELAB & PERSATUAN');
    expect(impactSource).toContain('MENU & BARANG SISWA');
    expect(impactSource).toContain('ACARA & PROGRAM KAMPUS');
    expect(impactSource).toContain('PENYERTAAN SISWA • 6 BULAN');
    expect(impactSource).toContain('MOMENTUM KOMUNITI KAMPUS');
    expect(impactSource).toContain('PESANAN &amp; ADUAN PELAJAR DISELESAIKAN • SERTAI SEKARANG');
    expect(impactSource).toContain('SCAN QR MERIT');
    expect(impactSource).toContain('21 KELAB POLISAS');
    for (const month of ['OKT', 'NOV', 'DIS', 'JAN', 'FEB', 'MAC']) {
      expect(impactSource).toContain(`'${month}'`);
    }

    expect(closingSource).toContain('chapterCode="09"');
    expect(closingSource).toContain('<QRCode');
    expect(closingSource).toContain('size={340}');
    expect(closingSource).toContain('bgColor="#FFFFFF"');
    expect(closingSource).toContain('fgColor="#061714"');
    expect(closingSource).toMatch(/isQrOrthogonalLocked\s*\?\s*0/);
    expect(closingSource).toMatch(/isQrOrthogonalLocked\s*\?\s*'none'/);
    expect(closingSource).toContain('rotateY(7deg)');
    expect(closingSource).toContain('rotateY(-7deg)');
    expect(closingSource).toContain('SpatialFloorGrid');
    expect(closingSource).toContain('Imbas Sekarang. Mulakan Pengalaman Kampus Anda.');
    expect(closingSource).toContain('Satu Kampus. Satu SuperApp Mahasiswa POLISAS.');
    expect(closingSource).toContain('Buka Kamera Telefon');
    expect(closingSource).toContain('Imbas Kod QR Ini');
    expect(closingSource).toContain('Log Masuk & Teroka');
    expect(closingSource).toContain('PERCUMA UNTUK SEMUA PELAJAR POLISAS • 24/7');
    expect(closingSource).toContain('AKSES SERTA-MERTA • IMBAS QR SEKARANG');
  });

  it('enforces v8 Teal-White palette, 3D sculpted intro bumpers across all 6 module chapters, and zero earth-tones or raw emojis', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const tokens = await import('../../remotion/launch/tokens');
    const bumper = await import('../../remotion/launch/motion/Module3DIntroBumper');

    expect(bumper.MODULE_BUMPER_DURATION_FRAMES).toBe(168);
    expect(bumper.MODULE_CONTENT_ENTER_OFFSET).toBe(132);
    expect(tokens.LUXURY_SPRING).toEqual({
      damping: 26,
      stiffness: 110,
      mass: 1.15,
    });

    const paletteValues = Object.values(tokens.LAUNCH_PALETTE);
    for (const hex of [
      '#0B2420',
      '#061714',
      '#0D9488',
      '#3B635C',
      '#B8E4DC',
      '#14B8A6',
      '#F6FBF9',
      '#EBF7F4',
      '#FFFFFF',
    ]) {
      expect(paletteValues).toContain(hex);
    }

    const collectSourceFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectSourceFiles(fullPath);
        return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
      });

    const filesToScan = [
      ...collectSourceFiles(LAUNCH_ROOT_DIR),
      path.resolve(process.cwd(), 'src/pages/LaunchVideo.tsx'),
    ];
    const earthTonePattern =
      /F8F6EE|F2EDE4|D9C9B2|C96F4F|2E3A2F|1F2720|6B7F5B|556453|182219|111812|46,\s*58,\s*47|31,\s*39,\s*32|217,\s*201,\s*178|201,\s*111,\s*79|248,\s*246,\s*238|242,\s*237,\s*228|107,\s*127,\s*91|85,\s*100,\s*83/i;
    const rawEmojiPattern = /[\u{1F300}-\u{1FAFF}]/u;

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content, `Retired earth-tone token leaked in ${filePath}`).not.toMatch(earthTonePattern);
      if (filePath.startsWith(LAUNCH_ROOT_DIR)) {
        expect(content, `Raw OS emoji leaked in ${filePath}`).not.toMatch(rawEmojiPattern);
      }
    }

    const bumperSceneFiles = [
      'PolyMapsCampusScene.tsx',
      'PolyMartCommerceScene.tsx',
      'PolyRentHousingScene.tsx',
      'PolySuaraVoiceScene.tsx',
      'WelfareCareScene.tsx',
      'ClubsEmsScene.tsx',
    ];
    for (const sceneName of bumperSceneFiles) {
      const sceneSource = readFileSync(join(LAUNCH_ROOT_DIR, 'scenes', sceneName), 'utf8');
      expect(sceneSource, `${sceneName} must mount Module3DIntroBumper`).toContain(
        '<Module3DIntroBumper',
      );
      expect(sceneSource, `${sceneName} must use MODULE_CONTENT_ENTER_OFFSET`).toContain(
        'MODULE_CONTENT_ENTER_OFFSET',
      );
    }
  });

  it('enforces v7 single-hero 3D depth scenes (zero raw emojis, 180-deg flip geometry, and valid motion actor contracts)', () => {
    const v7RebuiltScenes = [
      'PolyMartCommerceScene.tsx',
      'PolyRentHousingScene.tsx',
      'PolySuaraVoiceScene.tsx',
      'WelfareCareScene.tsx',
      'ClubsEmsScene.tsx',
    ];

    for (const sceneName of v7RebuiltScenes) {
      const sceneSource = readFileSync(join(LAUNCH_ROOT_DIR, 'scenes', sceneName), 'utf8');
      expect(sceneSource, `${sceneName} must include SpatialFloorGrid depth cue`).toContain(
        'SpatialFloorGrid',
      );
      expect(sceneSource, `${sceneName} must not contain raw OS emojis`).not.toMatch(
        /[\u{1F300}-\u{1FAFF}]/u,
      );
    }

    const polymartSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'PolyMartCommerceScene.tsx'),
      'utf8',
    );
    expect(polymartSource).toContain('WHIP_S_CURVE');
    expect(polymartSource).toContain("backfaceVisibility: 'hidden'");
    expect(polymartSource).toContain('JPP PAY • PESANAN #');
    expect(polymartSource).toContain('GeometricSparkBurst');
    expect(polymartSource).toContain('GhostCursor');
    expect(polymartSource).not.toContain('Taman Pertama');

    const polyrentSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'PolyRentHousingScene.tsx'),
      'utf8',
    );
    expect(polyrentSource).toContain('export const PolyRentHousingScene');
    expect(polyrentSource).toContain('Taman Pertama Semambu');
    expect(polyrentSource).toContain('PINTU UTAMA POLISAS');
    expect(polyrentSource).toContain('BEBAS SCAM');
    expect(polyrentSource).toContain('WHATSAPP TUAN RUMAH TERUS');
    expect(polyrentSource).toContain('EvolvingPath');
    expect(polyrentSource).toContain('GeometricSparkBurst');
    expect(polyrentSource).toContain('GhostCursor');

    const polysuaraSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'PolySuaraVoiceScene.tsx'),
      'utf8',
    );
    expect(polysuaraSource).toContain('EvolvingPath');
    expect(polysuaraSource).toContain('PersonaMonogram');
    expect(polysuaraSource).toContain('USUL DITERIMA JPP');
    expect(polysuaraSource).toContain('IG STORY');
    expect(polysuaraSource).toContain('GhostCursor');

    const welfareSource = readFileSync(
      join(LAUNCH_ROOT_DIR, 'scenes', 'WelfareCareScene.tsx'),
      'utf8',
    );
    expect(welfareSource).toContain('EvolvingPath');
    expect(welfareSource).toContain('MOD PRIVASI SISWA AKTIF');
    expect(welfareSource).toContain('SELESAI &amp; DISANTUNI');
    expect(welfareSource).toContain('DeterministicQrMatrix');

    const clubsSource = readFileSync(join(LAUNCH_ROOT_DIR, 'scenes', 'ClubsEmsScene.tsx'), 'utf8');
    expect(clubsSource).toContain('GhostCursor');
    expect(clubsSource).toContain('EvolvingPath');
    expect(clubsSource).toContain('MATA MERIT');
    expect(clubsSource).toContain("backfaceVisibility: 'hidden'");
    expect(clubsSource).toContain('GeometricSparkBurst');
    expect(clubsSource).toContain('Muat Turun PDF Rasmi Serta-Merta');

    for (const filePath of walkLaunchTsFiles(LAUNCH_ROOT_DIR)) {
      const content = readFileSync(filePath, 'utf8');
      const sparkMatches = content.match(/<GeometricSparkBurst\s+[\s\S]*?\/>/g) ?? [];
      for (const block of sparkMatches) {
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} missing triggerFrame`).toContain(
          'triggerFrame=',
        );
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} missing x`).toContain('x=');
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} missing y`).toContain('y=');
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} invalid spark prop`).not.toMatch(
          /\b(startFrame|particleCount|maxRadius|secondaryColor)=/,
        );
      }
      const cursorMatches = content.match(/<GhostCursor\s+[\s\S]*?\/>/g) ?? [];
      for (const block of cursorMatches) {
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} invalid GhostCursor prop`).not.toContain(
          'accentColor=',
        );
      }
      const floorGridMatches = content.match(/<SpatialFloorGrid\s+[\s\S]*?\/>/g) ?? [];
      for (const block of floorGridMatches) {
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} missing SpatialFloorGrid accentColor`).toContain(
          'accentColor=',
        );
        expect(block, `${relative(LAUNCH_ROOT_DIR, filePath)} invalid SpatialFloorGrid prop`).not.toMatch(
          /\b(color|height|tiltDeg|opacity)=/,
        );
      }
    }
  });
});
