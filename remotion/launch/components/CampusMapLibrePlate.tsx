import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Easing,
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { Circle } from '@remotion/shapes';
import {
  Check,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Eye,
  Navigation,
  Umbrella,
} from 'lucide-react';
import { LAUNCH_FONTS, LAUNCH_MODULE_THEMES, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';
import {
  CAMPUS_JUNCTION_NODES,
  CAMPUS_LANDMARKS,
  CAMPUS_WALK_ROUTE,
  getCampusTurnStep,
  getWalkerCoordinate,
  sliceCampusRoute,
} from '../lib/campusRoute';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const ROUTE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

const EMERALD = LAUNCH_MODULE_THEMES.polymaps.primary; // #10B981
const EMERALD_DARK = LAUNCH_MODULE_THEMES.polymaps.dark; // #059669
const EMERALD_INK = '#047857'; // WCAG AA+ Emerald-700 for white icon badges
const EMERALD_SOFT = LAUNCH_MODULE_THEMES.polymaps.soft; // #ECFDF5
const EMERALD_BORDER = LAUNCH_MODULE_THEMES.polymaps.border; // #A7F3D0

// 17-waypoint projection of CAMPUS_ROUTE_COORDINATES inside 1000x830 SVG blueprint
const OFFLINE_ROUTE_PATH =
  'M 376 616 L 379 556 L 378 546 L 371 538 L 416 496 L 440 504 L 479 495 L 552 465 L 568 457 L 540 432 L 560 413 L 567 402 L 569 390 L 571 368 L 569 330 L 580 321 L 641 297';
const OFFLINE_COVERED_PATH = 'M 416 496 L 440 504 L 479 495 L 552 465 L 568 457';
const OFFLINE_ROUTE_LENGTH = getLength(OFFLINE_ROUTE_PATH);

const OFFLINE_LANDMARKS = [
  { x: 376, y: 616, label: 'Dataran Siswa', role: 'origin' as const },
  { x: 479, y: 495, label: 'Laluan F Berbumbung', role: 'waypoint' as const },
  { x: 568, y: 457, label: 'Simpang Akademik', role: 'junction' as const },
  { x: 641, y: 297, label: 'Blok JTMK • Makmal 3', role: 'destination' as const },
] as const;

const OFFLINE_DEST_LEFT_PCT = 64.1;
const OFFLINE_DEST_TOP_PCT = (297 / 830) * 100;

const GRID_VERTICAL_X = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880, 960] as const;
const GRID_HORIZONTAL_Y = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800] as const;

const CONTOUR_CURVES = [
  'M -20 130 C 180 85, 360 155, 560 110 C 740 70, 890 118, 1020 82',
  'M -20 235 C 210 190, 390 258, 600 206 C 780 164, 910 212, 1020 176',
  'M -20 385 C 165 340, 360 412, 575 352 C 760 302, 900 348, 1020 310',
  'M -20 538 C 190 498, 410 558, 625 496 C 795 448, 920 486, 1020 452',
  'M -20 688 C 225 654, 440 698, 665 628 C 820 580, 935 596, 1020 562',
] as const;

const CAMPUS_ROADS = [
  {
    id: 'jalan-semambu',
    d: 'M -20 740 Q 340 718 680 668 T 1030 568',
    casingWidth: 24,
    deckWidth: 18,
    major: true,
  },
  {
    id: 'laluan-a',
    d: 'M 210 710 L 244 552 Q 260 508 320 502 L 568 457 L 820 386',
    casingWidth: 15,
    deckWidth: 10,
    major: false,
  },
  {
    id: 'laluan-b',
    d: 'M 176 346 L 442 332 L 641 297 L 892 246',
    casingWidth: 15,
    deckWidth: 10,
    major: false,
  },
  {
    id: 'laluan-d',
    d: 'M 372 706 L 376 616 L 379 556 L 404 336 L 420 146',
    casingWidth: 14,
    deckWidth: 9.5,
    major: false,
  },
  {
    id: 'laluan-f',
    d: 'M 588 648 L 568 457 L 569 330 L 641 297 L 664 136',
    casingWidth: 14,
    deckWidth: 9.5,
    major: false,
  },
] as const;

const ROUTE_START_CENTER: [number, number] = [103.315, 3.8617];

let workerUrlConfigured = false;

export type CampusMapLibrePlateProps = {
  readonly width: number;
  readonly height: number;
  readonly routeStartFrame?: number;
  readonly routeEndFrame?: number;
  readonly arrivalLabel?: string;
  readonly showTurnByTurn?: boolean;
  readonly showStreetViewBadge?: boolean;
};

