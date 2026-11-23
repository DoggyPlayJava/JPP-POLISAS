import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';
import { CAMPUS_LANDMARKS, getWalkerCoordinate, sliceCampusRoute } from '../lib/campusRoute';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const ROUTE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

const OFFLINE_ROUTE_PATH = 'M 380 548 L 478 446 L 590 347';
const OFFLINE_ROUTE_LENGTH = getLength(OFFLINE_ROUTE_PATH);

const OFFLINE_LANDMARKS = [
  { x: 380, y: 548, label: 'Dataran Siswa', role: 'origin' as const },
  { x: 478, y: 446, label: 'Laluan Berbumbung', role: 'waypoint' as const },
  { x: 590, y: 347, label: 'Blok JTMK • Makmal 3', role: 'destination' as const },
] as const;

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
    d: 'M -20 710 Q 340 692 680 638 T 1030 536',
    casingWidth: 24,
    deckWidth: 18,
    major: true,
  },
  {
    id: 'laluan-a',
    d: 'M 236 694 L 236 556 Q 236 508 286 500 L 520 474 L 748 428',
    casingWidth: 15,
    deckWidth: 10,
    major: false,
  },
  {
    id: 'laluan-b',
    d: 'M 176 356 L 434 342 L 626 318 L 872 272',
    casingWidth: 15,
    deckWidth: 10,
    major: false,
  },
  {
    id: 'laluan-d',
    d: 'M 366 678 L 366 552 L 424 342 L 436 146',
    casingWidth: 14,
    deckWidth: 9.5,
    major: false,
  },
  {
    id: 'laluan-f',
    d: 'M 642 646 L 636 458 L 626 318 L 642 128',
    casingWidth: 14,
    deckWidth: 9.5,
    major: false,
  },
] as const;

let workerUrlConfigured = false;

export type CampusMapLibrePlateProps = {
  readonly width: number;
  readonly height: number;
  readonly routeStartFrame?: number;
  readonly routeEndFrame?: number;
};

/**
 * Deterministic frame-to-route progress calculation shared between MapLibre GeoJSON updates,
 * the offline fallback route path, and synchronized scene telemetry readouts.
 */
export function computeCampusRouteProgress(
  frame: number,
  startFrame: number,
  endFrame: number,
): number {
  const safeEnd = Math.max(startFrame + 1, endFrame);
  return interpolate(frame, [startFrame, safeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ROUTE_EASING,
  });
}

