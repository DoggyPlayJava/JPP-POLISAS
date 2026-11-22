import React, { useEffect, useRef, useState } from 'react';
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
import { interpolatePaths } from '@remotion/paths';
import { LAUNCH_FONTS, LAUNCH_PALETTE, POLISAS_COORDS } from '../tokens';
import { CAMPUS_LANDMARKS, getWalkerCoordinate, sliceCampusRoute } from '../lib/campusRoute';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

let workerUrlConfigured = false;

export const CampusMapLibrePlate: React.FC<{
  readonly width: number;
  readonly height: number;
}> = ({ width, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const settledRef = useRef(false);
  const safetyTimerRef = useRef<number | null>(null);
  const loadingClearedRef = useRef(false);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [loadingHandle] = useState(() => delayRender('Loading POLISAS MapLibre campus map'));

  useEffect(() => {
    if (settledRef.current) return;

    const clearSafetyTimer = () => {
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };

    const activateFallback = () => {
      if (settledRef.current) return;
      settledRef.current = true;
      clearSafetyTimer();
      setFallbackMode(true);
    };

    safetyTimerRef.current = window.setTimeout(activateFallback, 4000);

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
          activateFallback();
        });

        mapInstance.on('load', () => {
          if (settledRef.current) return;

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
            if (settledRef.current) return;
            settledRef.current = true;
            clearSafetyTimer();
            setMap(mapInstance);
          });
        });
      } catch {
        activateFallback();
      }
    }

    return () => {
      clearSafetyTimer();
    };
  }, []);

  // Declared above loadingHandle release so frame-0 registers its own delayRender before loadingHandle clears.
  useEffect(() => {
    if (!map || fallbackMode) return;

    const handle = delayRender('Updating POLISAS MapLibre route frame');
    const progress = interpolate(frame, [15, Math.max(16, durationInFrames - 30)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    const traceSource = map.getSource('campus-trace') as GeoJSONSource | undefined;
    traceSource?.setData(sliceCampusRoute(progress));

    const [wx, wy] = getWalkerCoordinate(progress);
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
      map.off('idle', finish);
      finish();
    };
  }, [continueRender, delayRender, durationInFrames, fallbackMode, frame, map]);

  useEffect(() => {
    if ((!map && !fallbackMode) || loadingClearedRef.current) return;
    loadingClearedRef.current = true;
    continueRender(loadingHandle);
  }, [continueRender, fallbackMode, loadingHandle, map]);

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
            width={width}
            height={height}
            fit="cover"
            premountFor={fps}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <Interactive.Svg
            width={width}
            height={height}
            viewBox="0 0 1000 720"
            premountFor={fps}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Interactive.Path
              name="Offline Campus Walking Route"
              premountFor={fps}
              d={interpolatePaths(
                frame,
                [15, Math.max(16, durationInFrames - 30)],
                [
                  'M 210 540 L 240 520 L 260 510',
                  'M 210 540 L 490 385 L 770 215',
                ],
                {
                  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                },
              )}
              fill="none"
              stroke={LAUNCH_PALETTE.ACCENT}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Interactive.Svg>
        </>
      )}
    </div>
  );
};
