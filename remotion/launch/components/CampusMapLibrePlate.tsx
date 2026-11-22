import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CanvasImage,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useDelayRender,
  useVideoConfig,
} from 'remotion';
import { evolvePath, getLength, getPointAtLength } from '@remotion/paths';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';
import { CAMPUS_LANDMARKS, getWalkerCoordinate, sliceCampusRoute } from '../lib/campusRoute';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const ROUTE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

const OFFLINE_ROUTE_PATH = 'M 315 535 L 468 435 L 590 347';
const OFFLINE_ROUTE_LENGTH = getLength(OFFLINE_ROUTE_PATH);

const OFFLINE_LANDMARKS = [
  { x: 315, y: 535, label: 'Dataran Siswa', role: 'origin' as const },
  { x: 468, y: 435, label: 'Laluan Berbumbung', role: 'waypoint' as const },
  { x: 590, y: 347, label: 'Blok JTMK • Makmal 3', role: 'destination' as const },
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
          <CanvasImage
            name="POLISAS Static Campus Map Fallback"
            src={staticFile('GAMBAR/Polymap View Phone.png')}
            premountFor={fps}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 44%' }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(248, 246, 238, 0.16)',
              pointerEvents: 'none',
            }}
          />
          <Interactive.Svg
            width={width}
            height={height}
            viewBox="0 0 1000 830"
            premountFor={fps}
            style={{ position: 'absolute', inset: 0 }}
          >
            <path
              d={OFFLINE_ROUTE_PATH}
              fill="none"
              stroke="rgba(255, 255, 255, 0.55)"
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
        </>
      )}
    </div>
  );
};