/**
 * Deterministic frame-to-route progress calculation shared between MapLibre GeoJSON updates,
 * 3D chase-cam interpolation, turn-by-turn HUD, and synchronized scene telemetry readouts.
 */
export function computeCampusRouteProgress(
  frame: number,
  startFrame: number,
  endFrame: number,
): number {
  const safeFrame = Number.isFinite(frame) ? frame : 0;
  const safeStart = Number.isFinite(startFrame) ? startFrame : 0;
  const safeEnd = Number.isFinite(endFrame) ? Math.max(safeStart + 1, endFrame) : safeStart + 1;
  return interpolate(safeFrame, [safeStart, safeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ROUTE_EASING,
  });
}

function computeChaseCamera(routeProgress: number): {
  readonly center: [number, number];
  readonly zoom: number;
  readonly pitch: number;
  readonly bearing: number;
} {
  const p = Math.min(1, Math.max(0, Number.isFinite(routeProgress) ? routeProgress : 0));
  const leadWalker = getWalkerCoordinate(Math.min(1, p + 0.08 * (1 - p)));
  const camBlend = interpolate(p, [0, 0.25, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const arrivalLock = interpolate(p, [0.85, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rawLng = interpolate(camBlend, [0, 1], [ROUTE_START_CENTER[0], leadWalker[0]]);
  const rawLat = interpolate(camBlend, [0, 1], [ROUTE_START_CENTER[1], leadWalker[1]]);
  return {
    center: [
      interpolate(arrivalLock, [0, 1], [rawLng, POLISAS_COORDS.BLOK_JTMK[0]]),
      interpolate(arrivalLock, [0, 1], [rawLat, POLISAS_COORDS.BLOK_JTMK[1]]),
    ],
    zoom: interpolate(p, [0, 1], [16.35, 17.35]),
    pitch: interpolate(p, [0, 1], [48, 57]),
    bearing: interpolate(p, [0, 0.55, 1], [-16, 8, 22]),
  };
}

export const CampusMapLibrePlate: React.FC<CampusMapLibrePlateProps> = ({
  width,
  height,
  routeStartFrame,
  routeEndFrame,
  arrivalLabel = 'TIBA DI MAKMAL 3 • TEPAT MASA ✓',
  showTurnByTurn = true,
  showStreetViewBadge = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const settledRef = useRef(false);
  const safetyTimerRef = useRef<number | null>(null);
  const loadingHandleRef = useRef<number | null>(null);
  const loadingClearedRef = useRef(false);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1000;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 830;
  const safeFps = Math.max(1, Number.isFinite(fps) ? fps : 60);
  const safeDuration = Number.isFinite(durationInFrames) && durationInFrames > 2 ? durationInFrames : 480;
  const safeStartCandidate =
    routeStartFrame !== undefined && Number.isFinite(routeStartFrame)
      ? routeStartFrame
      : Math.round(0.6 * safeFps);
  const resolvedStartFrame = Math.max(0, safeStartCandidate);
  const safeEndCandidate =
    routeEndFrame !== undefined && Number.isFinite(routeEndFrame)
      ? routeEndFrame
      : safeDuration - Math.round(1.0 * safeFps);
  const resolvedEndFrame = Math.max(resolvedStartFrame + 1, safeEndCandidate);
  const routeProgress = computeCampusRouteProgress(frame, resolvedStartFrame, resolvedEndFrame);
  const hasArrived = routeProgress >= 0.999;
  const turnStep = getCampusTurnStep(routeProgress);

  // Acquire the initial delayRender handle in useLayoutEffect so React StrictMode
  // double-mounts and mid-load unmounts cleanly release any pending handle, while
  // still blocking synchronously before requestAnimationFrame / remotion still capture.
  useLayoutEffect(() => {
    if (loadingClearedRef.current) return;
    const handle = delayRender('Loading POLISAS 3D MapLibre campus map');
    loadingHandleRef.current = handle;
    return () => {
      if (loadingHandleRef.current === handle) {
        loadingHandleRef.current = null;
        continueRender(handle);
      }
    };
  }, [continueRender, delayRender]);

  useEffect(() => {
    if (settledRef.current) return;

    let cancelled = false;

    const clearSafetyTimer = () => {
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };

    const disposeMap = () => {
      try {
        mapInstanceRef.current?.remove();
      } catch {
        // Ignore teardown errors if the WebGL2 context was already lost or disposed.
      }
      mapInstanceRef.current = null;
    };

    const activateFallback = () => {
      if (cancelled || settledRef.current) return;
      settledRef.current = true;
      clearSafetyTimer();
      disposeMap();
      setMap(null);
      setFallbackMode(true);
    };

    safetyTimerRef.current = window.setTimeout(() => {
      if (cancelled) return;
      activateFallback();
    }, 4500);

    if (!mapInstanceRef.current && containerRef.current) {
      try {
        if (
          !workerUrlConfigured &&
          typeof window !== 'undefined' &&
          typeof Blob !== 'undefined' &&
          typeof URL !== 'undefined' &&
          typeof URL.createObjectURL === 'function'
        ) {
          maplibregl.setWorkerUrl(
            URL.createObjectURL(
              new Blob(
                [
                  `import "https://unpkg.com/maplibre-gl@${maplibregl.getVersion()}/dist/maplibre-gl-worker.mjs";`,
                ],
                { type: 'text/javascript' },
              ),
            ),
          );
          workerUrlConfigured = true;
        }

        const initialCam = computeChaseCamera(0);
        const mapInstance = new maplibregl.Map({
          container: containerRef.current,
          style: OPENFREEMAP_STYLE,
          center: initialCam.center,
          zoom: initialCam.zoom,
          pitch: initialCam.pitch,
          bearing: initialCam.bearing,
          maxPitch: 65,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          canvasContextAttributes: {
            preserveDrawingBuffer: true,
          },
        });
        mapInstanceRef.current = mapInstance;

        let preIdleErrorCount = 0;
        mapInstance.on('error', (evt) => {
          if (cancelled || settledRef.current) return;
          const errStatus = (evt as { error?: { status?: number; message?: string } })?.error?.status;
          const errMsg = String(
            (evt as { error?: { message?: string } })?.error?.message ?? '',
          ).toLowerCase();
          const sourceId = (evt as { sourceId?: string })?.sourceId;
          preIdleErrorCount += 1;
          // Style load failure, offline status=0, or repeated tile errors trigger offline SVG fallback
          if (!sourceId || errStatus === 0 || errMsg.includes('style') || preIdleErrorCount >= 3) {
            activateFallback();
          }
        });

        mapInstance.on('load', () => {
          if (cancelled || settledRef.current) return;

          try {
            // Subtle architectural 3D campus building extrusions beneath the route layers
            if (mapInstance.getSource('openmaptiles') && !mapInstance.getLayer('campus-3d-buildings')) {
              try {
                mapInstance.addLayer({
                  id: 'campus-3d-buildings',
                  source: 'openmaptiles',
                  'source-layer': 'building',
                  type: 'fill-extrusion',
                  minzoom: 15,
                  paint: {
                    'fill-extrusion-color': '#E3DDD0',
                    'fill-extrusion-height': [
                      'min',
                      22,
                      ['max', 7, ['*', ['coalesce', ['get', 'render_height'], 5], 1.6]],
                    ],
                    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                    'fill-extrusion-opacity': 0.72,
                  },
                });
              } catch {
                // Continue gracefully if building source layer metadata differs
              }
            }

            // Full 17-waypoint preview track so student sees the upcoming campus turns
            if (!mapInstance.getSource('campus-route-preview-src')) {
              mapInstance.addSource('campus-route-preview-src', {
                type: 'geojson',
                data: CAMPUS_WALK_ROUTE,
              });
            }

            if (!mapInstance.getLayer('campus-route-preview')) {
              mapInstance.addLayer({
                id: 'campus-route-preview',
                type: 'line',
                source: 'campus-route-preview-src',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: {
                  'line-color': EMERALD_DARK,
                  'line-width': 4,
                  'line-opacity': 0.28,
                  'line-dasharray': [2, 2],
                },
              });
            }

            if (!mapInstance.getSource('campus-trace')) {
              mapInstance.addSource('campus-trace', {
                type: 'geojson',
                data: sliceCampusRoute(0),
              });
            }

            if (!mapInstance.getLayer('campus-trace-casing')) {
              mapInstance.addLayer({
                id: 'campus-trace-casing',
                type: 'line',
                source: 'campus-trace',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': '#FFFFFF', 'line-width': 15 },
              });
            }

            if (!mapInstance.getLayer('campus-trace-rim')) {
              mapInstance.addLayer({
                id: 'campus-trace-rim',
                type: 'line',
                source: 'campus-trace',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': EMERALD_DARK, 'line-width': 10.5 },
              });
            }

            if (!mapInstance.getLayer('campus-trace-line')) {
              mapInstance.addLayer({
                id: 'campus-trace-line',
                type: 'line',
                source: 'campus-trace',
                layout: { 'line-cap': 'round', 'line-join': 'round' },
                paint: { 'line-color': EMERALD, 'line-width': 7 },
              });
            }

            if (!mapInstance.getSource('campus-junctions')) {
              mapInstance.addSource('campus-junctions', {
                type: 'geojson',
                data: CAMPUS_JUNCTION_NODES,
              });
            }

            if (!mapInstance.getLayer('campus-junction-dots')) {
              mapInstance.addLayer({
                id: 'campus-junction-dots',
                type: 'circle',
                source: 'campus-junctions',
                paint: {
                  'circle-color': EMERALD_SOFT,
                  'circle-radius': 4,
                  'circle-stroke-color': EMERALD_DARK,
                  'circle-stroke-width': 2,
                },
              });
            }

            if (!mapInstance.getSource('campus-landmarks')) {
              mapInstance.addSource('campus-landmarks', {
                type: 'geojson',
                data: CAMPUS_LANDMARKS,
              });
            }

            if (!mapInstance.getLayer('campus-landmark-dots')) {
              mapInstance.addLayer({
                id: 'campus-landmark-dots',
                type: 'circle',
                source: 'campus-landmarks',
                paint: {
                  'circle-color': [
                    'match',
                    ['get', 'role'],
                    'destination',
                    EMERALD_DARK,
                    'waypoint',
                    EMERALD,
                    LAUNCH_PALETTE.PRIMARY,
                  ],
                  'circle-radius': ['match', ['get', 'role'], 'destination', 11, 8.5],
                  'circle-stroke-color': '#FFFFFF',
                  'circle-stroke-width': 3.5,
                },
              });
            }

            if (!mapInstance.getLayer('campus-landmark-labels')) {
              mapInstance.addLayer({
                id: 'campus-landmark-labels',
                type: 'symbol',
                source: 'campus-landmarks',
                layout: {
                  'text-allow-overlap': true,
                  'text-anchor': 'top',
                  'text-field': ['get', 'name'],
                  'text-font': ['Noto Sans Regular'],
                  'text-offset': [0, 1.15],
                  'text-size': 15.5,
                },
                paint: {
                  'text-color': LAUNCH_PALETTE.PRIMARY_DARK,
                  'text-halo-color': '#F8F6EE',
                  'text-halo-width': 3,
                },
              });
            }

            const [wx, wy] = getWalkerCoordinate(0);
            if (!mapInstance.getSource('campus-walker')) {
              mapInstance.addSource('campus-walker', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'Point', coordinates: [wx, wy] },
                },
              });
            }

            if (!mapInstance.getLayer('campus-walker-halo')) {
              mapInstance.addLayer({
                id: 'campus-walker-halo',
                type: 'circle',
                source: 'campus-walker',
                paint: {
                  'circle-color': EMERALD,
                  'circle-radius': 22,
                  'circle-opacity': 0.28,
                },
              });
            }

            if (!mapInstance.getLayer('campus-walker-dot')) {
              mapInstance.addLayer({
                id: 'campus-walker-dot',
                type: 'circle',
                source: 'campus-walker',
                paint: {
                  'circle-color': EMERALD,
                  'circle-radius': 12.5,
                  'circle-stroke-color': '#FFFFFF',
                  'circle-stroke-width': 4,
                },
              });
            }

            mapInstance.jumpTo({
              center: initialCam.center,
              zoom: initialCam.zoom,
              pitch: initialCam.pitch,
              bearing: initialCam.bearing,
            });
            mapInstance.once('idle', () => {
              if (cancelled || settledRef.current) return;
              settledRef.current = true;
              clearSafetyTimer();
              setMap(mapInstance);
            });
          } catch {
            if (!cancelled) {
              activateFallback();
            }
          }
        });
      } catch {
        activateFallback();
      }
    }

    return () => {
      cancelled = true;
      clearSafetyTimer();
      disposeMap();
      setMap(null);
      setFallbackMode(false);
      settledRef.current = false;
    };
  }, []);

  // Declared above loadingHandle release so frame-0 registers its own delayRender before loadingHandle clears.
  useEffect(() => {
    if (!map || fallbackMode) return;

    const handle = delayRender('Updating POLISAS 3D MapLibre route frame');

    const traceSource = map.getSource('campus-trace') as GeoJSONSource | undefined;
    traceSource?.setData(sliceCampusRoute(routeProgress));

    const [wx, wy] = getWalkerCoordinate(routeProgress);
    const walkerSource = map.getSource('campus-walker') as GeoJSONSource | undefined;
    walkerSource?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [wx, wy] },
    });

    const cam = computeChaseCamera(routeProgress);
    map.jumpTo({
      center: cam.center,
      zoom: cam.zoom,
      pitch: cam.pitch,
      bearing: cam.bearing,
    });

    let done = false;
    let fallbackTimer: number | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      continueRender(handle);
    };

    fallbackTimer = window.setTimeout(finish, 1800);
    map.once('idle', finish);
    map.triggerRepaint();

    return () => {
      try {
        map.off('idle', finish);
      } catch {
        // Ignore listener removal errors if map was already disposed.
      }
      finish();
    };
  }, [continueRender, delayRender, fallbackMode, map, routeProgress]);

  useEffect(() => {
    if ((!map && !fallbackMode) || loadingClearedRef.current) return;
    loadingClearedRef.current = true;
    const handle = loadingHandleRef.current;
    if (handle !== null) {
      loadingHandleRef.current = null;
      continueRender(handle);
    }
  }, [continueRender, fallbackMode, map]);

  const clampedFallbackProgress = Math.min(1, Math.max(0, routeProgress));
  const isRouteStarted = clampedFallbackProgress > 0.0001;
  const isRouteComplete = clampedFallbackProgress >= 0.9999;
  const evolvedFallback =
    isRouteStarted && !isRouteComplete ? evolvePath(clampedFallbackProgress, OFFLINE_ROUTE_PATH) : null;
  const walkerPoint = getPointAtLength(
    OFFLINE_ROUTE_PATH,
    Math.min(OFFLINE_ROUTE_LENGTH, Math.max(0, clampedFallbackProgress * OFFLINE_ROUTE_LENGTH)),
  );

  // Pixel-locked destination anchor: (50%, 50%) in live 3D MapLibre mode when arrived,
  // or projected destination vertex in offline SVG blueprint mode.
  const destLeftCss = fallbackMode ? `${OFFLINE_DEST_LEFT_PCT.toFixed(2)}%` : '50%';
  const destTopCss = fallbackMode ? `${OFFLINE_DEST_TOP_PCT.toFixed(2)}%` : '50%';
  const arrivalPillTopCss = fallbackMode ? '16%' : '28%';

  const arrivalElapsed = hasArrived ? Math.max(0, frame - resolvedEndFrame) : 0;
  const arrivalPillSpring = hasArrived
    ? spring({
        frame: arrivalElapsed,
        fps: safeFps,
        config: { damping: 145, stiffness: 225, mass: 0.85 },
      })
    : 0;
  const arrivalPillEnter = hasArrived
    ? interpolate(arrivalElapsed, [0, Math.max(8, Math.round(0.35 * safeFps))], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EXPO_OUT,
      })
    : 0;
  const radarCycleFrames = Math.max(24, Math.round(1.25 * safeFps));
  const radarStaggerFrames = Math.max(8, Math.round(0.36 * safeFps));
  const timeSec = frame / safeFps;
  const arrivalFloatY = hasArrived ? Math.sin(timeSec * 2.4) * 3.5 * arrivalPillEnter : 0;

  // Floating Turn-by-Turn Toast pop-in aligned cleanly with navigation activation
  const toastEnter = interpolate(
    frame,
    [Math.max(0, resolvedStartFrame - 8), resolvedStartFrame + 10],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EXPO_OUT,
    },
  );

  const renderTurnIcon = () => {
    switch (turnStep.turnKind) {
      case 'arrived':
        return <Check size={18} color="#FFFFFF" strokeWidth={3} />;
      case 'left':
        return <CornerUpLeft size={18} color="#FFFFFF" strokeWidth={2.6} />;
      case 'right':
        return <CornerUpRight size={18} color="#FFFFFF" strokeWidth={2.6} />;
      case 'straight':
        return <Navigation size={17} color="#FFFFFF" strokeWidth={2.5} />;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: safeWidth,
        height: safeHeight,
        borderRadius: 28,
        overflow: 'hidden',
        border: `2px solid ${hasArrived ? EMERALD : EMERALD_BORDER}`,
        backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
        boxShadow: '0 26px 56px rgba(5, 150, 105, 0.14), 0 12px 28px rgba(31, 39, 32, 0.12)',
      }}
    >
      {!fallbackMode ? (
        <>
          <div ref={containerRef} style={{ position: 'absolute', width, height }} />
          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: 12,
              padding: '4px 10px',
              borderRadius: 8,
              backgroundColor: 'rgba(248, 246, 238, 0.94)',
              border: `1px solid ${EMERALD_BORDER}`,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 10.5,
              fontWeight: 700,
              color: LAUNCH_PALETTE.PRIMARY,
              zIndex: 5,
            }}
          >
            © OpenFreeMap • © OpenMapTiles • © OpenStreetMap contributors
          </div>
        </>
      ) : (
        <>
          <Interactive.Svg
            width={width}
            height={height}
            viewBox="0 0 1000 830"
            preserveAspectRatio="none"
            premountFor={safeFps}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Warm porcelain/sand architectural drafting backdrop */}
            <rect x={0} y={0} width={1000} height={830} fill={LAUNCH_PALETTE.SURFACE_MUTED} />

            {/* Subtle coordinate grid every 80px */}
            <g stroke={LAUNCH_PALETTE.TERTIARY} strokeWidth={1} strokeOpacity={0.55}>
              {GRID_VERTICAL_X.map((gx) => (
                <line key={`grid-x-${gx}`} x1={gx} y1={0} x2={gx} y2={830} />
              ))}
              {GRID_HORIZONTAL_Y.map((gy) => (
                <line key={`grid-y-${gy}`} x1={0} y1={gy} x2={1000} y2={gy} />
              ))}
            </g>

            {/* Organic topographic elevation contour curves */}
            <g fill="none" stroke="rgba(16, 185, 129, 0.18)" strokeWidth={1.6}>
              {CONTOUR_CURVES.map((d, idx) => (
                <path key={`contour-${idx}`} d={d} />
              ))}
            </g>

            {/* Campus green belt / lawn quads */}
            <g fill="rgba(16, 185, 129, 0.1)" stroke={EMERALD_BORDER} strokeWidth={1.1}>
              <rect x={312} y={564} width={128} height={92} rx={18} />
              <rect x={442} y={404} width={118} height={74} rx={14} />
              <rect x={706} y={118} width={222} height={134} rx={16} />
            </g>

            {/* Architectural road network: #FFFFFF road casings over #D9C9B2 strokes */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {CAMPUS_ROADS.map((road) => (
                <path
                  key={`${road.id}-casing`}
                  d={road.d}
                  stroke={LAUNCH_PALETTE.TERTIARY}
                  strokeWidth={road.casingWidth}
                />
              ))}
              {CAMPUS_ROADS.map((road) => (
                <path
                  key={`${road.id}-deck`}
                  d={road.d}
                  stroke={LAUNCH_PALETTE.CARD_BG}
                  strokeWidth={road.deckWidth}
                />
              ))}
            </g>

            {/* Covered walkway architectural spine (Laluan F Berbumbung) */}
            <path
              d={OFFLINE_COVERED_PATH}
              fill="none"
              stroke={EMERALD_BORDER}
              strokeWidth={24}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.65}
            />
            <path
              d={OFFLINE_COVERED_PATH}
              fill="none"
              stroke={EMERALD_SOFT}
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.94}
            />

            {/* Crisp geometric POLISAS Semambu campus building footprints */}
            <g>
              <rect
                x={338}
                y={590}
                width={76}
                height={52}
                rx={10}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.5}
              />
              <path
                d="M 196 376 H 322 V 430 H 256 V 464 H 196 Z"
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.6}
              />
              <rect
                x={476}
                y={554}
                width={132}
                height={80}
                rx={10}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.6}
              />
              <rect
                x={576}
                y={236}
                width={148}
                height={76}
                rx={8}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={EMERALD_BORDER}
                strokeWidth={1.8}
              />
              <rect
                x={724}
                y={132}
                width={186}
                height={38}
                rx={6}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.5}
              />
            </g>

            {/* Road & building annotations */}
            <g
              fontFamily={LAUNCH_FONTS.MONO}
              fontWeight={700}
              letterSpacing="0.1em"
              fill={LAUNCH_PALETTE.MUTED_OLIVE}
            >
              <text x={259} y={407} textAnchor="middle" fontSize={10}>
                PERPUSTAKAAN
              </text>
              <text x={542} y={598} textAnchor="middle" fontSize={10}>
                DEWAN JUBLI PERAK
              </text>
              <text x={650} y={272} textAnchor="middle" fontSize={10} fill={EMERALD_DARK}>
                BLOK JTMK
              </text>
              <text x={817} y={155} textAnchor="middle" fontSize={10}>
                KAMSIS
              </text>
              <text x={734} y={286} fontSize={9.5} opacity={0.82}>
                LALUAN B
              </text>
              <text x={410} y={226} fontSize={9.5} opacity={0.82}>
                LALUAN D
              </text>
              <text x={654} y={482} fontSize={9.5} opacity={0.82}>
                LALUAN F
              </text>
              <text x={772} y={644} fontSize={10.5} opacity={0.88} transform="rotate(-11 772 644)">
                JALAN SEMAMBU
              </text>
            </g>

            {/* Dashed preview route path along full 17 waypoints */}
            <path
              d={OFFLINE_ROUTE_PATH}
              fill="none"
              stroke="rgba(5, 150, 105, 0.25)"
              strokeWidth={10}
              strokeDasharray="10 10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {isRouteStarted ? (
              <>
                <path
                  d={OFFLINE_ROUTE_PATH}
                  fill="none"
                  stroke={LAUNCH_PALETTE.CARD_BG}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...(evolvedFallback
                    ? {
                        strokeDasharray: evolvedFallback.strokeDasharray,
                        strokeDashoffset: evolvedFallback.strokeDashoffset,
                      }
                    : undefined)}
                />
                <Interactive.Path
                  name="Offline Campus Walking Route"
                  premountFor={safeFps}
                  d={OFFLINE_ROUTE_PATH}
                  fill="none"
                  stroke={EMERALD}
                  strokeWidth={8.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...(evolvedFallback
                    ? {
                        strokeDasharray: evolvedFallback.strokeDasharray,
                        strokeDashoffset: evolvedFallback.strokeDashoffset,
                      }
                    : undefined)}
                />
              </>
            ) : null}

            {OFFLINE_LANDMARKS.map((lm) => {
              const isDest = lm.role === 'destination';
              const isOrigin = lm.role === 'origin';
              const pillWidth = isDest ? 222 : isOrigin ? 156 : 196;
              return (
                <g key={lm.label} transform={`translate(${lm.x}, ${lm.y})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={isDest ? 10 : 8}
                    fill={isDest ? EMERALD_DARK : EMERALD}
                    stroke={LAUNCH_PALETTE.CARD_BG}
                    strokeWidth={3.5}
                  />
                  <g transform={`translate(${-pillWidth / 2}, ${isDest ? 18 : 16})`}>
                    <rect
                      x={0}
                      y={0}
                      width={pillWidth}
                      height={30}
                      rx={15}
                      fill={isDest ? EMERALD_DARK : 'rgba(248, 246, 238, 0.96)'}
                      stroke={isDest ? EMERALD_BORDER : EMERALD}
                      strokeWidth={1.5}
                    />
                    <text
                      x={pillWidth / 2}
                      y={20}
                      textAnchor="middle"
                      fill={isDest ? '#FFFFFF' : LAUNCH_PALETTE.PRIMARY}
                      fontFamily={LAUNCH_FONTS.MONO}
                      fontSize={12.5}
                      fontWeight={700}
                    >
                      {lm.label}
                    </text>
                  </g>
                </g>
              );
            })}

            <g transform={`translate(${walkerPoint.x}, ${walkerPoint.y})`}>
              <circle cx={0} cy={0} r={20} fill="rgba(16, 185, 129, 0.28)" />
              <circle
                cx={0}
                cy={0}
                r={11.5}
                fill={EMERALD}
                stroke={LAUNCH_PALETTE.CARD_BG}
                strokeWidth={3.5}
              />
            </g>
          </Interactive.Svg>
          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: 12,
              padding: '4px 10px',
              borderRadius: 8,
              backgroundColor: 'rgba(248, 246, 238, 0.94)',
              border: `1px solid ${EMERALD_BORDER}`,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 10.5,
              fontWeight: 700,
              color: LAUNCH_PALETTE.PRIMARY,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            Pelan 17-Titik Semambu • {POLISAS_COORDS.LABEL_COORDS}
          </div>
        </>
      )}

      {/* Floating Turn-by-Turn Emerald Navigation Toast (top-left) */}
      {showTurnByTurn && toastEnter > 0.01 ? (
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 20,
            maxWidth: 620,
            padding: '12px 16px',
            borderRadius: 18,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            border: `1.5px solid ${hasArrived ? EMERALD_DARK : EMERALD}`,
            boxShadow: '0 16px 36px rgba(5, 150, 105, 0.18), 0 4px 12px rgba(31, 39, 32, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 6,
            opacity: toastEnter,
            transform: `translate3d(0px, ${((1 - toastEnter) * -12).toFixed(2)}px, 0px)`,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              backgroundColor: EMERALD_INK,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(4, 120, 87, 0.34)',
            }}
          >
            {renderTurnIcon()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: LAUNCH_FONTS.DISPLAY,
                  fontSize: 15,
                  fontWeight: 900,
                  letterSpacing: '-0.015em',
                  color: LAUNCH_PALETTE.PRIMARY_DARK,
                  whiteSpace: 'nowrap',
                }}
              >
                {turnStep.instruction}
              </span>
              {turnStep.isCovered ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    backgroundColor: EMERALD_SOFT,
                    border: `1px solid ${EMERALD_BORDER}`,
                    fontFamily: LAUNCH_FONTS.MONO,
                    fontSize: 10,
                    fontWeight: 800,
                    color: EMERALD_DARK,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Umbrella size={11} color={EMERALD_DARK} strokeWidth={2.5} />
                  <span>Laluan Berbumbung</span>
                </span>
              ) : null}
            </div>
            <span
              style={{
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 11,
                fontWeight: 700,
                color: LAUNCH_PALETTE.MUTED_OLIVE,
                whiteSpace: 'nowrap',
              }}
            >
              {turnStep.roadName} • {turnStep.distanceLabel}
            </span>
          </div>
        </div>
      ) : null}

      {/* Top-Right 360 Street View Badge + Live 3D Chase Telemetry */}
      {showStreetViewBadge ? (
        <div
          style={{
            position: 'absolute',
            right: 20,
            top: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            zIndex: 6,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 14px',
              borderRadius: 999,
              backgroundColor: 'rgba(236, 253, 245, 0.96)',
              border: `1.5px solid ${EMERALD}`,
              boxShadow: '0 10px 24px rgba(5, 150, 105, 0.16)',
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: EMERALD_DARK,
              whiteSpace: 'nowrap',
            }}
          >
            <Eye size={13.5} color={EMERALD_DARK} strokeWidth={2.5} />
            <span>360° Street View Tersedia</span>
          </div>

          {!fallbackMode ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                backgroundColor: 'rgba(248, 246, 238, 0.92)',
                border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
                fontFamily: LAUNCH_FONTS.MONO,
                fontSize: 10,
                fontWeight: 700,
                color: LAUNCH_PALETTE.PRIMARY,
              }}
            >
              <Compass size={11.5} color={EMERALD_DARK} strokeWidth={2.4} />
              <span>3D Chase-Cam • Pitch {Math.round(interpolate(routeProgress, [0, 1], [48, 57]))}°</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Pixel-Locked Arrival Radar Rings (@remotion/shapes <Circle>) at Blok JTMK Destination */}
      {hasArrived ? (
        <div
          style={{
            position: 'absolute',
            left: destLeftCss,
            top: destTopCss,
            width: 0,
            height: 0,
            pointerEvents: 'none',
            zIndex: 7,
          }}
        >
          {[0, 1, 2].map((ringIdx) => {
            const localElapsed = arrivalElapsed - ringIdx * radarStaggerFrames;
            if (localElapsed < 0) return null;
            const cycleT = (localElapsed % radarCycleFrames) / radarCycleFrames;
            const ringScale = interpolate(cycleT, [0, 1], [0.16, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const ringOpacity = interpolate(cycleT, [0, 0.14, 0.72, 1], [0, 0.9, 0.3, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            return (
              <Circle
                key={`map-radar-ring-${ringIdx}`}
                radius={116}
                fill="none"
                stroke={ringIdx % 2 === 0 ? EMERALD : EMERALD_DARK}
                strokeWidth={2.8}
                vectorEffect="non-scaling-stroke"
                premountFor={safeFps}
                showInTimeline={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: ringOpacity,
                  transform: `translate(-50%, -50%) scale(${ringScale.toFixed(4)})`,
                }}
              />
            );
          })}

          <Circle
            radius={13}
            fill={EMERALD_DARK}
            stroke="#FFFFFF"
            strokeWidth={3.5}
            premountFor={safeFps}
            showInTimeline={false}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: arrivalPillEnter,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      ) : null}

      {/* Pixel-Locked Emerald Arrival Pill above Blok JTMK */}
      {hasArrived && arrivalPillEnter > 0.001 ? (
        <div
          style={{
            position: 'absolute',
            left: destLeftCss,
            top: arrivalPillTopCss,
            zIndex: 8,
            pointerEvents: 'none',
            opacity: arrivalPillEnter,
            transform: `translate3d(-50%, ${((1 - arrivalPillEnter) * 16 + arrivalFloatY).toFixed(2)}px, 0px) scale(${(0.86 + 0.14 * arrivalPillSpring).toFixed(4)})`,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 11,
              padding: '11px 20px',
              borderRadius: 999,
              backgroundColor: LAUNCH_PALETTE.PRIMARY_DARK,
              border: `2px solid ${EMERALD}`,
              boxShadow: '0 22px 48px rgba(5, 150, 105, 0.28), 0 8px 20px rgba(31, 39, 32, 0.28)',
              color: '#FFFFFF',
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 14.5,
              fontWeight: 800,
              letterSpacing: '0.09em',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                backgroundColor: EMERALD_INK,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </span>
            <span>{arrivalLabel}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