export const CampusMapLibrePlate: React.FC<CampusMapLibrePlateProps> = ({
  width,
  height,
  routeStartFrame,
  routeEndFrame,
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

  const resolvedStartFrame = routeStartFrame ?? Math.round(0.6 * fps);
  const resolvedEndFrame = Math.max(
    resolvedStartFrame + 1,
    routeEndFrame ?? durationInFrames - Math.round(1.0 * fps),
  );
  const routeProgress = computeCampusRouteProgress(frame, resolvedStartFrame, resolvedEndFrame);

  // Acquire the initial delayRender handle in useLayoutEffect so React StrictMode
  // double-mounts and mid-load unmounts cleanly release any pending handle, while
  // still blocking synchronously before requestAnimationFrame / remotion still capture.
  useLayoutEffect(() => {
    if (loadingClearedRef.current) return;
    const handle = delayRender('Loading POLISAS MapLibre campus map');
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
    }, 4000);

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

        const mapInstance = new maplibregl.Map({
          container: containerRef.current,
          style: OPENFREEMAP_STYLE,
          center: POLISAS_COORDS.CENTER,
          zoom: 16.4,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          canvasContextAttributes: {
            preserveDrawingBuffer: true,
          },
        });
        mapInstanceRef.current = mapInstance;

        mapInstance.on('error', () => {
          if (cancelled) return;
          activateFallback();
        });

        mapInstance.on('load', () => {
          if (cancelled || settledRef.current) return;

          try {
            mapInstance.addSource('campus-trace', {
              type: 'geojson',
              data: sliceCampusRoute(0),
            });

            mapInstance.addLayer({
              id: 'campus-trace-casing',
              type: 'line',
              source: 'campus-trace',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': '#FFFFFF', 'line-width': 12 },
            });

            mapInstance.addLayer({
              id: 'campus-trace-line',
              type: 'line',
              source: 'campus-trace',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': LAUNCH_PALETTE.ACCENT, 'line-width': 7 },
            });

            mapInstance.addSource('campus-landmarks', {
              type: 'geojson',
              data: CAMPUS_LANDMARKS,
            });

            mapInstance.addLayer({
              id: 'campus-landmark-dots',
              type: 'circle',
              source: 'campus-landmarks',
              paint: {
                'circle-color': LAUNCH_PALETTE.PRIMARY,
                'circle-radius': 10,
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 4,
              },
            });

            mapInstance.addLayer({
              id: 'campus-landmark-labels',
              type: 'symbol',
              source: 'campus-landmarks',
              layout: {
                'text-allow-overlap': true,
                'text-anchor': 'top',
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Regular'],
                'text-offset': [0, 1.1],
                'text-size': 18,
              },
              paint: {
                'text-color': LAUNCH_PALETTE.PRIMARY,
                'text-halo-color': '#F8F6EE',
                'text-halo-width': 3,
              },
            });

            const [wx, wy] = getWalkerCoordinate(0);
            mapInstance.addSource('campus-walker', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [wx, wy] },
              },
            });

            mapInstance.addLayer({
              id: 'campus-walker-dot',
              type: 'circle',
              source: 'campus-walker',
              paint: {
                'circle-color': LAUNCH_PALETTE.ACCENT,
                'circle-radius': 13,
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 4,
              },
            });

            mapInstance.jumpTo({ center: POLISAS_COORDS.CENTER, zoom: 16.4 });
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

    const handle = delayRender('Updating POLISAS MapLibre route frame');

    const traceSource = map.getSource('campus-trace') as GeoJSONSource | undefined;
    traceSource?.setData(sliceCampusRoute(routeProgress));

    const [wx, wy] = getWalkerCoordinate(routeProgress);
    const walkerSource = map.getSource('campus-walker') as GeoJSONSource | undefined;
    walkerSource?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [wx, wy] },
    });

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      continueRender(handle);
    };

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

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 28,
        overflow: 'hidden',
        border: `2px solid ${LAUNCH_PALETTE.TERTIARY}`,
        backgroundColor: LAUNCH_PALETTE.SURFACE_MUTED,
        boxShadow: '0 24px 48px rgba(46, 58, 47, 0.12)',
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
              backgroundColor: 'rgba(248, 246, 238, 0.92)',
              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 11,
              color: LAUNCH_PALETTE.PRIMARY,
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
            premountFor={fps}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Warm porcelain/sand architectural drafting backdrop */}
            <rect x={0} y={0} width={1000} height={830} fill={LAUNCH_PALETTE.SURFACE_MUTED} />

            {/* Subtle #D9C9B2 topographic coordinate grid every 80px */}
            <g stroke={LAUNCH_PALETTE.TERTIARY} strokeWidth={1} strokeOpacity={0.58}>
              {GRID_VERTICAL_X.map((gx) => (
                <line key={`grid-x-${gx}`} x1={gx} y1={0} x2={gx} y2={830} />
              ))}
              {GRID_HORIZONTAL_Y.map((gy) => (
                <line key={`grid-y-${gy}`} x1={0} y1={gy} x2={1000} y2={gy} />
              ))}
            </g>

            {/* Organic topographic elevation contour curves */}
            <g fill="none" stroke="rgba(107, 127, 91, 0.22)" strokeWidth={1.6}>
              {CONTOUR_CURVES.map((d, idx) => (
                <path key={`contour-${idx}`} d={d} />
              ))}
            </g>

            {/* Campus green belt / lawn quads */}
            <g fill="rgba(107, 127, 91, 0.14)" stroke={LAUNCH_PALETTE.TERTIARY} strokeWidth={1.1}>
              <rect x={318} y={506} width={124} height={86} rx={18} />
              <rect x={442} y={378} width={118} height={74} rx={14} />
              <rect x={706} y={118} width={222} height={134} rx={16} />
            </g>

            {/* Architectural road network: layered #FFFFFF road casings over #D9C9B2 strokes */}
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
              <path
                d={CAMPUS_ROADS[0].d}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeOpacity={0.65}
                strokeWidth={1.4}
                strokeDasharray="10 10"
              />
            </g>

            {/* Covered walkway architectural spine (Laluan Berbumbung) */}
            <path
              d="M 380 548 L 478 446 L 590 347"
              fill="none"
              stroke={LAUNCH_PALETTE.TERTIARY}
              strokeWidth={26}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.6}
            />
            <path
              d="M 380 548 L 478 446 L 590 347"
              fill="none"
              stroke={LAUNCH_PALETTE.CARD_BG}
              strokeWidth={21}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.92}
            />

            {/* Crisp geometric POLISAS Semambu campus building footprints */}
            <g>
              {/* Dataran Siswa courtyard & pavilion */}
              <rect
                x={344}
                y={524}
                width={72}
                height={48}
                rx={10}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.5}
              />

              {/* Perpustakaan L-wing */}
              <path
                d="M 196 376 H 322 V 430 H 256 V 464 H 196 Z"
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.6}
              />
              <rect
                x={208}
                y={386}
                width={102}
                height={34}
                rx={4}
                fill="rgba(107, 127, 91, 0.14)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.1}
              />

              {/* Dewan Jubli Perak */}
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
                x={490}
                y={567}
                width={104}
                height={54}
                rx={5}
                fill="rgba(107, 127, 91, 0.14)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.1}
              />

              {/* Blok JTMK complex */}
              <rect
                x={518}
                y={288}
                width={144}
                height={76}
                rx={8}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.6}
              />
              <rect
                x={556}
                y={246}
                width={94}
                height={44}
                rx={6}
                fill="rgba(107, 127, 91, 0.14)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.4}
              />
              <rect
                x={532}
                y={302}
                width={52}
                height={36}
                rx={4}
                fill="rgba(107, 127, 91, 0.14)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.1}
              />

              {/* Kamsis residential wings */}
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
              <rect
                x={724}
                y={184}
                width={186}
                height={38}
                rx={6}
                fill="rgba(107, 127, 91, 0.14)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.5}
              />
              <rect
                x={746}
                y={324}
                width={154}
                height={42}
                rx={6}
                fill={LAUNCH_PALETTE.CARD_BG}
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.5}
              />
              <rect
                x={746}
                y={378}
                width={154}
                height={42}
                rx={6}
                fill="rgba(107, 127, 91, 0.14)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.5}
              />
            </g>

            {/* Crisp architectural blueprint road & building annotations */}
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
              <text x={603} y={272} textAnchor="middle" fontSize={10}>
                BLOK JTMK
              </text>
              <text x={817} y={155} textAnchor="middle" fontSize={10}>
                KAMSIS
              </text>
              <text x={282} y={491} fontSize={9.5} opacity={0.82}>
                LALUAN A
              </text>
              <text x={734} y={291} fontSize={9.5} opacity={0.82}>
                LALUAN B
              </text>
              <text x={442} y={226} fontSize={9.5} opacity={0.82}>
                LALUAN D
              </text>
              <text x={652} y={492} fontSize={9.5} opacity={0.82}>
                LALUAN F
              </text>
              <text x={772} y={624} fontSize={10.5} opacity={0.88} transform="rotate(-11 772 624)">
                JALAN SEMAMBU
              </text>
            </g>

            {/* Architectural blueprint north compass & coordinate badge */}
            <g transform="translate(724, 24)">
              <rect
                x={0}
                y={0}
                width={250}
                height={38}
                rx={12}
                fill="rgba(248, 246, 238, 0.94)"
                stroke={LAUNCH_PALETTE.TERTIARY}
                strokeWidth={1.4}
              />
              <circle
                cx={22}
                cy={19}
                r={10}
                fill={LAUNCH_PALETTE.SURFACE_MUTED}
                stroke={LAUNCH_PALETTE.PRIMARY}
                strokeWidth={1.3}
              />
              <polygon points="22,12 25.5,22 22,20 18.5,22" fill={LAUNCH_PALETTE.ACCENT} />
              <text
                x={42}
                y={23}
                fill={LAUNCH_PALETTE.PRIMARY}
                fontFamily={LAUNCH_FONTS.MONO}
                fontSize={10.5}
                fontWeight={700}
                letterSpacing="0.08em"
              >
                PELAN KAMPUS SEMAMBU
              </text>
            </g>

            {/* Dashed preview route path */}
            <path
              d={OFFLINE_ROUTE_PATH}
              fill="none"
              stroke="rgba(46, 58, 47, 0.24)"
              strokeWidth={11}
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
                  premountFor={fps}
                  d={OFFLINE_ROUTE_PATH}
                  fill="none"
                  stroke={LAUNCH_PALETTE.ACCENT}
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
                    fill={isDest ? LAUNCH_PALETTE.ACCENT : LAUNCH_PALETTE.PRIMARY}
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
                      fill={isDest ? LAUNCH_PALETTE.PRIMARY : 'rgba(248, 246, 238, 0.96)'}
                      stroke={isDest ? LAUNCH_PALETTE.TERTIARY : LAUNCH_PALETTE.PRIMARY}
                      strokeWidth={1.5}
                    />
                    <text
                      x={pillWidth / 2}
                      y={20}
                      textAnchor="middle"
                      fill={isDest ? LAUNCH_PALETTE.BACKGROUND : LAUNCH_PALETTE.PRIMARY}
                      fontFamily={LAUNCH_FONTS.MONO}
                      fontSize={13}
                      fontWeight={700}
                    >
                      {lm.label}
                    </text>
                  </g>
                </g>
              );
            })}

            <g transform={`translate(${walkerPoint.x}, ${walkerPoint.y})`}>
              <circle cx={0} cy={0} r={19} fill="rgba(201, 111, 79, 0.25)" />
              <circle
                cx={0}
                cy={0}
                r={11.5}
                fill={LAUNCH_PALETTE.ACCENT}
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
              backgroundColor: 'rgba(248, 246, 238, 0.92)',
              border: `1px solid ${LAUNCH_PALETTE.TERTIARY}`,
              fontFamily: LAUNCH_FONTS.MONO,
              fontSize: 11,
              color: LAUNCH_PALETTE.PRIMARY,
              pointerEvents: 'none',
            }}
          >
            Pelan Vektor Semambu • {POLISAS_COORDS.LABEL_COORDS}
          </div>
        </>
      )}
    </div>
  );
};
